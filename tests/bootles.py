"""The boot's data files on iOS (klynge:64227db9, 26.11.2026): Safari keeps a large fetched body as a file on disk, and reading the
blob afterwards can fail with «NotReadableError: The I/O read operation failed.». dataGet (ui/11-boot.js) retried the fetch and the
blob, but read the bytes (blob.arrayBuffer, FileReader for the pictures) after the tries, so one such read stopped the start with
«Spillet startet ikke». Here the first read of every blob fails as Safari's does; the game must start anyway, every data file must be
in, and the error list must have no «I/O read» line.
Seen red on the working branch before the fix: the start stopped with «boot: The I/O read operation failed.».
Prints OK or FEIL per check."""
from _env import GAME
import asyncio, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:600]) if extra != '' else ''), flush=True)


# the first read of each data file (told by its size) fails as WebKit's does; the next read of it, from a new fetch, is normal
FAIL = """(() => { window.__io = 0; const seen = new Set(), err = () => new DOMException('The I/O read operation failed.', 'NotReadableError');
  const ab = Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer = function(){ if (!seen.has(this.size)){ seen.add(this.size); window.__io++; return Promise.reject(err()); } return ab.call(this); };
  const rd = FileReader.prototype.readAsDataURL;
  FileReader.prototype.readAsDataURL = function(b){ if (b instanceof Blob && !seen.has(b.size)){ seen.add(b.size); window.__io++;
    Object.defineProperty(this, 'error', {value:err(), configurable:true}); setTimeout(() => this.onerror && this.onerror(new ProgressEvent('error')), 0); return; }
    return rd.call(this, b); };
  window.__errs = []; addEventListener('error', e => window.__errs.push(String(e.message)));
})();"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
        pg.set_default_timeout(120000)
        perr = []
        pg.on('pageerror', lambda e: perr.append(str(e)))
        await pg.add_init_script(FAIL)
        await pg.goto(GAME)
        # the start screen, or the boot's error dialog
        await pg.wait_for_function("(document.getElementById('obGo') && document.getElementById('obGo').offsetParent) || /startet ikke|did not start/.test((document.getElementById('modal') || {}).textContent || '')", timeout=120000)
        failed = await pg.evaluate("(document.getElementById('modal') || {}).hidden === false && /startet ikke|did not start/.test(document.getElementById('modal').textContent) ? document.querySelector('#modal .note').textContent : ''")
        n = await pg.evaluate('window.__io')
        check(n > 0, 'the stand-in failed blob reads', n)
        check(not failed, 'the game starts although the first read of each data file failed', failed)
        if not failed:
            await pg.click('#obGo')
            await pg.wait_for_function("S.intro === true && document.getElementById('modal').hidden", timeout=60000)
            await pg.evaluate('modelsReady()')
            await pg.wait_for_function('MODELS.done', timeout=120000)
            left = await pg.evaluate("({els:[...document.querySelectorAll('script[data-src]')].map(e => e.id), failed:MODELS.failed, bytes:DATAB.size})")
            check(not left['els'] and not left['failed'] and left['bytes'] > 0, 'every data file came in', left)
        print('sidefeil', perr)
        await br.close()

asyncio.run(main())
