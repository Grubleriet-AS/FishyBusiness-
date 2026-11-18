#!/usr/bin/env python3
"""The emergency brake on the game's server (live-drift fase 4, 18.11.2026; Jonas: «Automatisk nødbrems i servervakta som overvåker
telemetrien i 2 timer etter hvert slipp, ruller tilbake til forrige utgavemappe hvis feilraten passerer tersklene, setter på sperrefil mot
nye automatiske slipp, varsler meg via ntfy, og lar neste kjøring av «Driften» åpne en reverserings-PR»).

Run once a minute by dsb-brems.timer (tools/server/setup.sh) as the upload user, with the watch's settings (/etc/dsb-vakt.env: SUPA_URL,
SUPA_KEY, NTFY_TOPIC, NTFY_URL). Within VINDU_T hours of a release (the newest swap in releases/HISTORY.jsonl by «slipp»), it asks the
database for the counts (supabase/migrations/20261118210000_brems_tall.sql, the publishable key: counts only) for the new edition since it
went out and the one before over the day before that, and decides (vurder):

- a severe fault is a crash, a black or one-coloured 3D picture, or NaN in the camera or the boat (the sessions it hit are counted);
- it waits until the new edition has MIN_OKTER sessions, or VENT_MIN minutes have gone and it has MIN_OKTER_SENT;
- it pulls when the sessions with a severe fault are at least MIN_ALVORLIGE and their share is more than FAKTOR × the edition before
  (at least GULV), or when a severe message the edition before did not have, has hit NY_SIGN sessions.

The numbers are starting values (CLAUDE.md: tallene er startverdier). When it pulls:
1. writes nodbrems.json into the edition before (so https://detstorebla.no/nodbrems.json answers once the pointer is back): from, to,
   the commits, why, the numbers. That file is the lock against automatic releases (autofix.yml, slipp.py --auto, slipp.yml), and Driften
   reads it to open the revert PR (tools/triage/brems.py). A new release, which Jonas starts himself, makes a new edition without it;
   by hand on the server: rm /srv/detstorebla/releases/<v>/nodbrems.json;
2. swaps the pointer back (utgave.back, one rename);
3. pushes to Jonas' phone through ntfy.sh;
4. writes in status/brems.json that this edition is done, so it pulls once.

    python3 brems.py            what the timer runs
    python3 brems.py --selftest the checks of vurder() and the pull, on made-up numbers and a folder of its own
"""
import datetime, json, os, sys, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..'))
import utgave

VINDU_T = 2
MIN_OKTER, VENT_MIN, MIN_OKTER_SENT = 20, 30, 8
MIN_ALVORLIGE, FAKTOR, GULV = 5, 2.0, 0.01
NY_SIGN = 3


def iso(t): return t.strftime('%Y-%m-%dT%H:%M:%SZ')


def ts(s):
    try: return datetime.datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    except Exception: return None


def vurder(tall, minutter):
    """(pull, why) from brems_tall's numbers and the minutes since the release."""
    ny, gml = tall.get('ny') or {}, tall.get('gml') or {}
    n, bad = int(ny.get('okter') or 0), int(ny.get('alvorlige') or 0)
    if n < MIN_OKTER and not (minutter >= VENT_MIN and n >= MIN_OKTER_SENT): return False, 'venter på økter (%d)' % n
    rate = bad / max(n, 1)
    base = max(int(gml.get('alvorlige') or 0) / max(int(gml.get('okter') or 0), 1), GULV)
    if bad >= MIN_ALVORLIGE and rate > FAKTOR * base:
        return True, '%d av %d økter med alvorlig feil (%.1f %%), mot %.1f %% i utgaven før' % (bad, n, rate * 100, base * 100)
    old = {x.get('melding') for x in gml.get('signaturer') or []}
    for x in ny.get('signaturer') or []:
        if x.get('melding') not in old and int(x.get('okter') or 0) >= NY_SIGN:
            return True, 'ny alvorlig feil i %d økter: %s' % (x['okter'], str(x['melding'])[:100])
    return False, '%d av %d økter med alvorlig feil (%.1f %%), utgaven før %.1f %%' % (bad, n, rate * 100, base * 100)


