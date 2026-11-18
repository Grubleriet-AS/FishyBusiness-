#!/usr/bin/env python3
"""Jakten: every touch Autonav's boat makes with anything that is not clean water, in the simulation (the autonav routine,
docs/planer/autonav-null-treff.md; Jonas 18.11.2026: «Du må lage et system som automatisk fanger opp hver gang dette skjer slik at vi kan
se mønster, gjøre rettinger …»).

Each run takes the next bit of a fixed, shuffled list of scenarios along the whole coast and goes on where the last run stopped
(--state: tilstand.json; the list is the same for the same seed, so a scenario is the same wherever it is run). A scenario is a place
(a plant, a shop, a yard or Senja's own harbours; a rorbu; Father's naust by a start plant; a berth in one of the coast's NPC harbours,
with their floating docks), a boat type, a speed (cruise or full), a wind and a tide (chart datum, or the tide as it runs at an hour of
the day). From the place she takes Autonav to the nearest other harbour (tests/allesteder.py ALS.go: 2-200 km, else open water) and
sails it with the boat model as the game's loop does; for the plants, rorbuer and the naust also back in from 1.5 km out. That is out
from a quay, between places and in to a quay.

The observer (JK.watch) runs after every step of the boat model and every minute step, independent of the game's own contact checks,
which do not see everything the 3D view draws (dynContact sees only PIERBOX and the harbour units, sjvTouch only the marks, turbines and
bridge piers, and with SJV.ghost the coast's vessels not at all). It tests her waterline (13 points round the hull) against:
  land (isLand), a harbour unit's quay and fill (onUnitGround), the bottom under her keel (keelClear), the obstacle index (obsIndex: the
  piers, the floating docks, the rorbuer's and the naust's quays, the sea marks, the wind turbines, the bridge piers, and a bridge deck
  lower than she is), the piers, quays and breakwaters the model sees (dynInside), the coast's breakwaters and slab piers (vec molos and
  slabs), and the other vessels, under way and lying (sjvNear, sjvSat);
and logs one line per thing touched per trip: what, which, where (and the nearest place), the boat, her speed then and the most during
the touch, the phase (ut fra kai, seiling, inn mot kai, sikkerhetsnett, hender), the leg, how far from the route's start and end, the
wind, the tide and the build. A touch under a knot within one and a half lengths of the route's start or end is her own berth (own:
true): fenders, not a hit. A grounding (status aground) is logged too.

The results go to --state: treff.jsonl (one line per touch; simulation only, no player data) and turer.jsonl (one line per trip), and
tilstand.json (next scenario, the runs). Needs the whole coast and the vec packs in dist-vec/ (tools/map/release.py, tools/map/game.py,
KYST_VEC=1 KYST_DIST=dist-vec node build.mjs). LITE (no 3D), one browser.
    python3 tools/autonav/jakt.py [--n 30] [--state DIR] [--seed 18112026] [--from K] [--only J,J,..] [--dry] [--min M]
--min stops taking new scenarios after M minutes (the run's time box); --from starts at scenario K instead of the state's next.
"""
import argparse, asyncio, json, os, random, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')

# allesteder's own setup, put-at-the-place, way out, way back in and sailing (ALS), so the hunt sails exactly as that test does: its
# source up to main() (allesteder runs main() when imported)
_src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
_ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}
exec(compile(_src, _ns['__file__'], 'exec'), _ns)
SETUP, ONE, HAVNS, ONE_HAVN, NAUST = (_ns[k] for k in ('SETUP', 'ONE', 'HAVNS', 'ONE_HAVN', 'NAUST'))
from _env import GAME, boot
from playwright.async_api import async_playwright

