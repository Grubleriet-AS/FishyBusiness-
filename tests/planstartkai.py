# The plan started at a quay that is not the home it picks (Driftsplan 3 picks the home itself, core/06k-plan3.js plan3Home, and the player
# lies where the player lies): the way from that quay to the places, the home and the plant is made with the plan (plan2Make), so the
# first trip needs no way found. Before, only the ways from the home and the plant were made, and the first trip asked for its way when
# it was to leave, the next morning, most often with the game closed: the time away is played in without a pause long enough for a way
# to be found on a phone (drWaiting, 20 s), and the boat lay at the quay with «Finner veien …» for as long as the player was away
# (Adrian 24.11.2026: «Sto på i en dag på ordentlig. Han gikk ikke ut å fiska en gang», tilbakemeldingene 367 and 398). Here the day is
# played closed with no real time between the hours, so no way can be found on the way: she must leave on the ways the plan made.
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
        r = await pg.evaluate("""(async () => { D2.reset(1); const at = 'botnhamn', P = portById(at), near = portById('husoy'); D2.boat('sjark', 1, true, at); await mapNeed(P.p, 14); await mapNeed(near.p, 14);
          const C = D2.spots(1, 1, 4, near.p)[0], err = await mk3(C, 'juksa', {tackle:'mark'}), o = S.ops; if (err) return {err};
          const out = {home:o.home, at, places:o.places.length, legs:o.places.map(q => !!drLeg(o, P.p, at, q, null)), legHome:!!drLeg(o, P.p, at, portById(o.home).p, o.home), seq:[]};
          plan2Start(o); let last = '', left = false, route = 0;
          for (let k = 0; k < 30; k++){ await D2.run(60, 'closed', 'k'); const w = o.run && o.run.wait, s = S.boat.status + (S.boat.port ? '@' + S.boat.port : '') + (w ? ' ' + w.k : '');
            if (S.boat.port !== at) left = true; if (w && w.k === 'route') route++; if (s !== last){ out.seq.push(hm(S.t / 60) + ' ' + s); last = s; } }
          out.left = left; out.route = route; return out; })()""")
        print(json.dumps(r, ensure_ascii=False)[:900])
        if r.get('err'): print('FEIL the plan is made', r['err'])
        else:
            print(ok(r['home'] != r['at']), 'the plan picks a home that is not the quay she lies at (else this test tries nothing)', [r['home'], r['at']])
            print(ok(all(r['legs']) and r['legHome']), 'the ways from the quay she lies at to every place and to the home are made with the plan', [r['legs'], r['legHome']])
            print(ok(r['left'] and r['route'] == 0), 'played closed with no time to find a way, she leaves the quay on the plan and never waits for a way', [r['left'], r['route'], r['seq'][:6]])
        print(ok(not errs), 'no page errors', errs[:3])
        await b.close()
asyncio.run(main())