def numbers(ny, gml, siden):
    url = os.environ['SUPA_URL'].rstrip('/') + '/rest/v1/rpc/brems_tall'
    key = os.environ['SUPA_KEY']
    body = json.dumps({'ny': ny, 'gml': gml, 'siden': iso(siden), 'gml_fra': iso(siden - datetime.timedelta(hours=24))}).encode()
    req = urllib.request.Request(url, data=body, method='POST', headers={'apikey': key, 'Content-Type': 'application/json',
                                                                          **({'Authorization': 'Bearer ' + key} if key.startswith('eyJ') else {})})
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)


def push(title, msg):
    topic = os.environ.get('NTFY_TOPIC', '')
    if not topic: return False
    req = urllib.request.Request(os.environ.get('NTFY_URL', 'https://ntfy.sh').rstrip('/') + '/' + topic, data=msg.encode('utf-8'), method='POST',
                                 headers={'Title': title.encode('utf-8').decode('latin-1', 'replace'), 'Priority': 'urgent', 'Tags': 'rotating_light'})
    try:
        urllib.request.urlopen(req, timeout=20).read(); return True
    except Exception: return False


def state():
    try: return json.load(open(utgave.P('status', 'brems.json')))
    except Exception: return {}


def save_state(s):
    os.makedirs(utgave.P('status'), exist_ok=True)
    tmp = utgave.P('status', '.brems.json'); open(tmp, 'w').write(json.dumps(s)); os.replace(tmp, utgave.P('status', 'brems.json'))


def pull(cur, prev, entry, why, tall):
    """The brake: the lock file into the edition before, the pointer back, the push."""
    commit_til = next((e.get('commit', '') for e in reversed(utgave.history()) if e.get('v') == prev and e.get('commit')), '')
    lock = {'aktiv': True, 'at': iso(datetime.datetime.now(datetime.timezone.utc)), 'fra': cur, 'til': prev, 'commit_fra': entry.get('commit', ''),
            'commit_til': commit_til, 'grunn': why, 'tall': tall}
    p = utgave.P('releases', prev, 'nodbrems.json'); tmp = p + '.tmp'
    open(tmp, 'w').write(json.dumps(lock, ensure_ascii=False, indent=1)); os.chmod(tmp, 0o644); os.replace(tmp, p)
    utgave.back(why, 'nodbrems')
    sent = push('Nødbremsen: detstorebla.no rullet tilbake',
                'Slippet %s ble rullet tilbake til %s: %s. Nye automatiske slipp er sperret til du slipper selv. Driften åpner en PR som reverserer det.' % (cur, prev, why))
    return lock, sent


