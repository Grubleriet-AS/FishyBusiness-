"""An ocean vessel in the chart plotter (core/06b-coastports.js placeWhy and innWhy, ui/03-map.js; Jonas 28.11.2026): a place she is not
sent to, by its quay or by the way in to it (src/data/innseiling.json, measured by the planner), is toned down in the chart, and a
tap on it, with Autonav or to set a point of a route by hand, sets nothing and says why. A coastal boat sees and taps it as before.
The limit is put in by the test (the yard at Lesund, 45.4 m), so the test does not hang on what the data has. Prints OK or FEIL."""
import asyncio, json
from _env import GAME, boot
from playwright.async_api import async_playwright

PID = 'sv422503_1010231'


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra else ''))


PUT = """async ([pid, type, lim]) => { const b = S.boat, q = portById(pid); S.tut = 0; b.type = type; if (!S.owned.includes(type)) S.owned.push(type); applyVessel(); await mapNeed(q.p, 6);
  b.status = 'idle'; b.port = null; b.pos = {x:q.p.x + 1.2, y:q.p.y + 0.8}; S.draft = []; S.plan = null; if (lim) INNSEILING.maks[pid] = lim; else delete INNSEILING.maks[pid];
  const w = placeWhy(q, b.type); return {cls:BOAT.cls, why:w ? w[0] : null}; }"""
VIEW = """pid => { const q = portById(pid).p; view.cx = q.x; view.cy = q.y; view.z = 6; applyView(); renderStatic(); renderDyn(); const r = svg.getBoundingClientRect();
  PLACE_NOGO.at = 0; const no = placeNoGo(portById(pid)); renderStatic(); return {no, dim:svg.querySelectorAll('g[opacity="0.4"]').length, at:[r.left + r.width / 2, r.top + r.height / 2]}; }"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
        await pg.click('#miniPlot'); await pg.wait_for_timeout(1200)
        await pg.evaluate("() => { window.TT = []; const t0 = toast; toast = (m, ...r) => { TT.push(String(m)); return t0(m, ...r); }; }")   # (every toast, in order: the rules' own words come too when the boat is changed)

        async def tap(type, lim, arm):
            r = await pg.evaluate(PUT, [PID, type, lim]); v = await pg.evaluate(VIEW, PID); await pg.wait_for_timeout(300)
            await pg.wait_for_timeout(600); await pg.evaluate("a => { LEIA_ARM = a; TT.length = 0; }", arm)
            await pg.mouse.click(v['at'][0], v['at'][1]); await pg.wait_for_timeout(900 if not arm else 2500)
            o = await pg.evaluate("() => ({n:S.draft.length, port:S.draft.length ? S.draft[S.draft.length - 1].port : null, toast:TT.join(' | ')})")
            await pg.evaluate("() => { S.draft = []; LEIA_ARM = false; }"); return dict(r, **v, **o)

        a = await tap('pelagisk', None, False); print('uten grense', json.dumps(a, ensure_ascii=False)[:300])
        base = a['dim']
        check(a['cls'] == 'hav' and a['why'] is None and not a['no'] and a['port'] == PID, 'without a limit the yard takes the 75 m vessel: not toned down, and a tap ends the route there', [a['why'], a['dim'], a['port']])
        b = await tap('pelagisk', [45.4, 'trangt'], False); print('med grense, for hånd', json.dumps(b, ensure_ascii=False)[:300])
        check(b['why'] and 'Innseilingen' in b['why'] and b['no'] and b['dim'] == base + 1, 'with the way in measured to 45.4 m the place is toned down for her', [b['why'], b['dim']])
        check(b['n'] == 0 and 'Innseilingen hit er for trang' in b['toast'], 'a point set by hand on it sets nothing and says why', [b['n'], b['toast'][:80]])
        c = await tap('pelagisk', [45.4, 'trangt'], True); print('med grense, Autonav', json.dumps(c, ensure_ascii=False)[:300])
        check(c['n'] == 0 and 'Innseilingen hit er for trang' in c['toast'], 'the tap of Autonav on it finds no route and says why', [c['n'], c['toast'][:80]])
        d = await tap('autoliner', [45.4, 'trangt'], False); print('autolineren', json.dumps(d, ensure_ascii=False)[:300])
        check(d['why'] is None and not d['no'] and d['port'] == PID, 'the 45.4 m vessel, which has a way in, is sent there as before', [d['why'], d['dim'], d['port']])
        e = await tap('kyst21', [0, 'grunt'], False); print('kystbåten', json.dumps(e, ensure_ascii=False)[:300])
        check(e['why'] is None and e['dim'] == 0 and e['port'] == PID, 'a coastal boat sees and taps the place as before, whatever the limit', [e['dim'], e['port']])
        print('sidefeil', errs); await br.close()
asyncio.run(main())
