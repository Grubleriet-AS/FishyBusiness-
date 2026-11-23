"""The map's manifest that does not come at the first try (klynge:a9611bd1, 23.11.2026): Safari on iOS says «Load failed» for a fetch
that the network drops (a phone that switches between Wi-Fi and the mobile net as the app opens), and the start stopped at once with
«Spillet startet ikke» and «boot: Load failed», where the packs and the data files are asked for again (core/01b-mapdata.js mapStart).
Here the first two requests for map/manifest.json fail as a dropped connection; the game shall start all the same, without the
error dialog. Prints OK or FEIL."""
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright

bad = []
def check(c, msg, d=None):
    print(('OK   ' if c else 'FEIL ') + msg, '' if c else json.dumps(d, ensure_ascii=False, default=str)[:500])
    if not c: bad.append(msg)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width':1280, 'height':800})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        n = {'man':0}
        async def drop(route):
            n['man'] += 1
            if n['man'] <= 2: await route.abort('failed')
            else: await route.continue_()
        await pg.route('**/map/manifest.json', drop)
        ok = True
        try: await boot(pg, GAME)
        except Exception as e: ok = False; print('   boot:', str(e).splitlines()[0][:200])
        st = await pg.evaluate("""() => ({ready:typeof SIMREADY !== 'undefined' && SIMREADY === true, intro:typeof S !== 'undefined' && !!S && S.intro === true,
          fail:/Spillet startet ikke|The game did not start/.test((document.getElementById('modal') || {}).textContent || ''), man:!!(MAPD && MAPD.man)})""")
        check(n['man'] >= 3, 'manifestet ble spurt om igjen etter to brutte forsøk (%d forespørsler)' % n['man'], n)
        check(ok and st['ready'] and st['intro'] and st['man'], 'spillet startet likevel', st)
        check(not st['fail'], 'ingen «Spillet startet ikke»', st)
        print('sidefeil:', errs)
        await br.close()
    print('ALT OK' if not bad else 'FEIL: ' + '; '.join(bad))

asyncio.run(main())
