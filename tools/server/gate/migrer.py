#!/usr/bin/env python3
"""The production migrations, run from the gate's server in the release (live-drift fase 3, 18.11.2026; Jonas: «Kjør
produksjonsmigreringene fra Hetzner-serveren i selve slippet»).

The release job (.github/workflows/slipp.yml, «migreringer: hetzner») uploads a question to /srv/dsb-gate/in/migrer: {"id", "commit"}.
That starts dsb-migrer.service (tools/server/gate/setup.sh), which runs this as the gate's user with the database URL from
/etc/dsb-migrer.env (root only; never at GitHub). It takes nothing but the commit from the question:

1. The commit must be on the working branch (GitHub's compare: the branch is at it or past it), so only what has passed a merge can run.
2. The migrations are the files under supabase/migrations/ that the commit adds or changes compared with main (what the release brings),
   fetched from GitHub at that commit, in name order. Never SQL from the upload.
3. Each must be `ok` by the static check installed here from the repository (/opt/dsb-gate/migsjekk.py, tools/ci/migsjekk.py): only
   expansion, safe to run twice. One that is `jonas` or `stopp` stops it all before anything runs: Jonas runs that one by hand.
4. Each runs in its own transaction (psql --single-transaction, ON_ERROR_STOP), and is written to supabase_migrations.schema_migrations
   with its file name, as apply_migration does. The first that fails stops the rest; those before it stay (expansion only).

The answer goes to /srv/dsb-gate/out/migrer.json ({"id", "ok", "kjort", "hvorfor"}) and the log to out/migrer-log.txt: file names and
psql's errors, never data. Exits 0 always (the answer is in the file); 2 on a fault of its own.

    python3 migrer.py run          what the service runs
    python3 migrer.py --dry COMMIT  which files a release of COMMIT would run, and the check's answer, without the database
    python3 migrer.py --lokal FILE…  the same check and run for files in a checkout, with SUPABASE_DB_URL from the environment: what
                                    .github/workflows/migreringer.yml does on the test project (exits 1 when it stops)
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.error, urllib.request

REPO = 'average01101010/FishyBusiness-'
WORK, PROD = 'ccr-5e1ba2f4-pusvyd', 'main'
SITE = os.environ.get('DSB_GATE_SITE', '/srv/dsb-gate')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', '..', 'ci'))
import migsjekk   # /opt/dsb-gate/migsjekk.py on the server, tools/ci/migsjekk.py in a checkout

LOG = []


def log(s):
    LOG.append(s); print(s, flush=True)


def get(url, raw=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'dsb-migrer', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        b = r.read()
    return b.decode('utf-8') if raw else json.loads(b)


def plan(commit):
    """(files [(path, sql)], why) for a release of commit: the migrations it adds or changes against main."""
    if not re.fullmatch(r'[0-9a-f]{40}', commit or ''): return None, 'ikke en hel commit: %r' % commit
    try: on = get('https://api.github.com/repos/%s/compare/%s...%s' % (REPO, WORK, commit))
    except urllib.error.HTTPError as e: return None, 'GitHub kjenner ikke commiten (%d)' % e.code
    if on.get('status') not in ('identical', 'behind'): return None, 'commiten ligger ikke på %s (%s)' % (WORK, on.get('status'))
    cmp = get('https://api.github.com/repos/%s/compare/%s...%s' % (REPO, PROD, commit))
    paths = sorted(f['filename'] for f in cmp.get('files') or [] if f['filename'].startswith('supabase/migrations/')
                   and f['filename'].endswith('.sql') and f.get('status') in ('added', 'modified', 'renamed'))
    files = [(p, get('https://raw.githubusercontent.com/%s/%s/%s' % (REPO, commit, p), raw=True)) for p in paths]
    return files, ''


def run(commit, db):
    files, why = plan(commit)
    if files is None: return False, [], why
    if not files: return True, [], 'ingen migreringer i slippet'
    return apply(files, db)


def apply(files, db):
    """Check every file, then run them in order: (ok, run, why)."""
    bad = []
    for p, sql in files:
        r = migsjekk.check_text(sql, p)
        log('%-5s %s' % (r['svar'].upper(), p))
        for a, w, _s in r['funn']: log('      %s: %s' % (a, w))
        if r['svar'] != migsjekk.OK: bad.append('%s er «%s»' % (os.path.basename(p), r['svar']))
    if bad: return False, [], 'den statiske sjekken: ' + '; '.join(bad) + '. Jonas kjører den for hånd og starter slippet med «kjørt».'
    if not db: return False, [], 'SUPABASE_DB_URL mangler (på serveren: /etc/dsb-migrer.env; i Actions: hemmeligheten SUPABASE_TEST_DB_URL)'
    done = []
    for p, sql in files:
        name = os.path.basename(p)[:-4]
        with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False, encoding='utf-8') as t: t.write(sql); tmp = t.name
        try:
            r = subprocess.run(['psql', db, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', tmp], capture_output=True, text=True, timeout=600)
        finally: os.unlink(tmp)
        if r.returncode:
            log('FEIL  %s: %s' % (name, (r.stderr or r.stdout).strip()[-800:]))
            return False, done, 'migreringen %s feilet (se loggen); de før den er kjørt' % name
        stamp = time.strftime('%Y%m%d%H%M%S', time.gmtime())
        rec = subprocess.run(['psql', db, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c',
                              "insert into supabase_migrations.schema_migrations (version, name) select '%s', '%s' "
                              "where not exists (select 1 from supabase_migrations.schema_migrations where name = '%s')" % (stamp, name, name)],
                             capture_output=True, text=True, timeout=60)
        log('KJØRT %s%s' % (name, '' if rec.returncode == 0 else ' (ikke ført i schema_migrations: %s)' % rec.stderr.strip()[-200:]))
        done.append(name); time.sleep(1.1)   # one second apart: the version is the time
    return True, done, ''


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--lokal':
        files = [(f, open(f, encoding='utf-8').read()) for f in sorted(sys.argv[2:])]
        if not files: print('ingen migreringer'); return 0
        ok, done, why = apply(files, os.environ.get('SUPABASE_DB_URL', ''))
        print(('GÅ' if ok else 'STOPP') + (': ' + why if why else '') + (' (kjørt: %s)' % ', '.join(done) if done else ''))
        return 0 if ok else 1
    if len(sys.argv) > 2 and sys.argv[1] == '--dry':
        files, why = plan(sys.argv[2])
        if files is None: print('NEI: ' + why); return 0
        for p, sql in files: print('%-5s %s' % (migsjekk.check_text(sql, p)['svar'].upper(), p))
        if not files: print('ingen migreringer')
        return 0
    if sys.argv[1:] != ['run']: print(__doc__); return 2
    ask = os.path.join(SITE, 'in', 'migrer'); out = os.path.join(SITE, 'out')
    q = {}
    try: q = json.load(open(ask))
    except Exception as e: log('spørsmålet kunne ikke leses: %s' % e)
    try: ok, done, why = run(q.get('commit', ''), os.environ.get('SUPABASE_DB_URL', ''))
    except Exception as e: ok, done, why = False, [], 'feil i migrer.py: %s' % str(e)[:300]
    log(('GÅ' if ok else 'STOPP') + (': ' + why if why else '') + (' (kjørt: %s)' % ', '.join(done) if done else ''))
    res = {'id': q.get('id', ''), 'ok': ok, 'kjort': done, 'hvorfor': why, 'commit': q.get('commit', '')}
    for name, body in (('migrer-log.txt', '\n'.join(LOG) + '\n'), ('migrer.json', json.dumps(res, ensure_ascii=False) + '\n')):   # the answer last
        tmp = os.path.join(out, '.' + name); open(tmp, 'w', encoding='utf-8').write(body); os.chmod(tmp, 0o644); os.replace(tmp, os.path.join(out, name))
    return 0


if __name__ == '__main__':
    try: sys.exit(main())
    except Exception as e: print('FEIL i migrer.py:', e); sys.exit(2)
