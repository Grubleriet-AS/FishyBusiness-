#!/usr/bin/env python3
"""The production's editions on the game's server: one folder per build, and a pointer that is swapped in one step (live-drift fase 4,
18.11.2026; Jonas: «Egne utgavemapper per bygg på Hetzner med atomisk pekerbytte for umiddelbar tilbakerulling»).

/srv/detstorebla/
  neste/                 what the release job uploads into (rsync, as current/ was before): the next edition, unchanged files kept
  releases/<v>/          one folder per edition, <v> the build's version (version.json «v»): a copy of neste/ made of hard links, so an
                         edition costs only the files that changed
  releases/HISTORY.jsonl one line per swap: {"v", "commit", "at", "av" (slipp, nodbrems, omgjort, tilbake), "fra"}
  current -> releases/<v>  the pointer Caddy serves (root /srv/detstorebla/current); swapped with rename(2), so a request sees the old
                         edition or the new one, never half of each
  in/utgave, out/utgave.json  the release job's question {"id", "versjon", "commit"} and the answer {"id", "ok", "fra", "til", "hvorfor"}

Runs as the upload user (deploy), which owns /srv/detstorebla: dsb-utgave.path sees in/utgave and starts `utgave.py bytt`; the emergency
brake (tools/server/vakt/brems.py) calls back() itself. KEEP editions are kept, and always the current one and the one before it.

    python3 utgave.py bytt                 the release job's question (what dsb-utgave.service runs)
    python3 utgave.py tilbake --grunn "…"  back to the edition before (by hand; the brake does it from brems.py)
    python3 utgave.py status               the current edition and the ones before it
    python3 utgave.py omgjor               once, by setup.sh: current/ as a folder becomes releases/<v> and the pointer
    python3 utgave.py --selftest           the checks of this file, on a folder of its own
"""
import datetime, json, os, re, shutil, sys, tempfile

SITE = os.environ.get('DSB_SITE', '/srv/detstorebla')
KEEP = 6
LINK_MIN = 64 * 1024   # files this large are hard links (the map packs, the models: their names carry their hash, and rsync replaces a file
                       # it changes rather than writing into it); the small ones (the page, version.json, sw.js) are copied, so nothing
                       # that writes into neste/ can ever change an edition that has gone out


def _copy(src, dst):
    if os.path.getsize(src) >= LINK_MIN:
        try: os.link(src, dst); return dst
        except OSError: pass
    return shutil.copy2(src, dst)
V_RE = re.compile(r'^[0-9a-f]{8,40}$')


def P(*a): return os.path.join(SITE, *a)


def now(): return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def version_of(d):
    try: return json.load(open(os.path.join(d, 'version.json')))
    except Exception: return {}


def current():
    """The version the pointer shows, or '' when current/ is not a pointer (before omgjor)."""
    c = P('current')
    if not os.path.islink(c): return ''
    return os.path.basename(os.readlink(c).rstrip('/'))


def history():
    try: return [json.loads(l) for l in open(P('releases', 'HISTORY.jsonl')) if l.strip()]
    except FileNotFoundError: return []


def _log(entry):
    with open(P('releases', 'HISTORY.jsonl'), 'a') as f: f.write(json.dumps(entry) + '\n')


def point(v):
    """The pointer to releases/<v>, swapped in one step (symlink beside it, then rename over the old one)."""
    if not V_RE.match(v) or not os.path.isdir(P('releases', v)): raise ValueError('ingen utgave %s' % v)
    tmp = P('.current.%d' % os.getpid())
    if os.path.lexists(tmp): os.unlink(tmp)
    os.symlink(os.path.join('releases', v), tmp)
    os.replace(tmp, P('current'))


def previous():
    """The edition before the current one: the «fra» of the newest swap to it, if its folder is still there."""
    cur = current()
    for e in reversed(history()):
        if e.get('v') == cur and e.get('fra') and os.path.isdir(P('releases', e['fra'])): return e['fra']
    return ''


def prune():
    keep = {current(), previous()}
    for e in reversed(history()):
        if len(keep) >= KEEP + 2: break
        keep.add(e.get('v'))
    for d in os.listdir(P('releases')):
        if V_RE.match(d) and d not in keep and os.path.isdir(P('releases', d)): shutil.rmtree(P('releases', d), ignore_errors=True)


