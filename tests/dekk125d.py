"""The decks laid out after the work (steg 125d, Jonas 15.11.2026; docs/planer/arbeidsceller.md «Forslagene, båt for båt»): each of the
eight coastal boats hauling line with the skipper and three hands, seen from above, in both formats. On a boat with a hold nobody ices
on deck (the packer is inside, the hatch open while she fishes); on the four smallest the hauler bleeds himself (nobody at the
bleeder's place). Pictures dekk125d_<type>_<landscape|portrait>.png in tests/out. Prints OK or FEIL."""
from _env import boot, OUT
import asyncio, os, sys
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra != '' else ''))


SET = """((a) => { const [type, scene, yaw, pitch, dist] = a, b = S.boat, g = GROUNDS[0].p; S.tut = 0; S.t = Math.round((Date.UTC(2027, 2, 12, 11) - EPOCH) / 6e4);
  b.type = type; applyVessel(); G3.vesselChanged(); S.boatName = 'Havbris'; S.equip = {linehaler:true, garnhaler:true}; S.jobs = []; S.cargo = []; b.gop = null; S.plan = null; S.settings.gut = true; S.settings.ice = true; S.settings.careAuto = false;
  S.pgear = newPGear(); S.sets = []; b.ice = 300; b.fuel = BOAT.fuelCap; b.deckStop = false; S.me = S.cur; S.myJob = null; S.rest = null;
  const hand = () => Object.assign(genCrew(), {bi:false, off:false, fatigue:5, morale:70, job:null});
  S.crew = [hand(), hand(), hand()].slice(0, Math.min(3, VESSELS[type].crewMax || 1));   // (the snekke takes one hand: more and nobody hauls)
  const fish = (kg, gut, iced) => ({sp:'torsk', cls:SPECIES.torsk.ref, kg, n:Math.round(kg / 3), bled:true, iced, hr:Math.floor(S.t / 60), fresh:100, gut, hook:true});
  // (jigging: only fish already gutted and iced aboard, else the crew, who see the work themselves, gut it first and one jigs)
  S.hold = scene === 'egn' || scene === 'mend' ? [] : scene === 'skiff' ? [fish(8, false, false)] : scene === 'jig' ? [fish(30, true, true)] : [fish(220, false, false), fish(12, true, false), fish(30, true, true)];
  b.status = 'fishing'; b.port = null; b.pos = {x:g.x, y:g.y}; b.heading = 0.4; b.v = 0; b.fishUntil = S.t + 600;
  if (scene === 'line'){ b.rig = 'line'; S.pgear.lines.hyse.n = 4; S.pgear.lines.hyse.baited = 2; b.gop = {op:'haul', kind:'line', n:6, done:2, prog:0.3, sub:0, sl:6, hooksPer:600, a:{x:g.x, y:g.y}, b:{x:g.x + 0.6, y:g.y}, lead:0, kg:0, rel:0, dead:0}; }
  if (scene === 'garn'){ b.rig = 'garn'; S.pgear.nets = [{id:'n1', mesh:180, ty:'bunn', n:4, cond:1}]; b.gop = {op:'haul', kind:'garn', n:6, done:2, prog:0.3, sub:0, sl:3, hooksPer:0, a:{x:g.x, y:g.y}, b:{x:g.x + 0.6, y:g.y}, lead:0, kg:0, rel:0, dead:0}; }
  if (scene === 'jig' || scene === 'skiff'){ b.rig = 'juksa'; b.gear = true; S.target = 'torsk'; window.jigActive = false; if (scene === 'skiff') S.equip.jukse = 2; }
  if (scene === 'egn' || scene === 'mend'){ b.status = 'idle'; b.fishUntil = null; b.rig = scene === 'egn' ? 'line' : 'garn'; const pg = S.pgear;
    if (scene === 'egn'){ pg.lines.hyse.n = 5; pg.lines.hyse.baited = 1; baitOf(pg).makrell = 100; window.EGN = egnSelf('hyse', 3); }
    else { pg.nets = [{id:'n1', mesh:180, ty:'bunn', n:6, cond:0.3, max:0.95}]; window.EGN = mendSelf('n1'); } }
  window.CATCHQ = []; clearInterval(window.FEED); if (scene !== 'egn' && scene !== 'mend') window.FEED = setInterval(() => { const Q = window.CATCHQ; if (Q.length < 3) Q.push({sp:Math.random() < 0.75 ? 'torsk' : 'hyse', kg:2 + Math.random() * 4, t:performance.now()}); }, 900);
  CREW3D.reset();
  const c = G3._debug.cam; c.helm = false; c.pitch = pitch; c.yaw = yaw; c.dist = dist; })"""

STATE = """(() => ({st:CREW3D.agents().map(a => a.st + ':' + (a.goal && a.goal.inside ? 'inne' : 'dekk') + ':' + (a.goal && a.goal.task)), W:geoOf(S.boat.type).work || {}, hold:(VESSELS[S.boat.type].hold || {}).kind}))()"""
# (from above, the bow up the picture: the camera's yaw and distance by her length; a little tilt so the people read as people)
BOATS = ['snekke', 'plastsjark', 'sjark', 'hurtigsjark', 'sjarkny', 'breisjark', 'kyst15', 'kyst21']


async def main():
    only = sys.argv[1:] or BOATS
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        await pg.wait_for_function("G3.isActive()", timeout=90000); await pg.wait_for_timeout(3000)
        for vw, vh, tag in [(1280, 800, 'landscape'), (800, 1280, 'portrait')]:
            await pg.set_viewport_size({'width': vw, 'height': vh})
            for t in only:
                L = await pg.evaluate("(t) => VESSELS[t].len", t); dist = (4.0 + L * 0.7) * (1.35 if tag == 'portrait' else 1)
                # (the kyst15's and the breisjark's working decks lie under a shelter: into the hauling station from the starboard side instead)
                yaw, pitch = (-1.35, 0.42) if t in ('kyst15', 'breisjark') else (0.0, 1.2)
                n0 = await pg.evaluate("G3._debug.kitStat.n")
                await pg.evaluate(SET, [t, 'line', yaw, pitch, dist * (0.75 if t in ('kyst15', 'breisjark') else 1)])
                await pg.wait_for_function("([t, n0]) => { const K = G3._debug.kitStat; return K.vt === t && K.n >= n0 + 4; }", arg=[t, n0], timeout=120000)
                await pg.wait_for_timeout(2500)
                await pg.screenshot(path=os.path.join(OUT, f'dekk125d_{t}_{tag}.png'))
                if tag != 'landscape': continue
                s = await pg.evaluate(STATE); st = s['st']
                deck = [x.split(':')[0] for x in st if x.split(':')[1] == 'dekk']
                if s['hold'] == 'rom' or s['W'].get('nopack'): check('is' not in deck, t + ': ingen pakker på dekk (isingen skjer i rommet)', st)
                if s['W'].get('solo'): check(all(x.split(':')[2] == 'gut' for x in st if x.startswith('blogg:')), t + ': haleren bløgger selv; den spillet gir bløggingen, sløyer ved bordet', st)
                check(('haling' in deck or len(st) <= 2) and ('sloy' in deck or any(x.split(':')[2] == 'gut' for x in st)), t + ': en haler og en sløyer på dekk' + (' (skipperen haler selv)' if 'haling' not in deck else ''), st)
        gerr = await pg.evaluate("G3._debug.glErr()")
        check(gerr == 0, 'ingen GL-feil', gerr)
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
