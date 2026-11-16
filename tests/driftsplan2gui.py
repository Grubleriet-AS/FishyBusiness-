"""The operations plan played as a player does it (Driftsplan 3 since DP3-3, 16.11.2026, docs/planer/driftsplan-3.md; rewritten from
Driftsplan 2's GUI review, which was older than UI 2 and red for that): every step is a real touch through the DevTools protocol
(Input.dispatchTouchEvent) on the middle of an element that is on the screen and not covered, from the Drift page with no plan to a plan
that runs: «Lag driftsplan», Redskap, Line, the bait, Sted, «Velg sted i kartet», a tap in the sea, «Ferdig», «Start planen». The test counts
the taps, in 800×1280 and 1280×800, and measures each state: sideways overflow, tap targets under 44×44 CSS px, an element covered where it
is tapped, and page errors. Screenshots go to tests/out/driftsplan2gui/<format>-<state>.png. Run with KYST_LITE=1 (set here when missing).
Like the other tests it prints OK/FEIL lines and asserts nothing."""
import os
os.environ.setdefault('KYST_LITE', '1')
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright
ok = lambda c: 'OK  ' if c else 'FEIL'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'driftsplan2gui')
os.makedirs(OUT, exist_ok=True)

SETUP = r"""(async () => { S.tut = 0; S.settings.lang = 'no'; S.lang = 'no';
  const b = S.boat, HP = portById('husoy'); b.type = 'sjark'; applyVessel(); b.status = 'port'; b.port = 'husoy'; b.pos = {...HP.p}; S.plan = null; S.ops = null; S.draft = []; S.me = S.cur; S.sets = []; S.cash = 500000;
  S.crew = [Object.assign(genCrew(), {bi:false, off:false, name:'Ole Mikalsen', known:[true, true]}), Object.assign(genCrew(), {bi:false, off:false, name:'Per Hansen', known:[true, true]})];
  S.equip.linehaler = true; S.pgear.kits.n = 6; const LN = S.pgear.lines.hyse; LN.n = 8; LN.baited = 8; LN.bt = {makrell:8}; S.pgear.nets = []; S.pgear.pots.big = 0;
  await mapNeed(HP.p, 14);
  let sea = null; for (let r = 4; r < 12 && !sea; r += 0.5) for (let a = 0; a < 24 && !sea; a++){ const q = {x:HP.p.x + r * Math.sin(a * 0.26), y:HP.p.y - r * Math.cos(a * 0.26)}; try { if (!isLand(q) && depthF(q) > 40 && coastDist(q) > 0.8) sea = q; } catch (e){} }
  DOCK.open('drift'); return {sea}; })()"""
# an element brought onto the screen in its own panel (as a finger swipes it there), and where its middle is, and what is on top there
WHERE = """s => { const e = [...document.querySelectorAll(s)].find(x => x.offsetParent); if (!e) return null; e.scrollIntoView({block:'center'}); const q = e.getBoundingClientRect(), x = q.x + q.width / 2, y = q.y + q.height / 2, t = document.elementFromPoint(x, y);
  return {x, y, w:Math.round(q.width), h:Math.round(q.height), top:!!t && (t === e || e.contains(t))}; }"""
MEASURE = """() => { const d = document.getElementById('drawerBody'), vis = e => e.offsetParent && (() => { const q = e.getBoundingClientRect(); return q.bottom > 0 && q.top < innerHeight && q.right > 0 && q.left < innerWidth; })();
  const btns = [...document.querySelectorAll('#drawerBody button, #pmBar button')].filter(vis), small = btns.filter(e => { const q = e.getBoundingClientRect(); return q.height < 43.5 || q.width < 43.5; }).map(e => e.textContent.trim().slice(0, 24));
  return {over:d && d.offsetParent ? d.scrollWidth - d.clientWidth : 0, page:document.documentElement.scrollWidth - innerWidth, small}; }"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-compositing'])
        allerr = []
        for w, h in [(800, 1280), (1280, 800)]:
            tag = '%dx%d' % (w, h)
            ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
            pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg); errs = []; taps = [0]; miss = []; meas = {}
            pg.on('pageerror', lambda e: errs.append(str(e)))
            async def touch(x, y):
                await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 0}]}); await asyncio.sleep(0.05)
                await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await asyncio.sleep(0.35); taps[0] += 1
            async def tap(sel, name):
                r = await pg.evaluate(WHERE, sel)
                if not r or not r['top']: miss.append([name, r]); return False
                await touch(r['x'], r['y']); return True
            async def state(name):
                await pg.wait_for_timeout(400); meas[name] = await pg.evaluate(MEASURE)
                await pg.screenshot(path=os.path.join(OUT, '%s-%s.png' % (tag, name)))
            await boot(pg)
            st = await pg.evaluate(SETUP); await pg.wait_for_timeout(600)
            await state('ingen-plan')
            await tap('[data-pa="p2-new"]', 'Lag driftsplan'); await state('ny')
            await tap('[data-pa="p2-row"][data-k="gear"]', 'Redskap')
            await tap('[data-pa="p2-g3"][data-g="line"]', 'Line')
            await tap('[data-pa="p2-bait3"][data-v="sild"]', 'Sild og lodde'); await state('redskap')
            gear = await pg.evaluate("() => ({rig:S.ops.rig, bait:S.ops.bait})")
            await tap('[data-pa="p2-row"][data-k="sted"]', 'Sted')
            await tap('[data-pa="p2-map"]', 'Velg sted i kartet'); await pg.wait_for_timeout(800)
            s = await pg.evaluate("mp => { view.cx = mp.x + 0.5; view.cy = mp.y + 0.5; applyView(); renderDyn(); const pt = svg.createSVGPoint(); pt.x = mp.x; pt.y = mp.y; const q = pt.matrixTransform(svg.getScreenCTM()); return {x:q.x, y:q.y}; }", st['sea'])
            await touch(s['x'], s['y'])
            for _ in range(60):
                if not await pg.evaluate("() => PLANMAP.busy()"): break
                await asyncio.sleep(0.1)
            await state('kart')
            ring = await pg.evaluate("() => !!S.ops.ring")
            await tap('#pmBar [data-pm="done"]', 'Ferdig'); await state('sted')
            await tap('[data-pa="p2-start"]', 'Start planen')
            on = False
            for _ in range(400):
                on = await pg.evaluate("() => !!(S.ops && S.ops.on)")
                if on: break
                await asyncio.sleep(0.1)
            await pg.evaluate("for (let i = 0; i < 20; i++){ DYN.on = false; step(); } DOCK.open('drift')"); await state('paa')
            print(tag, 'trykk:', taps[0], 'bommet:', miss, 'målt:', json.dumps(meas, ensure_ascii=False)[:600])
            print(ok(not miss and gear == {'rig': 'line', 'bait': 'sild'} and ring and on and taps[0] <= 10), '%s: from no plan to a plan that runs in %d touches (line, its bait, a ring, Start), every element tapped on the screen and uncovered' % (tag, taps[0]), [gear, ring, on])
            bad = {k: v for k, v in meas.items() if v['over'] > 1 or v['page'] > 1}
            print(ok(not bad), '%s: no sideways overflow in any state' % tag, bad)
            small = {k: v['small'] for k, v in meas.items() if v['small']}
            print(ok(not small), '%s: no tap target under 44×44 px in any state' % tag, small)
            allerr.extend(errs)
            await ctx.close()
        print('sidefeil:', allerr[:4]); await b.close()
asyncio.run(main())
