# The pub's WebGL context lost and given back (ui/09b-pub.js, klynge:b26b3468): on phones the browser takes a context back when the
# page is hidden or the GPU is short of memory, and gives it back after. That is normal: no console error, no page error when the room
# is tapped while it is gone, the room built again when it comes back with the pub open, and the pub in 3D again (not the flat wheel for
# the rest of the session) when it is opened after a loss while it was closed.
import asyncio, json
from playwright.async_api import async_playwright
from _env import *
ok = lambda c: 'OK  ' if c else 'FEIL'

async def tap(pg, x, y):
    s = await pg.context.new_cdp_session(pg)
    await s.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    await s.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

LOSE = "(() => { const x = document.querySelector('#pub3 canvas').getContext('webgl').getExtension('WEBGL_lose_context'); window._pubLC = x; x.loseContext(); })()"
BACK = "window._pubLC.restoreContext()"
OPEN = "doAct({dataset:{act:'pub'}, disabled:false})"
STATE = "JSON.stringify({on:PUB3.isOpen(), a:!!PUB3.anchors, flat:!document.getElementById('pubUI').hidden})"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-compositing'])
        ctx = await b.new_context(viewport={'width': 1000, 'height': 640}, has_touch=True); pg = await ctx.new_page(); errs = []; cons = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' and 'pub 3d' in m.text else None)
        await boot(pg, GAME3D_MIN)
        await pg.evaluate("""(() => { S.tut = 0; S.cash = 50000;
          S.t = Math.round((Date.UTC(2027, 2, 3, 19) - EPOCH) / 6e4); const q = portById(S.boat.port) || PORTS.find(x => x.mottak); S.boat.status = 'port'; S.boat.port = q.id; S.boat.pos = {...q.p}; renderActs(); })()""")
        await pg.wait_for_function("typeof MODELS === 'undefined' || MODELS.done", timeout=120000)
        await pg.evaluate(OPEN); await pg.wait_for_timeout(2500)
        st = json.loads(await pg.evaluate(STATE))
        print(ok(st['on'] and st['a']), 'puben åpner i 3D', st)
        # lost with the pub open: no error in the console, and a tap on the room while it is gone is no page error
        await pg.evaluate(LOSE); await pg.wait_for_timeout(500)
        await tap(pg, 500, 380); await pg.wait_for_timeout(400)
        print(ok(not cons), 'et tap av konteksten er ingen feil i konsollen', cons)
        print(ok(not errs), 'trykk i puben mens konteksten er borte gir ingen sidefeil', errs[:2])
        # given back with the pub open: the room is built again
        await pg.evaluate(BACK); await pg.wait_for_timeout(1500)
        st = json.loads(await pg.evaluate(STATE))
        print(ok(st['on'] and st['a']), 'rommet bygges igjen når konteksten kommer tilbake', st)
        # lost with the pub closed, opened before it is back, then opened again after: the 3D room, not the flat wheel for good
        await pg.evaluate("PUB3.close()"); await pg.wait_for_timeout(300)
        await pg.evaluate(LOSE); await pg.wait_for_timeout(500)
        await pg.evaluate(OPEN); await pg.wait_for_timeout(800)
        await pg.evaluate("PUB3.close(); document.getElementById('pubUI').hidden = true"); await pg.wait_for_timeout(300)
        await pg.evaluate(BACK); await pg.wait_for_timeout(1000)
        await pg.evaluate(OPEN); await pg.wait_for_timeout(2500)
        st = json.loads(await pg.evaluate(STATE))
        print(ok(st['on'] and st['a']), 'puben åpner i 3D igjen etter et tap mens den var lukket', st)
        print(ok(not cons and not errs), 'sidefeil', errs[:3], 'konsoll', cons[:3])
        await b.close()

asyncio.run(main())
