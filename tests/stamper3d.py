"""The line tubs in use (steg 125f, Jonas 15.11.2026: «tomme linebøtter stables i hverandre etter hvert som lina settes»; «Jeg vil heller
ikke at mannskapet bærer på kasser og sånt som ikke eksisterer og som dukker opp ut av løse lufta»): a boat with a crew sets a string of
line and hauls it again, with the new people (#folk2). Every half second the deck crew's account of the tubs is read (CREW3D.tubAccount,
deckcrew.js STAMPER) against the game's count (S.pgear.lines, b.gop, S.sets): every tub is somewhere, none is laid out anew while the
work goes on (snap), the tubs are carried, and at the end the set ones stand empty in the nest and the hauled ones coiled in the stack.
The game's pace is helped on (g.prog a little each half second) so a set and a haul fit in some minutes of SwiftShader. Pictures
stamper3d_<type>_<what>_<landscape|portrait>.png in tests/out while a tub is carried. Prints OK or FEIL.

  python3 tests/stamper3d.py [boat ...]      (default: sjark)
"""
from _env import boot, GAME, OUT
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dekk125d.py')).read().split('\nasync def main')[0])
import asyncio, sys, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra != '' else ''))


# the set begun as the game begins it (core/10-gear.js startSet), from the scene of tests/dekk125d.py with no haul going on
START = """((n) => { const b = S.boat, pg = S.pgear; b.gop = null; window.CATCHQ = []; pg.lines.hyse.n = n + 2; pg.lines.hyse.baited = n + 1; pg.lines.bank.n = 0; pg.lines.bank.baited = 0;
  pg.kits.n = Math.max(pg.kits.n || 0, 4); S.sets = []; CREW3D.reset(); const why = startSet('line', {lk:'hyse', n}, 0, b.heading || 0); return why ? String(why) : null; })"""
HAUL = """(() => { const s = (S.sets || []).find(x => x.kind === 'line'); if (!s) return 'ingen lenke'; S.boat.pos = {...s.b}; S.boat.status = 'idle'; S.boat.gop = null; const why = startHaul(s.id, false, 0); return why ? String(why) : null; })()"""
READ = """((dp) => { const L = CREW3D.tubAccount(), g = S.boat.gop, pg = S.pgear.lines, K = G3._debug.kitStat || {};
  // (the game's own clock is held, S.mult: the work goes on here, dp of a tub a frame, and ends as the game ends it)
  if (g && g.kind === 'line' && dp){ g.prog += dp; while (g.prog >= 1 && g.done < g.n){ g.prog -= 1; g.done++; } if (g.done >= g.n) (g.op === 'set' ? finishSet : finishHaul)(g, S.t / 60); }
  const w = {slot:0, work:0, nest:0, hand:0}; for (const q of L.T) w[q.at]++;
  const k = {full:0, coil:0, empty:0}; for (const q of L.T) k[q.k]++;
  const out = (S.sets || []).filter(x => x.kind === 'line').reduce((a, x) => a + x.n, 0), g2 = S.boat.gop;
  return {w, k, n:L.T.length, snap:L.n.snap, carried:L.n.carried, job:L.job ? L.job.to.at : null, op:g2 ? g2.op + ' ' + g2.done + '/' + g2.n + ' ' + g2.prog.toFixed(2) : null,
    game:(pg.hyse.n + pg.bank.n) + (g2 && g2.op === 'set' ? g2.n : 0) + out, kst:K.tubs125 || null, ag:CREW3D.agents().map(a => (a.role || a.st) + ':' + a.mode + ':' + a.task)}; })"""
RAFN = "(() => { if (!window.__RAFN){ window.__RAFN = 1; const f = () => { window.__RAFN++; requestAnimationFrame(f); }; requestAnimationFrame(f); } return window.__RAFN; })()"


async def step(pg, ms):
    """The held clock moved ms on and one frame drawn on it."""
    n0 = await pg.evaluate(RAFN); await pg.evaluate("(ms) => { window.__T += ms; }", ms)
    await pg.wait_for_function("(n0) => window.__RAFN >= n0 + 2", arg=n0, timeout=120000)


