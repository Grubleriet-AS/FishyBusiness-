# The coast's harbours shut to the players (Jonas 15.11.2026: «de 3300 kaiene skal ikke være tilgjengelige for ekte brukere»,
# core/07e-havn.js HAVN.shut). A save from before, with the boat lying at a harbour berth in Bodø and a route drawn to it, is loaded:
#  - the boat lies at the nearest place that takes her (a plant, a shop or a yard), not at the berth
#  - the drawn route ends off the shore, not at the berth, and the berth is let go
#  - the log says why
# Needs dist-vec/ (the vec packs, as havntest; run.py builds it once, KYST_VEC_BUILT).
import asyncio, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('KYST_DIST', os.path.join(ROOT, 'dist-vec'))
from _env import GAME, boot
from playwright.async_api import async_playwright

ok = lambda c: 'OK  ' if c else 'FEIL'

PUT = """async () => { const p = P(67.284, 14.385), b = S.boat; S.tut = 0; await mapNeed(p, 6);
  let f = null; HAVN.shut = false;
  for (let k = 0; k < 120 && !f; k++){ vecWant(p.x - 3, p.y - 3, p.x + 3, p.y + 3); vecTilesIn((p.x - 3) * 1000, (p.y - 3) * 1000, (p.x + 3) * 1000, (p.y + 3) * 1000); coastIndexAt(p, true); f = havnFind(p, 4, b.type); if (!f) await new Promise(r => setTimeout(r, 250)); }
  if (!f) return {err:'no berth'};
  const id = f.place.id; b.status = 'port'; b.port = id; b.berth = 'main'; b.pos = {x:f.place.p.x, y:f.place.p.y}; b.dyn = null; havnHold(id);
  S.draft = [{x:p.x + 0.5, y:p.y, port:null, fish:0}, {x:f.place.p.x, y:f.place.p.y, port:id, fish:0}];
  save(); window.removeEventListener('pagehide', save); window.save = () => {}; return {id, name:f.place.name}; }"""

LOOK = """(id) => { const b = S.boat, q = portById(b.port), e = S.draft[S.draft.length - 1], st = S.havn && S.havn.s[id];
  return {shut:HAVN.shut, status:b.status, port:b.port, berth:isBerth(b.port), kind:q ? (q.mottak ? 'mottak' : q.verft ? 'verft' : q.shop ? 'butikk' : q.rorbu ? 'rorbu' : 'annet') : null,
    name:q ? q.name : null, km:q ? +dist(q.p, P(67.284, 14.385)).toFixed(1) : null, onPlace:q ? dist(b.pos, q.p) < 0.01 : false,
    draftEnd:e ? e.port : 'none', held:!!(st && st.vid === S.cur), log:S.log.filter(x => /kystens egne båter/.test(x.no)).map(x => x.no.slice(0, 160))}; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 900, 'height': 700})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        a = await pg.evaluate(PUT); print('før:', json.dumps(a, ensure_ascii=False))
        if a.get('err'): print(ok(False), 'a berth in Bodø to put the boat at (vec packs in the build?)', a); await br.close(); return
        await pg.reload(); await pg.wait_for_function("typeof SIMREADY !== 'undefined' && SIMREADY === true && typeof S !== 'undefined' && S && S.boat", timeout=120000)
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate(LOOK, a['id']); print('etter:', json.dumps(r, ensure_ascii=False))
        print(ok(r['shut'] and r['status'] == 'port' and not r['berth'] and r['onPlace'] and r['kind'] in ('mottak', 'verft', 'butikk', 'annet')), 'the boat from the shut berth lies at the nearest place that takes her', [r['name'], r['kind'], r['km']])
        print(ok(r['draftEnd'] is None and not r['held']), 'the drawn route ends off the shore, and the berth is let go', [r['draftEnd'], r['held']])
        print(ok(len(r['log']) >= 1), 'the log says why', r['log'][:2])
        print('sidefeil:', errs[:5])
        await br.close()

asyncio.run(main())
