"""The old wooden boat (trebat) in steg 125e (Jonas 15.11.2026, a clip from her: the fish came aboard without being cranked up, the hands
were not on the crank, the line or the tiller): the hand jig's round read from the game (G3._debug.SK.anim.jk: the pilk let down, jigged,
cranked up, at the roller) with a picture at each, and the skipper at the tiller while she turns, in both formats. The account of the fish:
none let go while he jigs (the queue only shrinks as they are cranked up). Pictures trebat125e_<what>_<format>.png in tests/out. Prints OK or FEIL.

The jig on a locked clock (steg 125e, second session): SwiftShader gives a frame or less a second, and the jig and the bleeding go by
the frame's dt (at most 0.1 s a frame) while the hooked fish came by the wall's clock, so at 1280x800 he had bled 3 fish in two minutes
and the pilk never came up. Here the page's performance.now is held and moved 100 ms a frame (rawclock), a fish is hooked every 4 s of
that time, the window is small while it runs (cheaper frames) and full size for the pictures, in the white room (studio).
"""
from _env import boot, GAME, OUT
import asyncio, os
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra != '' else ''), flush=True)


SET = """((a) => { const [scene, yaw, pitch, dist] = a, b = S.boat, g = GROUNDS[0].p; S.tut = 0; S.t = Math.round((Date.UTC(2027, 2, 12, 11) - EPOCH) / 6e4);
  b.type = 'trebat'; applyVessel(); G3.vesselChanged(); S.boatName = 'Havbris'; S.equip = {}; S.jobs = []; S.cargo = []; b.gop = null; S.plan = null; S.crew = []; S.me = S.cur; S.myJob = null; S.rest = null;
  b.port = null; b.pos = {x:g.x, y:g.y}; b.heading = 0.4; b.fuel = BOAT.fuelCap; b.deckStop = false; S.hold = []; S.settings.gut = false; S.settings.ice = false;   // (nobody goes to gut: the one aboard jigs)
  window.CATCHQ = []; clearInterval(window.FEED); clearInterval(window.TURN);
  if (scene === 'jig'){ b.status = 'fishing'; b.fishUntil = S.t + 600; b.v = 0; b.rig = 'juksa'; b.gear = true; S.target = 'torsk'; window.jigActive = false;
    // (the fishing step's fish, as it hooks them, the kilos in the hold as the game puts them there)
    window.FEED = setInterval(() => { const f = {sp:'torsk', kg:2 + Math.random() * 3, t:performance.now()}; window.CATCHQ.push(f); S.hold.push({sp:'torsk', cls:SPECIES.torsk.ref, kg:f.kg, n:1, bled:true, iced:false, hr:Math.floor(S.t / 60), fresh:100, gut:false, hook:true}); window.HOOKED = (window.HOOKED || 0) + 1; }, 4000); }   // (a fish every 4 s: more than the game hooks on a hand jig, less than one man can crank up and bleed)
  else { b.status = 'sailing'; b.v = 3; b.fishUntil = null; b.rig = 'juksa';
    // (she turns: the heading swung to and fro, so the tiller goes over)
    window.TURN = setInterval(() => { b.heading += 0.035 * Math.sign(Math.sin(performance.now() / 4000)); }, 100); }
  const c = G3._debug.cam; c.helm = false; c.pitch = pitch; c.yaw = yaw; c.dist = dist; })"""

JK = "(() => { const A = G3._debug.SK && G3._debug.SK.anim; const J = A && A.jk; return J ? {st:J.st, d:+J.d.toFixed(2), on:J.fish.length, q:(window.CATCHQ || []).length, hooked:window.HOOKED || 0, bled:A.nb || 0, bq:A.bq.length, bl:!!A.bl, fly:A.fly.length} : null; })()"



RAFN = "(() => { if (!window.__RAFN){ window.__RAFN = 1; const f = () => { window.__RAFN++; requestAnimationFrame(f); }; requestAnimationFrame(f); } return window.__RAFN; })()"
HOOK = """(() => { const f = {sp:'torsk', kg:2 + Math.random() * 3, t:performance.now()}; window.CATCHQ.push(f); S.hold.push({sp:'torsk', cls:SPECIES.torsk.ref, kg:f.kg, n:1, bled:true, iced:false, hr:Math.floor(S.t / 60), fresh:100, gut:false, hook:true}); window.HOOKED = (window.HOOKED || 0) + 1; })()"""


async def step(pg, ms):
    """The held clock moved ms on and one frame drawn on it."""
    n0 = await pg.evaluate(RAFN); await pg.evaluate("(ms) => { window.__T += ms; }", ms)
    await pg.wait_for_function("(n0) => window.__RAFN >= n0 + 2", arg=n0, timeout=120000)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',folk2,rawclock')
        await pg.wait_for_function("G3.isActive()", timeout=90000); await pg.wait_for_timeout(3000)
        for vw, vh, tag in [(1280, 800, 'liggende'), (800, 1280, 'staende')]:
            await pg.set_viewport_size({'width': vw, 'height': vh})
            await pg.evaluate(SET, ['jig', -1.2, 0.35, 5.5]); await pg.wait_for_timeout(3000)
            await pg.evaluate("() => { clearInterval(window.FEED); window.HOOKED = 0; }")
            await pg.evaluate("G3._debug.studio(true)")   # (no land, sea, shadows or sky: the boat and her people in the white room, after her model is in)
            await pg.evaluate("() => { const r = performance.now.bind(performance); window.__R = r; window.__T = r(); performance.now = () => window.__T; }")
            seen, lost, last, k = {}, 0, None, 0
            await pg.set_viewport_size({'width': vw // 4, 'height': vh // 4})
            for k in range(1500):   # (150 s of the game's time at most)
                if k % 40 == 0: await pg.evaluate(HOOK)
                await step(pg, 100)
                r = await pg.evaluate(JK)
                if r:
                    last = r
                    if r['st'] not in seen:
                        seen[r['st']] = 1; await pg.set_viewport_size({'width': vw, 'height': vh}); await step(pg, 0)
                        await pg.screenshot(path=os.path.join(OUT, f'trebat125e_juksa_{r["st"]}_{tag}.png')); await pg.set_viewport_size({'width': vw // 4, 'height': vh // 4})
                    if r['hooked'] - (r['q'] + r['on'] + r['bq'] + (1 if r['bl'] else 0) + r['bled']) > 1: lost += 1
                    if len(seen) == 4 and r['bled'] >= 3: break
            await pg.set_viewport_size({'width': vw, 'height': vh})
            await pg.evaluate("() => { performance.now = window.__R; G3._debug.studio(false); }")
            print('juksa %s: %.1f s av spillets tid' % (tag, (k + 1) / 10), flush=True)
            if tag == 'liggende':
                check(set(seen) >= {'down', 'jig', 'up', 'top'}, 'juksa går ned, nappes, sveives opp og er oppe', list(seen))
                check(last and last['bled'] >= 3, 'fisken sveives opp og bløgges (minst tre)', last)
                check(lost == 0, 'ingen fisk er borte mellom kroken og karet (kroket = venter + på snøret + i hånda + bløgget)', {'brudd': lost, 'sist': last})
            await pg.evaluate(SET, ['sail', -2.0, 0.5, 4.2]); await pg.wait_for_timeout(9000)
            await pg.screenshot(path=os.path.join(OUT, f'trebat125e_rorkult_{tag}.png'))
        await pg.evaluate("() => { clearInterval(window.FEED); clearInterval(window.TURN); }")
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
