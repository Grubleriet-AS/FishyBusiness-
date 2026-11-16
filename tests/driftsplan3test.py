# Driftsplan 3, DP3-1 (docs/planer/driftsplan-3.md, 16.11.2026): the plan is a ring and a gear, and «find the plan» (core/06k-plan3.js)
# reckons the rest; the engine is Driftsplan 2's. Without 3D (LITE), on Senja, with driftsplan2test's harness (a fixed date, a seeded
# Math.random, the loop held). A: line from port, you aboard: the plan made from the ring and the gear only, a day played closed, the gear set
# in the ring and hauled, the catch landed. B: nets from the sea, the crew alone without a named skipper or mate: the plan names them and
# goes. C: a ring on land is refused with the reason. D: an old v4 plan that runs is switched off (plan3Retire, as DRIFT3 will do): it hauls
# its gear, lands at its plant, lies there, and is gone.
# DP3-2 (steg 130): E the search with the echo sounder in the day and on the sea (its length, time and fuel, the spots in the ring, every set
# inside it, how much of the strings lies in the ring), F a haul under half of the field's first sends her searching again and the field
# moves, G the same two days open and closed give the same places.
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
        await pg.evaluate("() => { window.mk3 = (c, rig, pick) => { const o = S.ops = plan3New(c, rig, pick); return new Promise(res => plan3Make(o, err => res(err || null))); }; }")

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
          await D2.make(o);   // (the legs again with the plant as home: in the game this search runs between frames, plan2Step waits for it)
          const L2 = await D2.run(2 * 1440, 'closed', 'D2'); const after = plan3Retire(o);
          return {sea, retiring, M, ops:L2.ops, ev:L2.ev.slice(0, 30), fin:L2.fin, gone:S.ops === null && after === null, msgs:L2.msgs.concat(S.msgs.slice(-2).map(m => m.no)).slice(-6)}; })()""")
        print('D:', json.dumps(r, ensure_ascii=False)[:700])
        print(ok(r.get('sea', 0) > 0 and r.get('retiring')), 'D a running v4 plan with gear in the sea goes on to fetch it and land at its plant', [r.get('sea'), r.get('retiring')])
        f = r.get('fin', {})
        print(ok(f.get('sets') == [] and f.get('hold') == 0 and f.get('status') == 'port' and f.get('port') == r.get('M') and r.get('gone')), 'D the gear hauled, the catch landed, the boat lies at the plant, and the plan is gone', [f.get('sets'), f.get('hold'), f.get('status'), f.get('port'), r.get('M'), r.get('gone')])
        # ---- DP3-2: the search. The harness's hook records each set as it goes out (its start, its end, the field) and the search trips
        await pg.evaluate(r'''() => { window.rec3 = o => { const R = {sets:{}, sok:[], cur:null}; R.hook = () => { for (const s of mySets()) if (!R.sets[s.id]){ const q = o.places.find(x => x.id === s.fid); R.sets[s.id] = {fid:s.fid, a:{x:s.a.x, y:s.a.y}, b:{x:s.b.x, y:s.b.y}, t:S.t, at0:q && q.at ? {x:q.at.x, y:q.at.y} : null}; }
            const pl = S.plan; if (pl && pl.sok != null && pl.idx >= pl.sok){ if (!R.cur) R.cur = {t0:S.t, x:S.boat.pos.x, y:S.boat.pos.y}; } else if (R.cur){ R.cur.t1 = S.t; R.sok.push(R.cur); R.cur = null; } };
          R.out = () => { const c = o.ring, inR = p => kmTrue(p, c) <= c.r + 0.05, frac = s => { let k = 0; for (let j = 0; j <= 20; j++) if (inR({x:s.a.x + (s.b.x - s.a.x) * j / 20, y:s.a.y + (s.b.y - s.a.y) * j / 20})) k++; return k / 21; };
            const L = Object.values(R.sets), mid = s => ({x:(s.a.x + s.b.x) / 2, y:(s.a.y + s.b.y) / 2});
            return {n:L.length, allIn:L.every(s => inR(mid(s))), dA:L.map(s => +kmTrue(mid(s), c).toFixed(2)), onAt:L.map(s => { const q = o.places.find(x => x.id === s.fid); return q && s.at0 ? +kmTrue(mid(s), s.at0).toFixed(2) : null; }), len:L.map(s => +kmTrue(s.a, s.b).toFixed(2)), frac:L.map(s => +frac(s).toFixed(2)), sok:R.sok.map(x => Math.round(x.t1 - x.t0)),
              at:o.places.map(q => q.at ? [+q.at.x.toFixed(3), +q.at.y.toFixed(3)] : null), atIn:o.places.every(q => !q.at || inR(q.at)), sokN:o.sokN || 0, last:o.sokLast, km:o.sok && o.sok.km, cand:o.sok && o.sok.cand.length, seen:o.sok && Object.fromEntries(Object.entries(o.sok.seen).map(([k, v]) => [k, v.length])), r:c.r}; };
          return R; }; }''')
        # E: line, the crew alone with a skipper of experience 4 (you ashore), the simple sounder; two days closed
        E = r'''(async (mode, tag) => { D2.reset(5); const home = D2.boat('sjark', 2, false); D2.gear('line', 8); S.crew[0].attr.erf = 4; await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0], err = await mk3(C, 'line', {lk:'hyse', bait:'sild'}), o = S.ops; if (err) return {err};
          const st = plan2State(o), d = planDay(o, plan2NextDep(o, S.t / 60), st), text = planDayText(o, d).map(x => x[0] + ' ' + x[1]), sk = d.steps.find(x => x.k === 'sok');
          const R = rec3(o); plan2Start(o); const L = await D2.run(2 * 1440, mode, tag, R.hook);
          return {text, sok:sk ? {h:sk.h, km:sk.km, l:sk.l, tier:sk.tier, who:sk.who} : null, R:R.out(), ops:L.ops, stats:L.stats.sum, gear:L.gearLog, log:L.log.filter(x => /Søkte|ga under/.test(x[1])).slice(0, 6), ev:L.ev.slice(0, 14)}; })'''
        r = await pg.evaluate(E + "('closed', 'E')")
        if r.get('err'): print('FEIL E plan3Make:', r['err'])
        else:
            R = r['R']; print('E dagen:'); print('  ' + '\n  '.join(r['text'][:8])); print('E søket:', json.dumps(r['sok'], ensure_ascii=False), 'mønsteret km', R['km'], 'kandidater', R['cand'], 'sett', R['seen'])
            print('E settingene: midten fra ringens midte', R['dA'], 'km, midten fra plassen søket fant', R['onAt'], 'km, lengde', R['len'], 'km, inne i ringen', R['frac'], 'ringens radius', round(R['r'], 2), '; søketurer i ringen (min)', R['sok'], '; logg', r['log'])
            ks = [t for t in r['text'] if 'Søker etter fisken' in t]; i_s = next((i for i, t in enumerate(r['text']) if 'Søker etter' in t), 99); i_set = next((i for i, t in enumerate(r['text']) if 'Setter' in t), -1)
            print(ok(r['sok'] and r['sok']['h'] > 0 and r['sok']['km'] > 0 and r['sok']['l'] > 0 and i_s < i_set and ks and 'leser bildet' in ks[0]), 'E the day searches the ring before the line is set, with its km, minutes and fuel, and who reads the picture', ks[:1])
            print(ok(R['sokN'] >= 1 and R['last'] and R['last']['tier'] == 'basic' and abs(R['last']['erf'] - 4) < 1e-9 and all(R['at']) and R['atIn']), 'E the pattern is sailed and read by the skipper (experience 4) with the simple sounder: every field has its spot in the ring', [R['sokN'], R['last'], R['at']])
            print(ok(R['sok'] and all(5 <= m <= 90 for m in R['sok'])), 'E the search in the ring takes its time on the sea (minutes)', R['sok'])
            print(ok(R['n'] >= 2 and R['allIn'] and all(x is not None and x <= 0.15 for x in R['onAt'])), 'E every string lies with its middle (where the catch is reckoned) in the ring, on the spot the search found', [R['n'], R['dA'], R['onAt']])
            print(ok(r['stats']['kg'] > 0 and r['ops']['on'] and not r['ops']['stop']), 'E the catch is landed and the plan still on after two days', [r['stats']['kg'], r['ops']['on'], r['ops']['stop']])
            # G: the same two days open (the loop let go every ten minutes) with the same seed: the same places and the same sets
            g = await pg.evaluate(E + "('open', 'G')"); G = g.get('R') or {}
            print('G åpent:', G.get('at'), G.get('dA'), G.get('sokN'), '; lukket:', R['at'], R['dA'], R['sokN'])
            print(ok(not g.get('err') and G.get('at') == R['at'] and G.get('sokN') == R['sokN'] and G.get('n') == R['n'] and all(abs(a - c) < 0.06 for a, c in zip(G.get('dA', []), R['dA']))), 'G two days open and closed with the same seed: the same spots, the same searches and the sets where they were', [G.get('at'), R['at']])
        # F: nets, the crew alone; the field's first haul made to look poor against a «first» far above it (q1 set high once the spot is
        # found), so the haul falls under half: she searches again before the nets go out, the field moves, and every set is in the ring
        r = await pg.evaluate(r'''(async () => { D2.reset(6); const home = D2.boat('sjark', 2, false); D2.gear('garn', 12); await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0], err = await mk3(C, 'garn'), o = S.ops; if (err) return {err};
          const R = rec3(o), q = o.places[0]; let at1 = null, forced = false; plan2Start(o);
          const L = await D2.run(2 * 1440 + 600, 'closed', 'F', i => { R.hook(); if (!forced && q.sokT != null && q.at){ at1 = {x:q.at.x, y:q.at.y}; q.q1 = 1e3; forced = true; } });
          return {R:R.out(), at1, at2:q.at, moved:at1 && q.at ? +kmTrue(at1, q.at).toFixed(2) : null, sets:Object.values(R.sets).filter(s => s.fid === q.id).map(s => [+s.a.x.toFixed(3), +s.a.y.toFixed(3), D2.when(s.t)]), msgs:L.msgs.filter(m => /halvparten/.test(m[1])).slice(0, 3), log:L.log.filter(x => /Søkte/.test(x[1])).slice(0, 4), ops:L.ops}; })()''')
        if r.get('err'): print('FEIL F plan3Make:', r['err'])
        else:
            R = r['R']; print('F:', json.dumps({k: r[k] for k in ('at1', 'at2', 'moved', 'sets', 'msgs', 'log')}, ensure_ascii=False)[:900])
            print(ok(r['msgs'] and R['sokN'] >= 2 and r['moved'] is not None and r['moved'] >= 0.4 - 1e-6 and len(r['sets']) >= 2), 'F a haul under half of the field\'s first: she searches again and the field moves before the nets go out', [r['moved'], R['sokN'], len(r['sets'])])
            print(ok(R['allIn'] and R['atIn'] and all(x is not None and x <= 0.15 for x in R['onAt']) and not r['ops']['stop']), 'F every string with its middle in the ring on the spot found, before and after the move, and the plan goes on', [R['dA'], R['onAt'], r['ops']['stop']])
        print('sidefeil:', errs[:5])
        await b.close()

if __name__ == "__main__": asyncio.run(main())
