"""A page hidden or closed while it makes the sea is not a try that never came back (klynge:46fd07ca, 20.11.2026, view3d/18-setup.js
seaAway): iPhones reported «3D sjønivå 0: et forsøk kom ikke tilbake (1 av 2)» many times a day, almost never the second in a row, as
iOS ends pages in the background and the game reloads itself for a new version. The sea's try mark (dsb_sea_try) must be taken down
when the page is hidden or leaves (pagehide) during the try, and put back when it is seen again with the try still under way.
The test catches the moment the mark is first written, and at once sends pagehide, then pageshow, and reads the mark after each.
Prints OK or FEIL per check."""
import asyncio, json
from _env import GAME3D_MIN, boot
from playwright.async_api import async_playwright
HOOK = """(() => { const set = Storage.prototype.setItem; window.__sea = {};
  Storage.prototype.setItem = function(k, v){ set.call(this, k, v);
    if (k === 'dsb_sea_try' && !window.__sea.hit){ window.__sea.hit = 1;
      setTimeout(() => { const g = () => localStorage.getItem('dsb_sea_try');
        window.dispatchEvent(new Event('pagehide')); window.__sea.afterHide = g();
        window.dispatchEvent(new Event('pageshow')); window.__sea.afterShow = g(); }, 0); } }; })()"""
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 900, 'height': 600}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.add_init_script(HOOK)
        await boot(pg, GAME3D_MIN)
        await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive()", timeout=120000); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("Object.assign({left:localStorage.getItem('dsb_sea_try'), gone:localStorage.getItem('dsb_sea_gone'), lvl:G3._debug.seaLvl}, window.__sea)")
        print(json.dumps(dict(r, errs=errs[:3])))
        print(('OK  ' if r.get('hit') else 'FEIL') + ' the try mark was written while the sea was made')
        print(('OK  ' if r.get('hit') and r.get('afterHide') is None else 'FEIL') + ' a page that leaves (pagehide) during the try takes its mark down: not read as a crash at the next start')
        print(('OK  ' if r.get('afterShow') else 'FEIL') + ' seen again with the try under way (pageshow), the mark is back')
        print(('OK  ' if r['left'] is None and r['gone'] is None and r['lvl'] == 0 and not errs else 'FEIL') + ' the sea came through: no mark left, full sea, no page errors')
        await br.close()
asyncio.run(main())