def run(now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    h = utgave.history()
    if not h: return 'ingen historikk'
    e = h[-1]; cur = utgave.current()
    if e.get('v') != cur: return 'pekeren og historikken er ulike (%s, %s)' % (cur, e.get('v'))
    if e.get('av') != 'slipp': return 'siste bytte var %s, ikke et slipp' % e.get('av')
    t0 = ts(e.get('at'))
    if not t0 or (now - t0).total_seconds() > VINDU_T * 3600: return 'utenfor vinduet'
    prev = e.get('fra') or ''
    if not prev or not os.path.isdir(utgave.P('releases', prev)): return 'ingen utgave å gå tilbake til'
    st = state()
    if st.get(cur, {}).get('trukket'): return 'alt trukket for %s' % cur
    tall = numbers(cur, prev, t0)
    pull_it, why = vurder(tall, (now - t0).total_seconds() / 60)
    st[cur] = {'sist': iso(now), 'vurdering': why, 'trukket': pull_it}
    if pull_it:
        lock, sent = pull(cur, prev, e, why, tall)
        st[cur]['varslet'] = sent
    save_state(st)
    return ('TRUKKET: ' if pull_it else 'ok: ') + why


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    T = lambda n, a, sig=(): {'okter': n, 'alvorlige': a, 'signaturer': [{'melding': m, 'okter': k} for m, k in sig]}
    eq('for få økter', vurder({'ny': T(5, 5), 'gml': T(100, 1)}, 10)[0], False)
    eq('få økter, men lenge nok', vurder({'ny': T(10, 6), 'gml': T(100, 1)}, 40)[0], True)
    eq('dobbelt så mange krasj', vurder({'ny': T(50, 6), 'gml': T(200, 4)}, 20)[0], True)
    eq('like mange som før', vurder({'ny': T(50, 6), 'gml': T(200, 22)}, 20)[0], False)
    eq('under fem alvorlige', vurder({'ny': T(50, 4), 'gml': T(200, 0)}, 20)[0], False)
    eq('gulvet: null før', vurder({'ny': T(500, 5), 'gml': T(200, 0)}, 20)[0], False)
    eq('ny alvorlig melding', vurder({'ny': T(60, 3, [('3D svart skjerm på dagtid', 3)]), 'gml': T(200, 4, [('Krasj: x', 4)])}, 20)[0], True)
    eq('kjent melding', vurder({'ny': T(60, 3, [('Krasj: x', 3)]), 'gml': T(200, 4, [('Krasj: x', 4)])}, 20)[0], False)
    eq('ingen tall', vurder({}, 200)[0], False)
    # the pull, in a folder of its own: a release, the brake, the lock file in the edition before, the pointer back, once
    old = utgave.SITE; utgave.SITE = tempfile.mkdtemp(prefix='brems-')
    global numbers, push
    real_numbers, real_push = numbers, push
    try:
        P = utgave.P
        def build(v):
            os.makedirs(P('neste'), exist_ok=True); json.dump({'v': v}, open(P('neste', 'version.json'), 'w')); open(P('neste', 'index.html'), 'w').write(v)
        os.makedirs(P('current')); json.dump({'v': 'aaaaaaaa0001'}, open(P('current', 'version.json'), 'w')); utgave.migrate()
        build('bbbbbbbb0002'); utgave.publish('bbbbbbbb0002', 'cb2', 'slipp')
        build('cccccccc0003'); utgave.publish('cccccccc0003', 'cc3', 'slipp')
        sent = []
        push = lambda t, m: sent.append(m) or True
        numbers = lambda ny, gml, siden: {'ny': T(40, 8), 'gml': T(300, 3)}
        r = run()
        eq('trekker', r.startswith('TRUKKET'), True)
        lock = json.load(open(P('current', 'nodbrems.json')))
        eq('tilbake og sperre', (utgave.current(), lock['fra'], lock['til'], lock['commit_fra'], lock['commit_til'], len(sent)),
           ('bbbbbbbb0002', 'cccccccc0003', 'bbbbbbbb0002', 'cc3', 'cb2', 1))
        eq('ikke to ganger', run().startswith('siste bytte var nodbrems'), True)
        build('dddddddd0004'); utgave.publish('dddddddd0004', 'cd4', 'slipp')
        eq('ny utgave har ingen sperre', os.path.exists(P('current', 'nodbrems.json')), False)
        numbers = lambda ny, gml, siden: {'ny': T(40, 1), 'gml': T(300, 3)}
        eq('holder', run().startswith('ok:'), True)
        later = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=3)
        eq('etter to timer', run(later), 'utenfor vinduet')
    finally:
        import shutil; shutil.rmtree(utgave.SITE, ignore_errors=True); utgave.SITE = old
        numbers, push = real_numbers, real_push
    for b in bad: print('FEIL ' + b)
    print('OK brems selftest' if not bad else 'FEIL brems selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    if sys.argv[1:] == ['--selftest']: return selftest()
    try: print(run())
    except Exception as e: print('FEIL i brems.py: %s' % str(e)[:300]); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
