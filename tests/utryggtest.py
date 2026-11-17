"""Yellow legs at the start (17.11.2026; Jonas: «Gjør gjerne også sånn at spillet varsler bedre ved start av utrygge ruter. Det må kanskje
også gjøres mer intuitivt hvordan autonav brukes?», after two new players grounded on drawn routes, tilbakemelding #122-#124). The real
«Kast loss» button on a drawn route with a yellow leg (draftHazards: shallower than the safe depth or rocks close by) asks first, with
three choices: «La Autonav legge ruta» (draftToLeia, ui/03b-route.js: the fairway through the same stops, no leg yellow, the end the
same), «Endre ruta selv» and «Kast loss likevel» (the route as drawn, at own risk). A route with no yellow leg starts at once, and code
that starts a route (a plain object, as the tests do) is not asked. Pictures of the dialog in both formats in tests/out/utrygg-*.png.
Prints OK or FEIL per check, the page errors last."""
import asyncio, json, os
from playwright.async_api import async_playwright
from _env import *

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:400]) if extra != '' else ''))

# a drawn one-leg route from the harbour with a yellow leg and no land on it: tried round the harbour's way out
FIND = """async () => { const b = S.boat, q = portById(b.port) || nearestPort(b.pos), a = portApproach(q) || {x:q.p.x + 1, y:q.p.y};
  for (const r of [0.6, 0.9, 1.2, 1.6, 2.0, 2.5, 3.0]) for (let k = 0; k < 24; k++){ const t = k / 24 * 2 * Math.PI, w = {x:a.x + Math.sin(t) * r, y:a.y - Math.cos(t) * r};
    if (isLandUI(w)) continue; S.draft = [{x:w.x, y:w.y, port:null, fish:0}]; hzCache.k = ''; let hz = draftHazards();
    for (let i = 0; i < 20 && /^wait/.test(hzCache.k); i++){ await new Promise(r => setTimeout(r, 300)); hzCache.k = ''; hz = draftHazards(); }
    const e = typeof estimate === 'function' ? estimate() : null; if (hz[0] && hz[0].unsafe && !(e && e.bad >= 0)) return {w, r, hz:hz[0]}; }
  S.draft = []; return null; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',ro0')
        f = await pg.evaluate(FIND)
        check(f is not None, 'a drawn route from the harbour with a yellow leg is found', f)
        if not f: print('sidefeil', errs); await br.close(); return
        # the real button: the dialog comes, the boat stays
        r = await pg.evaluate("""async () => { setTab('route'); routeChanged(); await new Promise(r => setTimeout(r, 400)); const bt = document.querySelector('#panel [data-act=start], [data-act=start]');
          if (!bt) return {btn:false}; bt.click(); await new Promise(r => setTimeout(r, 200)); const m = document.getElementById('modal');
          return {btn:true, open:!m.hidden, leia:!!document.getElementById('hzLeia'), go:!!document.getElementById('hzGo'), txt:m.innerText.slice(0, 300), st:S.boat.status, plan:!!S.plan}; }""")
        check(r.get('open') and r.get('leia') and r.get('go') and r.get('st') == 'port' and not r.get('plan'), 'Kast loss on a route with a yellow leg asks first, with Autonav as the first choice, and the boat stays', r)
        for W, H, tag in [(1280, 800, 'liggende'), (800, 1280, 'staaende')]:
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(500)
            g = await pg.evaluate("""(() => { const bx = document.querySelector('#modal .box').getBoundingClientRect(); return {in:bx.left >= 0 && bx.right <= innerWidth && bx.top >= 0 && bx.bottom <= innerHeight,
              btn:[...document.querySelectorAll('#modal button')].map(b => { const q = b.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; })}; })()""")
            check(g['in'] and all(h >= 44 for w, h in g['btn']), tag + ': the dialog is inside the screen and its buttons are big enough for a finger', g)
            await pg.screenshot(path=os.path.join(OUT, 'utrygg-%s.png' % tag))
        await pg.set_viewport_size({'width': 1280, 'height': 800}); await pg.wait_for_timeout(300)
        # «La Autonav legge ruta»: the same end, no yellow leg, and the boat still in port until Kast loss
        end0 = f['w']
        a = await pg.evaluate("""async () => { document.getElementById('hzLeia').click(); for (let i = 0; i < 100 && (LEIA_BUSY || S.draft.length < 2); i++) await new Promise(r => setTimeout(r, 200));
          hzCache.k = ''; let hz = draftHazards(); for (let i = 0; i < 20 && /^wait/.test(hzCache.k); i++){ await new Promise(r => setTimeout(r, 300)); hzCache.k = ''; hz = draftHazards(); }
          const e = S.draft[S.draft.length - 1]; return {n:S.draft.length, yellow:hz.filter(h => h.unsafe).length, end:e && {x:e.x, y:e.y}, leia:S.draft.filter(w => w.leia).length, st:S.boat.status, modal:!document.getElementById('modal').hidden}; }""")
        same = a.get('end') and abs(a['end']['x'] - end0['x']) < 1e-9 and abs(a['end']['y'] - end0['y']) < 1e-9
        check(a['n'] >= 2 and a['yellow'] == 0 and same and a['leia'] >= 1 and a['st'] == 'port' and not a['modal'], '«La Autonav legge ruta»: the fairway to the same end, no leg yellow, and she waits for Kast loss', a)
        s2 = await pg.evaluate("""async () => { document.querySelector('[data-act=start]').click(); await new Promise(r => setTimeout(r, 300)); return {plan:!!S.plan, modal:!document.getElementById('modal').hidden, st:S.boat.status}; }""")
        check(s2['plan'] and not s2['modal'], 'the safe route starts at once, with no question', s2)
        # «Kast loss likevel»: a new yellow route goes as drawn, its leg marked unsafe; first the boat back in port
        k = await pg.evaluate("""async (w) => { S.plan = null; S.boat.status = 'port'; S.draft = [{x:w.x, y:w.y, port:null, fish:0}]; hzCache.k = ''; panelDirty = true; setTab('route'); routeChanged(); renderPanel(); await new Promise(r => setTimeout(r, 400));
          document.querySelector('[data-act=start]').click(); await new Promise(r => setTimeout(r, 200)); const asked = !document.getElementById('modal').hidden && !!document.getElementById('hzGo');
          if (asked) document.getElementById('hzGo').click(); await new Promise(r => setTimeout(r, 300));
          return {asked, plan:!!S.plan, unsafe:S.plan ? S.plan.unsafe : null, n:S.plan ? S.plan.wps.length : 0}; }""", end0)
        check(k['asked'] and k['plan'] and k['n'] == 1 and k['unsafe'] == [True], '«Kast loss likevel»: the route goes as drawn, its leg marked yellow', k)
        # code that starts a route is not asked
        c = await pg.evaluate("""async (w) => { S.plan = null; S.boat.status = 'port'; S.draft = [{x:w.x, y:w.y, port:null, fish:0}]; hzCache.k = ''; doAct({dataset:{act:'start'}, disabled:false});
          await new Promise(r => setTimeout(r, 200)); const g = document.getElementById('ruGo'); return {plan:!!S.plan, hz:!!document.getElementById('hzGo') && !document.getElementById('modal').hidden}; }""", end0)
        check(c['plan'] and not c['hz'], 'a route started by code (not the button) is not asked', c)
        print('sidefeil', errs)
        await br.close()
asyncio.run(main())
