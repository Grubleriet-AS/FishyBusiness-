"""The wind's heel in 3D (tilbakemelding #134, 17.11.2026: «båten ligger noen ganger på sidlengs»): the heel follows the wind across
her (view3d/16-motion.js), not the sign of it alone. Head to wind (as at anchor) she lies near upright, and a few degrees of swing do
not flip her from full heel to full heel; with the wind abeam she heels as the core's windHeel says, away from the wind. Prints OK or
FEIL per check, the page errors last."""
import asyncio, json, math
from playwright.async_api import async_playwright
from _env import *

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:300]) if extra != '' else ''))

PROBE = """async (o) => { const D = G3._debug, b = S.boat, bv = D.bv, P = b.pos, gm = gridGamma(P);
  // the wind from o.from degrees (true), 20 m/s; she heads o.head degrees (true), not in port
  WX_FORCE = {w:20, d:o.from, hs:0.3}; b.status = 'idle'; b.port = null; b.heading = (o.head - gm) * Math.PI / 180;
  bv.stT = -1e9; await new Promise(r => setTimeout(r, 1500));
  return {heel:bv.heel * 180 / Math.PI, core:windHeel(stabOf(b.type), 20) * 180 / Math.PI}; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        pg = await (await br.new_context(viewport={'width': 1000, 'height': 700})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME3D_MIN + ',ro0')
        await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive && G3.isActive() && G3._debug && G3._debug.bv", timeout=900000, polling=2000)
        await pg.evaluate("S.boat.type = 'trebat'; applyVessel(); if (typeof G3.vesselChanged === 'function') G3.vesselChanged()")
        R = {}
        for k, frm, head in [('head', 0, 0), ('swingP', 6, 0), ('swingS', 354, 0), ('beamS', 90, 0), ('beamP', 270, 0)]:
            R[k] = await pg.evaluate(PROBE, {'from': frm, 'head': head})
        h = {k: round(v['heel'], 2) for k, v in R.items()}; beam = (abs(h['beamS']) + abs(h['beamP'])) / 2
        # (the 3D wind eases towards the forced one, so the heel abeam is the measure, not windHeel at 20 m/s)
        check(beam > 1 and h['beamS'] * h['beamP'] < 0 and abs(abs(h['beamS']) - abs(h['beamP'])) < 0.25 * beam, 'with the wind abeam she heels away from the wind, as much either side', h)
        check(abs(h['head']) < 0.1 * beam and abs(h['swingP']) < 0.25 * beam and abs(h['swingS']) < 0.25 * beam, 'head to wind she lies near upright, and a 6° swing either way is a small heel, not a flip to full heel (trebat)', h)
        print('sidefeil', errs)
        await br.close()
asyncio.run(main())
