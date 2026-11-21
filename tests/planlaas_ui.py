# The plan locked on «Lager planen …» (feedback 220, 21.11.2026): a plan saved while it was being made (building:true) and loaded again.
# Without 3D, on Senja: the Driftsplan page shows Start, not «Lager planen …», and the ring can be moved; then the plan is made and started.
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
        r = await pg.evaluate("""(async () => { D2.reset(1); const home = D2.boat('sjark', 2, true); await mapNeed(portById(home).p, 14);
          const C = D2.spots(1, 5, 10)[0];
          // as a save carries it: made, then paused, then building:true written in the middle of a new make, and loaded again (JSON)
          const o0 = plan3New(C, 'juksa', {tackle:'mark'}); o0.building = true; o0.paused = {t:S.t}; S.ops = JSON.parse(JSON.stringify(o0));
          const h = PLAN2UI.page(), o = S.ops;
          const res = {lager:/Lager planen/.test(h), start:/Start planen|Ikke klar/.test(h), building:o.building, locked:/Sett planen på pause for å flytte ringen/.test(h)};
          const err = await new Promise(r => plan3Make(o, e => r(e || null))); res.err = err;
          if (!err){ PLAN2UI.act('p2-start', {}); res.on = !!S.ops.on; }
          return res; })()""")
        print('svar:', json.dumps(r, ensure_ascii=False))
        print(ok(not r['lager'] and r['start']), 'a plan loaded with building:true shows Start, not «Lager planen …»', [r['lager'], r['start']])
        print(ok(r['building'] is False), 'the flag from the save is gone', r['building'])
        print(ok(not r['err'] and r.get('on')), 'the plan is made and started again', [r['err'], r.get('on')])
        print('sidefeil:', errs)
        await b.close()

asyncio.run(main())
