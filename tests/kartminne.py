"""The 3D view's drawing buffer while the chart is on the screen (klynge:730786ec, 19.11.2026): pages, most on iPhones, that stopped
after half an hour or more with the chart up and the 3D view hidden behind it, holding some 270 MB on the GPU. The hidden 3D canvas
kept its drawing buffer at full size (with antialiasing several samples a pixel, and the depth), tens of MB on a phone that nothing
showed. Now the view lets it go when the chart comes (1 x 1) and resize() gives it back at the first frame when the 3D view comes
again, so the picture is the same. Checks: the canvas has its size in 3D, is 1 x 1 behind the chart, and has the same size again,
with a frame drawn and no GL error, back in 3D. Prints OK or FEIL per check."""
import asyncio, json
from playwright.async_api import async_playwright
from _env import GAME3D_MIN, boot


def check(c, what, extra=''): print(('OK  ' if c else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)) if extra != '' else ''))


SIZE = "() => { const c = document.getElementById('gl'); return [c.width, c.height]; }"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 800, 'height': 1280}, has_touch=True)).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME3D_MIN)
        await pg.evaluate("() => { if (!G3.isActive()) G3.show(true); }")
        await pg.wait_for_function("G3.isActive() && document.getElementById('gl').width > 1", timeout=180000)
        await pg.wait_for_timeout(3000)
        a = await pg.evaluate(SIZE)
        check(a[0] > 100 and a[1] > 100, 'tegnebufferen har sin størrelse i 3D', a)
        await pg.evaluate("() => G3.show(false)")
        await pg.wait_for_timeout(1500)
        m = await pg.evaluate(SIZE)
        check(m[0] * m[1] <= 1, 'tegnebufferen er sluppet (1 x 1) mens kartet står oppe', m)
        await pg.evaluate("() => G3.show(true)")
        await pg.wait_for_function("G3.isActive() && document.getElementById('gl').width > 1", timeout=60000)
        await pg.wait_for_timeout(3000)
        c = await pg.evaluate(SIZE); n = await pg.evaluate("G3.hangInfo().n"); e = await pg.evaluate("G3._debug.glErr()")
        check(c == a and n > 0 and e == 0, 'tilbake i 3D: samme størrelse, bilder tegnet og ingen GL-feil', {'str': c, 'bilder': n, 'glErr': e})
        print('sidefeil', errs[:5])
        await b.close()

asyncio.run(main())