# the boats per kind of place: the rorbuer and the naust take boats up to 15 m (SITE_MAXLEN); the harbours all but the ocean vessels,
# and the 38 m purse seiner now and then at a plant
BIG = ['kyst21', 'kyst15', 'sjark', 'sjarkny', 'breisjark', 'hurtigsjark', 'plastsjark', 'snekke']
SMALL = ['kyst15', 'sjark', 'hurtigsjark', 'plastsjark', 'snekke', 'breisjark']
WINDS = [(3, None), (9, None), (14, None)]
KINDS = ['port'] * 4 + ['havn'] * 3 + ['rorbu'] * 2 + ['naust']   # (scenario j's kind is KINDS[j % 10])

JK = r"""() => {
  if (window.JK) return true;
  const C = HIND.C, HULL_PTS = [[0.5, 0]].concat([-0.5, -0.3, -0.1, 0.1, 0.3, 0.45].flatMap(f => [[f, 0.5], [f, -0.5]]));
  const near = p => { let best = null, bd = 1e9; for (const q of PORTS){ const d = dist(q.p, p); if (d < bd){ bd = d; best = q; } } return best ? [best.name, Math.round(bd * 1000)] : null; };
  const inPoly = (P, x, z) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1]; if ((zi > z) !== (zj > z) && x < xi + (z - zi) * (xj - xi) / (zj - zi)) ins = !ins; } return ins; };
  const segD = (x, z, P) => { let m = 1e9; for (let i = 1; i < P.length; i++){ const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0; m = Math.min(m, Math.hypot(x - ax - dx * u, z - az - dz * u)); } return m; };
  window.JK = {log:[], trips:[], cur:null, f:0, err:null, speed:'cruise', tide0:tideH, info:{},
    begin(to, from, r){ const pl = S.plan; let endP = to && to.p ? to.p : (pl && pl.wps.length ? pl.wps[pl.wps.length - 1] : from);
      JK.cur = {to:to ? to.name : null, toPort:!!(to && to.id), from:{x:from.x, y:from.y}, endP:{x:endP.x, y:endP.y}, nm:r && r.nm, seen:new Map(), hits:[], left:false, rpAt:-1e9, f0:JK.f, own:0}; },
    hit(c, what, id, p, kn, extra){ const b = S.boat, key = what + '|' + id, o = c.seen.get(key);
      if (o){ o.knMax = Math.max(o.knMax, kn); if (JK.f - o.fl > 40) o.n++; o.fl = JK.f; return; }
      const pl = S.plan, T = DYN.line, L = BOAT.len || 10, dS = Math.round(dist(b.pos, c.from) * 1000), dE = Math.round(dist(b.pos, c.endP) * 1000), ll = natLL(p);
      const hands = !!(T && T.assist > T.s), rp = !!(pl && pl.replan) || JK.f - c.rpAt < 480;
      const phase = hands ? 'hender' : rp ? 'sikkerhetsnett' : (!c.left && dS < 300) ? 'ut fra kai' : (dE < 300 && c.toPort) ? 'inn mot kai' : 'seiling';
      const own = kn < 1 && (dS < 1.5 * L || dE < 1.5 * L);
      const r = Object.assign({what, id:String(id).slice(0, 60), lat:+ll.lat.toFixed(5), lon:+ll.lon.toFixed(5), near:near(p), kn:+kn.toFixed(1), knMax:+kn.toFixed(1), phase, own, dS, dE,
        leg:pl ? [pl.idx, pl.wps.length] : null, harb:inHarbour(b.pos), status:b.status, to:c.to, fl:JK.f, n:1}, JK.info, extra || {});
      c.seen.set(key, r); c.hits.push(r); if (own) c.own++; },
    watch(minute){ const c = JK.cur; if (!c) return; JK.f++; const b = S.boat, pl = S.plan;
      if (pl && pl.replan) c.rpAt = JK.f;
      if (b.status === 'aground'){ if (!c.agr){ c.agr = true; const inc = (S.incidents || []).slice(-1)[0] || {}; JK.hit(c, 'grunnstøting', inc.how || '?', b.pos, +(inc.v != null ? inc.v : (b.v || 0)), {how:inc.how || null}); } return; }
      if (b.status === 'port' || !pl) return;
      if (!c.left && dist(b.pos, c.from) > 0.3) c.left = true;
      const d = b.dyn; if (!d || d.X == null) return;   // (the minute step without the model: its own grounding check is hers)
      const P = dynCalOf(b).P, L = P.L, B = P.B, X = d.X, Y = d.Y, sn = Math.sin(d.psi), cs = Math.cos(d.psi), kn = Math.hypot(d.u || 0, d.v || 0) / KN_MS;
      const pts = HULL_PTS.map(([fx, fy]) => { const xc = fx * L, yc = fy * B; return [X + xc * sn + yc * cs, Y - (xc * cs - yc * sn)]; });
      // land, a harbour unit's quay and fill, and the bottom
      for (const [x, z] of pts){ const p = {x:x / 1000, y:z / 1000}; let land = false, unit = false;
        try { unit = onUnitGround(p); land = !unit && isLand(p); } catch (e){ continue; }
        if (unit){ JK.hit(c, 'kai', 'unit@' + Math.round(x / 50) + ',' + Math.round(z / 50), p, kn); break; }
        if (land){ JK.hit(c, 'land', Math.round(x / 50) + ',' + Math.round(z / 50), p, kn); break; } }
      try { const k = keelClear(b); if (k < 0) JK.hit(c, 'grunn', Math.round(X / 50) + ',' + Math.round(Y / 50), b.pos, kn, {keel:+k.toFixed(2)}); } catch (e){}
      // the obstacle index: piers, floating docks, the rorbuer's and the naust's quays, marks, turbines, bridge piers and low decks
      let idx = null; try { idx = obsIndex(); } catch (e){}
      if (idx){ const air = obsAir(), done = new Set();
        for (const [x, z] of pts){ const L0 = idx.get(Math.floor(x / C) * 1048576 + Math.floor(z / C)); if (!L0) continue;
          for (const o of L0){ if (done.has(o) || o.why === 'buoy' || o.why === 'quay') continue;   // (the quay decks: its own test below) let ins = false;
            if (o.t === 0) ins = Math.hypot(x - o.x, z - o.z) < o.r;
            else if (o.t === 1){ const dx = x - o.x, dz = z - o.z; ins = Math.abs(dx * o.ux + dz * o.uz) < o.l && Math.abs(dx * o.uz - dz * o.ux) < o.w; }
            else if (o.t === 2 && o.under < air) ins = obsDist(o, x, z, x, z) < o.r;
            if (!ins) continue; done.add(o);
            // (a pack's pier mapped as an area is drawn in its own shape, slabInto, not as the box round it: the slabs below test it)
            if (o.why === 'pier' && (JK.areaPier(o) || !JK.isDrawn(o))) continue;
            const what =o.t === 2 ? 'brudekke' : o.B ? 'brupilar' : ({quay:'kai', pier:'brygge', dock:'flytebrygge', rorbu:'rorbukai', naust:'naustkai', mark:'merke', turbine:'vindturbin'})[o.why] || String(o.why);
            JK.hit(c, what, (o.why || 'b') + '#' + o.id + '@' + Math.round(o.x || o.ax) + ',' + Math.round(o.z || o.az), {x:x / 1000, y:z / 1000}, kn, o.t === 2 ? {under:+o.under.toFixed(1), air:+air.toFixed(1)} : null); } } }
      // the piers, quay decks and breakwaters the model itself sees
      try { const O = dynObsNear(X, Y, L + 20); if (O.boxes.length || O.units.length) for (const [x, z] of pts){ const I = dynInside(O, x, z); if (I){ JK.hit(c, I.k === 'kai' ? 'kai' : I.k, 'm@' + Math.round(x / 25) + ',' + Math.round(z / 25), {x:x / 1000, y:z / 1000}, kn, {model:true}); break; } } } catch (e){}
      // the coast's breakwaters (rubble mounds) and the piers mapped as areas, as the 3D view builds them; and the coast's quay decks
      // (a quay's line as a 6 m deck on its land side, made: drawn as concrete by pierInto, and in neither the obstacle index nor PIERBOX)
      try { for (const t of vecTilesIn(X - L - 30, Y - L - 30, X + L + 30, Y + L + 30)){ const V = JK.drawn(t);
        for (const q of V.piers){ if (!q.made || Math.abs(q.x - X) > q.l + q.w + L || Math.abs(q.z - Y) > q.l + q.w + L) continue;
          const ax = Math.sin(q.ang), az = Math.cos(q.ang);
          for (const [x, z] of pts){ const dx = x - q.x, dz = z - q.z; if (Math.abs(dx * ax + dz * az) < q.l / 2 && Math.abs(dx * az - dz * ax) < q.w / 2){ JK.hit(c, 'kai', 'vq' + t.k + '@' + Math.round(q.x) + ',' + Math.round(q.z), {x:x / 1000, y:z / 1000}, kn, {vec:true, deck:true}); break; } } }
        for (const [arr, what] of [[V.molos, 'molo'], [V.slabs, 'brygge']]) for (let i = 0; i < arr.length; i++){ const Pg = arr[i]; if (!Pg || Pg.length < 2) continue;
          const cl = Pg.length > 3 && Math.hypot(Pg[0][0] - Pg[Pg.length - 1][0], Pg[0][1] - Pg[Pg.length - 1][1]) < 1;
          for (const [x, z] of pts){ if (cl ? inPoly(Pg, x, z) : segD(x, z, Pg) < 4.5){ JK.hit(c, what, 'v' + t.k + ':' + what[0] + i, {x:x / 1000, y:z / 1000}, kn, {vec:true}); break; } } } } } catch (e){}
      // the other vessels, under way and lying at a quay or at anchor
      try { if (typeof sjvNear === 'function'){ const H = sjvClock(), T = sjvNear(H, X, Y), A = sjvHullPts(X, Y, d.psi, L, B), dt = (H - T.H) * 3600;
        for (const [list, lying] of [[T.v, false], [T.s, true]]) for (const q of list || []){ const x = q.x + (q.ve || 0) * dt, z = q.z + (q.vz || 0) * dt;
          if (Math.hypot(x - X, z - Y) > (L + q.L) * 0.6 + 2) continue;
          if (sjvSat(A, sjvHullPts(x, z, q.hd, q.L, q.B))) JK.hit(c, 'båt', String(q.n.id || q.n.name), {x:x / 1000, y:z / 1000}, kn, {other:q.n.name || null, lying, player:!!q.n.player}); } } } catch (e){}
    },
    end(R){ const c = JK.cur; if (!c) return; JK.cur = null;
      for (const h of c.hits){ delete h.fl; JK.log.push(h); }
      JK.trips.push(Object.assign({to:c.to, nm:c.nm, min:R && R.min, end:R && R.end, why:R && R.why ? String(R.why).slice(0, 160) : null, hits:c.hits.filter(h => !h.own).length, own:c.own, hands:R && R.hands, frames:JK.f - c.f0}, JK.info)); },
    take(){ const o = {hits:JK.log, trips:JK.trips, err:JK.err}; JK.log = []; JK.trips = []; JK.err = null; return o; },
    // a tile's piers, slabs and breakwaters as the 3D view builds them (view3d/04-vec-packs.js tileStatics' rules, copied here so the
    // observer does not lean on the game's own copy, vecDrawn): not under a harbour unit (a slab with any corner within 3 m of one), not a
    // box or a breakwater that reaches onto a unit's ground or into its basin
    drawn(t){ if (t.jkD) return t.jkD; const T = MAPD.man.tile * 1000, UN = UNITA.filter(U => U.o[0] > t.x0 - 300 && U.o[0] < t.x0 + T + 300 && U.o[1] > t.z0 - 300 && U.o[1] < t.z0 + T + 300);
      const under = (x, z) => unitCovers(x, z, 3), slabUnder = P => { let cx = 0, cz = 0; for (const [x, z] of P){ if (under(x, z)) return true; cx += x; cz += z; } return under(cx / P.length, cz / P.length); };
      const onU = (x, z) => UN.some(U => { const [lx, lz] = unitL(U, x, z), g = ugeo(U); return groundOut(U, lx, lz) <= 2 || (Math.abs(lx) <= g.basinX && lz >= 0 && lz <= g.basinZ); });
      const lineOnU = P => { for (let k = 0; k < P.length; k++){ const [ax, az] = P[k], [bx, bz] = P[Math.min(k + 1, P.length - 1)], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3)); for (let s = 0; s <= n; s++) if (onU(ax + (bx - ax) * s / n, az + (bz - az) * s / n)) return true; } return false; };
      const boxOnU = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (let s = -1; s <= 1; s += 0.25) for (const k of [-1, 0, 1]) if (onU(q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
      // (and what the game has taken away where a trade place's boats lie, vecGone, Jonas 18.11.2026: not drawn, so not there)
      const GN = typeof vecGone === 'function' ? vecGone(t) : null, gone = q => !!GN && GN.piers.has(q), goneS = P => !!GN && vecGoneSlab(GN, P);
      return t.jkD = {piers:(t.piers || []).filter(q => !gone(q) && !under(q.x, q.z) && !(UN.length && boxOnU(q))), slabs:(t.slabs || []).filter(P => P && P.length > 3 && !slabUnder(P) && !goneS(P)), molos:(t.molos || []).filter(P => !UN.length || !lineOnU(P))}; },
    // whether an index box of a pier is one the 3D view builds (Senja's PIERBOX, or a pack's pier JK.drawn keeps)
    isDrawn(o){ if (o.dr !== undefined) return o.dr; o.dr = PIERBOX.some(q => Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5);
      if (!o.dr) for (const t of vecTilesIn(o.x - 5, o.z - 5, o.x + 5, o.z + 5)) if (JK.drawn(t).piers.some(q => Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5)){ o.dr = true; break; }
      return o.dr; },
    // whether an index box is a pack's pier mapped as an area (closed, from a pack: the 3D view draws its outline, 05-quays-breakwaters.js pierInto)
    areaPier(o){ if (o.ap !== undefined) return o.ap; o.ap = false;
      for (const t of vecTilesIn(o.x - 5, o.z - 5, o.x + 5, o.z + 5)) for (const q of t.piers || []) if (q.closed && q.src !== undefined && Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5){ o.ap = true; return true; }
      return false; } };
  // the observer after every step of the model and every minute step (ALS.sail calls dynTick, then step, as the game's loop does)
  const dt0 = dynTick; dynTick = function(){ const r = dt0.apply(this, arguments); try { JK.watch(false); } catch (e){ JK.err = String(e && e.stack || e).slice(0, 300); } return r; };
  const st0 = step; step = function(){ const r = st0.apply(this, arguments); try { JK.watch(true); } catch (e){ JK.err = String(e && e.stack || e).slice(0, 300); } return r; };
  const s0 = ALS.sail; ALS.sail = async function(R, r, to, from){ JK.begin(to, from, r); if (JK.speed === 'max' && S.plan) S.plan.speed = BOAT.vmax; try { return await s0.call(this, R, r, to, from); } finally { JK.end(R); } };
  return true; }"""

