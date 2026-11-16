"""The feet walking (FB3, steg 121, 16.11.2026; deckcrew.js footStep and FOT, view3d/08-plants.js drawWorker footNow,
view3d/20-trawl-seine.js drawDeckCrew): on three boats (small, middle and large by VESSELS' fields, as tests/sjobein.py) the crew are
sent between their work and their breaks, and what drawWorker drew (SJOBEIN.log) is read every frame: each foot that stands, taken
back into the boat's frame from where it was drawn, moves under 1 cm from when it is put down to when it is lifted (the IK, the hips
and the guards included), at 1.2 m/s on a level deck and at 0.78 m/s in a roll over 0.14 rad; each foot that stands walking is within
1 cm of the deck at 0, 8 and 15° of roll (point 3: the sea legs hold walking); the steps' length and beat are printed; and the time
drawDeckCrew takes a figure with the gait off and on. «#fot0» (KYST_FOT=0) is the old gait: the same measure is red there.

  python3 tests/fotgli.py          the checks (prints OK or FEIL)
  KYST_FOT=0 python3 tests/fotgli.py    with #fot0: the «before»
"""
from _env import boot, GAME3D_MIN as GAME
import asyncio, json, math, os
from playwright.async_api import async_playwright

OFF = os.environ.get('KYST_FOT') == '0'
URL = GAME + (',fot0' if OFF else '')
DEG = math.pi / 180
bad = []


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:600]) if extra != '' else ''), flush=True)
    if not ok: bad.append(what)


BOATS = "Object.keys(VESSELS).filter(t => VESSELS[t].cls !== 'hav' && VESSELS[t].hold.kind === 'rom').sort((a, b) => VESSELS[a].len - VESSELS[b].len).filter((t, i, A) => i === 0 || i === (A.length >> 1) || i === A.length - 1)"

# the boat on a ground with three hands, lying idle (the breaks) or hauling line; the crew's speed held as a roll asks (FROLL: the
# agents' own roll, deckcrew.js setSea, so over 0.14 rad they walk at 0.78 m/s), the drawn deck as SJOBEIN.test
SET = """((a) => { const [type, scene] = a, b = S.boat, g = GROUNDS[0].p; S.tut = 0; S.t = Math.round((Date.UTC(2027, 2, 12, 11) - EPOCH) / 6e4); WX_FORCE = {w:1, d:250};
  if (!window._ss){ window._ss = CREW3D.setSea; CREW3D.setSea = (r, p, y, h) => window._ss(window.FROLL != null ? window.FROLL : r, p, y, h); }
  b.type = type; applyVessel(); G3.vesselChanged(); S.equip = {linehaler:true}; S.jobs = []; S.cargo = []; b.gop = null; S.plan = null; S.settings.gut = true; S.settings.ice = true; S.settings.careAuto = false;
  S.pgear = newPGear(); S.sets = []; b.ice = 300; b.fuel = BOAT.fuelCap; b.deckStop = false; S.me = S.cur; S.myJob = null; S.rest = null;
  S.crew = [0, 1, 2].map(() => Object.assign(genCrew(), {bi:false, off:false, fatigue:5, morale:70, job:null, traits:[]}));
  b.port = null; b.pos = {x:g.x, y:g.y}; b.heading = 0.4; b.v = 0; S.hold = []; b.status = 'idle'; b.fishUntil = null; b.rig = 'line'; window.CATCHQ = [];
  CREW3D.reset(); const c = G3._debug.cam; c.helm = false; c.pitch = 0.6; c.yaw = -0.75; c.dist = 9; })"""
# the work changes: to the line coming in (hauler, bleeding, gutting, packing) or back to the breaks
WORK = """((on) => { const b = S.boat, g = GROUNDS[0].p; const fish = (kg, gut, iced) => ({sp:'torsk', cls:SPECIES.torsk.ref, kg, n:Math.round(kg / 3), bled:true, iced, hr:Math.floor(S.t / 60), fresh:100, gut, hook:true});
  if (on){ S.hold = [fish(220, false, false), fish(12, true, false)]; b.status = 'fishing'; b.fishUntil = S.t + 600; S.pgear.lines.hyse.n = 4; S.pgear.lines.hyse.baited = 2; b.gop = {op:'haul', kind:'line', n:6, done:2, prog:0.3, sub:0, sl:6, hooksPer:600, a:{x:g.x, y:g.y}, b:{x:g.x + 0.6, y:g.y}, lead:0, kg:0, rel:0, dead:0}; }
  else { b.gop = null; S.hold = []; b.status = 'idle'; b.fishUntil = null; }
  CREW3D._st.ctxT = -1e9; })"""


async def frames(pg, t, n=4, timeout=180000):
    n0 = await pg.evaluate("G3._debug.kitStat.n")
    await pg.wait_for_function("([t, n0, n]) => { const K = G3._debug.kitStat; return K.vt === t && K.n >= n0 + n; }", arg=[t, n0, n], timeout=timeout)


