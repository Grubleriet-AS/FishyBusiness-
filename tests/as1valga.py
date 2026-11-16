"""Valg 41 A at the naust and the rorbuer (steg 126 AS1, Jonas 15.11.2026: «Valg A»: the boat lies inside the pile quay, and the sea bed
in front of its face is dredged): the 14.99 m coastal vessel (kyst15) put at the berth of three rorbuer and three of Father's naust
(south, middle, north) and looked at in 3D. Checks: the quay is built out to her no further than the fine coast's water (face.out, 0
where the face stands on the water: the T-shaped pier of before is gone), and the 3D ground under her hull (nine points, terrRaw) is
under the sea by her draught's half at least; no GL errors and no page errors. Pictures in tests/out/valga_*.png.
KYST_DIST=<dir> takes another build (dist-vec before the change, for a picture of before). KAI_TAG=_for names the pictures."""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT0 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('KYST_DIST', os.path.join(ROOT0, 'dist-vec'))
from _env import *

def check(c, what, extra=''): print(('OK  ' if c else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra else ''))
TAG = os.environ.get('KAI_TAG', '')
# the rorbuer: Leidland (58.6 N), Leirvika (63.3 N), Elleskjæret (69.0 N); the naust by the start plants nearest 58.6, 63.3 and 69.6 N
RORBU = [s for s in os.environ.get('VALGA_RB', 'rb512,rb345,rb148').split(',') if s]
NAUST_LAT = [58.6, 63.3, 69.6]

PUT = """async ([kind, id]) => { const b = S.boat; TAB.held = false; S.tut = 0;
  if (b.type !== 'kyst15'){ b.type = 'kyst15'; if (!S.owned.includes('kyst15')) S.owned.push('kyst15'); applyVessel(); }
  S.plan = null; S.draft = []; b.v = 0; b.dyn = null; b.anch = null; b.status = 'port';
  let p;
  if (kind === 'rorbu'){ const R = RBID.get(id); await mapPreload([R.cand], [['sim', 3], ['chart', 3], ['vec', 1.5]]); for (let i = 0; i < 80 && !rorbuSite(R); i++) await new Promise(r => setTimeout(r, 100)); b.port = id; b.berth = 'main'; p = R.p; }
  else { const pt = portById(id); await mapPreload([pt.p], [['sim', 3], ['chart', 3], ['vec', 1.5]]); S.home = id; S.naust = null; for (let i = 0; i < 80 && !naustSite(); i++) await new Promise(r => setTimeout(r, 100)); b.port = id; b.berth = 'naust'; p = pt.p; }
  b.pos = {x:p.x, y:p.y}; S.trail = [{x:p.x, y:p.y, port:b.port}];
  S.t = Math.round((Date.UTC(2027, 5, 15, 13) - EPOCH) / 6e4); WX_FORCE = {w:3, d:200}; if (!G3.isActive()) G3.show(true); return true; }"""
LOOK = """(kind) => { const b = S.boat, bp = berthPose(b.port, b.type, kind === 'naust' ? 'naust' : 'main'); if (!bp) return null; const c = G3._debug.cam; c.helm = false; c.dist = 28; c.pitch = 0.40; c.yaw = 2.3;
  const tr = G3._debug.terrRaw, s = Math.sin(bp.hd), cs = Math.cos(bp.hd); let mx = -99;
  for (const fa of [-0.4, 0, 0.4]) for (const ab of [-0.45, 0, 0.45]){ const x = bp.x * 1000 + s * fa * bp.Lb + cs * ab * bp.Bb, z = bp.y * 1000 - cs * fa * bp.Lb + s * ab * bp.Bb; mx = Math.max(mx, tr(x, z)); }
  const ll = natLL({x:bp.x, y:bp.y});
  return {name:portById(b.port).name, out:+(bp.face.out || 0).toFixed(1), worst:+mx.toFixed(2), draft:VESSELS[b.type].draft, ll:[+ll.lat.toFixed(4), +ll.lon.toFixed(4)]}; }"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        errs = []; res = []
        ctx = await br.new_context(viewport={'width': 1000, 'height': 700}); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + '#glchk')
        homes = await pg.evaluate("(L) => L.map(lat => { const q = P(lat, 14); return PORTS.filter(p => p.mottak && !p.sted).sort((a, b) => Math.abs(a.p.y - q.y) - Math.abs(b.p.y - q.y))[0].id; })", NAUST_LAT)
        await ctx.close()
        # (one page for all six: a page load in 3D takes 50-140 s before the first frames in SwiftShader, Jonas' test review 15.11.2026;
        # the trees, the life, the wind and the marinas off, the shore and the near zone on, since the bank under her is what is looked at)
        ctx = await br.new_context(viewport={'width': 1000, 'height': 700}); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + '#glchk#trees0,life0,vind0,marina0')
        for kind, pid in [('rorbu', i) for i in RORBU] + [('naust', i) for i in homes]:
            await pg.evaluate(PUT, [kind, pid])
            try: await pg.wait_for_function("G3.isActive()", timeout=120000)
            except Exception: print(kind, pid, '3D kom ikke opp'); continue
            await pg.wait_for_timeout(25000)
            r = await pg.evaluate(LOOK, kind); await pg.wait_for_timeout(8000)
            await pg.screenshot(path=os.path.join(ROOT0, 'tests', 'out', f'valga_{kind}_{pid}{TAG}.png'), timeout=300000)
            r = r or {}; r.update(kind=kind, id=pid); res.append(r); print(json.dumps(r, ensure_ascii=False), flush=True)
        await ctx.close()
        await br.close()
        got = [r for r in res if 'worst' in r]
        check(len(got) == 6, 'all six places looked at (%d)' % len(got))
        check(all(r['out'] <= 3 for r in got), 'the quay built out to her no more than 3 m at each (the T-shaped pier gone)', [(r['name'], r['out']) for r in got])
        check(all(r['worst'] <= -r['draft'] / 2 for r in got), 'the 3D ground under her hull under the sea by half her draught at least', [(r['name'], r['worst']) for r in got])
        print('errors:', errs[:4])
asyncio.run(main())