async def run_op(pg, t, what, tub_s, secs, small):
    """secs of the held clock at 100 ms a frame, the work a tub in tub_s of it."""
    rs, bad, snap0, shot, dp = [], 0, None, False, 0.1 / tub_s
    for i in range(int(secs * 10)):
        await step(pg, 100); r = await pg.evaluate(READ, dp); rs.append(r)
        if snap0 is None: snap0 = r['snap']
        if r['n'] != r['game'] or sum(r['w'].values()) != r['n']: bad += 1
        if os.environ.get('KYST_TRACE') and i % 100 == 0: print('   ', i / 10, r['op'], r['w'], r['k'], 'snap', r['snap'], 'båret', r['carried'], r['job'], r['ag'], flush=True)
        # (a picture in each format while a tub is in someone's hands, once it is up)
        if r['w']['hand'] and not shot and i > 20:
            shot = True
            for vw, vh, tag in [(1280, 800, 'landscape'), (800, 1280, 'portrait')]:
                await pg.set_viewport_size({'width': vw, 'height': vh}); await step(pg, 0); await step(pg, 0)
                await pg.screenshot(path=os.path.join(OUT, f'stamper3d_{t}_{what}_{tag}.png'))
            await pg.set_viewport_size(small)
        if not r['op'] and not r['job'] and r['w']['work'] == 0 and r['w']['hand'] == 0 and i > 10: break
    return rs, bad, snap0


async def main():
    boats = sys.argv[1:] or ['sjark']
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',folk2,rawclock')
        await pg.wait_for_function("G3.isActive()", timeout=90000); await pg.wait_for_timeout(3000)
        for t in boats:
            L = await pg.evaluate("(t) => VESSELS[t].len", t)
            n0 = await pg.evaluate("G3._debug.kitStat.n")
            await pg.evaluate(SET, [t, 'line', 0.0, 1.05, 4.0 + L * 0.7])
            await pg.wait_for_function("([t, n0]) => { const K = G3._debug.kitStat; return K.vt === t && K.n >= n0 + 4; }", arg=[t, n0], timeout=120000)
            await pg.evaluate("G3._debug.studio(2)")
            await pg.evaluate("() => { S.mult = 1e-4; const r = performance.now.bind(performance); window.__R = r; window.__T = r(); performance.now = () => window.__T; }")
            small = {'width': 320, 'height': 200}; await pg.set_viewport_size(small)
            n = 3; why = await pg.evaluate(START, n); check(why is None, t + ': settingen begynner', why)
            for _ in range(30): await step(pg, 100)   # (the deck's account follows the new scene: laid out once, a jump)
            await pg.evaluate("(() => { const L = CREW3D.tubAccount(); window.__SNAP = L.n.snap; })()")
            rs, bad, s0 = await run_op(pg, t, 'setting', 25, 150, small); last = rs[-1]
            check(bad == 0, t + ': setting: hver stamp er et sted, og tellingen er spillets', {'brudd': bad, 'sist': {k: last[k] for k in ('w', 'k', 'n', 'game')}})
            check(last['snap'] == s0, t + ': setting: ingen stamp lagt ut på nytt underveis', {'snap': [s0, last['snap']]})
            sp = await pg.evaluate("(() => { const P = CREW3D.tubWhy().spots; return {set:P.set.length, haul:P.haul.length}; })()")
            # (a deck where the stern and the stack are on parts of the deck with no way between them, deckcrew.js tubSpots: the line runs
            # from the stack and the empty ones stand there until they are hauled; the sjark while she fishes, since steg 125d)
            if sp['set']: check(last['carried'] >= n and last['w']['nest'] >= n and last['w']['work'] == 0 and last['w']['hand'] == 0, t + ': setting: de tomme står i hverandre i reiret, ingen igjen ved hekken', {'w': last['w'], 'båret': last['carried'], 'op': last['op']})
            else: check(last['w']['work'] == 0 and last['w']['hand'] == 0 and last['k']['empty'] == n, t + ': setting fra stabelen (ingen vei på dekk fra stabelen til hekken): de tomme står der lina gikk fra dem', {'w': last['w'], 'plasser': sp})
            c0 = last['carried']
            why = await pg.evaluate(HAUL); check(why is None, t + ': halingen begynner', why)
            rs, bad, s1 = await run_op(pg, t, 'haling', 30, 180, small); last = rs[-1]
            check(bad == 0, t + ': haling: hver stamp er et sted, og tellingen er spillets', {'brudd': bad, 'sist': {k: last[k] for k in ('w', 'k', 'n', 'game')}})
            check(last['snap'] == s1, t + ': haling: ingen stamp lagt ut på nytt underveis', {'snap': [s1, last['snap']]})
            check(last['carried'] - c0 >= n and last['w']['nest'] == 0 and last['w']['work'] == 0 and last['w']['hand'] == 0 and last['k']['empty'] == 0, t + ': haling: de fulle står i stabelen, reiret er tomt', {'w': last['w'], 'k': last['k'], 'båret': last['carried'] - c0, 'op': last['op']})
            print('   ', t, 'plasser', sp, 'mannskapet sist:', last['ag'])
        gerr = await pg.evaluate("G3._debug.glErr()")
        check(gerr == 0, 'ingen GL-feil', gerr)
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