def deckpos(g, f):
    """A drawn foot (world) taken back to the boat's frame through where he is on the deck (fs: x, z, h) and his drawn heading (hs)."""
    s = g['fs']; d = [f[0] - g['x'], f[2] - g['z']]; hs = s['hs']
    a = d[0] * math.sin(hs) - d[1] * math.cos(hs); r = d[0] * math.cos(hs) + d[1] * math.sin(hs)
    return [s['x'] + a * math.sin(s['h']) + r * math.cos(s['h']), s['z'] - a * math.cos(s['h']) + r * math.sin(s['h'])]


def sole(g, i):
    """How far a sole is from the deck under it: the deck's plane through the point he stands on, raised by that deck's own height
    where the foot is (a step, fs.fy: the boat's frame, so along the deck's normal)."""
    f = g['feet'][i]; n = g['n']; fy = g['fs'].get('fy', [0, 0])[i] if g.get('fs') else 0
    return abs((f[0] - g['x']) * n[0] + (f[1] - g['y']) * n[1] + (f[2] - g['z']) * n[2] - fy) if n else 0


# n steps of dt seconds: the agents ticked by the test alone (the page's own frames hold them: SwiftShader draws a frame in some
# seconds, and a gap over half a second puts the feet under him, footStep), the drawing reckoned without the GPU (LEMMER.redraw, as
# tests/lemmer.py) on the test's own clock (FOT.clock), and what drawWorker drew of each walking figure kept
STEPS = """(([n, dt]) => { if (!window._tk){ window._tk = CREW3D.tick; CREW3D.tick = d => { if (!window.HOLD) window._tk(d); }; } window.HOLD = true;
  if (FOT.clock == null) FOT.clock = 1000; const out = [];
  for (let i = 0; i < n; i++){ FOT.clock += dt; CREW3D._st.clk; window._tk(dt); LEMMER.log.length = 0; SJOBEIN.log = []; LEMMER.redraw();
    out.push(SJOBEIN.log.filter(g => !g.npc).map(g => ({idx:g.idx, x:g.x, y:g.y, z:g.z, n:g.n, feet:g.feet, fs:g.fs}))); }
  SJOBEIN.log = null; return out; })"""