def publish(v, commit='', av='slipp'):
    """neste/ as releases/<v>, and the pointer to it. Returns the edition before."""
    if not V_RE.match(v or ''): raise ValueError('ikke en versjon: %r' % v)
    if not os.path.islink(P('current')): raise ValueError('current/ er ikke en peker ennå (setup.sh: utgave.py omgjor)')
    dest = P('releases', v)
    if not os.path.isdir(dest):
        meta = version_of(P('neste'))
        if meta.get('v') != v: raise ValueError('neste/ har versjon %r, ikke %s' % (meta.get('v'), v))
        if meta.get('ch'): raise ValueError('neste/ er et testbygg (ch=%s)' % meta.get('ch'))
        tmp = tempfile.mkdtemp(prefix='.ny-', dir=P('releases'))
        os.rmdir(tmp)
        shutil.copytree(P('neste'), tmp, copy_function=_copy, symlinks=True)   # hard links for the large files: an edition costs what changed
        os.rename(tmp, dest)
    fra = current()
    if fra == v: return fra
    point(v)
    _log({'v': v, 'commit': commit or '', 'at': now(), 'av': av, 'fra': fra})
    prune()
    return fra


def back(grunn='', av='tilbake'):
    """Back to the edition before. Returns (from, to)."""
    cur, prev = current(), previous()
    if not prev: raise ValueError('ingen utgave å gå tilbake til')
    point(prev)
    _log({'v': prev, 'commit': next((e.get('commit', '') for e in reversed(history()) if e.get('v') == prev), ''), 'at': now(), 'av': av, 'fra': cur,
          'grunn': (grunn or '')[:300]})
    return cur, prev


def migrate():
    """current/ as a folder (before fase 4) becomes releases/<v>, the pointer, and neste/ a copy to upload into."""
    os.makedirs(P('releases'), exist_ok=True)
    c = P('current')
    if os.path.islink(c): return 'allerede en peker: ' + current()
    v = version_of(c).get('v') or ''
    if not V_RE.match(v):
        v = '0' * 8 + datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S')   # a placeholder page, before the first upload
    if os.path.isdir(P('releases', v)): os.rename(c, c + '.gammel-' + now().replace(':', ''))
    else: os.rename(c, P('releases', v))
    os.symlink(os.path.join('releases', v), c)
    if not os.path.isdir(P('neste')): shutil.copytree(P('releases', v), P('neste'), copy_function=_copy, symlinks=True)
    _log({'v': v, 'commit': '', 'at': now(), 'av': 'omgjort', 'fra': ''})
    return 'omgjort: ' + v


def answer_question():
    q, res = {}, {}
    try:
        q = json.load(open(P('in', 'utgave')))
        fra = publish(q.get('versjon', ''), q.get('commit', ''), 'slipp')
        res = {'id': q.get('id', ''), 'ok': True, 'fra': fra, 'til': current(), 'hvorfor': ''}
    except Exception as e:
        res = {'id': q.get('id', ''), 'ok': False, 'fra': current(), 'til': current(), 'hvorfor': str(e)[:300]}
    os.makedirs(P('out'), exist_ok=True)
    tmp = P('out', '.utgave.json'); open(tmp, 'w').write(json.dumps(res) + '\n'); os.chmod(tmp, 0o644); os.replace(tmp, P('out', 'utgave.json'))
    print(json.dumps(res))
    return 0


