"""The sea's try that never came back, in the error list (klynge:46fd07ca, 20.11.2026-): a load that finds the last load's try mark
(dsb_sea_try) still there tries the same level again, and only the second in a row steps the sea down (seatrytest.py). The first one is
what an iPhone leaves when the page is ended while 3D starts; the next start comes through, so it is not an error and is not sent as one.
The second in a row still is (the level down, with the GPU). Prints OK or FEIL per check."""
import asyncio, json
from _env import GAME3D_MIN, boot
from playwright.async_api import async_playwright

# every cloudErr the page makes, kept before the cloud is asked (the tests have no cloud, and cloudErr stops there)
TRAP = """document.addEventListener('DOMContentLoaded', () => { window.__errs = []; const f = window.cloudErr;
  if (typeof f === 'function') window.cloudErr = function(msg){ window.__errs.push(String(msg)); return f.apply(this, arguments); }; });"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 900, 'height': 600}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(TRAP)
        SITE = GAME3D_MIN.split('#')[0].rsplit('/', 1)[0] + '/kilder.html'
        KEYS = "['dsb_sea', 'dsb_sea_try', 'dsb_sea_gone', 'dsb_sea_ok', 'dsb_sea_mid', 'dsb_sea_midtry', 'dsb_sea_midgone', 'dsb_sea_re'].forEach(k => localStorage.removeItem(k))"
        READ = "({sea:localStorage.getItem('dsb_sea'), tryLeft:localStorage.getItem('dsb_sea_try'), gone:localStorage.getItem('dsb_sea_gone'), lvl:G3._debug.seaLvl, why:G3.failWhy || '', errs:window.__errs || null})"
        booted = []
        async def load(setup):
            await pg.goto(SITE); await pg.evaluate(KEYS); await pg.evaluate(setup); await pg.goto('about:blank')
            if booted: pg.set_default_timeout(120000); await pg.goto(GAME3D_MIN)
            else: await boot(pg, GAME3D_MIN); booted.append(1)
            await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive()", timeout=120000); await pg.wait_for_timeout(1500)
            return await pg.evaluate(READ)
        # the last load's try of the full sea never came back (a page from a minute ago): tried again, and it comes through
        once = await load("localStorage.setItem('dsb_sea_try', '0:x1:' + (Date.now() - 60000))")
        # the second in a row: a level down, and that is sent
        twice = await load("localStorage.setItem('dsb_sea_try', '0:x1:' + (Date.now() - 60000)); localStorage.setItem('dsb_sea_gone', '1')")
        print(json.dumps({'once': once, 'twice': twice, 'errs': errs[:3]}, ensure_ascii=False))
        gone = lambda r: [m for m in (r['errs'] or []) if 'kom ikke tilbake' in m or 'ikke kom tilbake' in m]
        print(('OK  ' if once['errs'] is not None and twice['errs'] is not None else 'FEIL') + ' the trap saw the page\'s cloudErr')
        print(('OK  ' if once['lvl'] == 0 and once['sea'] is None and once['tryLeft'] is None and once['gone'] is None and not once['why'] else 'FEIL') + ' one try that never came back: the full sea again, it comes through, and the marks are cleared')
        print(('OK  ' if not gone(once) else 'FEIL') + ' a try that never came back once, with the next start coming through, is not sent as an error  ' + json.dumps(gone(once), ensure_ascii=False))
        print(('OK  ' if twice['lvl'] == 1 and twice['sea'] == '1' and any('etter et forsøk som ikke kom tilbake' in m for m in twice['errs'] or []) else 'FEIL') + ' the second in a row: a level down, and that is sent')
        print(('OK  ' if not errs else 'FEIL') + ' no page errors')
        await br.close()
asyncio.run(main())
