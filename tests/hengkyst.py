"""The coast's boats in the chart without a hang (klynge:38184905, 23.11.2026). The error list had «Heng: spillet sto stille i 5–30 s · kart»
also after the time away was played in bits (PR #159), most of them at the start, before the 3D view was up. The chart's moving layer
(ui/03-map.js renderDyn) asks for the boats on the AIS (npcStates), and the first time a harbour of the coast's fleet is in reach
(core/05-vessels.js coastNear) its boats are given their places at the quay or the buoy (coastMoor), their grounds weighed by the fleet's
pressure (coastGround, fleetF) and their sets laid (coastSet): every harbour within reach in one stretch on the main thread. Profiled
with the whole coast at a start in Senja, CPU slowed ten times: 7.9 s in one tick. Now the chart's call has a time limit (40 ms); the
harbours not reached wait for the next tick.
Checks, the whole coast, the chart view, the start in Senja, with the CPU slowed four times and the coast's harbours in reach made new
as on a page just opened (their places, their grounds' weights and their sets forgotten):
  1. the longest stall of a 50 ms timer over the 8 s after is under 700 ms (one cold call took 1.3-1.5 s before)
  2. all the coast's boats in reach are on the chart's AIS in the end, as many as one call without a limit gives
  3. no page errors
Needs the whole coast in the build (python3 tools/map/release.py and game.py, then node build.mjs). KYST_LITE=1 python3 tests/hengkyst.py.
Prints OK or FEIL."""
import asyncio, json
from _env import GAME, boot
from playwright.async_api import async_playwright

# the harbours within reach as on a new page: what coastMoor, coastGround, coastSet and coastCast keep on them forgotten
COLD = """() => { let nh = 0, nb = 0; const b = S.boat, F = AIS_KM + 25;
  for (const t of vecTilesIn((b.pos.x - F) * 1000, (b.pos.y - F) * 1000, (b.pos.x + F) * 1000, (b.pos.y + F) * 1000)) for (const h of t.npc || []){ nh++;
    delete h.moorVer; delete h.moorK; for (const g of h.grounds) for (const k of Object.keys(g)) if (/^fw/.test(k) || k === 'R' || k === 'RR') delete g[k];
    for (const bt of h.boats){ nb++; delete bt.moored; delete bt.cs; delete bt.cc; } }
  COASTM.k = '';
  let last = performance.now(); window.__gap = 0; window.__iv = setInterval(() => { const n = performance.now(); window.__gap = Math.max(window.__gap, n - last); last = n; }, 50);
  return {havner:nh, baater:nb}; }"""


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)) if extra != '' else ''), flush=True)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 800, 'height': 1280}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('modal').hidden = true; G3.show(false)")
        await pg.wait_for_timeout(3000)
        tiles = await pg.evaluate("MAPD.man && MAPD.man.tiles ? Object.keys(MAPD.man.tiles).length : 0")
        cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        c = await pg.evaluate(COLD)
        await pg.wait_for_timeout(8000)
        r = await pg.evaluate("(() => { clearInterval(window.__iv); return {gap:Math.round(window.__gap), kart:!G3.isActive()}; })()")
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        # (the chart's own list until it has stood still for 3 s, then one call without a limit)
        last, still = -1, 0
        for _ in range(80):
            a = await pg.evaluate("AISNOW.filter(n => n.coast).length")
            still = still + 1 if a == last else 0; last = a
            if a and still >= 6: break
            await pg.wait_for_timeout(500)
        n = await pg.evaluate("(() => { const a = AISNOW.filter(n => n.coast).length; COASTM.k = ''; return [a, npcStates(S.t / 60).filter(aisShown).filter(n => n.coast).length]; })()")
        check(c['havner'] > 0 and r['kart'] and r['gap'] < 700, 'kartet ved starten: siden står aldri stille i 700 ms eller mer mens kystflåtens havner får plassene sine', {'lengste_ms': r['gap'], 'kart': r['kart'], 'pakker': tiles, **c})
        check(n[1] > 0 and n[0] >= n[1], 'alle kystflåtens båter innen rekkevidde er på AIS-en i kartet til slutt', {'i_kartet': n[0], 'alle': n[1]})
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
