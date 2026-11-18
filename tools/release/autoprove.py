#!/usr/bin/env python3
"""The build that is about to go to the players, tried where it is served (live-drift fase 4, 18.11.2026; Jonas: «Verifisering av nøyaktig
det bygget som skal ut (main + rettingen) på test.detstorebla.no/auto/ inkludert oppstartstest og den nye testen før produksjon endres»).

.github/workflows/autofix.yml uploads the build of slipp/auto-<PR> (main + the fix, built as for the production) to /srv/detstorebla/auto,
then runs this against https://test.detstorebla.no/auto/:

1. version.json there is the build's own (the files reached what is served, through Caddy, compressed as the players get them);
2. the game starts from that address as a player's would: the first screen, «Start», the map in (SIMREADY), the clock stepping (within
   60 s), and no page error. It opens with #nocloud, so it calls nothing in the database but the shared clock's time (sp_now, a read),
   and with the tests' seed and calm off.

The fix's own tests and the boot test run on the same bytes in the workflow (KYST_DIST=dist-pwa python3 tests/run.py smoke …).
Prints OK or FEIL lines (as the tests do) and exits 0 when all hold, 1 when not.

    python3 tools/release/autoprove.py https://test.detstorebla.no/auto/ dist-pwa/version.json
"""
import asyncio, json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tests'))


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:300]) if extra != '' else ''), flush=True)
    return ok


def served_version(base, tries=24):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(base + 'version.json?t=%d' % time.time(), headers={'User-Agent': 'autoprove', 'Cache-Control': 'no-cache'}), timeout=15) as r:
                return json.load(r)
        except Exception: time.sleep(5)
    return {}


async def start(base):
    from playwright.async_api import async_playwright
    from _env import boot
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 900, 'height': 700}); errs = []; calls = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        # the shared clock's time (sp_now, a read of the server's time and nothing else) is the one call to the database a game with
        # #nocloud still makes; any other would be a fault here
        pg.on('request', lambda r: calls.append(r.url) if 'supabase' in r.url and not r.url.endswith('/rpc/sp_now') else None)
        await boot(pg, base + 'index.html#qfix,seed=1,ro0#notut,nocloud')
        await pg.wait_for_function('SIMREADY === true', timeout=90000)
        t0 = await pg.evaluate('S.t')
        try: await pg.wait_for_function('S.t !== %s' % json.dumps(t0), timeout=60000, polling=1000)
        except Exception: pass
        t1 = await pg.evaluate('S.t')
        ver = await pg.evaluate("(document.querySelector('meta[name=dsb-version]') || {}).content || ''")
        await br.close()
        return {'t0': t0, 't1': t1, 'errs': errs[:3], 'db': calls[:3], 'meta': ver}


def main():
    if len(sys.argv) < 3: print(__doc__); return 2
    base = sys.argv[1].rstrip('/') + '/'
    want = json.load(open(sys.argv[2]))
    got = served_version(base)
    ok = check(got.get('v') == want.get('v') and not got.get('ch'), 'the address serves the build that goes out', {'served': got, 'built': want})
    if ok:
        r = asyncio.run(start(base))
        ok &= check(r['t1'] > r['t0'] and not r['errs'], 'the game starts from that address and its clock steps, with no page error', r)
        ok &= check(r['meta'] == want.get('v'), 'the page is the build that goes out (its dsb-version)', r['meta'])
        ok &= check(not r['db'], 'it called nothing in the database but the clock\'s time (#nocloud)', r['db'])
    print('AUTO HOLDER' if ok else 'AUTO STOPPET')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