def selftest():
    global SITE
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    old, SITE = SITE, tempfile.mkdtemp(prefix='utgave-')
    try:
        def build(v, extra=''):
            os.makedirs(P('neste'), exist_ok=True)
            json.dump({'v': v, 'at': now()}, open(P('neste', 'version.json'), 'w'))
            open(P('neste', 'index.html'), 'w').write('<p>%s%s</p>' % (v, extra))
            if not os.path.exists(P('neste', 'stor.bin')): open(P('neste', 'stor.bin'), 'w').write('x' * (LINK_MIN + 10))   # unchanged between editions
        os.makedirs(P('current')); json.dump({'v': 'aaaaaaaa0001'}, open(P('current', 'version.json'), 'w')); open(P('current', 'index.html'), 'w').write('gammel')
        open(P('current', 'stor.bin'), 'w').write('x' * (LINK_MIN + 10))
        eq('omgjør', migrate(), 'omgjort: aaaaaaaa0001')
        eq('pekeren', (os.path.islink(P('current')), current(), open(P('current', 'index.html')).read()), (True, 'aaaaaaaa0001', 'gammel'))
        eq('omgjør igjen', migrate(), 'allerede en peker: aaaaaaaa0001')
        build('bbbbbbbb0002')
        eq('slipp', publish('bbbbbbbb0002', 'c2'), 'aaaaaaaa0001')
        eq('ny side', open(P('current', 'index.html')).read(), '<p>bbbbbbbb0002</p>')
        eq('harde lenker', os.stat(P('releases', 'bbbbbbbb0002', 'stor.bin')).st_ino == os.stat(P('neste', 'stor.bin')).st_ino, True)
        build('cccccccc0003', ' ny')
        eq('neste endret rører ikke utgaven', open(P('releases', 'bbbbbbbb0002', 'index.html')).read(), '<p>bbbbbbbb0002</p>')
        try: publish('dddddddd0004'); bad.append('feil versjon ble sluppet')
        except ValueError: pass
        eq('feil versjon står', current(), 'bbbbbbbb0002')
        publish('cccccccc0003', 'c3')
        eq('forrige', previous(), 'bbbbbbbb0002')
        eq('tilbake', back('prøve', 'nodbrems'), ('cccccccc0003', 'bbbbbbbb0002'))
        eq('etter tilbake', (current(), open(P('current', 'index.html')).read(), history()[-1]['av'], history()[-1]['commit']), ('bbbbbbbb0002', '<p>bbbbbbbb0002</p>', 'nodbrems', 'c2'))
        json.dump({'v': 'eeeeeeee0005', 'ch': 'test'}, open(P('neste', 'version.json'), 'w'))
        try: publish('eeeeeeee0005'); bad.append('et testbygg ble sluppet')
        except ValueError: pass
        for i in range(10):
            build('f%011d' % i); publish('f%011d' % i)
        dirs = sorted(d for d in os.listdir(P('releases')) if V_RE.match(d))
        eq('ryddet', len(dirs) <= KEEP + 2 and current() in dirs and previous() in dirs, True)
        os.makedirs(P('in'), exist_ok=True); build('abcdef012345')
        json.dump({'id': 'q1', 'versjon': 'abcdef012345', 'commit': 'c9'}, open(P('in', 'utgave'), 'w')); answer_question()
        r = json.load(open(P('out', 'utgave.json')))
        eq('spørsmålet', (r['id'], r['ok'], r['til']), ('q1', True, 'abcdef012345'))
        json.dump({'id': 'q2', 'versjon': '../../etc'}, open(P('in', 'utgave'), 'w')); answer_question()
        r = json.load(open(P('out', 'utgave.json')))
        eq('stier nektes', (r['id'], r['ok'], r['til']), ('q2', False, 'abcdef012345'))
    finally:
        shutil.rmtree(SITE, ignore_errors=True); SITE = old
    for b in bad: print('FEIL ' + b)
    print('OK utgave selftest' if not bad else 'FEIL utgave selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    a = sys.argv[1:]
    if a == ['--selftest']: return selftest()
    if a == ['bytt']: return answer_question()
    if a == ['status']:
        print('nå: %s, før: %s' % (current() or '(ingen peker)', previous() or '-'))
        for e in history()[-8:]: print('  %s %s %s fra %s %s' % (e.get('at'), e.get('av'), e.get('v'), e.get('fra') or '-', e.get('grunn', '')))
        return 0
    if a == ['omgjor']: print(migrate()); return 0
    if a[:1] == ['tilbake']:
        g = a[2] if len(a) > 2 and a[1] == '--grunn' else 'for hånd'
        print('tilbake: %s -> %s' % back(g)); return 0
    print(__doc__); return 2


if __name__ == '__main__':
    sys.exit(main())
