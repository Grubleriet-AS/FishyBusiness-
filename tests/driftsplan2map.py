"""The operations plan on the chart plotter (ui/03g-planmap.js), Driftsplan 3 since DP3-3 (16.11.2026, docs/planer/driftsplan-3.md), with
real touches through the DevTools protocol: «Velg sted i kartet» opens the plotter with the bar, a tap in the sea sets the ring (its size
the gear's), a tap in the middle of the land is refused with the reason, another tap in the sea moves the ring, «Ferdig» goes back to the
page with the place named, and once the plan is made the fields stand where the search put them. Your own marks (S.pins, hold a finger
still) are still yours to set beside the plan (Jonas 16.11.2026: «Spillere skal fortsatt kunne sette ut nåler i kartplotteren, men det blir
mer for sin egen del»). Screenshots in 800×1280 and 1280×800 go to tests/out/."""
from _env import GAME, boot
import asyncio, json, os
from playwright.async_api import async_playwright
ok = lambda c: 'OK  ' if c else 'FEIL'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

SETUP = r"""(async () => {
  S.tut = 0; S.settings.lang = 'no'; S.lang = 'no';
  const b = S.boat, HP = portById('husoy'); b.type = 'sjark'; applyVessel(); b.status = 'port'; b.port = 'husoy'; b.pos = {...HP.p}; S.plan = null; S.ops = null; S.draft = []; S.me = S.cur; S.sets = []; S.pins = [];
  S.crew = [Object.assign(genCrew(), {bi:false, off:false, name:'Ole Mikalsen', known:[true, true]}), Object.assign(genCrew(), {bi:false, off:false, name:'Per Hansen', known:[true, true]})];
  S.equip.linehaler = true; S.pgear.kits.n = 6; const LN = S.pgear.lines.hyse; LN.n = 8; LN.baited = 8; LN.bt = {makrell:8};
  await mapNeed(HP.p, 14);
  PHONE.dact('drift', 'p2-new', {}); PHONE.dact('drift', 'p2-g3', {g:'line'});
  const sea = []; for (let r = 4; r < 12 && sea.length < 2; r += 0.5) for (let a = 0; a < 24 && sea.length < 2; a++){ const q = {x:HP.p.x + r * Math.sin(a * 0.26), y:HP.p.y - r * Math.cos(a * 0.26)}; try { if (!isLand(q) && depthF(q) > 40 && coastDist(q) > 0.8 && sea.every(z => dist(z, q) > 3)) sea.push(q); } catch (e){} }
  // a point in the middle of the land, with land all round it further out than the ring reaches
  let land = null; for (let r = 1; r < 25 && !land; r += 0.5) for (let a = 0; a < 36 && !land; a++){ const q = {x:HP.p.x + r * Math.sin(a * 0.1745), y:HP.p.y - r * Math.cos(a * 0.1745)}; try { await mapNeed(q, 3); let all = isLand(q); for (let k = 0; k < 12 && all; k++) all = isLand({x:q.x + 2.1 * Math.sin(k * 0.5236), y:q.y - 2.1 * Math.cos(k * 0.5236)}) && isLand({x:q.x + 1.1 * Math.sin(k * 0.5236), y:q.y - 1.1 * Math.cos(k * 0.5236)}); if (all) land = q; } catch (e){} }
  return {sea, land}; })()"""
