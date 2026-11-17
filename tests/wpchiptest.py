"""«Slett punkt» by the point in the chart (tilbakemelding #128, 17.11.2026: «vanskelig å slette rutepunkt som er satt feil»): a tap on
a point of the route (routeDragEnd without a move) shows the button by the point, big enough for a finger and inside the screen in both
formats; it deletes that point and only that one; a tap elsewhere takes the button away. Prints OK or FEIL per check, the page errors
last."""
import asyncio, json
from playwright.async_api import async_playwright
from _env import *

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:300]) if extra != '' else ''))

SETUP = """async () => { const b = S.boat, q = portById(b.port) || nearestPort(b.pos), a = portApproach(q) || {x:q.p.x + 1, y:q.p.y};
  if (typeof G3 !== 'undefined' && G3.isActive()) G3.show(false); if (typeof setTab === 'function') setTab('route');
  const pts = []; for (const r of [1, 2, 3]) for (let k = 0; k < 16 && pts.length < r; k++){ const t = k / 16 * 2 * Math.PI, p = {x:a.x + Math.sin(t) * r, y:a.y - Math.cos(t) * r}; if (!isLandUI(p)) pts.push(p); }
  S.draft = pts.slice(0, 3).map(p => ({x:p.x, y:p.y, port:null, fish:0})); routeChanged(); await new Promise(r => setTimeout(r, 300)); return S.draft.length; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',ro0')
        for W, H, tag in [(1280, 800, 'liggende'), (800, 1280, 'staaende')]:
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(400)
            n = await pg.evaluate(SETUP)
            r = await pg.evaluate("""async () => { const keep = S.draft.map(w => [w.x, w.y]), c = mapToClient(S.draft[1]), at = document.elementFromPoint(c.x, c.y), vis = !!at && (at === svg || svg.contains(at)); routeDragEnd({kind:'move', i:1, moved:false, before:JSON.stringify(S.draft)}); await new Promise(r => setTimeout(r, 100));
              const el = document.getElementById('wpChip'), b = el && el.querySelector('.wpchip-del'), q = el && el.getBoundingClientRect(), bq = b && b.getBoundingClientRect(), small = el ? [...el.querySelectorAll('button')].filter(x => x.getBoundingClientRect().height < 44).length : -1;
              const card = document.querySelector('#panel .wpc[data-i="1"]');
              return {vis, card:!!card, n:S.draft.length, chip:!!el, txt:b && b.textContent, small, w:bq && Math.round(bq.width), h:bq && Math.round(bq.height), inside:!!q && q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight, keep}; }""")
            await pg.screenshot(path=os.path.join(OUT, 'wpchip-%s.png' % tag))
            if not r['vis']:
                # under the route panel (portrait): no button over the panel's text; the panel's own card with its × is shown
                check(not r['chip'] and r['card'], tag + ': punktet ligger under rutepanelet: ingen knapp over panelet, kortet med × vises', r)
                continue
            check(n >= 3 and r['chip'] and r['h'] >= 44 and r['small'] == 0 and r['inside'], tag + ': et trykk på punkt 2 viser kortet ved punktet, alle knappene store nok for en finger og kortet innenfor skjermen', r)
            f = await pg.evaluate("async () => { const f0 = S.draft[1].fish || 0; document.querySelector('#wpChip .wpchip-f button[data-d=\"1\"]').click(); document.querySelector('#wpChip .wpchip-f button[data-d=\"1\"]').click(); await new Promise(r => setTimeout(r, 50)); return {f0, f1:S.draft[1].fish, out:document.querySelector('#wpChip output').textContent, open:!!document.getElementById('wpChip')}; }")
            check(f['f1'] == f['f0'] + 2 and f['open'], tag + ': + gir punktet fisketid, og kortet står', f)
            await pg.evaluate("document.getElementById('wpChip') || routeDragEnd({kind:'move', i:1, moved:false, before:JSON.stringify(S.draft)})")
            d = await pg.evaluate("""async (keep) => { document.querySelector('#wpChip .wpchip-del').click(); await new Promise(r => setTimeout(r, 100));
              return {n:S.draft.length, left:S.draft.map(w => [w.x, w.y]), gone:!document.getElementById('wpChip')}; }""", r['keep'])
            k = r['keep']
            check(d['n'] == r['n'] - 1 and d['left'] == [k[0]] + k[2:] and d['gone'], tag + ': knappen sletter punkt 2 og bare det', d)
            g = await pg.evaluate("""async () => { routeDragEnd({kind:'move', i:0, moved:false, before:JSON.stringify(S.draft)}); await new Promise(r => setTimeout(r, 50));
              const had = !!document.getElementById('wpChip'); document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); await new Promise(r => setTimeout(r, 50));
              return {had, gone:!document.getElementById('wpChip'), n:S.draft.length}; }""")
            check(g['had'] and g['gone'], tag + ': et trykk et annet sted tar knappen bort uten å slette', g)
        print('sidefeil', errs)
        await br.close()
asyncio.run(main())