async def walking(pg, t, secs, roll, test):
    """The crew sent to work and to the breaks in turn for secs seconds (30 steps a second); every step's drawing read. Gives the slides
    of the feet that stood (m, each from down to up), the soles off the deck of the feet that stood walking, and the speeds, steps and beats."""
    await pg.evaluate("([r, T]) => { window.FROLL = r; SJOBEIN.test = T; }", [roll, test])
    run = {'slides': [], 'soles': [], 'v': [], 'L': [], 'cad': [], 'frames': 0}
    track = {}; last = {}; on = True
    for chunk in range(int(secs / 9)):
        await pg.evaluate(WORK, on); on = not on
        for part in range(3):
            F = await pg.evaluate(STEPS, [90, 1 / 30])
            for L in F:
                run['frames'] += 1; seen = set()
                for g in L:
                    s = g.get('fs'); k = (s or {}).get('id') or g['idx']; seen.add(k)   # (followed by who he is: the drawing order changes when someone goes in)
                    if not s:
                        for i in (0, 1): track.pop((k, i), None)
                        continue
                    # (another man at this place in the drawing order, or put somewhere else at once: start again)
                    p = last.get(k); last[k] = (s['x'], s['z'])
                    if p and math.hypot(s['x'] - p[0], s['z'] - p[1]) > 0.3:
                        for i in (0, 1): track.pop((k, i), None)
                    if s['v'] > 0.3: run['v'].append(s['v']); run['L'].append(s['L']); run['cad'].append(s['cad'])
                    for i in (0, 1):
                        if not s['plant'][i]:
                            q = track.pop((k, i), None)
                            if q and q[2] >= 2: run['slides'].append(q[1])
                            continue
                        d = deckpos(g, g['feet'][i]); q = track.get((k, i))
                        if q is None: track[(k, i)] = [d, 0.0, 1]
                        else: q[1] = max(q[1], math.hypot(d[0] - q[0][0], d[1] - q[0][1])); q[2] += 1
                        if s['v'] > 0.3: run['soles'].append(sole(g, i)); run.setdefault('over', []).append(s.get('over', [0, 0])[i])
                for key in [q for q in track if q[0] not in seen]: track.pop(key)
    await pg.evaluate("window.FROLL = null; window.HOLD = false; SJOBEIN.test = null")
    return run


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 640, 'height': 400}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, URL)
        boats = await pg.evaluate(BOATS); print('båter:', boats, flush=True)
        med = lambda A: sorted(A)[len(A) // 2] if A else 0
        allv = {}
        for t in boats:
            await pg.evaluate(SET, [t, 'pause']); await frames(pg, t, 3)
            await pg.evaluate("LEMMER.log = []"); await frames(pg, t, 1)   # (a frame with the log on leaves LEMMER.redraw)
            for nm, roll, test in [('1,2 m/s, plant dekk', 0, {'roll': 0, 'pitch': 0}), ('0,78 m/s, 8° rulling', 0.17, {'roll': 8 * DEG, 'pitch': 0}), ('0,78 m/s, 15° rulling', 0.17, {'roll': 15 * DEG, 'pitch': 0})]:
                r = await walking(pg, t, 36, roll, test); allv[(t, nm)] = r
                sl = max(r['slides'] or [9]); so = max(r['soles'] or [9])
                print('    (foten utenfor rekkevidde: verst %.1f mm)' % (max(r.get('over') or [0]) * 1000), flush=True)
                print('    %-10s %-22s %3d bilder, %3d plantede steg, gli verst %.1f mm (median %.1f), såle verst %.1f mm; fart %.2f m/s, steg %.2f m, takt %.2f steg/s' % (
                    t, nm, r['frames'], len(r['slides']), sl * 1000, med(r['slides']) * 1000, so * 1000, med(r['v']), med(r['L']), med(r['cad'])), flush=True)
        S = [x for r in allv.values() for x in r['slides']]; So = [x for r in allv.values() for x in r['soles']]
        if OFF:
            check(not S, '«#fot0»: gangen har ikke føttene (den gamle sinusen; denne målingen leser footStep og har ingenting å måle)', len(S))
        else:
            for t in boats:
                for nm in ['1,2 m/s, plant dekk', '0,78 m/s, 8° rulling']:
                    r = allv[(t, nm)]
                    check(len(r['slides']) >= 6 and max(r['slides']) < 0.01, '%s, %s: foten som står, flytter seg under 1 cm mot dekket fra den settes ned til den løftes, slik den er tegnet (%d steg, verst %.1f mm)' % (t, nm, len(r['slides']), max(r['slides'] or [9]) * 1000))
            check(len(So) >= 30 and max(So) < 0.01, 'hver fot som står i gange, er innen 1 cm av dekket ved 0, 8 og 15° rulling (%d, verst %.1f mm)' % (len(So), max(So or [9]) * 1000))
            v12 = [x for (t, nm), r in allv.items() if nm.startswith('1,2') for x in r['v']]; v78 = [x for (t, nm), r in allv.items() if nm.startswith('0,78') for x in r['v']]
            L12 = [x for (t, nm), r in allv.items() if nm.startswith('1,2') for x in r['L']]; L78 = [x for (t, nm), r in allv.items() if nm.startswith('0,78') for x in r['L']]
            c12 = [x for (t, nm), r in allv.items() if nm.startswith('1,2') for x in r['cad']]; c78 = [x for (t, nm), r in allv.items() if nm.startswith('0,78') for x in r['cad']]
            check(v12 and v78 and med(v78) < med(v12) and med(L78) < med(L12) and med(c78) < med(c12), 'steget følger farten: %.2f m/s gir %.2f m og %.2f steg/s, %.2f m/s gir %.2f m og %.2f steg/s' % (med(v12), med(L12), med(c12), med(v78), med(L78), med(c78)))
        # the time drawDeckCrew takes a figure, the gait off and on, while they walk (reckoned without the GPU, LEMMER.redraw, as
        # tests/lemmer.py: the same work but for the gait; the best of three goes of 150)
        t = boats[1]; await pg.evaluate(SET, [t, 'pause']); await frames(pg, t, 3); await pg.evaluate("LEMMER.log = []"); await frames(pg, t, 1)
        await pg.evaluate(WORK, True); await pg.evaluate(STEPS, [45, 1 / 30])
        tm = await pg.evaluate("""(() => { const out = {}, n = Math.max(1, CREW3D.visible().length), w = CREW3D.visible().filter(a => a.mode === 'walk').length; window.HOLD = true;
          for (let go = 0; go < 3; go++) for (const on of [false, true]){ FOT.on = on; for (let i = 0; i < 20; i++) LEMMER.redraw(); const t0 = performance.now(); for (let i = 0; i < 150; i++){ FOT.clock += 1 / 30; window._tk(1 / 30); LEMMER.log.length = 0; LEMMER.redraw(); } const ms = (performance.now() - t0) / 150 / n; out[on] = Math.min(out[on] || 9, ms); }
          FOT.on = !/fot0/.test(location.hash); window.HOLD = false; return {off:out[false], on:out[true], n, walking:w}; })()""")
        print('    drawDeckCrew per figur (JS uten GPU, best av 3 × 150, %s, %d figurer, %d går): gangen av %.3f ms, på %.3f ms' % (t, tm['n'], tm['walking'], tm['off'], tm['on']), flush=True)
        check(tm['on'] < tm['off'] + 0.15, 'føttene koster under 0,15 ms per figur i drawDeckCrew (%.3f mot %.3f ms)' % (tm['on'], tm['off']))
        off = await pg.evaluate("/fot0/.test(location.hash) === !FOT.on && typeof FOT.WR === 'number'")
        check(off, '«#fot0» i adressen slår gangen av, og tallene står ett sted (FOT ved SJOBEIN i deckcrew.js)')
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()
    print('FEIL: ' + ', '.join(bad) if bad else 'alt OK')

asyncio.run(main())