# screen coordinates of a map point (the chart centred on it first, so it lies under neither the bar nor a panel)
SCR = "mp => { view.cx = mp.x; view.cy = mp.y; applyView(); renderDyn(); const pt = svg.createSVGPoint(); pt.x = mp.x; pt.y = mp.y; const q = pt.matrixTransform(svg.getScreenCTM()); return {x:q.x, y:q.y}; }"
RING = "() => S.ops && S.ops.ring ? {x:S.ops.ring.x, y:S.ops.ring.y, r:S.ops.ring.r} : null"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-compositing'])
        ctx = await b.new_context(viewport={'width': 800, 'height': 1280}, has_touch=True)
        pg = await ctx.new_page(); cdp = await ctx.new_cdp_session(pg); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        async def tap(x, y, hold=0.05):
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 0}]}); await asyncio.sleep(hold)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await asyncio.sleep(0.25)
        async def tap_el(sel):
            r = await pg.evaluate("s => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return q.width ? {x:q.x + q.width / 2, y:q.y + q.height / 2} : null; }", sel)
            if r: await tap(r['x'], r['y'])
            return bool(r)
        async def settle():
            for _ in range(60):
                if not await pg.evaluate("() => PLANMAP.busy()"): break
                await asyncio.sleep(0.1)
        await boot(pg)
        st = await pg.evaluate(SETUP); sea, land = st['sea'], st['land']
        print('oppsett:', len(sea), 'sjøpunkt, landpunkt', bool(land))
        # «Velg sted i kartet» opens the plotter with the bar and no ring yet
        await pg.evaluate("PHONE.dact('drift', 'p2-row', {k:'sted'}); PHONE.dact('drift', 'p2-map', {})"); await pg.wait_for_timeout(900)
        r1 = await pg.evaluate("() => ({on:PLANMAP.isOn(), bar:!document.getElementById('pmBar').hidden, text:document.getElementById('pmBar').innerText.replace(/\\s+/g, ' '), ring:!!S.ops.ring})")
        print(ok(r1['on'] and r1['bar'] and not r1['ring'] and 'Trykk i sjøen' in r1['text'] and '2,0 nm over for line' in r1['text']), '«Velg sted i kartet» opens the plotter with the bar: tap the sea, the ring 2 nm across for the line', r1)
        # a tap in the sea sets the ring, drawn on the chart
        s0 = await pg.evaluate(SCR, sea[0]); await tap(s0['x'], s0['y']); await settle(); R0 = await pg.evaluate(RING)
        drawn = await pg.evaluate("() => (document.querySelector('#map g.pm') || {innerHTML:''}).innerHTML.includes('pm-ring')")
        print(ok(R0 and abs(R0['x'] - sea[0]['x']) < 0.1 and abs(R0['y'] - sea[0]['y']) < 0.1 and drawn), 'a tap in the sea sets the ring where the finger was, and it is drawn', [R0, drawn])
        await pg.screenshot(path=os.path.join(OUT, 'driftsplan2map-800x1280.png'))
        # a tap in the middle of the land is refused with the reason; the ring stays
        if land:
            l0 = await pg.evaluate(SCR, land); await tap(l0['x'], l0['y']); await settle(); R1 = await pg.evaluate(RING)
            why = await pg.evaluate("() => { const t = document.getElementById('toast'), w = document.querySelector('#pmBar .pm-why'); return (t ? t.textContent : '') + ' | ' + (w ? w.textContent : ''); }")
            print(ok(R1 == R0 and 'Flytt ringen' in why), 'a tap in the middle of the land is refused with the reason, and the ring stays', [why[:140]])
        else: print('VENTER fant ikke land langt nok fra sjøen rundt Husøy')
        # another tap in the sea moves the ring
        s1 = await pg.evaluate(SCR, sea[1]); await tap(s1['x'], s1['y']); await settle(); R2 = await pg.evaluate(RING)
        print(ok(R2 and abs(R2['x'] - sea[1]['x']) < 0.1 and abs(R2['y'] - sea[1]['y']) < 0.1), 'another tap in the sea moves the ring', R2)
        # «Ferdig»: back to the page, with the place named
        await tap_el('#pmBar [data-pm=done]'); await pg.wait_for_timeout(600)
        r2 = await pg.evaluate("() => { const d = document.getElementById('drawerBody'); return {on:PLANMAP.isOn(), page:!!d && /Sted\\s*Ved /.test(d.innerText), start:!!d && d.innerText.includes('Start planen')}; }")
        print(ok(not r2['on'] and r2['page'] and r2['start']), '«Ferdig» goes back to the page with the place named and Start ready', r2)
        # the plan made: the fields where the search put them are drawn with their strings in the ring
        r3 = await pg.evaluate("""(async () => { const o = S.ops; PHONE.dact('drift', 'p2-start', {}); for (let k = 0; k < 400 && !o.on; k++) await new Promise(r => setTimeout(r, 100));
          o.places.forEach((q, i) => { if (!q.at){ q.at = {x:o.ring.x + 0.4 * (i + 1), y:o.ring.y}; q.st = {x:q.at.x, y:q.at.y - 0.5}; } });   // (as the search leaves them: the spot and the string's start)
          PLANMAP.open(S.cur); await new Promise(r => setTimeout(r, 600)); const g = (document.querySelector('#map g.pm') || {innerHTML:''}).innerHTML;
          return {on:o.on, err:o.err, fields:o.places.length, pins:(g.match(/Felt \\d/g) || []).length, strings:(g.match(/pm-string/g) || []).length}; })()""")
        print(ok(r3['on'] and r3['pins'] == r3['fields'] and r3['strings'] == r3['fields']), 'once the plan is made, its fields are drawn in the ring where the search put them, with their strings', r3)
        for w, h in [(1280, 800), (800, 1280)]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(700)
            ov = await pg.evaluate("() => { const bar = document.getElementById('pmBar').getBoundingClientRect(); return {inside:bar.right <= innerWidth + 1 && bar.left >= -1, h:Math.round(bar.height), done:(() => { const q = document.querySelector('#pmBar [data-pm=done]').getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; })()}; }")
            print(ok(ov['inside'] and ov['done'][1] >= 44), 'the bar fits at %d×%d and «Ferdig» is a finger wide' % (w, h), ov)
            await pg.screenshot(path=os.path.join(OUT, 'driftsplan2map-%dx%d-felt.png' % (w, h)))
        await pg.evaluate("PLANMAP.close()"); await pg.wait_for_timeout(400)
        # your own mark beside the plan: the plotter open on its own, a finger held still sets a pin (S.pins), drawn with the plan's ring
        # (the plan paused, so her route is off the chart: a finger held on a waypoint grabs the waypoint, not a pin)
        await pg.evaluate("PHONE.dact('drift', 'p2-pause', {}); S.plan = null; if (typeof DOCK !== 'undefined' && DOCK.close) DOCK.close(); if (PHONE.show) PHONE.show(false); openPlotter()"); await pg.wait_for_timeout(600)
        mp = await pg.evaluate("c => { for (let r = 2; r < 8; r += 0.5) for (let a = 0; a < 12; a++){ const q = {x:c.x + r * Math.sin(a * 0.52), y:c.y - r * Math.cos(a * 0.52)}; try { if (!isLand(q) && !routeGrab(q) && !(S.pins || []).some(p => dist(p, q) < 0.5)) return q; } catch (e){} } return {x:c.x + 2.5, y:c.y + 2.5}; }", sea[0])
        s2 = await pg.evaluate(SCR, mp); n0 = await pg.evaluate("() => (S.pins || []).length")
        await tap(s2['x'], s2['y'], hold=0.8); n1 = await pg.evaluate("() => (S.pins || []).length")
        both = await pg.evaluate("() => { const h = document.getElementById('map').innerHTML; return {ring:h.includes('pm-ring'), pins:(S.pins || []).length}; }")
        print(ok(n1 == n0 + 1 and both['ring']), 'your own mark: a finger held still sets a pin of your own, beside the plan\'s ring', [n0, n1, both])
        print('sidefeil:', errs[:4]); await b.close()
asyncio.run(main())
