"""The invite link in the game (tilbakemelding #132, 17.11.2026; the server's side is in sqltest): ?verv=<code> is kept on the device and
taken out of the address, a code that is not one is not kept; the account card shows the link with the code and a share button big
enough for a finger, in both formats; the thanks says a friend landed, not that feedback helped. Prints OK or FEIL, the page errors last."""
import asyncio, json
from playwright.async_api import async_playwright
from _env import *

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:300]) if extra != '' else ''))

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        ctx = await br.new_context(viewport={'width': 1280, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        url = GAME + ',ro0'; i = url.index('#')
        await boot(pg, url[:i] + '?verv=ABCDEF12&x=1' + url[i:])
        r = await pg.evaluate("({ref:localStorage.getItem('dsb_ref'), search:location.search, hash:location.hash.length > 0})")
        check(r['ref'] == 'abcdef12' and 'verv' not in r['search'] and 'x=1' in r['search'] and r['hash'], 'koden fra lenka ligger på enheten, og den er tatt ut av adressen (resten står)', r)
        # a second link does not replace the first, and a code that is not one is not kept
        await pg.evaluate("localStorage.setItem('dsb_ref', 'abcdef12')")
        pg2 = await ctx.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e)))
        await pg2.goto(url[:i] + '?verv=<b>bad' + url[i:]); await pg2.wait_for_function("typeof refRow === 'function' && !/verv/.test(location.search)", timeout=120000)
        r2 = await pg2.evaluate("({ref:localStorage.getItem('dsb_ref'), search:location.search})")
        check(r2['ref'] == 'abcdef12' and r2['search'] == '', 'en ugyldig kode tas ikke vare på, og den første står', r2)
        await pg2.close()
        for W, H, tag in [(1280, 800, 'liggende'), (800, 1280, 'staaende')]:
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(300)
            c = await pg.evaluate("""() => { CLOUD.ref = {code:'0a1b2c3d', month:2, max:5, total:3, waiting:1}; let d = document.getElementById('vervT'); if (!d){ d = document.createElement('div'); d.id = 'vervT'; d.className = 'ph-card'; d.style.cssText = 'position:fixed;left:8px;top:8px;width:min(420px,90vw);z-index:99999;background:#fff;color:#000;padding:10px'; document.body.appendChild(d); }
              d.innerHTML = refRow(); const i = d.querySelector('#accRef'), b = d.querySelector('[data-pa="cloudRefShare"]'), q = b && b.getBoundingClientRect(), dq = d.getBoundingClientRect();
              return {val:i && i.value, btn:!!b, h:q && Math.round(q.height), text:d.innerText, inside:dq.right <= innerWidth && dq.bottom <= innerHeight}; }""")
            await pg.screenshot(path=os.path.join(OUT, 'verv-%s.png' % tag))
            check(c['val'] == 'https://detstorebla.no/?verv=0a1b2c3d' and c['btn'] and c['h'] >= 44 and c['inside'] and '2 av 5' in c['text'] and '1 venn' in c['text'], tag + ': kortet viser lenka med koden, «Del lenka», 2 av 5 denne måneden og vennen som venter', c)
        n = await pg.evaluate("() => { CLOUD.ref = {none:true}; return refRow(); }")
        check(n == '', 'en server uten migreringen (404): ingen rad i kortet', n)
        m = await pg.evaluate("() => { shopWords(0, 0, 2); const l = (S.msgs || []).slice(-1).map(x => x.no || x.text || JSON.stringify(x)).join(' | '); return l; }")
        check('2 venner du inviterte' in m and 'tilbakemeldingen' not in m, 'takken for vennene sier at vennene leverte fisk, ikke at en tilbakemelding hjalp', m)
        print('sidefeil', errs)
        await br.close()
asyncio.run(main())
