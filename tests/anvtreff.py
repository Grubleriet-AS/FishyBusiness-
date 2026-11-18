"""The catch (core/16e-anvtreff.js; docs/planer/autonav-null-treff.md «Fangsten», Jonas 18.11.2026): while a route steers the boat, the
game tells the cloud's queue a trip's start and end (anv_trip) and each thing her hull touches once a trip (anv_hit).
1. A route sailed with the boat model from a fishing ground to a point 2-4 km off: anv_trip start and end with the same trip id, the end with
   her status, the route's kind (how), her type and the miles.
2. Her hull put on land under way (the model's state moved there): one anv_hit «land» with the trip id, where, her speed and heading,
   the phase, the leg and the distances; told once, not every tick.
3. With no session (no consent, CLOUD.sid empty) nothing is queued.
Prints OK or FEIL per check."""
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + str(extra)) if extra else ''))


SAIL = """(async () => { const b = S.boat; S.tut = 0; CLOUD.sid = 'test'; CLOUD.q = [];
  // out on a fishing ground (as autonavtest does), to a point 2-4 km off in open water
  b.status = 'idle'; b.port = null; b.pos = {...GROUNDS[2].p}; b.fuel = BOAT.fuelCap; await mapNeed(b.pos, 6);
  let tgt = null; for (let r = 2; r <= 4 && !tgt; r += 0.5) for (let a = 0; a < 6.28; a += 0.4){ const q = {x:b.pos.x + Math.cos(a) * r, y:b.pos.y + Math.sin(a) * r}; if (!isLand(q) && legClear(b.pos, q)){ tgt = q; break; } }
  if (!tgt) return {err:'no open water'};
  S.plan = {wps:[{x:tgt.x, y:tgt.y, port:null, fish:0, leia:true}], idx:0, speed:BOAT.vcruise, returning:false}; b.status = 'sailing';
  DYN.on = true; TAB.held = true; let acc = 0;
  for (let k = 0; k < 6000 && S.plan; k++){ dynTick(0.25); acc += 0.25 * simRate() / 60; while (acc >= 1){ step(); acc -= 1; } if (k % 400 === 0) await new Promise(r => setTimeout(r, 0)); }
  dynTick(0.25);
  return {q:CLOUD.q.filter(e => /^anv_/.test(e.k)).map(e => ({k:e.k, d:e.d})), st:b.status}; })()"""

LAND = """(async () => { const b = S.boat; CLOUD.sid = 'test'; CLOUD.q = [];
  // under way on a route, the model's state put on land (the nearest land to the harbour point)
  const p0 = portById('senjahopen').p; let land = null; for (let r = 0.05; r < 1 && !land; r += 0.025) for (let a = 0; a < 6.28; a += 0.2){ const q = {x:p0.x + Math.cos(a) * r, y:p0.y + Math.sin(a) * r}; if (isLand(q) && !onUnitGround(q)){ land = q; break; } }
  S.plan = {wps:[{x:p0.x + 2, y:p0.y, port:null, fish:0, leia:true}], idx:0, speed:BOAT.vcruise, returning:false};
  b.status = 'sailing'; b.pos = {...land}; DYN.on = true; DYN.b = b; b.dyn = Object.assign(b.dyn || {}, {X:land.x * 1000, Y:land.y * 1000, psi:0.5, u:2, v:0, r:0, wall:Date.now()});
  ANV.cur = null; for (let i = 0; i < 12; i++) anvTick();
  const ev = CLOUD.q.filter(e => /^anv_/.test(e.k)).map(e => ({k:e.k, d:e.d}));
  // with no session nothing is queued
  CLOUD.sid = null; CLOUD.q = []; S.plan = null; anvTick(); ANV.cur = null; S.plan = {wps:[{x:p0.x + 2, y:p0.y}], idx:0}; for (let i = 0; i < 8; i++) anvTick();
  const none = CLOUD.q.length; S.plan = null; b.status = 'idle'; anvTick();
  return {ev, none}; })()"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME)
        r = await pg.evaluate(SAIL)
        if r.get('err'): check(False, 'a route to sail', r); await br.close(); return
        q = r['q']; st = [e for e in q if e['k'] == 'anv_trip' and e['d'].get('ph') == 'start']; en = [e for e in q if e['k'] == 'anv_trip' and e['d'].get('ph') == 'end']
        check(len(st) == 1 and len(en) == 1 and st[0]['d']['t'] == en[0]['d']['t'], 'anv_trip: én start og én slutt for turen, med samme id', [e['d'] for e in st + en])
        check(st and st[0]['d'].get('how') == 'autonav' and st[0]['d'].get('boat') and st[0]['d'].get('nm', 0) > 0.5, 'anv_trip: hva slags rute, båten og milene', st[0]['d'] if st else None)
        check(en and en[0]['d'].get('end') in ('idle', 'fishing', 'port', 'sailing'), 'anv_trip: slutten sier hvor hun endte', en[0]['d'] if en else None)
        r = await pg.evaluate(LAND)
        hits = [e['d'] for e in r['ev'] if e['k'] == 'anv_hit']
        land = [h for h in hits if h['w'] == 'land']
        check(len(land) == 1, 'anv_hit: skroget på land gir ett treff «land», ikke ett per tick', hits)
        h = land[0] if land else {}
        check(all(k in h for k in ('t', 'x', 'y', 'boat', 'kn', 'hd', 'ph', 'how', 'leg', 'dS', 'dE')) and abs(h.get('kn', 0) - 3.9) < 0.2, 'anv_hit: turen, hvor, båten, farten (2 m/s), kursen, fasen, etappen og avstandene', h)
        check(r['none'] == 0, 'uten økt (uten samtykke) legges ingenting i køen', r['none'])
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
