"""Klynge 8dead4b1 (20.11.2026): Safari on iOS and macOS can fail to read a Blob the page has just made from its own bytes, and the
read rejects with «NotReadableError: The I/O read operation failed.». The fine coast and the roads (core/01-world.js loadFine and
loadRoads) and the buildings (view3d/06-buildings-lights.js loadBuildings) inflated their bytes only through new Blob([...]).stream(),
so on such a device they were left out and the error went to the console. Here Blob.prototype.stream always fails that way (as the
blob store of such a Safari does), and the three must still come. The first page plays without 3D (the fine coast and the roads); the
second opens the 3D view (GAME3D_MIN) for the buildings. Seen red on the working branch before the fix: FINE, ROADS and G3.BLD null.
(Chromium turns the stream's error into «TypeError: Failed to fetch», so the console's text is not checked here.) Prints OK or FEIL."""
from _env import boot, GAME, GAME3D_MIN
import asyncio
from playwright.async_api import async_playwright
ok = lambda c: 'OK  ' if c else 'FEIL'
BREAK = """(() => { window.__blobFail = 0;
  Blob.prototype.stream = function(){ window.__blobFail++; return new ReadableStream({pull(c){ c.error(new DOMException('The I/O read operation failed.', 'NotReadableError')); }}); }; })()"""

async def page(br, url, errs):
    pg = await (await br.new_context(viewport={'width': 1000, 'height': 760})).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(BREAK)
    await boot(pg, url)
    return pg

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        errs = []
        pg = await page(br, GAME if 'no3d' in GAME else GAME + ',no3d', errs)
        try: await pg.wait_for_function("FINE !== null && ROADS !== null", timeout=30000)
        except Exception: pass
        r = await pg.evaluate("() => ({fine:FINE ? FINE.length : null, roads:ROADS ? ROADS.length : null, fail:window.__blobFail})")
        print(ok(r['fail'] >= 2), 'Blob.stream feilet slik Safari gjør (ganger)', r['fail'])
        print(ok(r['fine']), 'den fine kysten kom likevel (polygoner)', r['fine'])
        print(ok(r['roads']), 'veiene kom likevel', r['roads'])
        await pg.context.close()
        pg = await page(br, GAME3D_MIN.replace(',no3d', ''), errs)
        await pg.wait_for_function("G3.isActive()", timeout=180000); await pg.wait_for_timeout(2000)
        b = await pg.evaluate("() => ({bld:G3._debug.BLD ? G3._debug.BLD.n : null, fail:window.__blobFail})")
        print(ok(b['bld']), 'husene i 3D kom likevel', b['bld'])
        print(ok(not errs), 'ingen sidefeil', errs[:4])
        await br.close()
asyncio.run(main())
