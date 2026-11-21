# The plan locked on «Lager planen …» (feedback 220, 21.11.2026): a plan saved while it was being made (building:true) and loaded again.
# Without 3D, on Senja. A: loaded with the flag, the Driftsplan page shows Start, not «Lager planen …», the ring can be moved (the row Sted
# open), the flag is gone, and the plan is made and started. B: while a make runs in the page the page says «Lager planen …» and the ring is
# locked (Start tapped as the player does). C: a make given up (as plan2Building does after P2MAKE_MAX, a phone that slept) answers nothing when it ends: no cb, no made;
# the newer make answers once.
import asyncio, json
from playwright.async_api import async_playwright
from _env import boot
from driftsplan2test import D2
ok = lambda c: 'OK  ' if c else 'FEIL'
LOCK = 'Sett planen på pause for å flytte ringen'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        await pg.evaluate(D2)
        r = await pg.evaluate("""(async () => { D2.reset(1); const home = D2.boat('sjark', 2, true); await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0], LOCK = '""" + LOCK + """';
          // A: as a save carries it: paused, with building:true written in the middle of a make, and loaded again (JSON)
          const o0 = plan3New(C, 'juksa', {tackle:'mark'}); o0.building = true; o0.paused = {t:S.t}; S.ops = JSON.parse(JSON.stringify(o0));
          PLAN2UI.act('p2-row', {k:'sted'}); const h = PLAN2UI.page(), o = S.ops;
          const A = {lager:/Lager planen/.test(h), start:/Start planen|Ikke klar/.test(h), building:o.building, locked:h.includes(LOCK), mapBtn:/p2-map/.test(h)};
          // B: Start, as the player taps it: the make under way in the page (the page's mark first, then plan2Make's flag)
          A.err = o.err || null; PLAN2UI.act('p2-start', {});
          const hB = PLAN2UI.page(); const B = {lager:/Lager planen/.test(hB), locked:hB.includes(LOCK)};
          for (let i = 0; i < 600 && !S.ops.on && !S.ops.err; i++) await new Promise(r => setTimeout(r, 100));
          A.err = S.ops.err || null; A.on = !!S.ops.on;
          // C: make 1 given up (its mark gone, as after P2MAKE_MAX), make 2 started; both run to the end
          const o3 = S.ops = plan3New(C, 'juksa', {tackle:'mark'}); const C3 = {n1:0, n2:0};
          const p1 = plan3Make(o3, () => { C3.n1++; }); P2MAKING.delete(o3); o3.building = false;
          const p2 = plan3Make(o3, () => { C3.n2++; });
          await Promise.all([p1, p2]); await new Promise(r => setTimeout(r, 50));
          C3.made = !!o3.made; C3.building = o3.building;
          return {A, B, C:C3}; })()""")
        print('svar:', json.dumps(r, ensure_ascii=False))
        A, B, C = r['A'], r['B'], r['C']
        print(ok(not A['lager'] and A['start']), 'A a plan loaded with building:true shows Start, not «Lager planen …»', [A['lager'], A['start']])
        print(ok(A['building'] is False), 'A the flag from the save is gone', A['building'])
        print(ok(not A['locked'] and A['mapBtn']), 'A the ring can be moved (the row Sted open, its button there)', [A['locked'], A['mapBtn']])
        print(ok(not A['err'] and A.get('on')), 'A the plan is made and started again', [A['err'], A.get('on')])
        print(ok(B['lager'] and B['locked']), 'B Start tapped, while the make runs: «Lager planen …» and the ring locked', B)
        print(ok(C['n1'] == 0 and C['n2'] == 1 and C['made'] and C['building'] is False), 'C a make given up answers nothing; the newer answers once', C)
        print('sidefeil:', errs)
        await b.close()

asyncio.run(main())
