"""One fish all the way in the game (steg 125e, Jonas 15.11.2026: «Fisk teleporterer fra kar til sløyebenk»): the boat hauling line
with the new people (#folk2), and the account of the fish seen on deck read every half second (G3._debug.dk.fv, deckcrew.js
FISKVEI): fish are bled into the tub and gutted out of it into the hatch, every fish is somewhere (the tub, a hand, the table, the air,
out), and where the hauler bleeds himself (work.solo) it is he who bleeds the fish let fall at his side, not one inside or at the
table. Prints OK or FEIL.

  python3 tests/fiskvei3d.py [boat ...]      (default: sjark, the hauler bleeds himself, and sjarkny, with a bleeder)
"""
from _env import boot, GAME
import os
# (the boat set up as tests/dekk125d.py sets her, hauling line: its SET, without running that script)
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dekk125d.py')).read().split('\nasync def main')[0])
import asyncio, sys
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra != '' else ''))


# (each bleeding taken against who hauls at the first reading it is seen, window.__BL keyed by who and when it began: an event stays in D.ev for up to 24 s after, and the
# sjark's hauler carries the tubs himself in between; read against the hauling now, it was taken for one bled away from the hauler, 125f)
READ = """(() => { const D = G3._debug.dk, A = CREW3D.agents(), haul = A.filter(a => a.task === 'haul').map(a => a.id), seen = window.__BL || (window.__BL = new Set()), now = [];
  const T = performance.now() / 1000; for (const e of D.ev){ if (e.kind !== 'bleed' || e.who == null) continue; const k = e.who + '|' + (T - e.age).toFixed(1); if (seen.has(k)) continue; seen.add(k); now.push(e.who); }
  return {fv:D.fv, bleeders:now, haul, solo:!!(geoOf(S.boat.type).work || {}).solo}; })()"""


async def main():
    boats = sys.argv[1:] or ['sjark', 'sjarkny']
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',folk2')
        await pg.wait_for_function("G3.isActive()", timeout=90000); await pg.wait_for_timeout(3000)
        for t in boats:
            n0 = await pg.evaluate("G3._debug.kitStat.n")
            await pg.evaluate(SET, [t, 'line', 0.0, 1.2, 9])
            await pg.wait_for_function("([t, n0]) => { const K = G3._debug.kitStat; return K.vt === t && K.n >= n0 + 4; }", arg=[t, n0], timeout=120000)
            await pg.evaluate("G3._debug.studio(true)")   # (no land, sea or trees drawn, 35 frames a second in place of 1: the boat is what is looked at. After her model is in: in studio from the start the new type was never loaded)
            bad_sum, wrong, last, solo = 0, set(), None, False
            for _ in range(160):   # (80 s of the game's own time at the frame rate SwiftShader gives)
                await pg.wait_for_timeout(500); r = await pg.evaluate(READ); f = r['fv']; n = f['n']; solo = r['solo']
                if f['tub'] + f['hand'] + f['table'] + f['air'] + f['out'] != n['seed'] + n['bled']: bad_sum += 1
                if solo: wrong |= {w for w in r['bleeders'] if w not in r['haul']}
                last = f
            n = last['n']
            check(n['bled'] > 0 and n['out'] > 0, t + ': fisk blir bløgget i karet og sløyd ut i luka', n)
            check(bad_sum == 0, t + ': hver fisk er et sted (karet, hånda, bordet, lufta, luka) i hver avlesning', {'brudd': bad_sum, 'sist': last})
            if solo: check(not wrong, t + ': haleren bløgger selv (ingen andre tar fisken ved slippet)', sorted(wrong))
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