# the conditions of one scenario, set before it: the wind, the tide (chart datum the whole trip, or the tide as it runs) and the hour
COND = r"""([w, d, low, hh, speed, info]) => { WX_FORCE = {w, d}; JK.speed = speed; JK.info = info;
  if (low){ tideH = (H, p) => -tideZC(p); window.ALS_LOW = true; } else { tideH = JK.tide0; window.ALS_LOW = false; }
  S.t = Math.round((Date.UTC(2027, 5, 15, 11) - EPOCH) / 6e4) + Math.round(hh * 60); return true; }"""


def scenario(j, seed, places):
    """Scenario j of the list: its kind by j, the place by that kind's own shuffled order, the conditions by its own random draw."""
    kind = KINDS[j % len(KINDS)]
    L = places[kind]
    if not L: return None
    nth = sum(1 for k in range(j) if KINDS[k % len(KINDS)] == kind)   # how many of this kind came before it
    lap, i = divmod(nth, len(L))
    order = list(range(len(L))); random.Random('%s|%s|%d' % (seed, kind, lap)).shuffle(order)
    R = random.Random('%s|%d' % (seed, j))
    w, _ = R.choice(WINDS)
    s = {'j': j, 'kind': kind, 'place': L[order[i]], 'type': R.choice(BIG if kind in ('port', 'havn') else SMALL),
         'speed': R.choice(['cruise', 'cruise', 'max']), 'w': w, 'd': R.randrange(0, 360, 15),
         'low': R.random() < 0.4, 'h': R.choice([0, 3, 6, 9, 12, 15, 18, 21])}
    if kind == 'port' and R.random() < 0.08: s['type'] = 'ringnot38'
    return s


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=30); ap.add_argument('--state', default=os.path.join(ROOT, 'docs', 'planer', 'autonav-jakt'))
    ap.add_argument('--seed', default='18112026'); ap.add_argument('--from', dest='start', type=int); ap.add_argument('--dry', action='store_true')
    ap.add_argument('--min', type=float, default=0)
    ap.add_argument('--only', default='', help='these scenarios (comma-separated j), not the next bit: the tests of a fix, red before and green after')
    a = ap.parse_args()
    if not os.path.isdir(os.path.join(ROOT, 'tools', 'map', 'out', 'game')):
        sys.exit('the whole coast is not in the build (tools/map/release.py, tools/map/game.py, KYST_VEC=1 KYST_DIST=dist-vec node build.mjs)')
    os.makedirs(a.state, exist_ok=True)
    stf = os.path.join(a.state, 'tilstand.json')
    st = json.load(open(stf)) if os.path.exists(stf) else {'seed': a.seed, 'next': 0, 'runs': []}
    if st.get('seed') != a.seed and a.start is None: sys.exit('the state has seed %s, not %s (--from to start the other list)' % (st.get('seed'), a.seed))
    j0 = a.start if a.start is not None else st['next']
    ver = None
    try: ver = open(os.path.join(os.environ['KYST_DIST'], 'version.json')).read(); ver = json.loads(ver)['v']
    except Exception: pass
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
        await pg.evaluate(SETUP, ['kyst21', 0, False])
        await pg.evaluate(JK)
        # the places: the coast's harbours are found once (every vec pack is read) and kept with the state
        places = {'port': await pg.evaluate("() => PORTS.filter(q => !q.havOnly).map(q => q.id)"),
                  'rorbu': await pg.evaluate("() => RORBUER.map(R => R.id)"),
                  'naust': await pg.evaluate("() => PORTS.filter(q => q.mottak && !q.sted).map(q => q.id)")}
        hf = os.path.join(a.state, 'havner.json')
        if os.path.exists(hf): places['havn'] = json.load(open(hf))
        else:
            t = time.time(); places['havn'] = await pg.evaluate(HAVNS); json.dump(places['havn'], open(hf, 'w'))
            print('the coast\'s harbours found: %d in %d s' % (len(places['havn']), time.time() - t), flush=True)
        print('places:', {k: len(v) for k, v in places.items()}, '| from scenario', j0, '| build', ver, flush=True)
        only = [int(x) for x in a.only.split(',') if x.strip()]
        todo = [scenario(j, a.seed, places) for j in (only or range(j0, j0 + a.n))]
        if a.dry:
            for s in todo: print(json.dumps(s, ensure_ascii=False))
            await br.close(); return
        T0 = time.time(); hits_all, trips_all = [], []; done = j0
        for s in todo:
            if s is None: done += 1; continue
            if a.min and (time.time() - T0) / 60 > a.min: print('time box reached', flush=True); break
            info = {'j': s['j'], 'kind': s['kind'], 'type': s['type'], 'speed': s['speed'], 'w': s['w'], 'wd': s['d'], 'tide': 'lav' if s['low'] else 'live', 'h': s['h'], 'ver': ver}
            await pg.evaluate(COND, [s['w'], s['d'], s['low'], s['h'], s['speed'], info])
            t = time.time()
            try:
                if s['kind'] == 'naust' and not await pg.evaluate(NAUST, s['place']): r = {'skip': 'no naust found'}
                elif s['kind'] == 'havn':
                    h = s['place']; info['place'] = 'havn %d:%d:%d' % (h[0], h[1], h[2]); await pg.evaluate("i => { JK.info = i; }", info)
                    r = await pg.evaluate(ONE_HAVN, [h[3], h[4], s['type'], True])
                else:
                    info['place'] = s['place']; await pg.evaluate("i => { JK.info = i; }", info)
                    r = await pg.evaluate(ONE, [s['kind'], s['place'], s['type'], None, s['kind'] != 'havn', False])
            except Exception as e:
                r = {'why': 'error: ' + str(e)[:200]}
                try: await pg.evaluate("() => { if (JK.cur) JK.end({why:'error'}); }")
                except Exception: pass
            got = await pg.evaluate("() => JK.take()")
            for tr in got['trips']: tr['name'] = r.get('name'); tr['ll'] = r.get('ll'); trips_all.append(tr)
            for hh in got['hits']: hh['name'] = r.get('name'); hits_all.append(hh)
            real = [hh for hh in got['hits'] if not hh['own']]
            print('%4d %-5s %-28s %-11s %-6s %2s m/s %-4s | trips %d hits %d%s%s %ds' % (s['j'], s['kind'], str(r.get('name'))[:28], s['type'], s['speed'], s['w'], 'lav' if s['low'] else 'live',
                  len(got['trips']), len(real), (' [' + ', '.join('%s %s %.1fkn %s' % (x['what'], x['phase'], x['kn'], (x['near'] or [''])[0]) for x in real[:4]) + ']') if real else '',
                  (' (' + (r.get('why') or r.get('skip') or '')[:80] + ')') if (r.get('why') or r.get('skip')) else '', time.time() - t), flush=True)
            if got.get('err'): print('   observer error:', got['err'][:200], flush=True)
            done = s['j'] + 1
            # (written as it goes, so a run cut short keeps what it found)
            with open(os.path.join(a.state, 'treff.jsonl'), 'a') as f:
                for hh in got['hits']: f.write(json.dumps(hh, ensure_ascii=False) + '\n')
            with open(os.path.join(a.state, 'turer.jsonl'), 'a') as f:
                for tr in got['trips']: f.write(json.dumps(tr, ensure_ascii=False) + '\n')
            st['next'] = max(st['next'], done) if a.start is None and not only else st['next']; json.dump(st, open(stf, 'w'), ensure_ascii=False, indent=1)
        real = [h for h in hits_all if not h['own']]
        st['runs'].append({'at': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'from': j0, 'to': done, 'trips': len(trips_all), 'hits': len(real), 'own': len(hits_all) - len(real), 'ver': ver, 'min': round((time.time() - T0) / 60, 1)})
        json.dump(st, open(stf, 'w'), ensure_ascii=False, indent=1)
        print('trips %d, hits %d (%.0f per 1000 trips), own-berth touches %d | page errors %s' % (len(trips_all), len(real), 1000 * len(real) / max(1, len(trips_all)), len(hits_all) - len(real), errs[:3]))
        await br.close()

asyncio.run(main())
