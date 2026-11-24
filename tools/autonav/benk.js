// The bench's page side (Autonav 2.0 F0, steg 140, docs/planer/autonav-2-0.md): BK. tools/autonav/benk.py evaluates this in the game's
// page after tests/allesteder.py's SETUP (ALS: put her at a place, sail with the boat model as the game's loop does) and
// tools/autonav/benkobs.js (BKO: the observer's geometry). An arrow function, as jakt.py's JK.
//
// BK gives the observer its world: everything the 3D view draws in the sea, read from the game's raw data and not from what a route
// planner or the boat model thinks is in her way: the fine coast (isLand, coastSegHit) and the harbour units' ground, the foreshore as
// the 3D ground falls from the coast line (COAST3 in view3d/02-mesh-terrain.js), the depth with the tide under five points of her
// keel, the rocks as view3d/17i-rocks.js shapes them (rockShape, at her keel's depth), the piers, quay decks, slab piers and
// breakwaters as the 3D view builds them (the hunt's own copy of tileStatics' rules, JK.drawn), the floating docks, the rorbuer's and
// the naust's quays, the sea marks, the wind turbines, the bridges' piers and the decks lower than she is, and the other vessels.
// Not here (only the 3D view knows them): the quay modules built out to a berth and the marinas' small boats.
//
// A trip is sailed twice from the same route: with the boat model (ALS.sail, the game's loop when it is looked at) and as time away
// (the minute step alone with the model off, as catchUp plays it), and the observer sweeps her hull along both.
() => {
  if (window.BK) return true;
  const C = HIND.C, km = (x, z) => ({x:x / 1000, y:z / 1000}), sleep = ms => new Promise(r => setTimeout(r, ms));
  // (view3d/00-head.js rng, the seeded generator a rock's shape is drawn from)
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ROCK_FOOT = -2.4, COAST3 = {top:2, g:1 / 3, gMole:1 / 1.5, deep:-2.5}, MOLO3 = {half:8, run:1.4, foot:6};
  const nearPort = p => { let best = null, bd = 1e9; for (const q of PORTS){ const d = dist(q.p, p); if (d < bd){ bd = d; best = q; } } return best ? [best.name, Math.round(bd * 1000)] : null; };
  const WHAT = {quay:'kai', pier:'brygge', dock:'flytebrygge', rorbu:'rorbukai', naust:'naustkai', mark:'merke', turbine:'vindturbin'};
  // the ground of the foreshore at a point by the 3D view's rule (m over mean sea level), or null off it
  const shoreGround = p => { let sd; try { sd = coastSdIf(p, 30); } catch (e){ return null; } if (!(sd === sd)) return null; if (sd >= 0) return COAST3.top; const g = COAST3.top + sd * (COAST.mole ? COAST3.gMole : COAST3.g); return g > COAST3.deep ? g : null; };

  const BK = window.BK = {cur:null, f:0, err:null, eng:'modell', squat:0, rocks:new Map(), T0:0, tide0:tideH,
    // ---- what the 3D view builds of a tile's piers, slabs and breakwaters (jakt.py JK.drawn, isDrawn, areaPier) ----
    drawn(t){ if (t.bkD) return t.bkD; const T = MAPD.man.tile * 1000, UN = UNITA.filter(U => U.o[0] > t.x0 - 300 && U.o[0] < t.x0 + T + 300 && U.o[1] > t.z0 - 300 && U.o[1] < t.z0 + T + 300);
      const under = (x, z) => unitCovers(x, z, 3), slabUnder = P => { let cx = 0, cz = 0; for (const [x, z] of P){ if (under(x, z)) return true; cx += x; cz += z; } return under(cx / P.length, cz / P.length); };
      const onU = (x, z) => UN.some(U => { const [lx, lz] = unitL(U, x, z), g = ugeo(U); return groundOut(U, lx, lz) <= 2 || (Math.abs(lx) <= g.basinX && lz >= 0 && lz <= g.basinZ); });
      const lineOnU = P => { for (let k = 0; k < P.length; k++){ const [ax, az] = P[k], [bx, bz] = P[Math.min(k + 1, P.length - 1)], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3)); for (let s = 0; s <= n; s++) if (onU(ax + (bx - ax) * s / n, az + (bz - az) * s / n)) return true; } return false; };
      const boxOnU = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (let s = -1; s <= 1; s += 0.25) for (const k of [-1, 0, 1]) if (onU(q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
      const GN = typeof vecGone === 'function' ? vecGone(t) : null, gone = q => !!GN && GN.piers.has(q), goneS = P => !!GN && vecGoneSlab(GN, P);
      return t.bkD = {piers:(t.piers || []).filter(q => !gone(q) && !under(q.x, q.z) && !(UN.length && boxOnU(q))), slabs:(t.slabs || []).filter(P => P && P.length > 3 && !slabUnder(P) && !goneS(P)), molos:(t.molos || []).filter(P => !UN.length || !lineOnU(P))}; },
    isDrawn(o){ if (o.dr !== undefined) return o.dr; o.dr = PIERBOX.some(q => Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5);
      if (!o.dr) for (const t of vecTilesIn(o.x - 5, o.z - 5, o.x + 5, o.z + 5)) if (BK.drawn(t).piers.some(q => Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5)){ o.dr = true; break; }
      return o.dr; },
    areaPier(o){ if (o.ap !== undefined) return o.ap; o.ap = false;
      for (const t of vecTilesIn(o.x - 5, o.z - 5, o.x + 5, o.z + 5)) for (const q of t.piers || []) if (q.closed && q.src !== undefined && Math.abs(q.x - o.x) < 0.5 && Math.abs(q.z - o.z) < 0.5){ o.ap = true; return true; }
      return false; },
    // ---- the things, as BKO has them ----
    // one of the obstacle index's (11b-obstacles.js obsIndex): a circle, a box or a piece of a bridge's deck; 0 for what is not there to hit
    conv(o){ if (o.bk !== undefined) return o.bk; let t = 0;
      if (o.t === 0){ if (o.why !== 'buoy') t = {k:'c', x:o.x, z:o.z, r:o.r, what:o.B ? 'brupilar' : WHAT[o.why] || String(o.why)}; }
      else if (o.t === 1){ if (!((o.why === 'pier' || o.why === 'quay') && (BK.areaPier(o) || !BK.isDrawn(o)))) t = {k:'b', x:o.x, z:o.z, l:o.l, w:o.w, ux:o.ux, uz:o.uz, what:WHAT[o.why] || String(o.why)}; }
      else if (o.t === 2) t = {k:'s', ax:o.ax, az:o.az, bx:o.bx, bz:o.bz, r:o.r, what:'brudekke', under:o.under, x:(o.ax + o.bx) / 2, z:(o.az + o.bz) / 2};
      if (t) t.id = o.t === 2 ? 'dekk#' + Math.round(o.B.br[4]) + ',' + Math.round(o.B.br[5]) : (o.B ? 'bru' : o.why || 't') + '#' + Math.round(t.x) + ',' + Math.round(t.z);   // (a deck is one thing, whatever piece of it she is under)
      return o.bk = t; },
    // a vec tile's slab piers and breakwaters in their own shape, by 250 m cell
    tileThings(t){ if (t.bkT) return t.bkT; const V = BK.drawn(t), M = new Map();
      const put = o => { const b = BKO.bbox(o); for (let j = Math.floor(b[1] / C); j <= Math.floor(b[3] / C); j++) for (let i = Math.floor(b[0] / C); i <= Math.floor(b[2] / C); i++){ const k = i * 1048576 + j; let a = M.get(k); if (!a) M.set(k, a = []); a.push(o); } };
      V.slabs.forEach((P, i) => put({k:'p', P, what:'brygge', id:'v' + t.k + ':b' + i}));
      // (a breakwater as the 3D view builds it, view3d/05-quays-breakwaters.js MOLO: its rock meets mean sea level 8 m out from a line, on
      // the outline of one mapped as an area, and falls 1 in 1.4 to 6 m under it. Until steg 141 (23.11.2026) the bench had a line of
      // 9 m and the bare outline: a boat 5 m from a breakwater's line counted as clear. In the index with the slope's whole reach; r
      // is set for her draught and the water when it is asked for, thingsIn)
      V.molos.forEach((P, i) => { if (!P || P.length < 2) return; const cl = P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1, base = cl ? 0 : MOLO3.half; put({k:'l', P, r:base + MOLO3.run * MOLO3.foot, closed:cl, base, molo:true, what:'molo', id:'v' + t.k + ':m' + i}); });
      return t.bkT = M; },
    // a rock as the 3D view shapes it (17i-rocks.js rockShape: the same seed and the same draws), where it is drawn (not well inside a
    // harbour's water, not under the foreshore's ground); and its outline at her keel's depth now: null where her keel goes over it
    rock(q){ const key = q[0] + ',' + q[1]; let R = BK.rocks.get(key);
      if (R === undefined){ R = null; const p = {x:q[0], y:q[1]};
        try { if (!(inHarbour(p) && inHarbour({x:p.x + 0.015, y:p.y}) && inHarbour({x:p.x - 0.015, y:p.y}) && inHarbour({x:p.x, y:p.y + 0.015}) && inHarbour({x:p.x, y:p.y - 0.015}))){
          const seed = (Math.imul(Math.round(q[0] * 1e4), 73856093) ^ Math.imul(Math.round(q[1] * 1e4), 19349663)) | 0, r = rng(seed), Cc = tidePlace(p).C, A = Math.max(0.35, Cc[0][0] + Cc[1][0]);
          const a = 3.6 + 5.2 * r() * r(), b = a * (0.5 + 0.38 * r()), th = r() * Math.PI, top = A * (-0.1 + 0.85 * r()), pw = 2.1 + 1.3 * r(), g = shoreGround(p);
          if (!(g != null && g > top - 0.25)) R = {x:q[0] * 1000, z:q[1] * 1000, a, b, th, top, pw, D:top - ROCK_FOOT, p}; } } catch (e){ return null; }   // (the map not in there yet: asked again)
        BK.rocks.set(key, R); }
      if (!R) return null;
      const keelY = tideH(S.t / 60, R.p) - BOAT.draft; if (!(R.top > keelY)) return null;
      const s = Math.min(1, Math.pow((R.top - keelY) / R.D, 1 / R.pw));
      return {k:'e', x:R.x, z:R.z, a:R.a * s, b:R.b * s, th:R.th, what:'skjær', id:'r' + Math.round(R.x) + ',' + Math.round(R.z)}; },
    // every thing whose cell the box touches (m): the index's, the tiles' slabs and breakwaters, the rocks and the vessels
    thingsIn(x0, z0, x1, z1, noBoats){ const out = [], seen = new Set(); let idx = null; try { idx = obsIndex(); } catch (e){}
      const air = obsAir(), i0 = Math.floor(x0 / C), i1 = Math.floor(x1 / C), j0 = Math.floor(z0 / C), j1 = Math.floor(z1 / C); let tiles = []; try { tiles = vecTilesIn(x0 - 30, z0 - 30, x1 + 30, z1 + 30).map(t => BK.tileThings(t)); } catch (e){}
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const k = i * 1048576 + j;
        if (idx) for (const o of idx.get(k) || []){ if (seen.has(o)) continue; seen.add(o); const t = BK.conv(o); if (!t || (t.k === 's' && !(t.under < air))) continue; out.push(t); }
        for (const M of tiles) for (const o of M.get(k) || []) if (!seen.has(o)){ seen.add(o); if (o.molo){ let h = 0; try { h = tideH(S.t / 60, km(o.P[0][0], o.P[0][1])); } catch (e){} o.r = Math.max(0, o.base + MOLO3.run * Math.min(MOLO3.foot, BOAT.draft + BK.squat - h)); } out.push(o); } }
      try { for (const q of rocksIn((x0 - 12) / 1000, (z0 - 12) / 1000, (x1 + 12) / 1000, (z1 + 12) / 1000)){ const r = BK.rock(q); if (r) out.push(r); } } catch (e){}
      if (!noBoats && typeof sjvNear === 'function') try { const X = (x0 + x1) / 2, Z = (z0 + z1) / 2, model = BK.eng === 'modell', H = (S.t + (model ? liveFrac() : 0)) / 60, T = sjvNear(H, X, Z), dt = (H - T.H) * 3600;
        for (const [list, lying] of [[T.v, false], [T.s, true]]){ if (!lying && !model) continue;   // (a vessel under way is where she is only for the boat that is looked at)
          for (const q of list || []){ const x = q.x + (q.ve || 0) * dt, z = q.z + (q.vz || 0) * dt; out.push({k:'h', P:sjvHullPts(x, z, q.hd, q.L, q.B), what:'båt', id:String(q.n.id || q.n.name), x, z, lying, other:q.n.name || null, player:!!q.n.player}); } } } catch (e){}
      return out; },
    world(){ const H = S.t / 60;
      return {
        land(x, z){ const p = km(x, z); try { return onUnitGround(p) ? 2 : isLand(p) ? 1 : 0; } catch (e){ return 0; } },
        landSeg(ax, az, bx, bz){ try { return coastSegHit(km(ax, az), km(bx, bz)); } catch (e){ return false; } },
        // (a point of her keel over land is the land's own touch, not shallow water: the depth there is 0 by definition)
        keel(x, z){ const p = km(x, z); try { return isLand(p) ? 9 : depthNav(p) + tideCD(H, p) - BOAT.draft - BK.squat; } catch (e){ return 9; } },
        // the foreshore as drawn: the ground over her keel there (not in a harbour unit's basin, which is dug out)
        beach(x, z){ const p = km(x, z); try { if (inHarbourPocket(p)) return false; const g = shoreGround(p); return g != null && g < COAST3.top && g > tideH(H, p) - BOAT.draft; } catch (e){ return false; } },
        things(x0, z0, x1, z1){ return BK.thingsIn(x0, z0, x1, z1); },
        // clear water beyond R round the point: the fine coast, the harbour units and the things' boxes; 0 when not known
        free(x, z, R){ const p = km(x, z), cap = R + 60; let d; try { if (isLand(p)) return 0; d = coastDistM(p, cap); } catch (e){ return 0; } if (!(d > R)) return 0;
          // (the foreshore reaches (top - deep) / g = 13.5 m out from the line)
          d -= 14; if (!(d > R)) return 0;
          for (const U of UNITA) if (Math.hypot(U.o[0] - x, U.o[1] - z) < cap + 160) return 0;
          for (const o of BK.thingsIn(x - cap, z - cap, x + cap, z + cap)){ const dd = BKO.boxDist(o, x, z); if (dd < d){ d = dd; if (!(d > R)) return 0; } }
          return d - R; } }; },
    // ---- a trip's log ----
    begin(to, from, r, strek){ const pl = S.plan, endP = to && to.p ? to.p : (pl && pl.wps.length ? pl.wps[pl.wps.length - 1] : from);
      BK.cur = {to:to ? to.name : null, toPort:!!(to && to.id), from:{x:from.x, y:from.y}, endP:{x:endP.x, y:endP.y}, seen:new Map(), hits:[], left:false, rpAt:-1e9, st:{}, own:0, jumps:0, m:0, tN:0, tSum:0, tMax:0, fuel0:S.boat.fuel, bg:null, berth:new Set()}; },
    // what a touch is of, for her own berth: the land, a unit's quay, the foreshore and the bottom as such, a thing as itself
    bkey(h){ return h.what === 'land' || h.what === 'kai' || h.what === 'fjære' || h.what === 'grunn' ? h.what : h.what + '|' + h.id; },
    hit(c, h, kn){ const b = S.boat, key = h.what + '|' + h.id, o = c.seen.get(key);
      if (o){ if (kn > o.knMax) o.knMax = +kn.toFixed(1); o.n++; return; }
      const pl = S.plan, T = DYN.line, L = BOAT.len || 10, p = km(h.x, h.z), dS = Math.round(dist(p, c.from) * 1000), dE = Math.round(dist(p, c.endP) * 1000), ll = natLL(p), model = BK.eng === 'modell';
      const hands = model && !!(T && T.assist > T.s), rp = !!(pl && pl.replan) || BK.f - c.rpAt < 480;
      const phase = hands ? 'hender' : rp ? 'sikkerhetsnett' : (!c.left && dS < 300) ? 'ut fra kai' : (dE < 300 && c.toPort) ? 'inn mot kai' : 'seiling';
      // her own berth: under a knot within a length and a half of the route's start or end (the fenders); a boat moved by the minute
      // step has no speed there to speak of; and what her hull lay against where she cast off (c.berth: the quay she backs out along
      // at 1.6 knots is not struck), within that length and a half of the start
      const own = h.what !== 'grunnstøting' && (((dS < 1.5 * L || dE < 1.5 * L) && (!model || kn < 1)) || (dS < 1.5 * L && c.berth.has(BK.bkey(h))));
      const r = {what:h.what, id:String(h.id).slice(0, 60), lat:+ll.lat.toFixed(5), lon:+ll.lon.toFixed(5), near:nearPort(p), kn:+kn.toFixed(1), knMax:+kn.toFixed(1), phase, own, dS, dE, leg:pl ? [pl.idx, pl.wps.length] : null, harb:inHarbour(p), n:1};
      if (h.keel != null) r.keel = +h.keel.toFixed(2); if (h.o){ if (h.o.lying != null){ r.lying = h.o.lying; r.other = h.o.other; } if (h.o.under != null){ r.under = +h.o.under.toFixed(1); r.air = +obsAir().toFixed(1); } }
      if (h.how) r.how = h.how;
      c.seen.set(key, r); c.hits.push(r); if (own) c.own++; },
    sweep(c, pose, kn){ const P = dynCalOf(S.boat).P, first = c.st.first !== false && BK.eng === 'modell'; let hs; try { hs = BKO.step(c.st, pose, {L:P.L, B:P.B}, BK.world()); } catch (e){ BK.err = String(e && e.stack || e).slice(0, 300); return; }
      for (const h of hs){ if (first) c.berth.add(BK.bkey(h)); BK.hit(c, h, kn); } },
    aground(c){ const b = S.boat; if (c.agr) return; c.agr = true; const inc = (S.incidents || []).slice(-1)[0] || {}; BK.hit(c, {what:'grunnstøting', id:inc.how || '?', x:b.pos.x * 1000, z:b.pos.y * 1000, how:inc.how || null}, +(inc.v != null ? inc.v : (b.v || 0))); },
    // after every step of the boat model (ALS.sail calls dynTick as the game's loop does)
    watch(){ const c = BK.cur; if (!c || BK.eng !== 'modell') return; BK.f++; const b = S.boat, pl = S.plan;
      if (pl && pl.replan) c.rpAt = BK.f;
      if (b.status === 'aground'){ BK.aground(c); return; }
      if (b.status === 'port' || !pl){ c.st.last = null; return; }
      if (!c.left && dist(b.pos, c.from) > 0.3) c.left = true;
      const d = b.dyn; if (!d || d.X == null){ c.st.last = null; return; }   // (the minute step has her: its own check is hers, as in the hunt)
      const L0 = c.st.last, pose = {X:d.X, Z:d.Y, psi:d.psi}, P = dynCalOf(b).P, E = DYN.env;
      // (set down somewhere else, «Sitter båten fast?», a berth: not a way she sailed)
      if (L0){ const mv = Math.hypot(pose.X - L0.X, pose.Z - L0.Z); if (mv > 60){ c.st.last = null; c.jumps++; } else c.m += mv; }
      BK.squat = dynSquat(P, d.u, !!(E && E.narrow)); BK.sweep(c, pose, Math.hypot(d.u || 0, d.v || 0) / KN_MS); },
    // after a minute step with the model off: her way from where she was, along the route's points she passed
    watchBg(c, p0, i0, w0){ const b = S.boat, pl = S.plan; BK.f++;
      if (pl && pl.replan) c.rpAt = BK.f;
      if (b.status === 'aground'){ BK.aground(c); return; }
      if (!c.left && dist(b.pos, c.from) > 0.3) c.left = true;
      const p1 = {x:b.pos.x, y:b.pos.y}, path = [p0], arrived = b.status === 'port' && !pl;
      if (w0 && (arrived || (pl && pl.wps === w0.a && pl.wps.length === w0.n && pl.idx >= i0))){ const i1 = arrived ? w0.n : pl.idx; for (let i = i0; i < i1; i++) path.push({x:w0.pts[i].x, y:w0.pts[i].y}); }
      if (dist(path[path.length - 1], p1) > 1e-6) path.push(p1);
      const P = dynCalOf(b).P, kn = b.v || 0; BK.squat = dynSquat(P, kn * KN_MS, false);
      for (let i = 1; i < path.length; i++){ const a = path[i - 1], q = path[i], L = dist(a, q); if (!(L > 1e-6)) continue; const psi = Math.atan2(q.x - a.x, -(q.y - a.y)); c.m += L * 1000;
        c.st.last = {X:a.x * 1000, Z:a.y * 1000, psi}; BK.sweep(c, {X:q.x * 1000, Z:q.y * 1000, psi}, kn); } },
    finish(R, r){ const c = BK.cur; if (!c) return null; BK.cur = null; const b = S.boat, hits = c.hits;
      return {end:R.end || b.status, at:!!R.at, why:R.why ? String(R.why).slice(0, 200) : null, min:R.min, nmRoute:r && r.nm != null ? +r.nm.toFixed(2) : null, nmSailed:+(c.m / 1852).toFixed(2), fuel:+(c.fuel0 - b.fuel).toFixed(1),
        hands:R.hands || 0, handsK:R.handsK || {}, hits:hits.filter(h => !h.own), own:c.own, berth:[...c.berth].map(k => k.split('|')[0]), obs:{n:c.st.n || 0, skip:Math.round(c.st.skip || 0), jumps:c.jumps}, tick:c.tN ? {n:c.tN, mean:+(c.tSum / c.tN).toFixed(2), max:+c.tMax.toFixed(1)} : null, err:BK.err}; },
    // ---- the ends of a stretch, her place at the start, the route ----
    async end(e){ const kinds = [['sim', 3], ['chart', 3], ['vec', 1.5]];
      if (e.ll){ const p = natP(e.ll[0], e.ll[1]); await mapPreload([p], kinds); return {kind:'ll', id:null, p, name:e.navn || 'punkt'}; }
      if (e.port){ const pt = await ALS.place('port', e.port); return {kind:'port', id:pt.id, p:pt.p, name:pt.name, pt}; }
      if (e.rorbu){ const R = await ALS.place('rorbu', e.rorbu); return R ? {kind:'rorbu', id:R.id, p:R.p, name:R.name, pt:R} : {skip:'no shore found for the rorbu'}; }
      if (e.naust){ const pt = portById(e.naust); await mapPreload([pt.p], kinds); S.home = e.naust; S.naust = null; let n = null; for (let i = 0; i < 80 && !(n = naustSite()); i++) await sleep(100);
        return n ? {kind:'naust', id:e.naust, p:pt.p, name:pt.name + ' (naustet)', pt} : {skip:'no naust found'}; }
      return {skip:'unknown end'}; },
    // whether the place takes her (the game's own rules: an ocean vessel only where the quay and the room take her, placeWhy; the
    // rorbuer and the naust boats up to SITE_MAXLEN and what their sill lets out)
    takes(E, type){ const V = VESSELS[type]; if (E.kind === 'll') return null;
      if (E.kind === 'port'){ if (E.pt.havOnly && V.cls !== 'hav') return 'bare for havfiskefartøy'; if (V.cls === 'hav'){ const w = placeWhy(E.pt, type); if (w) return String(Array.isArray(w) ? w[0] : w).slice(0, 80); } return null; }
      if (V.len > SITE_MAXLEN) return 'over ' + SITE_MAXLEN + ' m'; if (typeof SITE_SILL !== 'undefined' && SITE_SILL[E.id] != null && !siteFits(type, E.id)) return 'terskelen'; return null; },
    // she is put at the stretch's start, the clock at the bench's hour
    put(A){ const b = S.boat; S.t = BK.T0; BK.eng = 'modell'; DYN.on = true;
      if (A.kind === 'll'){ S.plan = null; S.draft = []; S.jobs = []; b.status = 'idle'; b.port = null; b.berth = null; b.v = 0; b.land = null; b.landQ = null; b.dyn = null; b.anch = null; b.pos = {x:A.p.x, y:A.p.y}; b.fuel = BOAT.fuelCap; b.damage = 0; b.dmg = null; b.tow = null; b.tripBad = false; b.engineUntil = null; b.prev = null; b.engH = 0; b.svcAt = 0; b.hits = [];
        S.energy = 100; S.sleep = null; S.drowsy = false; S.rest = null; S.trail = [{x:A.p.x, y:A.p.y}]; ALS.clear(); DYN.line = null; return {x:A.p.x, y:A.p.y}; }
      ALS.put(A.id, A.kind === 'naust' ? 'naust' : 'main'); return {...(typeof quayPos === 'function' && quayPos(b) || b.pos)}; },
    // the coast's packs (bridges, piers, breakwaters) over the box round the points (km), fetched and decoded: the game decodes a tile
    // when it is asked for, in a worker, and a route waits four seconds for it at most (obsLoad); the bench sails and observes with
    // them in, so a run is the same every time. true when all are in
    async vecReady(pts, pad = 1.5, ms = 90000){ if (!MAPD.man || !pts.length) return true; const T = MAPD.man.tile, tiles = [];
      const x0 = Math.min(...pts.map(p => p.x)) - pad, x1 = Math.max(...pts.map(p => p.x)) + pad, y0 = Math.min(...pts.map(p => p.y)) - pad, y1 = Math.max(...pts.map(p => p.y)) + pad;
      for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) if (vecHas(tx, ty)){ tiles.push([tx, ty]); vecWant(tx * T, ty * T, (tx + 1) * T - 0.001, (ty + 1) * T - 0.001); }
      const t0 = performance.now(); while (performance.now() - t0 < ms){ if (tiles.every(([tx, ty]) => vecTile(tx, ty))) return true; await sleep(60); } return false; },
    // the route as a tap in the chart plotter finds it (draftWay), timed: the time it took and the longest the page's own thread was
    // held between two turns of the event loop while it was worked out
    async route(A, Z, from){ const b = S.boat, atN = b.status === 'port' && berthKind(b) === 'naust'; let nt = null;
      if (Z.kind === 'naust'){ nt = naustTarget(berthPose(Z.id, b.type, 'naust') || Z.p, 0.5); if (!nt) return {why:'the naust is not a place to go for her (naustTarget)'}; }
      if (BK.ny) return BK.route2(Z, from, nt);
      const ch = new MessageChannel(); let last = performance.now(), gap = 0, on = true; ch.port1.onmessage = () => { const t = performance.now(); if (t - last > gap) gap = t - last; last = t; if (on) ch.port2.postMessage(0); }; ch.port2.postMessage(0);
      const t0 = performance.now(); let r;
      try { r = await draftWay(from, Z.p, A.kind === 'll' || atN ? null : A.id, Z.kind === 'll' ? null : Z.id, atN, A.kind === 'll' ? null : A.id, nt); } catch (e){ r = {why:['error: ' + String(e && e.message).slice(0, 120)]}; }
      const ms = performance.now() - t0; on = false; const t = performance.now(); if (t - last > gap) gap = t - last; ch.port1.close();
      if (!r || !r.wps || !r.wps.length) return {why:String(r && r.why ? r.why[0] : 'none').slice(0, 120), ms:Math.round(ms), gap:+gap.toFixed(1)};
      const st = r.st || {}; return {r, nt, ms:Math.round(ms), gap:+gap.toFixed(1), st:{ms:st.ms, maxSlice:st.maxSlice, slices:st.slices, expanded:st.expanded, by:st.by, loadMs:st.loadMs, soft:st.soft}}; },
    // Autonav 2.0 (--autonav ny): the bane the planner finds (17c-plan.js planBane), timed the same way
    async route2(Z, from, nt){ const ch = new MessageChannel(); let last = performance.now(), gap = 0, on = true; ch.port1.onmessage = () => { const t = performance.now(); if (t - last > gap) gap = t - last; last = t; if (on) ch.port2.postMessage(0); }; ch.port2.postMessage(0);
      const t0 = performance.now(), sl0 = FARB.F.n.slice; FARB.F.n.slice = 0; let R;
      try { R = await planBane(from, nt ? {x:nt.x, y:nt.y} : Z.p, null, {kn:BOAT.vmax}); } catch (e){ R = {why:['error: ' + String(e && e.message).slice(0, 120)]}; }
      const ms = performance.now() - t0; on = false; const t = performance.now(); if (t - last > gap) gap = t - last; ch.port1.close(); const slice = FARB.F.n.slice; FARB.F.n.slice = Math.max(sl0, slice);
      if (!R.bane) return {why:String(R.why ? R.why[0] : 'none').slice(0, 160), cause:R.cause, at:R.at, ms:Math.round(ms), gap:+gap.toFixed(1), tries:R.tries, tiles:R.tiles};
      return {r:{wps:R.pts.map(q => ({x:q.x, y:q.y})), nm:R.nm, bane:R}, nt, ms:Math.round(ms), gap:+gap.toFixed(1), st:{ms:R.ms, maxSlice:+slice.toFixed(1), expanded:R.exp, tiles:R.tiles, tries:R.tries, time:Math.round(R.bane.time)}}; },
    plan(r, Z, nt, full){ const n = r.wps.length, last = nt ? {x:nt.x, y:nt.y, port:Z.id, berth:'naust', fish:0} : Z.id ? {x:Z.p.x, y:Z.p.y, port:Z.id, fish:0} : {x:Z.p.x, y:Z.p.y, port:null, fish:0, leia:true};
      S.plan = {wps:r.wps.map((q, i) => i === n - 1 ? last : {x:q.x, y:q.y, port:null, fish:0, leia:true}), idx:0, speed:full ? BOAT.vmax : BOAT.vcruise, full:!!full, returning:false};
      if (r.bane){ S.plan.wps = [last]; planInto(S.plan, r.bane, 0, 1); }
      return {id:Z.id, name:Z.name, p:nt ? {x:nt.x, y:nt.y} : Z.p, berth:Z.kind === 'naust' ? 'naust' : null}; },
    // how the route looks: its length, its turns over 30 degrees per nautical mile, all its turning (degrees a mile), its legs shorter
    // than two boat lengths outside the harbours, and the straight line
    shape(from, wps){ const P = [from].concat(wps), L = BOAT.len || 10; let km0 = 0, turn = 0, kinks = 0, short = 0, minLeg = 1e9;
      for (let i = 1; i < P.length; i++){ const d = dist(P[i - 1], P[i]); km0 += d; if (d < minLeg) minLeg = d; if (d * 1000 < 2 * L && !(inHarbour(P[i - 1]) && inHarbour(P[i]))) short++;
        if (i > 1){ let a = Math.atan2(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y) - Math.atan2(P[i - 1].x - P[i - 2].x, P[i - 1].y - P[i - 2].y); a = Math.abs(BKO.norm(a)) / RAD; turn += a; if (a > 30) kinks++; } }
      const nm = km0 / NM; return {nm:+nm.toFixed(3), n:wps.length, air:+(dist(from, P[P.length - 1]) / NM).toFixed(3), kinks, kinksNm:+(kinks / Math.max(nm, 0.05)).toFixed(2), turnNm:Math.round(turn / Math.max(nm, 0.05)), short, minLeg:Math.round(minLeg * 1000)}; },
    // ---- the sailing ----
    async sailModel(r, to, from){ BK.eng = 'modell'; BK.err = null; const R = {}; BK.begin(to, from, r); try { await ALS.sail(R, r, to, from); } catch (e){ R.why = 'error: ' + String(e && e.message).slice(0, 120); } return BK.finish(R, r); },
    // the time away: the minute step alone with the model off, as playMinutes plays it (ui/08-actions.js: no step while the waters are
    // not in or a way round is being looked for), till she lies where she was sent or the time is out
    async sailBg(r, to, from){ BK.eng = 'bakgrunn'; BK.err = null; const b = S.boat, R = {}; BK.begin(to, from, r); const c = BK.cur;
      try { const T0 = S.t, H0 = DYN.hands || 0; DYN.on = false; if (depart() === false){ R.why = 'depart: refused'; S.plan = null; return BK.finish(R, r); }
        const limit = 60 + Math.ceil(r.nm / Math.max(3, BOAT.vcruise) * 60 * 1.6); let best = 1e9, lastBest = S.t, stuck = null, waits = 0;
        LANDQ.away = true;
        while (S.t - T0 < limit){
          if (!simAreaReady()){ await mapNeed(b.pos, 4); await sleep(20); continue; }
          if (sailWaiting() && waits++ < 1500){ await sleep(20); continue; }
          DYN.on = false; const pl0 = S.plan, p0 = {x:b.pos.x, y:b.pos.y}, i0 = pl0 ? pl0.idx : 0, w0 = pl0 ? {a:pl0.wps, n:pl0.wps.length, pts:pl0.wps.map(q => ({x:q.x, y:q.y}))} : null;
          step(); BK.watchBg(c, p0, i0, w0);
          if (S.plan && S.plan.replan) await sleep(20);
          if (b.status === 'aground'){ stuck = 'aground'; break; }
          if (b.status === 'port' && !S.plan) break;
          if (!to.id && !S.plan && ['idle', 'fishing', 'sailing'].includes(b.status)) break;
          const pl = S.plan; let d = 0; if (pl && pl.wps.length > pl.idx){ d = dist(b.pos, pl.wps[pl.idx]); for (let j = pl.idx + 1; j < pl.wps.length; j++) d += dist(pl.wps[j - 1], pl.wps[j]); }
          if (d < best - 0.03){ best = d; lastBest = S.t; } else if (S.t - lastBest > 40){ stuck = 'no headway for 40 min (' + b.status + ')'; break; } }
        R.min = S.t - T0; R.end = b.status; R.hands = (DYN.hands || 0) - H0; R.at = to.id ? b.port === to.id : dist(b.pos, to.p) < 0.3; if (to.berth && R.at && b.berth !== to.berth) R.at = false;
        if (stuck) R.why = stuck; else if (!R.at) R.why = 'not in ' + to.name + ' after ' + R.min + ' min (' + b.status + ', ' + dist(b.pos, to.p).toFixed(2) + ' km off)';
      } catch (e){ R.why = 'error: ' + String(e && e.message).slice(0, 120); } finally { LANDQ.away = false; S.plan = null; }
      return BK.finish(R, r); },
    // the first n steps of the boat model from the berth, each timed (the line she steers by is built in the first, dynLineBuild)
    // (the traffic round her is looked up first: the game pays for that when the chart or the 3D view draws the other vessels, whatever
    // Autonav does, and with no view open here it would land on her first step; `warm` is what it took)
    cpu(n){ const T = [], b = S.boat, t00 = performance.now(); try { npcStates(S.t / 60); sjvNear(S.t / 60, b.pos.x * 1000, b.pos.y * 1000); if (typeof fixBoats === 'function') fixBoats(b.pos.x * 1000, b.pos.y * 1000); } catch (e){} const warm = performance.now() - t00;
      if (depart() === false) return null; acc = 0; lastWall = Date.now();
      for (let i = 0; i < n; i++){ const t0 = performance.now(); dynTick(0.25); T.push(performance.now() - t0); acc += 0.25 * simRate() / 60; lastWall = Date.now(); while (acc >= 1){ step(); acc -= 1; } }
      S.plan = null; const s = T.slice().sort((a, b) => a - b); return {first:+T[0].toFixed(1), max:+s[s.length - 1].toFixed(1), at:T.indexOf(s[s.length - 1]), mean:+(T.reduce((a, b) => a + b, 0) / T.length).toFixed(2), med:+s[Math.floor(s.length / 2)].toFixed(2), p95:+s[Math.floor(s.length * 0.95)].toFixed(2), over4:s.filter(v => v > 4).length, warm:+warm.toFixed(1)}; }
  };
  Object.assign(BK, {
    // the boat, the wind and the bench's hour; the tide stands at chart datum the whole trip (Jonas 15.11.2026: «kun laveste lavvann,
    // fordi det sikrer at det faktisk fungerer under alle forhold»), so the charted depths are the water there is
    cond([type, w, d, hh]){ const b = S.boat; if (b.type !== type){ b.type = type; if (!S.owned.includes(type)) S.owned.push(type); applyVessel(); }
      WX_FORCE = {w, d}; tideH = (H, p) => -tideZC(p); window.ALS_LOW = true; BK.T0 = Math.round((Date.UTC(2027, 5, 15, 11) - EPOCH) / 6e4) + Math.round((hh || 0) * 60); S.t = BK.T0; BK.rocks.clear(); return true; },
    // ---- the reference («fasiten»): the shortest way there is for her with the hard minimums only ----
    // A grid of 5 m cells over the window round the stretch (10 m and more when the window is big). A cell is hard when its middle is
    // land or inside a thing (her own rocks and low decks with them); she may be where the nearest hard cell is at least half her
    // beam and FAS.side m away, with FAS.keel m under her keel at chart datum, but for the cells by her own berth at each end. The
    // shortest way over those cells (A* with eight neighbours, no corner cut), pulled tight where the straight line is clear. Not a
    // route to sail (no turning circle, no speed): the length no route can beat by much, to measure the detours against.
    FAS:{side:2, keel:0.5, cells:5e6, cell:5},
    async landGrid(pts, widen = 1, cell0 = 0){ let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
      const m = Math.max(0.3, Math.max(x1 - x0, y1 - y0) * 0.25) * widen; x0 -= m; x1 += m; y0 -= m; y1 += m;
      let cell = cell0 || BK.FAS.cell; while ((x1 - x0) * 1000 / cell * ((y1 - y0) * 1000 / cell) > BK.FAS.cells) cell *= 2;
      const W = Math.ceil((x1 - x0) * 1000 / cell), Hh = Math.ceil((y1 - y0) * 1000 / cell), X0 = x0 * 1000, Z0 = y0 * 1000, t0 = performance.now();
      const need = []; for (let y = y0; y < y1 + 3; y += 3) for (let x = x0; x < x1 + 3; x += 3) need.push({x:Math.min(x, x1), y:Math.min(y, y1)});
      await mapPreload(need, [['sim', 3], ['chart', 3], ['vec', 3]]);
      await BK.vecReady([{x:x0, y:y0}, {x:x1, y:y1}], 0.2);
      const land = new Uint8Array(W * Hh), Bk = 8, half = Bk * cell * 0.7072 + cell, UN = UNITA.filter(U => U.o[0] > X0 - 400 && U.o[0] < x1 * 1000 + 400 && U.o[1] > Z0 - 400 && U.o[1] < y1 * 1000 + 400);
      for (let bj = 0; bj < Hh; bj += Bk){ for (let bi = 0; bi < W; bi += Bk){ const cx = X0 + (bi + Bk / 2) * cell, cz = Z0 + (bj + Bk / 2) * cell; let uni = null;
          // (a block with no coast line within its reach and no harbour unit near is all land or all water)
          try { const c = km(cx, cz), d = coastDistM(c, half + 5); if (d >= half && !UN.some(U => Math.hypot(U.o[0] - cx, U.o[1] - cz) < half + 200)) uni = isLand(c) ? 1 : 0; } catch (e){}
          for (let j = bj; j < Math.min(Hh, bj + Bk); j++) for (let i = bi; i < Math.min(W, bi + Bk); i++){ let v = uni; if (v == null){ try { v = isLand(km(X0 + (i + 0.5) * cell, Z0 + (j + 0.5) * cell)) ? 1 : 0; } catch (e){ v = 1; } } land[j * W + i] = v; } }
        if ((bj / Bk) % 24 === 0) await sleep(0); }
      return BK.G = {x0, y0, x1, y1, X0, Z0, cell, W, Hh, land, widen, ms:Math.round(performance.now() - t0)}; },
    // the squared distance (cells) from every cell to the nearest hard one (Felzenszwalb and Huttenlocher's transform, exact)
    edt(hard, W, Hh){ const INF = 1e12, N = W * Hh, d = new Float32Array(N), n = Math.max(W, Hh), f = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), o = new Float64Array(n);
      for (let i = 0; i < N; i++) d[i] = hard[i] ? 0 : INF;
      const dt = len => { let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < len; q++){ let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); while (s <= z[k]){ k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); } k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
        k = 0; for (let q = 0; q < len; q++){ while (z[k + 1] < q) k++; const p = v[k]; o[q] = (q - p) * (q - p) + f[p]; } };
      for (let x = 0; x < W; x++){ for (let y = 0; y < Hh; y++) f[y] = d[y * W + x]; dt(Hh); for (let y = 0; y < Hh; y++) d[y * W + x] = o[y]; }
      for (let y = 0; y < Hh; y++){ const r = y * W; for (let x = 0; x < W; x++) f[x] = d[r + x]; dt(W); for (let x = 0; x < W; x++) d[r + x] = o[x]; }
      return d; },
    // a thing into the hard cells: every cell whose middle is in it, and the cells its own line or outline passes (a stake, a narrow pier)
    raster(G, hard, o){ const {X0, Z0, cell, W, Hh} = G, b = BKO.bbox(o), mark = (x, z) => { const i = Math.floor((x - X0) / cell), j = Math.floor((z - Z0) / cell); if (i >= 0 && j >= 0 && i < W && j < Hh) hard[j * W + i] = 1; };
      const walk = (ax, az, bx, bz) => { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (cell / 2))); for (let k = 0; k <= n; k++) mark(ax + (bx - ax) * k / n, az + (bz - az) * k / n); };
      const P = o.k === 'b' ? (o.P || (o.P = BKO.boxPts(o))) : o.P, closed = o.k === 'b' || o.k === 'p' || o.k === 'h';
      const ins = o.k === 'c' ? (x, z) => Math.hypot(x - o.x, z - o.z) < o.r : o.k === 'e' ? (x, z) => { const dx = x - o.x, dz = z - o.z, ct = Math.cos(o.th), st = Math.sin(o.th), u = (dx * ct + dz * st) / o.a, w = (-dx * st + dz * ct) / o.b; return u * u + w * w < 1; }
        : o.k === 's' ? (x, z) => BKO.dSeg(x, z, o.ax, o.az, o.bx, o.bz) < o.r : o.k === 'l' ? (x, z) => { for (let k = 1; k < P.length; k++) if (BKO.dSeg(x, z, P[k - 1][0], P[k - 1][1], P[k][0], P[k][1]) < o.r) return true; return false; } : (x, z) => BKO.inPoly(P, x, z);
      const i0 = Math.max(0, Math.floor((b[0] - X0) / cell)), i1 = Math.min(W - 1, Math.floor((b[2] - X0) / cell)), j0 = Math.max(0, Math.floor((b[1] - Z0) / cell)), j1 = Math.min(Hh - 1, Math.floor((b[3] - Z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!hard[j * W + i] && ins(X0 + (i + 0.5) * cell, Z0 + (j + 0.5) * cell)) hard[j * W + i] = 1;
      if (o.k === 'c' || o.k === 'e') mark(o.x, o.z); else if (o.k === 's') walk(o.ax, o.az, o.bx, o.bz); else if (P) for (let k = closed ? 0 : 1; k < P.length; k++){ const a = P[(k + P.length - 1) % P.length], q = P[k]; walk(a[0], a[1], q[0], q[1]); } },
    // the reference for the boat she is now, from a to z (km), on the grid BK.G: {nm, n, cell, ms, pts} or {why}
    fasit(a, z){ const G = BK.G, {X0, Z0, cell, W, Hh} = G, N = W * Hh, t0 = performance.now(), L = BOAT.len || 10, H = BK.T0 / 60;
      const hard = G.land.slice(), eng = BK.eng; BK.eng = 'bakgrunn'; let things = []; try { things = BK.thingsIn(X0, Z0, X0 + W * cell, Z0 + Hh * cell); } finally { BK.eng = eng; }
      for (const o of things) BK.raster(G, hard, o);
      const d2 = BK.edt(hard, W, Hh), need = ((BOAT.beam || 3) / 2 + BK.FAS.side + cell / 2) / cell, need2 = need * need, deep = new Uint8Array(N), lim = BOAT.draft + BK.FAS.keel;
      const cellOf = p => { const i = Math.floor((p.x * 1000 - X0) / cell), j = Math.floor((p.y * 1000 - Z0) / cell); return i >= 0 && j >= 0 && i < W && j < Hh ? j * W + i : -1; };
      const re = Math.max(1.5 * L, 25) / cell, ends = [a, z].map(p => [(p.x * 1000 - X0) / cell - 0.5, (p.y * 1000 - Z0) / cell - 0.5]);
      const pass = k => { if (hard[k]) return false; const i = k % W, j = (k - i) / W;
        for (const e of ends) if ((i - e[0]) * (i - e[0]) + (j - e[1]) * (j - e[1]) < re * re) return true;   // (by her berth: the quay beside her is hers)
        if (d2[k] < need2) return false;
        let v = deep[k]; if (!v){ const p = km(X0 + (i + 0.5) * cell, Z0 + (j + 0.5) * cell); let dd = 0; try { dd = depthNav(p) + tideCD(H, p); } catch (e){} v = deep[k] = dd >= lim ? 1 : 2; } return v === 1; };
      // each end's cell, or the nearest one she may be in within her berth's reach
      const snap = p => { const k0 = cellOf(p); if (k0 < 0) return -1; if (pass(k0)) return k0; const i0 = k0 % W, j0 = (k0 - i0) / W, R = Math.ceil(re); let best = -1, bd = 1e9;
        for (let j = Math.max(0, j0 - R); j <= Math.min(Hh - 1, j0 + R); j++) for (let i = Math.max(0, i0 - R); i <= Math.min(W - 1, i0 + R); i++){ const dd = (i - i0) * (i - i0) + (j - j0) * (j - j0); if (dd < bd && pass(j * W + i)){ bd = dd; best = j * W + i; } } return best; };
      const s = snap(a), t = snap(z); if (s < 0 || t < 0) return {why:(s < 0 ? 'the start' : 'the end') + ' is not on water she may be in', cell};
      const g = new Float32Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), done = new Uint8Array(N), ti = t % W, tj = (t - ti) / W, SQ = Math.SQRT2;
      const h = k => { const dx = Math.abs(k % W - ti), dz = Math.abs(Math.floor(k / W) - tj); return dx > dz ? dx + (SQ - 1) * dz : dz + (SQ - 1) * dx; };
      // (a binary heap of [f, cell])
      const hf = [], hk = []; const push = (f, k) => { let i = hf.length; hf.push(f); hk.push(k); while (i > 0){ const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hk[i] = hk[p]; i = p; } hf[i] = f; hk[i] = k; };
      const pop = () => { const k = hk[0], f = hf.pop(), kk = hk.pop(), n = hf.length; if (n){ let i = 0; for (;;){ let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hk[i] = hk[c]; i = c; } hf[i] = f; hk[i] = kk; } return k; };
      g[s] = 0; push(h(s), s); let found = false, exp = 0;
      while (hf.length){ const k = pop(); if (done[k]) continue; done[k] = 1; exp++; if (k === t){ found = true; break; } const i = k % W, j = (k - i) / W, gk = g[k];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++){ if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= Hh) continue; const nk = nj * W + ni; if (done[nk] || !pass(nk)) continue;
          if (di && dj && !(pass(j * W + ni) && pass(nj * W + i))) continue; const ng = gk + (di && dj ? SQ : 1); if (ng < g[nk]){ g[nk] = ng; par[nk] = k; push(ng + h(nk), nk); } } }
      if (!found) return {why:'no way with the hard minimums (half her beam + ' + BK.FAS.side + ' m, ' + BK.FAS.keel + ' m under her keel)', cell, exp, ms:Math.round(performance.now() - t0)};
      let P = []; for (let k = t; k >= 0; k = par[k]) P.push([k % W + 0.5, Math.floor(k / W) + 0.5]); P.reverse();
      // the straight line between two cell middles is clear when every cell it passes is one she may be in
      const los = (p, q) => { const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) * 2)); for (let u = 1; u < n; u++){ const x = p[0] + (q[0] - p[0]) * u / n, y = p[1] + (q[1] - p[1]) * u / n; if (!pass(Math.floor(y) * W + Math.floor(x))) return false; } return true; };
      for (let round = 0; round < 4; round++){ const out = [P[0]]; let i = 0; while (i < P.length - 1){ let j = i + 1, st = 1; while (j + st < P.length && los(P[i], P[j + st])){ j += st; st *= 2; } for (st >>= 1; st >= 1; st >>= 1) if (j + st < P.length && los(P[i], P[j + st])) j += st; out.push(P[j]); i = j; } const same = out.length === P.length; P = out; if (same) break; }
      let len = 0; for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      const pts = P.map(q => [+((X0 + q[0] * cell) / 1000).toFixed(4), +((Z0 + q[1] * cell) / 1000).toFixed(4)]);
      return {nm:+((len * cell / 1000 + dist(a, {x:pts[0][0], y:pts[0][1]}) + dist(z, {x:pts[pts.length - 1][0], y:pts[pts.length - 1][1]})) / NM).toFixed(3), n:P.length, cell, exp, ms:Math.round(performance.now() - t0), pts}; }
  });
  // ---- a picture of a stretch: the reference's own grid (land, the things in the water as she meets them), the route, the reference
  // and what she touched in each engine; a PNG as a data URL ----
  BK.bilde = (o) => { const G = BK.G, {X0, Z0, cell, W, Hh} = G, hard = new Uint8Array(W * Hh), eng = BK.eng; BK.eng = 'bakgrunn'; let things = []; try { things = BK.thingsIn(X0, Z0, X0 + W * cell, Z0 + Hh * cell); } finally { BK.eng = eng; }
    for (const t of things) BK.raster(G, hard, t);
    const c0 = document.createElement('canvas'); c0.width = W; c0.height = Hh; const x0 = c0.getContext('2d'), im = x0.createImageData(W, Hh), D = im.data;
    for (let i = 0; i < W * Hh; i++){ const k = i * 4, v = G.land[i] ? [203, 196, 178] : hard[i] ? [60, 60, 70] : [224, 236, 244]; D[k] = v[0]; D[k + 1] = v[1]; D[k + 2] = v[2]; D[k + 3] = 255; }
    x0.putImageData(im, 0, 0);
    const sc = Math.min(4, Math.max(0.25, 1500 / Math.max(W, Hh))), cw = Math.round(W * sc), chh = Math.round(Hh * sc), top = 64, cv = document.createElement('canvas'); cv.width = Math.max(cw, 900); cv.height = chh + top + 30;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = sc < 1; g.drawImage(c0, 0, top, cw, chh);
    const px = p => [(p.x * 1000 - X0) / cell * sc, (p.y * 1000 - Z0) / cell * sc + top], line = (P, col, w, dash) => { if (!P || P.length < 2) return; g.beginPath(); g.setLineDash(dash || []); g.strokeStyle = col; g.lineWidth = w; P.forEach((p, i) => { const q = px(p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); g.setLineDash([]); };
    if (o.fasit) line(o.fasit.map(q => ({x:q[0], y:q[1]})), '#0a8f3c', 3, [9, 6]);
    if (o.rute) line([BK.from].concat(o.rute.map(q => ({x:q[0], y:q[1]}))), '#1450c8', 2.5);
    if (o.rute) for (const q of o.rute){ const a = px({x:q[0], y:q[1]}); g.fillStyle = '#1450c8'; g.beginPath(); g.arc(a[0], a[1], 3.5, 0, 7); g.fill(); }
    const mark = (h, col, sq) => { const p = natP(h.lat, h.lon), a = px(p); g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); if (sq) g.rect(a[0] - 7, a[1] - 7, 14, 14); else g.arc(a[0], a[1], 8, 0, 7); g.stroke(); g.fillStyle = col; g.font = '13px sans-serif'; g.fillText(h.what, a[0] + 11, a[1] + (sq ? 16 : -6)); };
    for (const h of o.modell || []) mark(h, '#d01818', false); for (const h of o.bakgrunn || []) mark(h, '#e07800', true);
    const a = px(BK.from), z = px(o.til); g.fillStyle = '#000'; g.font = 'bold 14px sans-serif'; g.fillText('A', a[0] - 4, a[1] - 8); g.fillText('B', z[0] - 4, z[1] - 8);
    g.fillStyle = '#000'; g.font = 'bold 17px sans-serif'; g.fillText(o.tittel, 8, 22); g.font = '14px sans-serif'; g.fillText(o.under, 8, 44);
    g.fillStyle = '#1450c8'; g.fillText('— ruta', 8, chh + top + 20); g.fillStyle = '#0a8f3c'; g.fillText('- - fasiten (korteste med minstemålene)', 70, chh + top + 20); g.fillStyle = '#d01818'; g.fillText('○ treff med båtmodellen', 340, chh + top + 20); g.fillStyle = '#e07800'; g.fillText('□ treff som bakgrunnstur', 520, chh + top + 20);
    // (a scale bar)
    const m = [50, 100, 200, 500, 1000, 2000, 5000].find(v => v / cell * sc > 70) || 5000; g.fillStyle = '#000'; g.fillRect(cv.width - 30 - m / cell * sc, 50, m / cell * sc, 3); g.font = '12px sans-serif'; g.fillText(m + ' m', cv.width - 30 - m / cell * sc, 44);
    return cv.toDataURL('image/png'); };
  // the observer after every step of the model, and each step timed (the step alone, not the observer)
  const dt0 = dynTick; dynTick = function(){ const c = BK.cur, t0 = c ? performance.now() : 0, r = dt0.apply(this, arguments); if (c){ const ms = performance.now() - t0; c.tN++; c.tSum += ms; if (ms > c.tMax) c.tMax = ms; } try { BK.watch(); } catch (e){ BK.err = String(e && e.stack || e).slice(0, 300); } return r; };
  return true; }
