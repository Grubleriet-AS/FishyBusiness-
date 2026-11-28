"""Autonav 2.0 behind #autonav2 (steg 143, core/17d-styr.js; Jonas 27.11.2026: «Ført langs banen»). At «Kast loss» the plan is put on
checked banes (styrPlan: planBane from her berth, with her whole hull), she lies at the quay while they are found (styrWait), and
the minute step follows the bane to the stop and back to her berth. Without the flag nothing of it happens.
1. Without the flag: depart leaves the plan as it was (no bane, no wait).
2. With it, out of Husøy to open water with the game shut (the minute step alone): she waits while the banes are found and has
   not moved, the plan gets a bane, the minute step follows it every minute to the stop, and she ends there, never aground.
3. Back in with the game looked at (the boat model each frame): the tick carries her along the bane, and she is in port.
Needs dist-vec/ (the vec packs the planner's map reads; run.py builds it once, KYST_VEC_BUILT). Prints OK or FEIL per check."""
import asyncio, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('KYST_DIST', os.path.join(ROOT, 'dist-vec'))
from _env import GAME, boot
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra else ''))


# (TAB.held: the game's own loop is held, as the hunt holds it, tests/allesteder.py: the test plays the minutes and the frames itself)
PUT = """async () => { TAB.held = true; const b = S.boat, pid = 'husoy', pt = portById(pid); S.tut = 0; S.settings.autoOn = false; S.me = S.cur; S.plan = null; S.sleep = null; S.energy = 100;
  await mapNeed(pt.p, 6); b.status = 'port'; b.port = pid; b.berth = 'main'; b.pos = {x:pt.p.x, y:pt.p.y}; b.dyn = null; b.fuel = BOAT.fuelCap; b.landQ = null;
  let open = null; for (let rr = 0.5; rr <= 3 && !open; rr += 0.25) for (let a = 0; a < 6.28; a += 0.26){ const c = {x:pt.p.x + Math.cos(a) * rr, y:pt.p.y + Math.sin(a) * rr}; try { if (!isLand(c) && depthF(c) > 15 && coastDist(c) > 0.3){ open = c; break; } } catch (e){} }
  window.T2 = {pid, open, inc0:(S.incidents || []).length}; return {open:!!open, type:b.type, cast:CAST_MIN, hold:STYR.hold}; }"""

OFF = """() => { const b = S.boat, T = window.T2; PLAN.on = false; S.plan = {wps:[{x:T.open.x, y:T.open.y, port:null, fish:0}], idx:0, speed:BOAT.vcruise, returning:false, depAt:null};
  const pl = S.plan, ok = depart(), r = {dep:ok, wait:!!pl.b2w, b2:!!pl.b2, n:pl.wps.length};
  S.plan = null; b.status = 'port'; b.port = T.pid; b.castUntil = null; S.stats.trips--; return r; }"""

