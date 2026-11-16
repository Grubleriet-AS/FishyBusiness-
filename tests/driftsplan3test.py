# Driftsplan 3, DP3-1 (docs/planer/driftsplan-3.md, 16.11.2026): the plan is a ring and a gear, and «find the plan» (core/06k-plan3.js)
# reckons the rest; the engine is Driftsplan 2's. Without 3D (LITE), on Senja, with driftsplan2test's harness (a fixed date, a seeded
# Math.random, the loop held). A: line from port, you aboard: the plan made from the ring and the gear only, a day played closed, the gear set
# in the ring and hauled, the catch landed. B: nets from the sea, the crew alone without a named skipper or mate: the plan names them and
# goes. C: a ring on land is refused with the reason. D: an old v4 plan that runs is switched off (plan3Retire, as DRIFT3 will do): it hauls
# its gear, lands at its plant, lies there, and is gone.
import asyncio, json
from playwright.async_api import async_playwright
from _env import boot
from driftsplan2test import D2
ok = lambda c: 'OK  ' if c else 'FEIL'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        await pg.evaluate(D2)
        await pg.evaluate("lifeDay = () => {}; lifeInjury = () => {};")
        await pg.evaluate("window.mk3 = (c, rig, pick) => { const o = S.ops = plan3New(c, rig, pick); return new Promise(res => plan3Make(o, err => res(err || null))); };")

        # A: line from port, you aboard, two in the crew; only the ring and the gear are given
        r = await pg.evaluate("""(async () => { D2.reset(1); const home = D2.boat('sjark', 2, true); D2.gear('line', 8); await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0], err = await mk3(C, 'line', {lk:'hyse', bait:'sild'}), o = S.ops;
          const made = {err, home:o.home, M:o.M, rhythm:o.rhythm, wx:o.wx, land:o.land, places:o.places.map(q => ({k:q.k, n:q.n, lk:q.lk, d:kmTrue(q, o.ring)})), r:o.ring.r, jig:o.jig, bait:S.pgear.baitPref, rig:S.boat.rig, homeRest:plan2RestOk(o.home)};
          if (err) return {made};
          plan2Start(o); const L = await D2.run(1440, 'closed', 'A');
          return {made, gear:L.gearLog, stats:L.stats.sum, fin:L.fin, ops:L.ops, msgs:L.msgs.slice(0, 6)}; })()""")
        m = r['made']; print('A laget:', json.dumps(m, ensure_ascii=False)[:600])
        print(ok(not m['err'] and m['home'] and m['M'] and m['homeRest']), 'A the plan is made from the ring and the gear: a home where the crew rest, and a plant', [m['err'], m['home'], m['M']])
        print(ok(len(m['places']) == 2 and all(q['k'] == 'felt' and q['lk'] == 'hyse' and q['d'] <= m['r'] + 1e-6 for q in m['places']) and sum(q['n'] for q in m['places']) == 8), 'A eight tubs on two fields inside the ring', m['places'])
        print(ok(not m['jig'] and m['bait'] == 'sild' and m['rig'] == 'line'), 'A one gear: no jig, the bait chosen, the boat rigged for line', [m['jig'], m['bait'], m['rig']])
        if 'gear' in r:
            g = r['gear']; print('A redskap:', g)
            print(ok(len(g) >= 2 and all(x['haul'] for x in g[:2])), 'A the fields are set and hauled within the day', g[:3])
            print(ok(r['stats']['kg'] > 0 and r['ops']['on'] and not r['ops']['stop']), 'A the catch is landed and the plan still on after a day', [r['stats']['kg'], r['ops']['on'], r['ops']['stop']])

        # B: nets from the sea, the crew alone (you ashore), no skipper or mate named: the plan names the two with the most experience
        r = await pg.evaluate("""(async () => { D2.reset(2); const home = D2.boat('sjark', 2, false); D2.gear('garn', 12); for (const c of S.crew){ delete c.sk; delete c.mate; } await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0], b = S.boat; b.status = 'idle'; b.port = null; b.pos = {x:C.x + 0.8, y:C.y}; await mapNeed(b.pos, 6);
          const err = await mk3(C, 'garn'), o = S.ops, sk = crewSkipper(), mt = crewMate();
          const made = {err, roles:o.derived && o.derived.roles, sk:sk && sk.name, mt:mt && mt.name, places:o.places.length, home:o.home};
          if (err) return {made};
          plan2Start(o); const L = await D2.run(720, 'closed', 'B');
          return {made, gear:L.gearLog, ops:L.ops, fin:L.fin}; })()""")
        m = r['made']; print('B laget:', json.dumps(m, ensure_ascii=False)[:400])
        print(ok(not m['err'] and m['sk'] and m['mt'] and m['sk'] != m['mt']), 'B from the sea, you ashore: the plan names a skipper and a mate and is made', [m['err'], m['sk'], m['mt']])
        if 'gear' in r: print(ok(len(r['gear']) >= 1 and not r['ops']['stop']), 'B the nets are set without a stop', [r['gear'][:2], r['ops']['stop']])

        # C: a ring on land
        r = await pg.evaluate("""(async () => { D2.reset(3); const home = D2.boat('sjark', 2, true); D2.gear('line', 8); const P = portById(home).p; await mapNeed(P, 14);
          let L = null; for (let a = 0; a < 40 && !L; a++){ const q = {x:P.x + 3 * Math.sin(a), y:P.y + 3 * Math.cos(a)}; try { if (isLand(q) && isLand({x:q.x + 1, y:q.y}) && isLand({x:q.x - 1, y:q.y}) && isLand({x:q.x, y:q.y + 1}) && isLand({x:q.x, y:q.y - 1})) L = q; } catch (e){} }
          if (!L) return {skip:true}; S.pgear.lines.hyse.n = 8; const err = await mk3(L, 'juksa', {tackle:'mark'}); return {err, made:!!S.ops.made}; })()""")
        print(ok(r.get('skip') or (r['err'] and 'Flytt ringen' in r['err'] and not r['made'])), 'C a ring on land is refused with the reason', r)

        # D: an old v4 plan that runs, with its line in the sea: switched off, it hauls, lands at the plant, lies there, and is gone
        r = await pg.evaluate("""(async () => { D2.reset(4); const home = D2.boat('sjark', 2, true); D2.gear('line', 4); await mapNeed(portById(home).p, 14);
          const F = D2.spots(2, 4, 12), o = S.ops = plan2New({home, rig:'line', jig:false, places:[D2.felt('f1', F[0], 2, 6), D2.felt('f2', F[1], 2, 6)], dep:5, land:{mode:'near', port:null, when:'trip'}});
          const e1 = await D2.make(o); if (e1) return {e1}; plan2Start(o); const L1 = await D2.run(360, 'closed', 'D1');
          const sea = mySets().length, M = o.M, r1 = plan3Retire(o), retiring = !!(r1 && o.retire && o.home === M);
          const L2 = await D2.run(2 * 1440, 'closed', 'D2'); const after = plan3Retire(o);
          return {sea, retiring, M, fin:L2.fin, gone:S.ops === null && after === null, msgs:L2.msgs.concat(S.msgs.slice(-2).map(m => m.no)).slice(-6)}; })()""")
        print('D:', json.dumps(r, ensure_ascii=False)[:700])
        print(ok(r.get('sea', 0) > 0 and r.get('retiring')), 'D a running v4 plan with gear in the sea goes on to fetch it and land at its plant', [r.get('sea'), r.get('retiring')])
        f = r.get('fin', {})
        print(ok(f.get('sets') == [] and f.get('hold') == 0 and f.get('status') == 'port' and f.get('port') == r.get('M') and r.get('gone')), 'D the gear hauled, the catch landed, the boat lies at the plant, and the plan is gone', [f.get('sets'), f.get('hold'), f.get('status'), f.get('port'), r.get('M'), r.get('gone')])
        print('sidefeil:', errs[:5])
        await b.close()

if __name__ == "__main__": asyncio.run(main())
