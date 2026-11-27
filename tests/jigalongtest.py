# Jigging while the passive gear stands (Jonas 09.10.2026): the jig is there whenever the boat lies still, whatever the rig. No room in the
# hold is kept for the gear in the sea (Jonas 27.11.2026): the jig may fill the boat, and a haul that fills the hold stops with the rest of
# the string and its fish left in the sea, to be hauled after the landing.
import asyncio, json
from playwright.async_api import async_playwright
from _env import *
ok = lambda c: 'OK  ' if c else 'FEIL'
SEED = """(()=>{ let a = 20260930; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1100, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg); await pg.evaluate(SEED)
        r = await pg.evaluate("""(()=>{ const R = {}, b = S.boat; S.tut = 0; S.cash = 1e7; S.settings.autoOn = false; S.stock = initStock(); S.crew = [Object.assign(genCrew(), {bi:false, off:false})];
          S.equip.linehaler = true; S.equip.jukse = 0; b.rig = 'line'; R.rig = rigOf();
          const spot = GROUNDS[2].p; S.t = Math.round((Date.UTC(2028, 2, 5, 6) - EPOCH) / 3.6e6 * 60);
          b.status = 'fishing'; b.port = null; b.pos = {...spot}; b.gop = null; b.fishUntil = S.t + 300; S.hold = []; for (let i = 0; i < 120; i++) step();
          R.jigKg = Math.round(holdTotal());
          // gear in the sea keeps no room in the hold: the jig fills her to the brim (a small hold, so it is quick)
          const cap0 = BOAT.holdCap; BOAT.holdCap = Math.round(holdLoad() + 12); R.cap = capHold();   // (12 kg of room: full within the half hour, before the weather of the day turns)
          S.sets = [{id:'t1', vid:S.cur, kind:'line', lk:Object.keys(LINE_KINDS)[0], n:4, hooks:1200, a:{...spot}, b:{x:spot.x + 0.4, y:spot.y}, tSet:S.t - 600, depth:80, cond:1, acc:{torsk:{kg:400, n:100, ts:400 * (S.t / 60 - 5)}}, dead:0}];
          R.kg0 = Math.round(holdLoad()); b.status = 'fishing'; b.gop = null; b.fishUntil = S.t + 3000; for (let i = 0; i < 240 && b.status === 'fishing'; i++) step();
          R.fullKg = Math.round(holdLoad()); R.afterFull = b.status;
          // hauling with too little room: the haul stops when the hold is full, the rest stands with its fish, and nothing is lost
          S.hold = []; BOAT.holdCap = 150; b.status = 'idle'; b.pos = {...spot}; const sum = () => Object.values(S.sets[0].acc).reduce((a, x) => a + x.kg, 0), lg = window.letGo; window.letGo = () => false;
          R.why = startHaul('t1'); for (let i = 0; i < 600 && b.gop; i++) step();
          R.haulKg = Math.round(holdLoad()); R.left = S.sets[0] ? S.sets[0].n : 0; R.leftKg = Math.round(sum()); R.lost = Math.round((400 - holdLoad() - sum()) * 10) / 10; R.gop = !!b.gop;
          // the hold filling on the last slice of the last unit: the string is not done, and what found no room is still on it
          { const keepSets = S.sets; S.sets = [{id:'t2', vid:S.cur, kind:'line', lk:keepSets[0].lk, n:1, hooks:300, a:{...spot}, b:{x:spot.x + 0.1, y:spot.y}, tSet:S.t - 600, depth:80, cond:1, acc:{torsk:{kg:200, n:50, ts:200 * (S.t / 60 - 5)}}, dead:0}];
            S.hold = []; BOAT.holdCap = 190; b.status = 'idle'; b.pos = {...spot}; startHaul('t2'); for (let i = 0; i < 600 && b.gop; i++) step();
            const s2 = S.sets[0]; R.last = [Math.round(holdLoad()), s2 ? s2.n : 0, s2 ? Math.round((200 - holdLoad() - Object.values(s2.acc).reduce((a, x) => a + x.kg, 0)) * 10) / 10 : null]; S.sets = keepSets; }
          // a haul stopped by hand between two fish loses nothing either
          { S.hold = []; BOAT.holdCap = 5000; b.status = 'idle'; b.pos = {...S.sets[0].a}; const before = sum(); startHaul('t1'); for (let i = 0; i < 25 && b.gop; i++) step(); if (b.gop) gopAbort('stop'); R.stop = Math.round((before - holdLoad() - sum()) * 10) / 10; }
          // after the landing the rest comes up
          b.status = 'idle'; b.pos = {...S.sets[0].a}; R.why2 = startHaul('t1'); for (let i = 0; i < 900 && b.gop; i++) step();
          R.restKg = Math.round(holdLoad()); R.sets = S.sets.length; window.letGo = lg; BOAT.holdCap = cap0;
          R.dock = (() => { b.status = 'fishing'; b.fishUntil = S.t + 300; b.gop = null; DOCK.render(); return DOCK.items().map(x => x.id); })();
          return R; })()""")
        print(json.dumps(r))
        print(ok(r['rig'] == 'line' and r['jigKg'] > 0), 'a boat rigged for line still jigs while it lies still', [r['rig'], r['jigKg']])
        print(ok(r['fullKg'] >= r['cap'] - 1 and r['fullKg'] > r['kg0'] and r['afterFull'] != 'fishing'), 'with a line in the sea the jig fills the hold to the brim, and fishing ends there', [r['kg0'], r['fullKg'], r['cap'], r['afterFull']])
        print(ok(not r['why'] and not r['gop'] and 149 <= r['haulKg'] <= 150 and 0 < r['left'] < 4), 'a haul that fills the hold stops, with the rest of the string in the sea', [r['why'], r['haulKg'], r['left']])
        print(ok(r['leftKg'] > 0 and abs(r['lost']) <= 0.5), 'the fish that found no room stays on the gear: of the 400 kg on it, none is lost (nothing let go here)', [r['haulKg'], r['leftKg'], r['lost']])
        print(ok(r['last'][1] == 1 and r['last'][2] is not None and abs(r['last'][2]) <= 0.5), 'the hold filling on the last slice of the last tub: the tub stays in the sea with what found no room', r['last'])
        print(ok(abs(r['stop']) <= 0.5), 'a haul stopped by hand loses no fish between the string and the hold', r['stop'])
        print(ok(not r['why2'] and r['sets'] == 0 and abs(r['restKg'] - r['leftKg']) <= 6), 'after the landing the rest is hauled, with what stood on it', [r['why2'], r['sets'], r['restKg'], r['leftKg']])
        print(ok('jigg' in r['dock']), 'the Jig button is on the dock whatever the rig', r['dock'])
        print(ok(not errs), 'no page errors', errs[:2])
        await b.close()
asyncio.run(main())
