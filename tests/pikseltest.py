"""Low on a big screen and the lanterns' arcs (15.11.2026; tilbakemelding #112, #113 and #116).

Low draws fewer pixels a step at a time when the frame rate stays under 26 (view3d/00-head.js pxTick, QUAL.pxK): a step that does not
lift the frame rate by 8 % within 6 s is taken back and no more are tried; a step that helps stays, and pxK goes back up after 10 s
over 45. Nothing happens above Low. The canvas follows pxK (18-setup.js resize). The lanterns' arcs (22-docks-air.js lampArc) fade
over a few degrees at their edges instead of switching, so a boat that rolls a degree does not blink them on and off. Prints OK/FEIL
lines; 3D with GAME3D_MIN (logic, no picture)."""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import GAME3D_MIN, boot
from playwright.async_api import async_playwright

ok = lambda c: 'OK  ' if c else 'FEIL'

PX = """(() => { const D = G3._debug, Q = D.QUAL, P = D.pxs, keep = {fix:Q.fix, lvl:Q.lvl, k:Q.pxK}, R = {};
  const reset = () => { Q.pxK = 1; Object.assign(P, {bad:0, good:0, tryAt:0, fps0:0, prev:1, no:false}); };
  let t = performance.now() + 1e6; const run = (fps, s) => { for (let i = 0; i < s * 10; i++){ t += 100; D.qualTick(0.1, fps, t); } return +Q.pxK.toFixed(4); };
  try {
    Q.fix = false; G3.quality('low'); Q.lvl = 0;
    reset(); R.noHelp = [run(20, 6), run(20, 7), P.no, run(20, 8)];          // a step, no gain: back to 1, and no more tried
    reset(); R.helps = [run(20, 6), run(24, 7), P.no, run(24, 7), run(30, 7)]; // a step that helps stays; a second one is tried
    reset(); Q.pxK = 0.5625; R.up = [run(50, 11), run(50, 11), run(50, 11)]; // well over 45: back up a step every 10 s, to 1
    reset(); R.floor = []; for (let i = 0; i < 6; i++){ run(20, 5.2); R.floor.push(run(25, 6.1)); }   // each step helps (20 to 25 b/s): down to the floor
    reset(); G3.quality('high'); Q.lvl = 2; R.high = run(10, 20);            // not above Low
  } finally { G3.quality('low'); Q.fix = keep.fix; }
  return R; })()"""

ARC = """(() => { const D = G3._debug, arc = (th, lp, lk) => { const a = th * Math.PI / 180, R = 1000, M = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, -R * Math.sin(a) - lp[0], -lp[1], R * Math.cos(a) - lp[2], 1]); return +D.lampArc(M, lp, lk).toFixed(3); };
  const sb = [1, 2, 0], po = [-1, 2, 0], st = [0, 2, 3], R = {};
  R.sb = [90, 112, 114, 116, -0.5, -2, -3.5].map(th => arc(th, sb, 'side')); R.po = [-90, -114, 0.5, 2, 3.5].map(th => arc(th, po, 'side'));
  R.st = [180, 120, 111, 108, -111].map(th => arc(th, st, 'stern')); R.mast = arc(30, [0, 5, 0], 'masthead');
  let jump = 0; for (const [lp, lk] of [[sb, 'side'], [po, 'side'], [st, 'stern']]){ let prev = arc(-180, lp, lk); for (let th = -179.9; th <= 180; th += 0.1){ const v = arc(th, lp, lk); jump = Math.max(jump, Math.abs(v - prev)); prev = v; } }
  R.jump = +jump.toFixed(3); return R; })()"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await br.new_context(viewport={'width': 1300, 'height': 900})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME3D_MIN.replace(',no3d', ''))
        await pg.wait_for_function("typeof G3 !== 'undefined' && G3.isActive && G3.isActive()", timeout=180000)
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate(PX); print(json.dumps(r))
        print(ok(r['noHelp'][0] == 0.75 and r['noHelp'][1] == 1 and r['noHelp'][2] is True and r['noHelp'][3] == 1), 'Low under 26 b/s: a step to 0.75, no gain in 6 s, back to 1 and no more tried', r['noHelp'])
        print(ok(r['helps'][0] == 0.75 and r['helps'][1] == 0.75 and r['helps'][2] is False and r['helps'][3] == 0.5625), 'a step that lifts the frame rate 8 % stays, and the next is tried', r['helps'])
        print(ok(r['up'] == [0.75, 1, 1]), 'over 45 b/s for 10 s: a step back up, to 1 at most', r['up'])
        print(ok(min(r['floor']) >= 0.5 and r['floor'][:3] == [0.75, 0.5625, 0.5] and r['floor'][-1] == 0.5), 'never under half the pixels', r['floor'])
        print(ok(r['high'] == 1), 'above Low nothing changes', r['high'])
        # the canvas follows pxK on Low (1300 x 900 is under px0, so only pxK lowers it); pxs.no keeps SwiftShader's own slow frames out
        d = await pg.evaluate("""(async () => { const D = G3._debug, Q = D.QUAL, keep = Q.fix; Q.fix = false; G3.quality('low'); Q.lvl = 0; D.pxs.no = true;
          const w = () => new Promise(r => setTimeout(r, 6000)); Q.pxK = 1; await w(); const a = D.dpr; Q.pxK = 0.5; await w(); const b = D.dpr; Q.pxK = 1; Q.fix = keep; const cv = [...document.querySelectorAll('canvas')].sort((x, y) => y.width * y.height - x.width * x.height)[0].getBoundingClientRect(); return [+a.toFixed(3), +b.toFixed(3), Q.lvl, Math.round(D.fps), Math.round(cv.width * cv.height)]; })()""")
        print(ok(d[0] > 0.99 and abs(d[1] - min(1, (2.1e6 * 0.5 / d[4]) ** 0.5)) < 0.02 and d[1] < 0.99), 'the canvas on Low: full pixels at pxK 1, sqrt(px0 x pxK / area) at 0.5', d)
        a = await pg.evaluate(ARC); print(json.dumps(a))
        print(ok(a['sb'] == [1, 1, 0.5, 0, 1, 0.5, 0] and a['po'] == [1, 0.5, 1, 0.5, 0]), 'the side lights: full in the arc, fading over 3 degrees aft and from 1 to 3 degrees across the bow', a['sb'], a['po'])
        print(ok(a['st'] == [1, 1, 0.5, 0, 0.5]), 'the stern light: full in its 135 degrees, fading over 3 degrees at the edges', a['st'])
        print(ok(a['mast'] == 1), 'the masthead light is not cut by lampArc', a['mast'])
        print(ok(a['jump'] <= 0.06), 'no jump at the edges: at most 0.06 per 0.1 degree', a['jump'])
        print(ok(not errs), 'side errors', errs[:3])
        await br.close()

asyncio.run(main())