# cast off with the flag, the minute steps while the banes are found (she waits), then till the search is done
GO = """async ([to, eng]) => { const b = S.boat, T = window.T2, p0 = {x:b.pos.x, y:b.pos.y}; PLAN.on = true; DYN.on = eng === 'modell';
  S.plan = {wps:[to === 'sea' ? {x:T.open.x, y:T.open.y, port:null, fish:0} : {x:portById(T.pid).p.x, y:portById(T.pid).p.y, port:T.pid, fish:0}], idx:0, speed:BOAT.vcruise, returning:false, depAt:null};
  const pl = S.plan, r = {dep:depart(), wait0:!!pl.b2w, st0:b.status};
  // (three minutes of the game while the search is at it: the lines are in after one, and she lies where the quay put her)
  step(); const p1 = {x:b.pos.x, y:b.pos.y}; r.st1 = b.status; if (eng === 'modell') for (let k = 0; k < 40; k++) dynTick(0.25); step(); step(); r.waitStill = !!pl.b2w || !!pl.b2; r.moved = Math.round(dist(b.pos, p1) * 1000); r.cast = Math.round(dist(p1, p0) * 1000);
  const t0 = performance.now(); while (pl.b2w && performance.now() - t0 < 150000) await new Promise(q => setTimeout(q, 100));
  r.ms = Math.round(performance.now() - t0); r.b2 = !!pl.b2; r.legs = pl.b2 ? pl.b2.legs.length : 0; r.n = pl.wps.length; r.same = S.plan === pl;
  const g = pl.b2 && pl.b2.legs[0]; r.time = g && baneOf(g) ? Math.round(baneOf(g).B.time) : null; r.len = g && baneOf(g) ? Math.round(baneOf(g).B.len) : null;
  const T0 = S.t, going = () => S.plan === pl && b.status !== 'port' && b.status !== 'idle' && b.status !== 'aground' && S.t - T0 < 240; let n = 0, on = 0;
  // the minute step alone (the game shut, catchUp), or the game's own loop with the boat model each frame (ui/08-actions.js)
  if (eng === 'modell'){ acc = 0; lastWall = Date.now(); while (going()){ if (!simAreaReady()){ await mapNeed(b.pos, 4); await new Promise(q => setTimeout(q, 20)); continue; } n++; if (styrOn(pl) && dynLive()) on++; dynTick(0.25); acc += 0.25 * simRate() / 60; lastWall = Date.now(); while (acc >= 1){ step(); acc -= 1; } } }
  else { let waits = 0; while (going()){ if (!simAreaReady()){ await mapNeed(b.pos, 4); await new Promise(q => setTimeout(q, 20)); continue; } if (sailWaiting() && waits++ < 1500){ await new Promise(q => setTimeout(q, 20)); continue; } n++; if (styrOn(pl)) on++; step(); } }   // (the map round her is waited for, as the game's own loop waits)
  r.min = S.t - T0; r.n = n; r.on = on; r.st = b.status; r.port = b.port; r.plan = !!S.plan; r.inc = (S.incidents || []).length - T.inc0;
  const end = to === 'sea' ? T.open : (planEnd(T.pid, b.type) || portById(T.pid).p); r.dEnd = Math.round(dist(b.pos, end) * 1000); return r; }"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
        put = await pg.evaluate(PUT); print('oppsett', json.dumps(put))
        check(put['open'], 'open water is found by Husøy')
        off = await pg.evaluate(OFF); print('uten flagget', json.dumps(off))
        check(off['dep'] and not off['wait'] and not off['b2'] and off['n'] == 1, 'without the flag «Kast loss» leaves the plan as it was (no bane, no wait)')
        ut = await pg.evaluate(GO, ['sea', 'bakgrunn']); print('ut', json.dumps(ut))
        check(ut['dep'] and ut['wait0'], 'with the flag she waits for her banes at «Kast loss»')
        check(ut['st1'] == 'sailing' and ut['moved'] == 0 and ut['waitStill'], 'and lies at the quay while they are found (the lines in, two minute steps more: 0 m)', [ut['st1'], ut['moved'], ut['cast']])
        check(ut['b2'] and ut['legs'] == 1 and ut['len'] > 300 and ut['same'], 'the plan gets a bane in place of its one point', [ut['legs'], ut['len'], ut['ms']])
        check(ut['on'] == ut['n'] and ut['n'] > 1, 'the minute step follows the bane every minute she sails (the game shut)', [ut['on'], ut['n']])
        check(ut['st'] == 'idle' and ut['dEnd'] <= 3 and ut['inc'] == 0, 'she ends at the stop, never aground', [ut['st'], ut['dEnd'], ut['inc']])
        check(ut['time'] is not None and ut['min'] <= ut['time'] / 60 * 3 + 6, 'in the time the bane and the harbour\'s 5 knots give (under three times the bane\'s own, and 6 min)', [ut['min'], ut['time']])
        inn = await pg.evaluate(GO, ['port', 'modell']); print('inn', json.dumps(inn))
        check(inn['dep'] and inn['b2'] and inn['legs'] == 1 and inn['len'] > 300, 'back in: the plan gets a bane from where she lies at sea', [inn['legs'], inn['len'], inn['ms']])
        check(inn['moved'] == 0, 'she lies still while it is found, with the boat model on too', inn['moved'])
        check(inn['on'] > 0.9 * inn['n'] and inn['n'] > 100, 'the boat model\'s tick carries her along it (the game looked at)', [inn['on'], inn['n']])
        check(inn['st'] == 'port' and inn['port'] == 'husoy' and inn['inc'] == 0, 'and she is in port at Husøy, never aground', [inn['st'], inn['port'], inn['inc']])
        check(inn['time'] is not None and inn['min'] <= inn['time'] / 60 * 3 + 6, 'in the same time as the minute step would take her', [inn['min'], inn['time']])
        print('sidefeil', errs); await br.close()
asyncio.run(main())
