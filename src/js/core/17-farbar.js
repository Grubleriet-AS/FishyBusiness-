// ===== FARBARHETSKARTET: ONE TRUTH ABOUT WHAT A BOAT CAN SAIL OVER AND UNDER (Autonav 2.0 F1, steg 141, 23.11.2026) =====
// Jonas 23.11.2026: «Målet er null kollisjoner og grunnstøtinger … og at systemet fungerer like presist for den minste båten som for
// det største fartøyet.» The plan and the diagnosis: docs/planer/autonav-2-0.md. Today's Autonav asks three pictures of the world
// (the route's obstacles, the way through a harbour and the boat model's contact, and what the 3D view draws), each with its own
// margins, and checks a line without a width. This is the one picture Autonav 2.0's planner (F2), its steering and watch (F3) and
// the trip in the background are to ask, for a boat's own beam, draught and height:
//   - the fine coast and the harbour units' ground (isLand), and the distance to the coast line;
//   - the water there is: the chart's depth with the tide, the foreshore as the 3D view draws it (the ground stands FARB.shore.top
//     over mean sea level on the coast line and falls 1 in 3 seaward, 1 in 1.5 by a breakwater: view3d/02-mesh-terrain.js COAST3,
//     whose numbers these are), and a channel dredged for the boats a place takes (farbDig, Jonas' choice 5: «Tilpass havna»);
//   - everything that stands in the sea, each in its own shape: Senja's and the coast's piers, quay decks, slab piers and
//     breakwaters as the 3D view builds them, the floating docks, Father's naust's and the rorbuer's quays, the harbour units, the
//     sea marks, the wind turbines, the rocks as the 3D view shapes them, the bridges' piers, and a bridge's deck where it is lower
//     than she is high (her height: VESSELS.air, Jonas' choice 6), and the vessels lying still when asked for.
// A point is asked with farbNearest and farbClear (how far to the nearest thing she cannot pass), her hull with farbPose (her
// waterline's outline against the coast's own edges and each thing's own shape, with a margin to the side when asked, and the water
// under the outline against her draught) and farbSweep (the outline swept from one pose to the next). Where the map is not in (a
// pack not loaded, the coast's things not decoded and sorted) the answer is «not known» (NaN, 'ukjent'), never «free».
// Nothing of the game calls this yet: today's Autonav (11-route.js, 11b-obstacles.js, 16b-dyn.js) sails as before. The bench's
// observer (tools/autonav/benk.js) reads the raw data itself, not this, and tools/autonav/farsjekk.py holds the two against each other.
// Metres on the grid throughout: x east, z south, psi from north clockwise (as the boat model); H game hours.
const FARB = {C:250, cap:100, airOver:1, keel:0.5, side:2, eps:0.03, step:0.3, skip:60, slice:0.6, t0:0, live:false,
  shore:{top:2, g:1 / 3, gMole:1 / 1.5, deep:-2.5, reach:13.5},
  // her waterline, the starboard half from the bow aft: fractions of L forward and of B abeam (a rounded bow, a square stern)
  hullF:[[0.5, 0], [0.44, 0.27], [0.33, 0.45], [0.2, 0.5], [-0.5, 0.5]],
  lay:{stat:null, statN:-1, unit:null, unitN:-1, site:null, siteKey:null}, til:new WeakMap(), nTil:0, mk:new Map(), rk:new Map(), dug:new Map(), dugL:[], keelP:new Map(),
  kn:new Map(), knV:'', buf:[], cs:[], pk:new WeakMap(), tp:new Map(), rkm:new Map(), rkV:-1, ovr:new Map(), ovd:new Set(), pz:null, q:0, mole:0, test:null, w:null, n:{pose:0, near:0, ms:0}};
const FARB_UNK = {d:NaN, what:'ukjent', id:'', x:0, z:0, o:null}, FARB_NONE = [];
// (the 3D view's own generator for a rock's shape, view3d/00-head.js rng)
const farbRng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---- the boat as the map asks about her ----
// {L, B, T (draught), air (her highest point over the waterline)} of a type, or of the boat that is sailed now
function farbBoat(type){ const V = type ? VESSELS[type] : BOAT, L = V.len || 8; return {L, B:V.beam || 3, T:V.draft || 1, air:V.air > 0 ? V.air : Math.min(16, Math.max(2, L * 0.35))}; }
// her waterline's outline at a pose (m; from the bow round by starboard): convex
function farbHull(X, Z, psi, boat){ const s = Math.sin(psi), c = Math.cos(psi), F = FARB.hullF, L = boat.L, B = boat.B, P = [];
  for (let i = 0; i < F.length; i++){ const f = F[i][0] * L, g = F[i][1] * B; P.push([X + f * s + g * c, Z - f * c + g * s]); }
  for (let i = F.length - 1; i > 0; i--){ const f = F[i][0] * L, g = -F[i][1] * B; P.push([X + f * s + g * c, Z - f * c + g * s]); }
  return P; }
// half her breadth (m) f metres forward of amidships, from the waterline's outline
function farbHalfW(f, boat){ const P = FARB.hullF, u = f / boat.L; if (u < -0.5 || u > 0.5) return 0; if (u <= P[3][0]) return 0.5 * boat.B;
  for (let i = 3; i > 0; i--) if (u <= P[i - 1][0]){ const a = P[i], b = P[i - 1]; return (a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0])) * boat.B; } return 0; }
// Where the water under her is asked (m forward, m to starboard): the points the bench's observer asks (amidships, the centre line
// by the bow and by the stern, and 0.42 B to each side), her outline's corners, and a lattice of 4 m or closer over her whole
// waterline, so the biggest hull is asked as closely as the smallest (a 75 m hull asked at her corners alone had 52 m of each side
// unasked). rim: with her outline every 2 m or closer as well, for where the foreshore is under her: its ground rises 1 in 3 (1 in
// 1.5 by a breakwater), so between two points 2 m apart it is at most 0.33 m (0.67 m) higher than at the nearer of them
function farbKeelPts(boat, rim){ const key = boat.L + '|' + boat.B; let Y = FARB.keelP.get(key);
  if (!Y){ const L = boat.L, B = boat.B, P = [[0, 0], [0.42 * L, 0], [-0.45 * L, 0], [0, 0.42 * B], [0, -0.42 * B]], O = [];
    for (const [f, g] of FARB.hullF) O.push([f * L, g * B]); for (let i = FARB.hullF.length - 1; i > 0; i--) O.push([FARB.hullF[i][0] * L, -FARB.hullF[i][1] * B]);
    for (const q of O) P.push(q);
    const nf = Math.ceil(L / 4); for (let i = 0; i <= nf; i++){ const f = (-0.5 + i / nf) * L, hw = farbHalfW(f, boat), ng = Math.max(1, Math.ceil(2 * hw / 4)); if (!(hw > 0)) continue; for (let j = 0; j <= ng; j++) P.push([f, -hw + 2 * hw * j / ng]); }
    const R = P.slice(); for (let i = 0, j = O.length - 1; i < O.length; j = i++){ const a = O[j], b = O[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (let k = 1; k < n; k++) R.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    FARB.keelP.set(key, Y = [P, R]); }
  return Y[rim ? 1 : 0]; }

// ---- a thing, and how far a point is from it ----
// k 'c' a circle {x, z, r}; 'b' a box {x, z, l, w (half length and width), ux, uz (the way its length runs)}; 's' a piece of a
// bridge's deck {ax, az, bx, bz, r (half its width), under}; 'p' a closed outline {P}; 'l' an open line with a width {P, r}; 'e' an
// ellipse {x, z, a, b, th}; 'u' a harbour unit's block and fill {U}. Each with what it is (what, as the log names it) and an id.
function farbSegD(x, z, ax, az, bx, bz){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0; return Math.hypot(x - ax - dx * u, z - az - dz * u); }
function farbInPoly(P, x, z){ let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1]; if ((zi > z) !== (zj > z) && x < xi + (z - zi) * (xj - xi) / (zj - zi)) ins = !ins; } return ins; }
// metres from x, z to the thing, 0 on or in it; never more than the true distance (an ellipse's is a floor under it)
function farbD(o, x, z){
  switch (o.k){
    case 'c': return Math.max(0, Math.hypot(x - o.x, z - o.z) - o.r);
    case 'b': { const dx = x - o.x, dz = z - o.z; return Math.hypot(Math.max(0, Math.abs(dx * o.ux + dz * o.uz) - o.l), Math.max(0, Math.abs(dx * o.uz - dz * o.ux) - o.w)); }
    case 's': return Math.max(0, farbSegD(x, z, o.ax, o.az, o.bx, o.bz) - o.r);
    case 'p': { const P = o.P; if (farbInPoly(P, x, z)) return 0; let m = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const d = farbSegD(x, z, P[j][0], P[j][1], P[i][0], P[i][1]); if (d < m) m = d; } return m; }
    case 'l': { const P = o.P; let m = P.length === 1 ? Math.hypot(x - P[0][0], z - P[0][1]) : Infinity; for (let i = 1; i < P.length; i++){ const d = farbSegD(x, z, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]); if (d < m) m = d; } return Math.max(0, m - o.r); }
    // (two floors under the true distance, the higher of them: the scaled one is close near the foot, the circle round it far off)
    case 'e': { const dx = x - o.x, dz = z - o.z, ct = Math.cos(o.th), st = Math.sin(o.th), k = Math.hypot((dx * ct + dz * st) / o.a, (-dx * st + dz * ct) / o.b); return k <= 1 ? 0 : Math.max((k - 1) * Math.min(o.a, o.b), Math.hypot(dx, dz) - Math.max(o.a, o.b)); }
    case 'u': { const l = unitL(o.U, x, z); return groundOut(o.U, l[0], l[1]); }
  }
  return Infinity;
}
// ---- her outline (a convex polygon P) against a point, a line and a thing ----
// metres from x, z to P, 0 in or on it
function farbPtPoly(P, x, z){ let sg = 0, ins = true;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const cr = (P[i][0] - P[j][0]) * (z - P[j][1]) - (P[i][1] - P[j][1]) * (x - P[j][0]); if (cr > 1e-12 || cr < -1e-12){ const g = cr > 0 ? 1 : -1; if (sg && g !== sg){ ins = false; break; } sg = g; } }
  if (ins) return 0; let m = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const d = farbSegD(x, z, P[j][0], P[j][1], P[i][0], P[i][1]); if (d < m) m = d; } return m; }
const farbTurn = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
// metres between the line a-b and P, 0 where they touch or cross (two lines that do not cross are nearest at an end of one of them)
function farbSegPoly(P, ax, az, bx, bz){ if (farbPtPoly(P, ax, az) === 0 || farbPtPoly(P, bx, bz) === 0) return 0; let m = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const px = P[j][0], pz = P[j][1], qx = P[i][0], qz = P[i][1];
    const d1 = farbTurn(px, pz, qx, qz, ax, az), d2 = farbTurn(px, pz, qx, qz, bx, bz), d3 = farbTurn(ax, az, bx, bz, px, pz), d4 = farbTurn(ax, az, bx, bz, qx, qz);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
    const d = Math.min(farbSegD(px, pz, ax, az, bx, bz), farbSegD(ax, az, px, pz, qx, qz), farbSegD(bx, bz, px, pz, qx, qz)); if (d < m) m = d; }
  return m; }
// a closed outline Q of any shape against P: 0 where they overlap (an edge of Q touches P, or P lies inside Q)
function farbRingD(P, Q){ let m = Infinity; for (let i = 0, j = Q.length - 1; i < Q.length; j = i++){ const d = farbSegPoly(P, Q[j][0], Q[j][1], Q[i][0], Q[i][1]); if (d === 0) return 0; if (d < m) m = d; } return farbInPoly(Q, P[0][0], P[0][1]) ? 0 : m; }
const farbBoxPts = o => { const nx = o.uz, nz = -o.ux; return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [o.x + o.ux * o.l * a + nx * o.w * b, o.z + o.uz * o.l * a + nz * o.w * b]); };
// a harbour unit's ground as outlines: its block, and its fill behind it where it has one
function farbUnitRings(U){ const g = ugeo(U), R = [[[g.E, 0], [g.E, -g.B], [-g.E, -g.B], [-g.E, 0]].map(([lx, lz]) => unitW(U, lx, lz))]; if (U.f){ const F = []; for (let i = 0; i + 1 < U.f.length; i += 2) F.push(unitW(U, U.f[i], U.f[i + 1])); R.push(F); } return R; }
// metres between her outline P and a thing, 0 where they touch (an ellipse's is a floor under the true distance)
function farbPolyD(P, o){
  switch (o.k){
    case 'c': return Math.max(0, farbPtPoly(P, o.x, o.z) - o.r);
    case 's': return Math.max(0, farbSegPoly(P, o.ax, o.az, o.bx, o.bz) - o.r);
    case 'l': { const Q = o.P; let m = Q.length === 1 ? farbPtPoly(P, Q[0][0], Q[0][1]) : Infinity; for (let i = 1; i < Q.length && m > 0; i++){ const d = farbSegPoly(P, Q[i - 1][0], Q[i - 1][1], Q[i][0], Q[i][1]); if (d < m) m = d; } return Math.max(0, m - o.r); }
    case 'b': return farbRingD(P, o.Q || (o.Q = farbBoxPts(o)));
    case 'p': return farbRingD(P, o.P);
    case 'e': { const ct = Math.cos(o.th), st = Math.sin(o.th); return Math.max(Math.max(0, farbPtPoly(P.map(([x, z]) => { const dx = x - o.x, dz = z - o.z; return [(dx * ct + dz * st) / o.a, (-dx * st + dz * ct) / o.b]; }), 0, 0) - 1) * Math.min(o.a, o.b), farbPtPoly(P, o.x, o.z) - Math.max(o.a, o.b)); }
    case 'u': { const G = o.G || (o.G = farbUnitRings(o.U)); let m = farbRingD(P, G[0]); if (m > 0 && G[1]) m = Math.min(m, farbRingD(P, G[1])); return m; }
  }
  return Infinity;
}
// a thing's box (m), kept on it
function farbBB(o){ if (o.bb) return o.bb; let x0, z0, x1, z1;
  if (o.k === 'c' || o.k === 'e' || o.k === 'b' || o.k === 'u'){ const e = o.k === 'c' ? o.r : o.k === 'e' ? Math.max(o.a, o.b) : o.k === 'b' ? Math.hypot(o.l, o.w) : (o.U.y ? 200 : 120), cx = o.k === 'u' ? o.U.o[0] : o.x, cz = o.k === 'u' ? o.U.o[1] : o.z; x0 = cx - e; x1 = cx + e; z0 = cz - e; z1 = cz + e; }
  else if (o.k === 's'){ x0 = Math.min(o.ax, o.bx) - o.r; x1 = Math.max(o.ax, o.bx) + o.r; z0 = Math.min(o.az, o.bz) - o.r; z1 = Math.max(o.az, o.bz) + o.r; }
  else { const r = o.k === 'l' ? o.r : 0; x0 = z0 = Infinity; x1 = z1 = -Infinity; for (const q of o.P){ if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < z0) z0 = q[1]; if (q[1] > z1) z1 = q[1]; } x0 -= r; x1 += r; z0 -= r; z1 += r; }
  return o.bb = [x0, z0, x1, z1]; }
// into a layer: a map from a cell of FARB.C m to the things whose box touches it
function farbPut(M, o){ const b = farbBB(o), C = FARB.C; for (let j = Math.floor(b[1] / C); j <= Math.floor(b[3] / C); j++) for (let i = Math.floor(b[0] / C); i <= Math.floor(b[2] / C); i++){ const k = i * 1048576 + j, a = M.get(k); if (a) a.push(o); else M.set(k, [o]); } return o; }
// a pier's box of the packs or of Senja (PIERBOX: its length q.l along ang), and a bridge's piers and deck pieces (obsBridge, as the 3D view builds them)
const farbPier = (q, what) => ({k:'b', x:q.x, z:q.z, l:q.l / 2, w:q.w / 2, ux:Math.sin(q.ang), uz:Math.cos(q.ang), what:what || (q.made ? 'kai' : q.bw ? 'molo' : 'brygge'), id:(q.made ? 'kai#' : 'brygge#') + Math.round(q.x) + ',' + Math.round(q.z)});
function farbBridge(M, br){ const B = obsBridge(br), id = Math.round(br[4]) + ',' + Math.round(br[5]);
  for (const p of B.piers) farbPut(M, {k:'c', x:p.x, z:p.z, r:p.r, what:'brupilar', id:'bru#' + Math.round(p.x) + ',' + Math.round(p.z)});
  for (const d of B.deck) farbPut(M, {k:'s', ax:d.ax, az:d.az, bx:d.bx, bz:d.bz, r:d.r, under:d.under, what:'brudekke', id:'dekk#' + id}); }

// ---- the layers ----
// A tile's layer is asked for by the tile a point lies in, but a thing does not stop at a tile's border: Karmsund bru lies in the
// tile west of the sound and reaches 50 m into the next, where a hull under it asked that tile only and saw no bridge (found by
// the field's check against the geometry, 23.11.2026). So each layer's cells that lie in another tile are written down (FARB.ovr: the
// cell, and how to get the layer), and a look at a cell takes those too.
function farbOver(M, tx, ty, id, get){ if (!M || !MAPD.man) return; const T = MAPD.man.tile * 1000, C = FARB.C;
  for (const k of M.keys()){ const i = Math.floor(k / 1048576), j = k - i * 1048576; if (Math.floor(i * C / T) === tx && Math.floor(j * C / T) === ty) continue; const key = k + '|' + id; if (FARB.ovd.has(key)) continue; FARB.ovd.add(key); const a = FARB.ovr.get(k); if (a) a.push(get); else FARB.ovr.set(k, [get]); } }
// Each is built by a generator that stops for breath every few things, so farbNeed can build it in slices between the frames
// (farbRunA); asked without that (the tests, a first look) it is built at once (farbRun). One clock times the slices of a turn of
// the event loop (FARB.t0, set at the first of the map's work in the turn), whichever generators run in it: a thousand small ones
// one after the other were else a thousand slices that never stopped for breath. FARB.slice is the time the map takes before it
// lets go (ms); the longest it was held, by that and the step it was in, is kept in FARB.F.n.slice (farsjekk.py reads it with the
// CPU slowed four times: 4 ms at most).
function farbRun(g){ let r; while (!(r = g.next()).done); return r.value; }
const farbBreath = () => new Promise(r => { if (typeof MessageChannel === 'function'){ const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); r(); }; c.port2.postMessage(0); } else setTimeout(r, 0); });
function farbTurn0(){ if (FARB.live) return; FARB.live = true; FARB.t0 = performance.now(); farbBreath().then(() => { FARB.live = false; }); }
async function farbRunA(g){ let r; const F = FARB.F, note = () => { const dt = performance.now() - FARB.t0; if (!F) return; if (dt > F.n.slice) F.n.slice = dt; F.n.h[dt >= 8 ? 8 : Math.floor(dt)]++; if (dt > 3 && F.n.long.length < 40) F.n.long.push([Math.round(FARB.t0), +dt.toFixed(1), F.at]); };
  const breath = async () => { note(); await farbBreath(); FARB.live = false; farbTurn0(); };
  farbTurn0();
  for (;;){ const t = F && F.steps ? performance.now() : 0; r = g.next(); if (t){ const dt = performance.now() - t; if (dt > F.n.step) F.n.step = dt; if (dt > 1.5 && F.n.long.length < 40) F.n.long.push(['skritt', +dt.toFixed(1), F.at]); }
    if (r.done) break; if (r.value === 1 || performance.now() - FARB.t0 > FARB.slice) await breath(); }   // (yield 1: a step that cannot be cut comes next, and gets a turn of its own)
  // (a generator that had nothing to do is over at once: a thousand of those in a row stop for breath here)
  if (performance.now() - FARB.t0 > FARB.slice) await breath(); else note(); return r.value; }
// Senja's own: the piers, breakwaters and quay decks (PIERBOX), the bridges, the sea marks, and the wind turbines everywhere (which
// of them stand in the sea is asked when the map there is in)
function* farbStatG(){ const at = v => { if (FARB.F) FARB.F.at = 'lag:faste:' + v; }, M = new Map(); let n = 0; at('brygger');
  for (const q of PIERBOX){ farbPut(M, farbPier(q)); if (!(++n & 3)) yield; }
  at('bruer'); for (const br of BRIDGES){ yield 1; if (!bridgeUnderUnit(br)) farbBridge(M, br); }
  at('merker'); for (const mk of SEAMARKS.marks){ const r = obsMarkR[mk[2]]; if (r) farbPut(M, {k:'c', x:mk[0] * 1000, z:mk[1] * 1000, r, what:'merke', id:'merke#' + Math.round(mk[0] * 1000) + ',' + Math.round(mk[1] * 1000), mk}); if (!(++n & 7)) yield; }
  at('turbiner'); if (VIND) for (const q of VIND.t){ farbPut(M, {k:'c', x:q[0], z:q[1], r:Math.max(5, q[2] * 0.11), what:'vindturbin', id:'turbin#' + Math.round(q[0]) + ',' + Math.round(q[1]), turb:true}); if (!(++n & 7)) yield; }
  return M; }
function* farbUnitG(){ const M = new Map(); let n = 0; for (const U of UNITA){ farbPut(M, {k:'u', U, what:'kai', id:'enhet#' + U.id}); if (!(++n & 7)) yield; } return M; }
// Father's naust's pile quay and the rorbuer's quays found so far (the boxes 11b-obstacles.js fixIndex has)
function farbSiteM(){ const M = new Map();
  if (S && S.naust && S.naust.o){ const n = S.naust, nx = -n.u[1], nz = n.u[0], fx = n.o[0] - n.u[0] * 0.5, fz = n.o[1] - n.u[1] * 0.5; farbPut(M, {k:'b', x:fx - nx * 1.7, z:fz - nz * 1.7, l:8.1, w:1.7, ux:n.u[0], uz:n.u[1], what:'naustkai', id:'naust'}); }
  for (const R of RORBUER) if (R.site){ const n = R.site, nx = -n.u[1], nz = n.u[0], w = RORBU.out / 2; farbPut(M, {k:'b', x:n.o[0] - nx * w, z:n.o[1] - nz * w, l:RORBU.hl, w, ux:n.u[0], uz:n.u[1], what:'rorbukai', id:'rorbu#' + R.id}); }
  return M; }
function farbGlob(){ const Y = FARB.lay, n = UNITA.length;
  if (!Y.stat || Y.statN !== n){ Y.stat = farbRun(farbStatG()); Y.statN = n; }
  if (!Y.unit || Y.unitN !== n){ Y.unit = farbRun(farbUnitG()); Y.unitN = n; }
  const key = (S && S.naust && S.naust.o ? S.naust.o.join(',') : '') + '|' + (RORBU.ver || 0); if (Y.siteKey !== key){ Y.site = farbSiteM(); Y.siteKey = key; }
  return Y; }
// The trade places' zones (11b-obstacles.js portZones), a tile's floating docks and open piers taken away there (vecGone) and what the
// 3D view builds of its piers, slabs and breakwaters (vecDrawn): the same rules, in slices, kept here; where the game has worked one
// out already (the 3D view asks for the tiles round the boat), that one is taken
function* farbZonesG(){ if (PORTZ.list) return PORTZ; if (FARB.pz) return FARB.pz; if (FARB.F) FARB.F.at = 'lag:soner';
  const list = [], cells = new Map(), put = (z, x0, z0, x1, z1) => { for (let i = Math.floor((x0 - 60) / 1000); i <= Math.floor((x1 + 60) / 1000); i++) for (let j = Math.floor((z0 - 60) / 1000); j <= Math.floor((z1 + 60) / 1000); j++){ const k = i * 65536 + j; let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(z); } };
  for (const pt of PORTS){ if (pt.havOnly) continue; let f = null; try { f = quayFace(pt.id, 'main'); } catch (e){}
    const px = pt.p.x * 1000, pz = pt.p.y * 1000, segs = [];
    if (f){ const e = f.hl + PORTZ.past; segs.push([f.x - f.ux * e, f.z - f.uz * e, f.x + f.ux * e, f.z + f.uz * e], [px, pz, f.x, f.z]); }
    else if (pt.coast) segs.push([px, pz, pt.coast.x * 1000, pt.coast.y * 1000]); else segs.push([px, pz, px, pz]);
    for (const g of segs){ list.push(g); put(g, Math.min(g[0], g[2]), Math.min(g[1], g[3]), Math.max(g[0], g[2]), Math.max(g[1], g[3])); } yield; }
  return FARB.pz = {list, cells, r:PORTZ.r}; }   // (kept here: the game's own, which the old Autonav reads, is the game's to build)
function farbInZone(Z, x, z){ const L = Z.cells.get(Math.floor(x / 1000) * 65536 + Math.floor(z / 1000)); if (!L) return false;
  for (const [ax, az, bx, bz] of L){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0; if (Math.hypot(x - ax - dx * u, z - az - dz * u) < Z.r) return true; }
  return false; }
function* farbGoneG(t){ const o0 = VECGONE.get(t); if (o0) return o0; const PZ = yield* farbZonesG(); if (FARB.F) FARB.F.at = 'lag:borte'; let n = 0;
  const box = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (const s of [-1, -0.5, 0, 0.5, 1]) for (const k of [-1, 0, 1]) if (farbInZone(PZ, q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
  const fmK = q => q.fm ? Math.round(q.fm[0]) + ':' + Math.round(q.fm[1]) : null, hit = new Set(), piers = new Set(), fd = new Set();
  for (const q of t.piers || []){ if (!q.made && !q.bw && !q.closed && fmK(q) && box(q)) hit.add(fmK(q)); yield; }
  yield;
  if (hit.size) for (const q of t.piers || []){ if (!q.made && !q.bw && !q.closed && hit.has(fmK(q))) piers.add(q); if (!(++n & 15)) yield; }
  if (FARB.F) FARB.F.at = 'lag:borte:flyte'; yield 1; const FT = flyteTile(t.tx, t.ty); yield 1;
  for (const d of FT){ if (d.L.some(l => l.p.some(([x, z]) => farbInZone(PZ, x, z)))) fd.add(Math.round(d.mx) + ':' + Math.round(d.mz)); yield; }
  if (fd.size) for (const q of t.piers || []){ if (q.fm){ const rx = Math.round(q.fm[0]), rz = Math.round(q.fm[1]); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (fd.has((rx + a) + ':' + (rz + b))) piers.add(q); } if (!(++n & 15)) yield; }
  return {piers, fd}; }
function* farbDrawnG(t){ const o0 = VECDRAWN.get(t); if (o0 && o0.n === UNITA.length) return o0; if (FARB.F) FARB.F.at = 'lag:tegnet'; let n = 0;
  const T = MAPD.man ? MAPD.man.tile * 1000 : 50000, UN = UNITA.filter(U => U.o[0] > t.x0 - 300 && U.o[0] < t.x0 + T + 300 && U.o[1] > t.z0 - 300 && U.o[1] < t.z0 + T + 300);
  const under = (x, z) => unitCovers(x, z, 3), slabUnder = P => { let cx = 0, cz = 0; for (const [x, z] of P){ if (under(x, z)) return true; cx += x; cz += z; } return under(cx / P.length, cz / P.length); };
  const onU = (x, z) => UN.some(U => { const [lx, lz] = unitL(U, x, z), g = ugeo(U); return groundOut(U, lx, lz) <= 2 || (Math.abs(lx) <= g.basinX && lz >= 0 && lz <= g.basinZ); });
  const lineOnU = P => { for (let k = 0; k < P.length; k++){ const [ax, az] = P[k], [bx, bz] = P[Math.min(k + 1, P.length - 1)], m = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3)); for (let s = 0; s <= m; s++) if (onU(ax + (bx - ax) * s / m, az + (bz - az) * s / m)) return true; } return false; };
  const boxOnU = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (let s = -1; s <= 1; s += 0.25) for (const k of [-1, 0, 1]) if (onU(q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
  const G = yield* farbGoneG(t), FK = new Set(); if (FARB.F) FARB.F.at = 'lag:tegnet:flyte';
  for (const d of flyteTile(t.tx, t.ty)){ yield; const key = Math.round(d.mx) + ':' + Math.round(d.mz); if (!under(d.mx, d.mz) && !G.fd.has(key)) FK.add(key); }
  if (FARB.F) FARB.F.at = 'lag:tegnet';
  const isF = (x, z) => { if (!FK.size) return false; const rx = Math.round(x), rz = Math.round(z); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (FK.has((rx + a) + ':' + (rz + b))) return true; return false; };
  const slabF = P => { let cx = 0, cz = 0; for (const [x, z] of P){ cx += x; cz += z; } return isF(cx / P.length, cz / P.length); };
  const flo = new Set(), piers = [], slabs = [], molos = [];
  for (const q of t.piers || []){ yield; if (G.piers.has(q)) continue; if (q.fm && isF(q.fm[0], q.fm[1])){ flo.add(q); if (!under(q.x, q.z)) piers.push(q); } else if (!under(q.x, q.z) && !(UN.length && boxOnU(q))) piers.push(q); }
  for (const P of t.slabs || []){ yield; if (P && P.length > 3 && !slabUnder(P) && !vecGoneSlab(G, P)) slabs.push([P, slabF(P)]); }
  for (const P of t.molos || []){ yield; if (!UN.length || !lineOnU(P)) molos.push(P); }
  return {n:UNITA.length, piers, flo, slabs, molos}; }
// a vec tile's own: its piers and quay decks as boxes (a pier mapped as an area as its outline instead), its slab piers and closed
// breakwaters as outlines, a breakwater mapped as a line as a line 9 m wide, and its bridges
function* farbTileG(t){ const M = new Map(), V = yield* farbDrawnG(t); if (FARB.F) FARB.F.at = 'lag:flis'; let n = 0;
  for (const q of V.piers){ if (!(++n & 3)) yield; if (q.closed && !q.bw && !q.made && t.slabs && t.slabs[q.src]) continue; farbPut(M, farbPier(q, V.flo.has(q) ? 'flytebrygge' : null)); }
  for (const [P, f] of V.slabs){ if (!(++n & 3)) yield; farbPut(M, {k:'p', P, what:f ? 'flytebrygge' : 'brygge', id:'flate#' + Math.round(P[0][0]) + ',' + Math.round(P[0][1])}); }
  for (const P of V.molos){ if (!(++n & 3)) yield; if (!P || P.length < 2) continue; const cl = P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1;
    farbPut(M, cl ? {k:'p', P, what:'molo', id:'molo#' + Math.round(P[0][0]) + ',' + Math.round(P[0][1])} : {k:'l', P, r:4.5, what:'molo', id:'molo#' + Math.round(P[0][0]) + ',' + Math.round(P[0][1])}); }
  for (const br of t.bridges || []){ yield 1; if (!bridgeUnderUnit(br)) farbBridge(M, br); }
  return {M, n:UNITA.length, dock:null, dockV:-1}; }
// the tile's layer where it is built (null where not: farbNeed builds it), and the coast harbours' floating docks and gangways in it,
// which come when a harbour is moored (05-vessels.js moorHarbour, FDOCK.ver)
function farbTile(t){ const Y = FARB.til.get(t); if (!Y || Y.n !== UNITA.length) return null;
  if (Y.dockV !== FDOCK.ver){ const M = new Map(); for (const h of t.npc || []) for (const d of h.docks || []){ const L = d.np * FDOCK.PL, sm = d.s0 + L / 2;
      farbPut(M, {k:'b', x:d.o[0] + d.n[0] * sm, z:d.o[1] + d.n[1] * sm, l:L / 2, w:FDOCK.PW / 2, ux:d.n[0], uz:d.n[1], what:'flytebrygge', id:'fb#' + Math.round(d.o[0]) + ',' + Math.round(d.o[1])});
      farbPut(M, {k:'b', x:d.o[0] + d.n[0] * d.s0 / 2, z:d.o[1] + d.n[1] * d.s0 / 2, l:d.s0 / 2, w:0.8, ux:d.n[0], uz:d.n[1], what:'flytebrygge', id:'lg#' + Math.round(d.o[0]) + ',' + Math.round(d.o[1])}); }
    Y.dock = M; Y.dockV = FDOCK.ver; if (M.size){ const tk = t.tx + ':' + t.ty; farbOver(M, t.tx, t.ty, 'd' + tk, () => { const tt = VEC.tiles.get(tk), Q = tt && FARB.til.get(tt); return Q && Q.dockV === FDOCK.ver ? Q.dock : null; }); } }
  return Y; }
// a chart tile's sea marks (01e-marks.js MARKS.tiles), built when first asked (a tile has some hundreds)
function* farbMarksG(k){ const t = MARKS.tiles.get(k); if (!t) return null; let Y = FARB.mk.get(k); if (Y && Y.t === t) return Y.M; let n = 0;
  const M = new Map(); for (const mk of t.marks){ const r = obsMarkR[mk[2]]; if (r) farbPut(M, {k:'c', x:mk[0] * 1000, z:mk[1] * 1000, r, what:'merke', id:'merke#' + Math.round(mk[0] * 1000) + ',' + Math.round(mk[1] * 1000), mk}); if (!(++n & 3)) yield; }
  FARB.mk.set(k, {t, M}); { const q = k.split(':'); farbOver(M, +q[0], +q[1], 'm' + k, () => { const Q = FARB.mk.get(k); return Q ? Q.M : null; }); } return M; }
function farbMarks(k){ const t = MARKS.tiles.get(k); if (!t) return null; const Y = FARB.mk.get(k); return Y && Y.t === t ? Y.M : farbRun(farbMarksG(k)); }
// The ground of the foreshore at x, z as the 3D view draws it (m over mean sea level): FARB.shore.top on the coast line and on land,
// falling seaward to FARB.shore.deep; null off it (the chart's depth holds there), NaN where the coast is not known. From the coast's
// line as it is (raw): the view draws the ramp from the line whether or not a pocket lies over it
function farbShoreG(x, z){ const c = farbCoast(x, z, FARB.shore.reach + 2, true); if (c !== c) return NaN; if (c === 0) return FARB.shore.top;
  if (c >= FARB.shore.reach + 2) return null; const g = FARB.shore.top - c * (FARB.mole ? FARB.shore.gMole : FARB.shore.g); return g > FARB.shore.deep ? g : null; }
// A rock as the 3D view shapes it (view3d/17i-rocks.js rockShape: the same seed and the same draws): an ellipse of its whole foot, which
// lies 2.4 m under mean sea level, so no boat is sent over any of it. Not one well inside a harbour's water or under the foreshore's
// ground, which the view does not draw. Shaped a square km at a time (the game's index of the rocks is by the km: asked for a cell of
// 250 m it gave the whole km's, sixteen times over) and laid in the cells of FARB.C m each one's foot can reach; kept while the
// marks are the same. In steps: farbNeed and the field's job shape them between the frames; asked before that, at once
function* farbRocksKmG(gx, gy){ if (FARB.rkV !== MARKS.ver){ FARB.rkV = MARKS.ver; FARB.rkm.clear(); FARB.rk.clear(); } const kk = gx * 65536 + gy; if (FARB.rkm.has(kk)) return true;
  let Q, n = 0, whole = true; const C = FARB.C, L = [];
  yield 1; try { Q = rocksIn(gx + 0.001, gy + 0.001, gx + 0.999, gy + 0.999); } catch (e){ return false; }
  yield; for (const q of Q){ if (Math.floor(q[0]) !== gx || Math.floor(q[1]) !== gy) continue; yield;
    try { const p = {x:q[0], y:q[1]};
      if (inHarbour(p) && inHarbour({x:p.x + 0.015, y:p.y}) && inHarbour({x:p.x - 0.015, y:p.y}) && inHarbour({x:p.x, y:p.y + 0.015}) && inHarbour({x:p.x, y:p.y - 0.015})) continue;
      const r = farbRng((Math.imul(Math.round(q[0] * 1e4), 73856093) ^ Math.imul(Math.round(q[1] * 1e4), 19349663)) | 0), Cc = farbTideP(q[0] * 1000, q[1] * 1000).C, A = Math.max(0.35, Cc[0][0] + Cc[1][0]);
      const a = 3.6 + 5.2 * r() * r(), b = a * (0.5 + 0.38 * r()), th = r() * Math.PI, top = A * (-0.1 + 0.85 * r()), g = farbShoreG(q[0] * 1000, q[1] * 1000);
      if (g !== g){ whole = false; continue; } if (g != null && g > top - 0.25) continue;
      L.push({k:'e', x:q[0] * 1000, z:q[1] * 1000, a, b, th, top, what:'skjær', id:'skjær#' + Math.round(q[0] * 1000) + ',' + Math.round(q[1] * 1000)}); } catch (e){ return false; } }
  if (!whole) return false;
  for (const o of L){ if (!(++n & 7)) yield; const e = Math.max(o.a, o.b); for (let j = Math.floor((o.z - e) / C); j <= Math.floor((o.z + e) / C); j++) for (let i = Math.floor((o.x - e) / C); i <= Math.floor((o.x + e) / C); i++){ const k = i * 1048576 + j, A = FARB.rk.get(k); if (A) A.push(o); else FARB.rk.set(k, [o]); } }
  FARB.rkm.set(kk, 1); return true; }
// the rocks whose foot can reach into the cell i, j of FARB.C m (a foot is 8.8 m at the most): null where the map there is not in
function* farbRocksG(i, j){ const C = FARB.C;
  for (let gy = Math.floor((j * C - 9) / 1000); gy <= Math.floor(((j + 1) * C + 9) / 1000); gy++) for (let gx = Math.floor((i * C - 9) / 1000); gx <= Math.floor(((i + 1) * C + 9) / 1000); gx++) if (!(FARB.rkV === MARKS.ver && FARB.rkm.has(gx * 65536 + gy)) && !(yield* farbRocksKmG(gx, gy))) return null;
  return FARB.rk.get(i * 1048576 + j) || FARB_NONE; }
function farbRocks(i, j){ return farbRun(farbRocksG(i, j)); }

// ---- the harbours' pockets ----
// A harbour unit's dredged basin and the 50 m in front of a designer's quay face are water whatever the coast says (01-world.js
// inHarbourPocket, pocketHit): boxes. So the land a boat can touch by a harbour is the coast's line outside the boxes, and a box's
// own side where it cuts through the coast's land (the wall of what is dug out). A boat whose middle is in a basin reaches out of it,
// so the distance to the land there is to those two, not «far» (the check against the bench's observer, 23.11.2026: 5 poses with the
// hull on land and 26 to 35 m of clearance at her middle).
// the boxes near x, z: {x, z (its middle), ux, uz (along the face), nx, nz (out from it), l, w (half along and out)}; null where none
function farbPockets(x, z){ if (!harbourNear(x, z)) return null; const c = HCELL.get(Math.floor(x / 200) * 65536 + Math.floor(z / 200)); if (!c) return null;
  let Y = FARB.pk.get(c); if (Y && Y.n === c.U.length + c.Q.length) return Y.L;
  const L = [];
  for (const U of c.U){ let b = FARB.pk.get(U); if (!b){ const g = ugeo(U), m = unitW(U, 0, g.basinZ / 2); FARB.pk.set(U, b = {x:m[0], z:m[1], ux:U.u[0], uz:U.u[1], nx:U.n[0], nz:U.n[1], l:g.basinX, w:g.basinZ / 2, walls:null, wv:''}); } L.push(b); }
  for (const f of c.Q){ let b = FARB.pk.get(f); if (!b) FARB.pk.set(f, b = {x:f.x + f.nx * POCKET / 2, z:f.z + f.nz * POCKET / 2, ux:f.ux, uz:f.uz, nx:f.nx, nz:f.nz, l:f.hl + 4, w:POCKET / 2, walls:null, wv:''}); L.push(b); }
  FARB.pk.set(c, {n:c.U.length + c.Q.length, L}); return L.length ? L : null; }
const farbInBox = (b, x, z) => { const dx = x - b.x, dz = z - b.z; return Math.abs(dx * b.ux + dz * b.uz) <= b.l && Math.abs(dx * b.nx + dz * b.nz) <= b.w; };
// The squared distance from x, z to the part of the line a-b that lies outside every box of PK (Infinity where none of it does). The
// distance along a line has one low point, so the nearest point outside is that point, or an end of a piece taken away
function farbSegOutD2(PK, x, z, ax, az, bx, bz){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
  const out = t => { const qx = ax + dx * t, qz = az + dz * t; for (const b of PK) if (farbInBox(b, qx, qz)) return Infinity; return (qx - x) * (qx - x) + (qz - z) * (qz - z); };
  let best = out(u); if (best < Infinity) return best;
  for (const b of PK){ const s0 = (ax - b.x) * b.ux + (az - b.z) * b.uz, ds = dx * b.ux + dz * b.uz, n0 = (ax - b.x) * b.nx + (az - b.z) * b.nz, dn = dx * b.nx + dz * b.nz; let t0 = 0, t1 = 1, ok = true;
    for (const [v0, dv, h] of [[s0, ds, b.l], [n0, dn, b.w]]){ if (Math.abs(dv) < 1e-12){ if (Math.abs(v0) > h){ ok = false; break; } continue; } let a = (-h - v0) / dv, c = (h - v0) / dv; if (a > c){ const q = a; a = c; c = q; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1){ ok = false; break; } }
    if (!ok) continue; const e = 1e-6 + 0.001 / Math.sqrt(L2 || 1);   // (a millimetre outside the box's side)
    if (t0 - e >= 0){ const d = out(t0 - e); if (d < best) best = d; } if (t1 + e <= 1){ const d = out(t1 + e); if (d < best) best = d; } }
  return best; }
// A box's sides where the land stands just outside them (asked every metre, 5 cm out): pieces [ax, az, bx, bz]. Kept while the coast's
// tiles are the same; throws where the map there is not in. In steps (farbNeed finds them between the frames; asked before that, at once)
function* farbWallsG(b){ const v = COAST.built + '|' + UNITA.length; if (b.walls && b.wv === v) return b.walls; const W = []; let m = 0;
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => [b.x + b.ux * b.l * a + b.nx * b.w * c, b.z + b.uz * b.l * a + b.nz * b.w * c]);
  for (let i = 0; i < 4; i++){ const p = C[i], q = C[(i + 1) % 4], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(len)), mx = (p[0] + q[0]) / 2 - b.x, mz = (p[1] + q[1]) / 2 - b.z, ml = Math.hypot(mx, mz) || 1, ox = mx / ml * 0.05, oz = mz / ml * 0.05; let run = -1;
    for (let k = 0; k <= n; k++){ if (!(++m & 3)) yield; const u = k / n, land = isLand({x:(p[0] + (q[0] - p[0]) * u + ox) / 1000, y:(p[1] + (q[1] - p[1]) * u + oz) / 1000}); if (land && run < 0) run = k;
      if (run >= 0 && (!land || k === n)){ const k1 = land ? k : k - 1, u0 = Math.max(0, (run - 0.5) / n), u1 = Math.min(1, (k1 + 0.5) / n); W.push([p[0] + (q[0] - p[0]) * u0, p[1] + (q[1] - p[1]) * u0, p[0] + (q[0] - p[0]) * u1, p[1] + (q[1] - p[1]) * u1]); run = -1; } } }
  b.walls = W; b.wv = v; return W; }
function farbWalls(b){ return b.walls && b.wv === COAST.built + '|' + UNITA.length ? b.walls : farbRun(farbWallsG(b)); }

// ---- the world under the things: land, the coast's distance, the depth, the tide ----
// 0 water, 1 land, 2 a harbour unit's block or fill; NaN where the map is not in
function farbLand(x, z){ if (FARB.w) return FARB.w.land(x, z); const p = {x:x / 1000, y:z / 1000}; try { return onUnitGround(p) ? 2 : isLand(p) ? 1 : 0; } catch (e){ return NaN; } }
// Metres to the land a boat can touch (0 on it, cap where it is farther off), NaN where it is not known; FARB.mole says whether the
// nearest edge was a breakwater's. The fine coast's line, of every tile the reach touches (01d-coast.js coastDistQ asks the point's
// own tile and the cells round its own: an edge just across a tile's border, or more than a cell away, was not seen); by a harbour
// the line outside the pockets and the pockets' walls (farbPockets). A tile without a fine coast (the open sea) has the coarse
// distance. raw: the coast's line as it is, the pockets not taken out: what the foreshore's ground is drawn from
function farbCoast(x, z, cap, raw){ FARB.mole = 0;
  if (FARB.w){ const r = FARB.w.coast(x, z, cap); if (!r) return NaN; if (FARB.w.land(x, z)) return 0; FARB.mole = r[1]; return Math.min(cap, r[0]); }
  const p = {x:x / 1000, y:z / 1000};
  try { if (isLand(p)) return 0; if (raw && inHarbourPocket(p) && coastAt(p) > 0) return 0;
    const PK = raw ? null : farbPockets(x, z), T = MAPD.man.tile * 1000, CC = COAST.CC, tx0 = Math.floor(x / T), ty0 = Math.floor(z / T); let d2 = cap * cap, own = false, mole = 0;
    for (let ty = Math.floor((z - cap) / T); ty <= Math.floor((z + cap) / T); ty++) for (let tx = Math.floor((x - cap) / T); tx <= Math.floor((x + cap) / T); tx++){
      const pk = MAPD.byTile.get('chart:' + tx + ':' + ty); if (!pk) continue; const I = pk.coast; if (!I) return NaN; if (tx === tx0 && ty === ty0) own = true; const N = I.N; if (!N) continue;
      const ox = tx * T, oz = ty * T, lx = x - ox, lz = z - oz, ed = I.ed, i0 = Math.max(0, Math.floor((lx - cap - COAST.COX) / CC) + 1), i1 = Math.min(N - 1, Math.floor((lx + cap - COAST.COX) / CC) + 1), j0 = Math.max(0, Math.floor((lz - cap - COAST.COY) / CC) + 1), j1 = Math.min(N - 1, Math.floor((lz + cap - COAST.COY) / CC) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const c = j * N + i;
        for (let q = I.cs[c]; q < I.cs[c + 1]; q++){ const e = I.ce[q], o = e * 4, ax = ed[o], az = ed[o + 1], dx = ed[o + 2] - ax, dz = ed[o + 3] - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((lx - ax) * dx + (lz - az) * dz) / L2)) : 0, ex = ax + u * dx - lx, ez = az + u * dz - lz; let dd = ex * ex + ez * ez;
          if (dd >= d2) continue; if (PK){ dd = farbSegOutD2(PK, x, z, ax + ox, az + oz, ed[o + 2] + ox, ed[o + 3] + oz); if (dd >= d2) continue; }
          d2 = dd; mole = I.K[e]; } } }
    if (PK) for (const b of PK) for (const w of farbWalls(b)){ const d = farbSegD(x, z, w[0], w[1], w[2], w[3]); if (d * d < d2){ d2 = d * d; mole = 0; } }
    if (!own){ const far = Math.min(cap, coastDist(p) * 1000), near = Math.sqrt(d2); if (near < far){ FARB.mole = mole; return near; } return far; }   // (the coarse distance, or a neighbour tile's fine line where that is nearer)
    FARB.mole = mole; return Math.sqrt(d2); } catch (e){ return NaN; } }
// the chart's depth for navigation at chart datum (07-harbours.js depthNav: the harbours dredged), before the foreshore and the dredging
function farbDepthRaw(x, z){ if (FARB.w) return FARB.w.rawDepth ? FARB.w.rawDepth(x, z) : 50; try { return depthNav({x:x / 1000, y:z / 1000}); } catch (e){ return NaN; } }
// (the tide's place by the km, kept: 03-simulation.js tidePlace keeps only the last km asked for and sorts the stations for every other,
// 40 µs, and a hull or a lattice over a km's border asked for the two in turn)
function farbTideP(x, z){ const rx = Math.round(x / 1000), rz = Math.round(z / 1000), k = rx * 65536 + rz; let v = FARB.tp.get(k); if (!v){ if (FARB.tp.size > 4000) FARB.tp.clear(); FARB.tp.set(k, v = tidePlace({x:rx, y:rz})); } return v; }
const farbZC = (x, z) => FARB.w ? FARB.w.zc(x, z) : farbTideP(x, z).zc;
// A bridge's deck is drawn from mean sea level, and the water comes up under it: the room under a deck is from the highest tide
// (what a bridge's sailing height is measured from), the sum of the tide's parts at the place. Kept on the piece
const farbHat = (x, z) => { if (FARB.w) return FARB.w.hat ? FARB.w.hat(x, z) : 0; let a = 0; for (const c of farbTideP(x, z).C) a += c[0]; return a; };
const farbUnder = o => o.uh !== undefined ? o.uh : (o.uh = o.under - farbHat((o.ax + o.bx) / 2, (o.az + o.bz) / 2));
// the water level over chart datum at H (game hours)
const farbTide = (H, x, z) => FARB.w ? FARB.w.tide(H, x, z) : tideCD(H, {x:x / 1000, y:z / 1000});
// A channel dredged for the boats a place takes (Jonas' choice 5, 23.11.2026: «Tilpass havna»): pieces {ax, az, bx, bz, r (half its
// width), d (its depth at chart datum)} under a key (the place's id); null takes the key's away. Inside one the water is at least
// that deep, the foreshore too. (What the map digs, the 3D view must dig: 141b and F2.)
function farbDig(key, segs){ if (segs && segs.length) FARB.dug.set(key, segs); else FARB.dug.delete(key); FARB.dugL = [].concat(...FARB.dug.values()); if (FARB.F) FARB.F.dugV++; }
// The depth at chart datum for navigation at x, z (m; under 0: dry at chart datum): the chart's, the foreshore's ramp where that is
// shallower, and a dredged channel's where that is deeper. NaN where it is not known
// (off: the caller knows the foreshore is not there, the coast being farther off than it reaches)
function farbDepth(x, z, off){ if (FARB.w && FARB.w.depth) return FARB.w.depth(x, z);
  let d = farbDepthRaw(x, z); if (d !== d) return NaN;
  if (!off && !(FARB.w ? FARB.w.pocket(x, z) : inHarbourPocket({x:x / 1000, y:z / 1000}))){ const g = farbShoreG(x, z); if (g !== g) return NaN; if (g != null) d = Math.min(d, -g - farbZC(x, z)); }
  for (const s of FARB.dugL) if (s.d > d && farbSegD(x, z, s.ax, s.az, s.bx, s.bz) < s.r) d = s.d;
  return d; }
// the water under her keel at x, z now (m; under 0 she is on the bottom): squat is hers at the speed she has, when the caller knows it
function farbKeel(x, z, boat, H, squat, off){ return farbDepth(x, z, off) + farbTide(H, x, z) - boat.T - (squat || 0); }

// ---- what is known ----
// Whether everything within R of x, z is in: the simulation's and the chart's packs with the coast's index (mapReadyAt), and every
// vec tile there decoded and sorted into its layer. Kept per cell of 1 km until a pack comes or a layer is built
function farbKnown(x, z, R){ if (FARB.w) return FARB.w.known ? !!FARB.w.known(x, z, R) : true;
  if (!MAPD.man) return false;
  const v = VEC.ver + '|' + COAST.built + '|' + FARB.nTil + '|' + UNITA.length; if (v !== FARB.knV){ FARB.knV = v; FARB.kn.clear(); }
  const key = Math.floor(x / 1000) * 1048576 + Math.floor(z / 1000), e = FARB.kn.get(key); if (e >= R) return true;
  const T = MAPD.man.tile * 1000, Rk = Math.max(R, 150); let ok = true; try { ok = mapReadyAt({x:x / 1000, y:z / 1000}, (Rk + 1500) / 1000); } catch (e2){ ok = false; }
  // (a cell's answer holds for the whole cell: the look is 1.5 km wider than what is asked)
  if (ok) for (let ty = Math.floor((z - Rk - 1500) / T); ty <= Math.floor((z + Rk + 1500) / T) && ok; ty++) for (let tx = Math.floor((x - Rk - 1500) / T); tx <= Math.floor((x + Rk + 1500) / T); tx++){ if (!vecHas(tx, ty)) continue; const t = VEC.tiles.get(tx + ':' + ty); if (!t || !farbTile(t)){ ok = false; break; } }
  if (ok) FARB.kn.set(key, Rk); return ok; }
// the rasters' blocks over a box (m), unpacked off this thread before they are read (01b-mapdata.js mapBlockWarm): the depth's, and
// the 25 m mask's where a tile has no fine coast
async function farbBlocks(x0, z0, x1, z1){ if (typeof mapBlockWarm !== 'function' || !MAPD.L) return; const W = [];
  for (const L of [MAPD.L.depth, MAPD.L.mask]){ if (!L) continue; const c = L.c * 1000;
    for (let by = Math.floor((z0 / c - 2) / L.n); by <= Math.floor((z1 / c + 2) / L.n); by++) for (let bx = Math.floor((x0 / c - 2) / L.n); bx <= Math.floor((x1 / c + 2) / L.n); bx++) W.push(mapBlockWarm(L, bx, by)); }
  try { await Promise.all(W); } catch (e){} }
// Everything within the box round the points (km) made known: the packs loaded, the coast's tiles decoded, and each tile's layer built
// in slices of FARB.slice ms between the frames. True when all is in (ms: how long to wait for the packs)
async function farbNeed(pts, padKm = 1.5, ms = 60000){ if (FARB.w || !MAPD.man || !pts.length) return true;
  const T = MAPD.man.tile, x0 = Math.min(...pts.map(p => p.x)) - padKm, x1 = Math.max(...pts.map(p => p.x)) + padKm, y0 = Math.min(...pts.map(p => p.y)) - padKm, y1 = Math.max(...pts.map(p => p.y)) + padKm, t0 = performance.now();
  const lat = []; for (let y = y0; y < y1 + 3; y += 3) for (let x = x0; x < x1 + 3; x += 3) lat.push({x:Math.min(x, x1), y:Math.min(y, y1)});
  try { for (const p of lat) await mapNeed(p, 3); } catch (e){ return false; }
  const tiles = []; for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) if (vecHas(tx, ty)){ tiles.push([tx, ty]); vecWant(tx * T, ty * T, (tx + 1) * T - 0.001, (ty + 1) * T - 0.001); }
  while (!tiles.every(([tx, ty]) => vecTile(tx, ty))){ if (performance.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 50)); }
  const Y = FARB.lay, n = UNITA.length;
  if (!Y.stat || Y.statN !== n){ Y.stat = await farbRunA(farbStatG()); Y.statN = n; } if (!Y.unit || Y.unitN !== n){ Y.unit = await farbRunA(farbUnitG()); Y.unitN = n; }
  for (const [tx, ty] of tiles){ const t = VEC.tiles.get(tx + ':' + ty); if (!t) return false; const o = FARB.til.get(t); if (o && o.n === n) continue; FARB.til.set(t, await farbRunA(farbTileG(t))); FARB.nTil++; farbOver(FARB.til.get(t).M, tx, ty, 'v' + tx + ':' + ty, () => { const tt = VEC.tiles.get(tx + ':' + ty), Y = tt && FARB.til.get(tt); return Y ? Y.M : null; }); }
  // the harbours' pockets there with their walls, and the rocks' shapes (where the box is under 250 km2: a longer way has them
  // shaped as it is asked, a cell at a time), so what asks afterwards finds them made
  await farbBlocks(x0 * 1000, y0 * 1000, x1 * 1000, y1 * 1000);
  try { await farbRunA(farbWarmG(x0 * 1000, y0 * 1000, x1 * 1000, y1 * 1000)); } catch (e){ return false; }
  return true; }
function* farbWarmG(x0, z0, x1, z1){ const seen = new Set(); let n = 0; if (FARB.F) FARB.F.at = 'lag:merker';
  { const T = MAPD.man.tile * 1000; for (let ty = Math.floor(z0 / T); ty <= Math.floor(z1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) yield* farbMarksG(tx + ':' + ty); }
  if (FARB.F) FARB.F.at = 'lag:lommer';
  for (let z = z0; z <= z1 + 100; z += 100) for (let x = x0; x <= x1 + 100; x += 100){ if (!(++n & 63)) yield; const L = farbPockets(x, z); if (L) for (const b of L) if (!seen.has(b)){ seen.add(b); yield* farbWallsG(b); } }
  if (FARB.F) FARB.F.at = 'lag:skjær';
  if ((x1 - x0) * (z1 - z0) <= 250e6) for (let j = Math.floor(z0 / FARB.C); j <= Math.floor(z1 / FARB.C); j++) for (let i = Math.floor(x0 / FARB.C); i <= Math.floor(x1 / FARB.C); i++){ yield* farbRocksG(i, j); if (!(++n & 15)) yield; } }

// ---- the questions ----
// the things whose cell lies within R of x, z, each once, into FARB.buf; how many
function farbGather(x, z, R){ const buf = FARB.buf, C = FARB.C, q = ++FARB.q, Y = farbGlob(); let n = 0;
  const i0 = Math.floor((x - R) / C), i1 = Math.floor((x + R) / C), j0 = Math.floor((z - R) / C), j1 = Math.floor((z + R) / C), Ms = [Y.stat, Y.unit, Y.site];
  if (!FARB.w && MAPD.man){ const T = MAPD.man.tile * 1000;
    for (let ty = Math.floor((z - R) / T); ty <= Math.floor((z + R) / T); ty++) for (let tx = Math.floor((x - R) / T); tx <= Math.floor((x + R) / T); tx++){ const k = tx + ':' + ty, t = VEC.tiles.get(k), Yt = t && farbTile(t); if (Yt){ Ms.push(Yt.M); if (Yt.dock.size) Ms.push(Yt.dock); } const mk = farbMarks(k); if (mk) Ms.push(mk); } }
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const k = i * 1048576 + j;
    for (const M of Ms){ const a = M.get(k); if (a) for (const o of a) if (o.q !== q){ o.q = q; buf[n++] = o; } }
    const ov = FARB.ovr.get(k); if (ov) for (const g of ov){ const M = g(), a = M && M.get(k); if (a) for (const o of a) if (o.q !== q){ o.q = q; buf[n++] = o; } }
    if (!FARB.w && MAPD.man){ const a = farbRocks(i, j); if (a) for (const o of a) if (o.q !== q){ o.q = q; buf[n++] = o; } } }
  if (FARB.test) for (const o of FARB.test) buf[n++] = o;
  return n; }
// the same in steps, into a list of its own (the field's job: a tile's reach has some thousands of things)
function* farbGatherG(x, z, R){ const out = [], C = FARB.C, q = ++FARB.q, Y = farbGlob(), Ms = [Y.stat, Y.unit, Y.site];
  if (!FARB.w && MAPD.man){ const T = MAPD.man.tile * 1000;
    for (let ty = Math.floor((z - R) / T); ty <= Math.floor((z + R) / T); ty++) for (let tx = Math.floor((x - R) / T); tx <= Math.floor((x + R) / T); tx++){ const k = tx + ':' + ty, t = VEC.tiles.get(k), Yt = t && farbTile(t); if (Yt){ Ms.push(Yt.M); if (Yt.dock.size) Ms.push(Yt.dock); } const mk = yield* farbMarksG(k); if (mk) Ms.push(mk); } }
  for (let j = Math.floor((z - R) / C); j <= Math.floor((z + R) / C); j++) for (let i = Math.floor((x - R) / C); i <= Math.floor((x + R) / C); i++){ const k = i * 1048576 + j; yield;
    for (const M of Ms){ const a = M.get(k); if (a) for (const o of a) if (o.q !== q){ o.q = q; out.push(o); } }
    const ov = FARB.ovr.get(k); if (ov) for (const g of ov){ const M = g(), a = M && M.get(k); if (a) for (const o of a) if (o.q !== q){ o.q = q; out.push(o); } }
    if (!FARB.w && MAPD.man){ const a = yield* farbRocksG(i, j); if (a) for (const o of a) if (o.q !== q){ o.q = q; out.push(o); } } }
  return out; }
// a sea mark that hangs on a bridge (a bridge's own lights and the signs of the passage under it: within 3.6 m of a deck's edge,
// 11b-obstacles.js markOnDeck) is no post in the water; and a turbine on land is not in the sea
function farbGone(o, n, buf = FARB.buf){ if (o.mk){ if (o.hung === undefined){ let h = false; if (MK_HUNG.has(o.mk[2])) for (let i = 0; i < n; i++){ const d = buf[i]; if (d.k === 's' && farbD(d, o.x, o.z) < 3.6){ h = true; break; } } if (FARB.w || farbKnown(o.x, o.z, 50)) o.hung = h; return h; } return o.hung; }
  if (o.turb){ if (o.sea === undefined){ const l = farbLand(o.x, o.z); if (l !== l) return false; o.sea = !l; } return !o.sea; }
  return false; }
// The nearest thing she cannot pass within cap of x, z: {d (metres to it, 0 on it), what, id, x, z, o}; null where there is none;
// FARB_UNK (d NaN) where the map is not in. The land, the coast line, the things, a bridge's deck lower than boat.air and
// FARB.airOver, and with opt.boats the vessels lying still (11b-obstacles.js fixBoats)
function farbNearest(x, z, cap, boat, opt){ FARB.n.near++;
  if (!farbKnown(x, z, cap)) return FARB_UNK;
  const land = farbLand(x, z); if (land !== land) return FARB_UNK; if (land) return {d:0, what:land === 2 ? 'kai' : 'land', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z, o:null};
  let d = cap, hit = null, what = '', id = '';
  const c = farbCoast(x, z, cap); if (c !== c) return FARB_UNK; if (c < d){ d = c; what = 'land'; id = Math.round(x / 50) + ',' + Math.round(z / 50); }
  const air = boat ? boat.air + FARB.airOver : Infinity, n = farbGather(x, z, cap), buf = FARB.buf;
  for (let i = 0; i < n; i++){ const o = buf[i]; if (o.k === 's' && !(farbUnder(o) < air)) continue; const b = o.bb || farbBB(o); if (x < b[0] - d || x > b[2] + d || z < b[1] - d || z > b[3] + d) continue;
    const e = farbD(o, x, z); if (e < d && !farbGone(o, n)){ d = e; hit = o; what = o.what; id = o.id; } }
  if (opt && opt.boats && !FARB.w) try { for (const o of fixBoats(x, z)){ const e = o.t === 0 ? Math.max(0, Math.hypot(x - o.x, z - o.z) - o.r) : Math.hypot(Math.max(0, Math.abs((x - o.x) * o.ux + (z - o.z) * o.uz) - o.l), Math.max(0, Math.abs((x - o.x) * o.uz - (z - o.z) * o.ux) - o.w)); if (e < d){ d = e; hit = o; what = 'båt'; id = 'båt#' + Math.round(o.x) + ',' + Math.round(o.z); } } } catch (e){}
  return what || hit ? {d, what, id, x, z, o:hit} : null; }
// metres from x, z to the nearest thing she cannot pass, cap where there is none within it, NaN where the map is not in
function farbClear(x, z, boat, cap, opt){ const n = farbNearest(x, z, cap || FARB.cap, boat, opt); return n ? n.d : (cap || FARB.cap); }
// The fine coast's edges in the cells the box touches (m), five numbers an edge in FARB.cs (ax, az, bx, bz, a breakwater's): how
// many numbers; -1 where a tile's coast is not indexed. An edge comes once per cell it touches.
function farbCoastSegs(x0, z0, x1, z1){ const out = FARB.cs; let n = 0;
  if (FARB.w){ if (FARB.w.segs) for (const e of FARB.w.segs(x0, z0, x1, z1)){ out[n++] = e[0]; out[n++] = e[1]; out[n++] = e[2]; out[n++] = e[3]; out[n++] = e[4] || 0; } return n; }
  const T = MAPD.man.tile * 1000, CC = COAST.CC;
  for (let ty = Math.floor(z0 / T); ty <= Math.floor(z1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++){
    const pk = MAPD.byTile.get('chart:' + tx + ':' + ty); if (!pk) continue; const I = pk.coast; if (!I) return -1; const N = I.N; if (!N) continue;
    const ox = tx * T, oz = ty * T, ed = I.ed, i0 = Math.max(0, Math.floor((x0 - ox - COAST.COX) / CC) + 1), i1 = Math.min(N - 1, Math.floor((x1 - ox - COAST.COX) / CC) + 1), j0 = Math.max(0, Math.floor((z0 - oz - COAST.COY) / CC) + 1), j1 = Math.min(N - 1, Math.floor((z1 - oz - COAST.COY) / CC) + 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const c = j * N + i; for (let q = I.cs[c]; q < I.cs[c + 1]; q++){ const e = I.ce[q], o = e * 4; out[n++] = ed[o] + ox; out[n++] = ed[o + 1] + oz; out[n++] = ed[o + 2] + ox; out[n++] = ed[o + 3] + oz; out[n++] = I.K[e]; } } }
  return n; }
// Her hull at a pose: null when it is free, else what it touches {what, id, x, z}: the land under a corner of her outline, the
// coast's line or a thing within opt.m of the outline (0: touching it), or less water under the outline than she draws ('grunn';
// opt.squat hers at the speed she has, opt.keel a margin under her keel); 'ukjent' where the map is not in
function farbPose(X, Z, psi, boat, H, opt){ FARB.n.pose++; const m = opt && opt.m || 0, P = farbHull(X, Z, psi, boat), R = Math.hypot(boat.L, boat.B) / 2 + m + 4;
  if (!farbKnown(X, Z, R)) return {what:'ukjent', id:'', x:X, z:Z};
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of P){ const l = farbLand(x, z); if (l !== l) return {what:'ukjent', id:'', x, z}; if (l) return {what:l === 2 ? 'kai' : 'land', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z}; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  x0 -= m; z0 -= m; x1 += m; z1 += m;
  // the coast's line between her corners and within the margin (a crossing in a harbour unit's basin does not count: the basin is water)
  const cs = FARB.cs, nc = farbCoastSegs(x0, z0, x1, z1); if (nc < 0) return {what:'ukjent', id:'', x:X, z:Z};
  for (let k = 0; k < nc; k += 5){ const ax = cs[k], az = cs[k + 1], bx = cs[k + 2], bz = cs[k + 3]; if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(az, bz) < z0 || Math.min(az, bz) > z1) continue;
    if (farbSegPoly(P, ax, az, bx, bz) > m) continue;
    // where: each place it crosses her outline, or (within the margin, or wholly under her) its point nearest her middle
    let hx = 0, hz = 0, hit = false, crossed = false;
    for (let i = 0, j = P.length - 1; i < P.length && !hit; j = i++){ const px = P[j][0], pz = P[j][1], qx = P[i][0], qz = P[i][1], d1 = farbTurn(px, pz, qx, qz, ax, az), d2 = farbTurn(px, pz, qx, qz, bx, bz), d3 = farbTurn(ax, az, bx, bz, px, pz), d4 = farbTurn(ax, az, bx, bz, qx, qz);
      if (!(((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)))) continue; crossed = true; const t = d3 / (d3 - d4); hx = px + (qx - px) * t; hz = pz + (qz - pz) * t; hit = !!FARB.w || !inHarbourPocket({x:hx / 1000, y:hz / 1000}); }
    if (!crossed){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((X - ax) * dx + (Z - az) * dz) / L2)) : 0; hx = ax + dx * u; hz = az + dz * u; hit = !!FARB.w || !inHarbourPocket({x:hx / 1000, y:hz / 1000}); }
    if (hit) return {what:'land', id:Math.round(hx / 50) + ',' + Math.round(hz / 50), x:hx, z:hz}; }
  // (and a pocket's wall: the land outside a basin's side, where it runs in between her corners)
  if (!FARB.w){ const PK = farbPockets(X, Z); if (PK) try { for (const b of PK) for (const w of farbWalls(b)) if (!(Math.max(w[0], w[2]) < x0 || Math.min(w[0], w[2]) > x1 || Math.max(w[1], w[3]) < z0 || Math.min(w[1], w[3]) > z1) && farbSegPoly(P, w[0], w[1], w[2], w[3]) <= m) return {what:'land', id:Math.round(w[0] / 50) + ',' + Math.round(w[1] / 50), x:w[0], z:w[1]}; } catch (e){ return {what:'ukjent', id:'', x:X, z:Z}; } }
  // (a test's world without the coast's edges: the distance at her corners)
  if (FARB.w && !FARB.w.segs) for (const [x, z] of P){ const c = farbCoast(x, z, m + 1); if (c !== c) return {what:'ukjent', id:'', x, z}; if (m > 0 && c <= m) return {what:'land', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z}; }
  // the things
  const air = boat.air + FARB.airOver, n = farbGather(X, Z, R), buf = FARB.buf;
  for (let i = 0; i < n; i++){ const o = buf[i]; if (o.k === 's' && !(farbUnder(o) < air)) continue; const b = o.bb || farbBB(o); if (b[0] > x1 || b[2] < x0 || b[1] > z1 || b[3] < z0) continue;
    if (farbPolyD(P, o) <= m && !farbGone(o, n)) return {what:o.what, id:o.id, x:o.x != null ? o.x : (b[0] + b[2]) / 2, z:o.z != null ? o.z : (b[1] + b[3]) / 2}; }
  if (opt && opt.boats && !FARB.w) try { for (const o of fixBoats(X, Z)){ const d = o.t === 0 ? Math.max(0, farbPtPoly(P, o.x, o.z) - o.r) : farbRingD(P, o.Q || (o.Q = farbBoxPts(o))); if (d <= m) return {what:'båt', id:'båt#' + Math.round(o.x) + ',' + Math.round(o.z), x:o.x, z:o.z}; } } catch (e){}
  // the water under her: with the foreshore where the coast is near enough for it to reach in under her, and then her outline closely
  const s = Math.sin(psi), c = Math.cos(psi), sq = opt && opt.squat || 0, kl = opt && opt.keel || 0, reach = Math.hypot(boat.L, boat.B) / 2 + FARB.shore.reach + 2, cd = farbCoast(X, Z, reach, true);
  if (cd !== cd) return {what:'ukjent', id:'', x:X, z:Z}; const off = cd >= reach;
  // (the tide at her middle: it is the same along a hull, and the tide's place is looked up by the km. The game's own answer within
  // a km is that of the point it was last asked there, so two askers can be some mm apart: FARB.eps, 3 cm of water, covers that.
  // The check against the bench's observer found it: 2 poses of 27 360, each 2 cm past the edge of the foreshore)
  const lvl = farbTide(H, X, Z) - boat.T - sq;
  for (const [f, g] of farbKeelPts(boat, !off)){ const x = X + f * s + g * c, z = Z - f * c + g * s, k = farbDepth(x, z, off) + lvl; if (k !== k) return {what:'ukjent', id:'', x, z}; if (k < kl + FARB.eps) return {what:'grunn', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z, keel:k}; }
  return null; }
// Her hull swept from one pose to another ({X, Z, psi}): the first thing it touches, or null; 'ukjent' where the map is not in. A pose
// every FARB.step m of the farthest any point of her moves, each with half a step's margin so nothing slips between two of them.
// Where nothing is within her reach she goes on over the open water at once, with the water under her asked at each stop. Two
// things the independent control found (23.11.2026) are in the rule for that:
//  - the foreshore is drawn from the coast's line as it is, also the line inside a harbour's pocket, so «nothing within reach»
//    takes the raw line too (1 336 sweeps along the outside of the basins at 20 harbour units went over the foreshore);
//  - a jump is never longer than her waterline reaches along her way where she stands (her length ahead, her beam sideways, the
//    lesser of them in a turn), so the water is asked under every metre she passes (a 7.9 m boat stepped 12.5 m over a bar).
function farbSweep(p0, p1, boat, H, opt){ const dx = p1.X - p0.X, dz = p1.Z - p0.Z; let dpsi = p1.psi - p0.psi; while (dpsi > Math.PI) dpsi -= 2 * Math.PI; while (dpsi < -Math.PI) dpsi += 2 * Math.PI;
  const m = opt && opt.m || 0, tr = Math.hypot(dx, dz), move = tr + Math.abs(dpsi) * boat.L / 2, R = Math.hypot(boat.L, boat.B) / 2 + m + FARB.step + FARB.shore.reach + 2, o2 = Object.assign({}, opt, {m:m + FARB.step / 2}), sq = opt && opt.squat || 0, kl = opt && opt.keel || 0; let u = 0;
  for (let guard = 0; guard < 4e5; guard++){ const X = p0.X + dx * u, Z = p0.Z + dz * u, psi = p0.psi + dpsi * u; let adv = FARB.step;
    let c = farbClear(X, Z, boat, R + FARB.skip, opt); if (c !== c) return {what:'ukjent', id:'', x:X, z:Z};
    if (c > R){ const cr = farbCoast(X, Z, R + FARB.skip, true); if (cr !== cr) return {what:'ukjent', id:'', x:X, z:Z}; if (cr < c) c = cr; }
    if (c > R){ const s = Math.sin(psi), cs = Math.cos(psi), lvl = farbTide(H, X, Z) - boat.T - sq, al = tr > 1e-6 ? Math.min(1, Math.abs((dx * s - dz * cs) / tr)) : 0;
      const ext = Math.abs(dpsi) > 0.02 || tr <= 1e-6 ? Math.min(boat.L, boat.B) : al * boat.L + Math.sqrt(1 - al * al) * boat.B;
      adv = Math.min(c - R, 12.5, Math.max(FARB.step, ext));
      for (const [f, g] of farbKeelPts(boat)){ const x = X + f * s + g * cs, z = Z - f * cs + g * s, k = farbDepth(x, z, true) + lvl; if (!(k >= kl + FARB.eps)) return {what:k !== k ? 'ukjent' : 'grunn', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z, keel:k}; } }
    else { const t = farbPose(X, Z, psi, boat, H, o2); if (t) return t; }
    if (u >= 1) return null; u = move > 0 ? Math.min(1, u + Math.max(adv, FARB.step) / move) : 1; }
  return {what:'ukjent', id:'', x:p1.X, z:p1.Z}; }   // (a way too long to be swept in one go is not known to be free)

// ===== THE FIELD: THE DISTANCE AND THE DEPTH ON A GRID, WORKED OUT IN A WORKER =====
// A search (F2) asks millions of points, so what the geometry above answers exactly is laid out on a grid, a tile at a time:
// FARB.F.N x N cells of `cell` m (2 m: a tile of 500 m, for a harbour; 4 and 8 m for the sounds and the open coast), each with
//   d: metres from the cell's middle to the nearest thing nobody can pass (the land, the coast's line outside the harbours' pockets
//      and the pockets' walls, everything fixed in the sea but the bridges' decks), in steps of FARB.F.q rounded down, FARB.F.cap at
//      most. Never more than the geometry's answer at the middle; anywhere else in the cell up to 0.71 x cell less is true;
//   z: the least water (dm at chart datum; the foreshore and the dredged channels in it) at the middles of the cell and its eight
//      neighbours: 0 dry, 254 that or more, 255 not known;
//   u: the lowest underside (steps of 0.25 m) of a bridge's deck within FARB.F.deck m of the cell's middle; 255 none.
// The search goes on the field; the way it finds is checked on the geometry (farbSweep) before she is sent along it.
// farbFieldJob gathers what a tile needs as plain numbers on the main thread, in slices; farbFieldBuild works the tile out from them
// in a worker (it is self-contained, and runs in Node for the unit tests); farbFieldNeed asks for the tiles over a box, and
// farbFieldAt reads a cell. The vessels lying still are not in it (they come and go): the geometry has them.
FARB.F = {N:250, cap:60, q:0.25, deck:8, lat:40, pad:3.5, max:96, fld:new Map(), use:0, worker:null, id:0, wait:new Map(), dugV:0, at:'', steps:false, n:{built:0, ms:0, job:0, slice:0, step:0, bytes:0, long:[], h:[0, 0, 0, 0, 0, 0, 0, 0, 0]}};   // (h: the slices by their length, whole ms, 8 and over last)
function farbFieldBuild(J){
  const N = J.N, cell = J.cell, cap = J.cap, NN = N * N, S = J.shore, reach = S.reach + 2, t0 = Date.now();
  const D = new Float32Array(NN).fill(cap), SH = new Float32Array(NN).fill(reach), MO = new Uint8Array(NN), U = new Uint8Array(NN).fill(255), Z = new Float32Array(NN);
  const segD2 = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0, ex = x - ax - dx * u, ez = z - az - dz * u; return ex * ex + ez * ez; };
  // the cells whose middles lie between lo - r and hi + r
  const lo = (v, r) => Math.max(0, Math.ceil((v - r) / cell - 0.5)), hi = (v, r) => Math.min(N - 1, Math.floor((v + r) / cell - 0.5));
  // a line with half its width w into F: the distance from each middle within reach of it, where that is less than what is there
  const line = (F, rc, ax, az, bx, bz, w, M, mv) => { const R = rc + w, i0 = lo(Math.min(ax, bx), R), i1 = hi(Math.max(ax, bx), R), j0 = lo(Math.min(az, bz), R), j1 = hi(Math.max(az, bz), R);
    for (let j = j0; j <= j1; j++){ const z = (j + 0.5) * cell; for (let i = i0; i <= i1; i++){ const k = j * N + i, lim = F[k] + w, d2 = segD2((i + 0.5) * cell, z, ax, az, bx, bz); if (d2 < lim * lim){ const d = Math.sqrt(d2) - w; F[k] = d > 0 ? d : 0; if (M) M[k] = mv; } } } };
  const inPoly = (T, p, n, x, z) => { let ins = false; for (let i = 0, j = n - 1; i < n; j = i++){ const xi = T[p + i * 2], zi = T[p + i * 2 + 1], xj = T[p + j * 2], zj = T[p + j * 2 + 1]; if ((zi > z) !== (zj > z) && x < xi + (z - zi) * (xj - xi) / (zj - zi)) ins = !ins; } return ins; };
  // the coast's line: the land a boat can touch (the pockets taken out, their walls in) for the distance, and as it is for the foreshore
  const EO = J.eo, EC = J.ec || J.eo;
  for (let k = 0; k < EC.length; k += 5) line(D, cap, EC[k], EC[k + 1], EC[k + 2], EC[k + 3], 0);
  for (let k = 0; k < EO.length; k += 5) line(SH, reach, EO[k], EO[k + 1], EO[k + 2], EO[k + 3], 0, MO, EO[k + 4] ? 1 : 0);
  // the things: 1 a circle, 2 a box, 3 a line with a width, 4 a closed outline, 5 an ellipse, 6 a piece of a bridge's deck
  const T = J.th;
  for (let p = 0; p < T.length;){ const k = T[p++];
    if (k === 1){ line(D, cap, T[p], T[p + 1], T[p], T[p + 1], T[p + 2]); p += 3; }
    else if (k === 2){ const x = T[p], z = T[p + 1], l = T[p + 2], w = T[p + 3], ux = T[p + 4], uz = T[p + 5], e = Math.hypot(l, w) + cap; p += 6;
      for (let j = lo(z, e); j <= hi(z, e); j++) for (let i = lo(x, e); i <= hi(x, e); i++){ const dx = (i + 0.5) * cell - x, dz = (j + 0.5) * cell - z, d = Math.hypot(Math.max(0, Math.abs(dx * ux + dz * uz) - l), Math.max(0, Math.abs(dx * uz - dz * ux) - w)); if (d < D[j * N + i]) D[j * N + i] = d; } }
    else if (k === 3){ const r = T[p++], n = T[p++]; if (n === 1) line(D, cap, T[p], T[p + 1], T[p], T[p + 1], r); for (let i = 1; i < n; i++) line(D, cap, T[p + i * 2 - 2], T[p + i * 2 - 1], T[p + i * 2], T[p + i * 2 + 1], r); p += n * 2; }
    else if (k === 4){ const n = T[p++]; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (let i = 0, j = n - 1; i < n; j = i++){ const x = T[p + i * 2], z = T[p + i * 2 + 1]; line(D, cap, T[p + j * 2], T[p + j * 2 + 1], x, z, 0); if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      for (let j = lo(z0, 0); j <= hi(z1, 0); j++) for (let i = lo(x0, 0); i <= hi(x1, 0); i++) if (D[j * N + i] > 0 && inPoly(T, p, n, (i + 0.5) * cell, (j + 0.5) * cell)) D[j * N + i] = 0;
      p += n * 2; }
    else if (k === 5){ const x = T[p], z = T[p + 1], a = T[p + 2], b = T[p + 3], th = T[p + 4], ct = Math.cos(th), st = Math.sin(th), mn = Math.min(a, b), e = Math.max(a, b) + cap; p += 5;
      for (let j = lo(z, e); j <= hi(z, e); j++) for (let i = lo(x, e); i <= hi(x, e); i++){ const dx = (i + 0.5) * cell - x, dz = (j + 0.5) * cell - z, q = Math.hypot((dx * ct + dz * st) / a, (-dx * st + dz * ct) / b), d = q <= 1 ? 0 : Math.max((q - 1) * mn, Math.hypot(dx, dz) - Math.max(a, b)); if (d < D[j * N + i]) D[j * N + i] = d; } }
    else if (k === 6){ const ax = T[p], az = T[p + 1], bx = T[p + 2], bz = T[p + 3], R = T[p + 4] + J.deck, v = Math.max(0, Math.min(254, Math.floor(T[p + 5] / 0.25))); p += 6;
      for (let j = lo(Math.min(az, bz), R); j <= hi(Math.max(az, bz), R); j++) for (let i = lo(Math.min(ax, bx), R); i <= hi(Math.max(ax, bx), R); i++) if (v < U[j * N + i] && segD2((i + 0.5) * cell, (j + 0.5) * cell, ax, az, bx, bz) <= R * R) U[j * N + i] = v; }
    else break; }
  // what is land: the coast's own (01d-coast.js coastQuery, on the cells that were sent), but for a harbour's pocket
  const C = J.co, PK = J.pk;
  const inPk = (x, z) => { for (let k = 0; k < PK.length; k += 8){ const dx = x - PK[k], dz = z - PK[k + 1]; if (Math.abs(dx * PK[k + 2] + dz * PK[k + 3]) <= PK[k + 6] && Math.abs(dx * PK[k + 4] + dz * PK[k + 5]) <= PK[k + 7]) return true; } return false; };
  const land = (x, z) => { if (!C) return false; const i = Math.floor((x - C.cx0) / C.CC), j = Math.floor((z - C.cz0) / C.CC); if (i < 0 || j < 0 || i >= C.n || j >= C.m) return false;
    const c = j * C.n + i, s0 = C.cs[c], s1 = C.cs[c + 1]; let wl = C.wl[c], wb = C.wb[c];
    if (s0 < s1){ const x0 = C.cx0 + i * C.CC, y0 = C.cz0 + j * C.CC, ed = C.ed;
      for (let q = s0; q < s1; q++){ const e = C.ce[q], o = e * 4, ax = ed[o], ay = ed[o + 1], bx = ed[o + 2], by = ed[o + 3]; let d = 0;
        if ((ax < x0) !== (bx < x0)){ const yc = ay + (x0 - ax) * (by - ay) / (bx - ax); if (yc >= y0 && yc < z) d += bx > ax ? 1 : -1; }
        if ((ay <= z) !== (by <= z)){ const xc = ax + (z - ay) * (bx - ax) / (by - ay); if (xc >= x0 && xc < x) d += by > ay ? -1 : 1; }
        if (d){ if (C.K[e]) wb += d; else wl += d; } } }
    return !!(wl || wb); };
  // the chart's depth from the lattice: the least of the water among the four round the point (a lattice point on land is under 0),
  // the water two round where all four are land, and 0.8 m where there is none (a sound the mask closed); NaN where one is not known
  const dep = J.dep, ln = dep.n, V = dep.v;
  const rawAt = (x, z) => { let gi = Math.floor(x / dep.step), gj = Math.floor(z / dep.step); gi = gi < 0 ? 0 : gi > ln - 2 ? ln - 2 : gi; gj = gj < 0 ? 0 : gj > ln - 2 ? ln - 2 : gj; let m = Infinity;
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++){ const v = V[(gj + b) * ln + gi + a]; if (v !== v) return NaN; if (v >= 0 && v < m) m = v; }
    if (m < Infinity) return m;
    for (let b = -1; b < 3; b++) for (let a = -1; a < 3; a++){ const i = gi + a, j = gj + b; if (i < 0 || j < 0 || i >= ln || j >= ln) continue; const v = V[j * ln + i]; if (v >= 0 && v < m) m = v; }
    return m < Infinity ? m : 0.8; };
  for (let j = 0; j < N; j++){ const z = (j + 0.5) * cell; for (let i = 0; i < N; i++){ const k = j * N + i, x = (i + 0.5) * cell, pk = PK.length ? inPk(x, z) : false, ld = !pk && land(x, z);
      if (ld){ D[k] = 0; Z[k] = -S.top - J.zc; continue; }
      let d = rawAt(x, z); if (d !== d){ Z[k] = NaN; continue; }
      if (!pk && SH[k] < reach){ const g = S.top - SH[k] * (MO[k] ? S.gMole : S.g); if (g > S.deep) d = Math.min(d, -g - J.zc); }
      Z[k] = d; } }
  // the dredged channels
  const G = J.dug; for (let q = 0; q < G.length; q += 6){ const ax = G[q], az = G[q + 1], bx = G[q + 2], bz = G[q + 3], r = G[q + 4], dd = G[q + 5];
    for (let j = lo(Math.min(az, bz), r); j <= hi(Math.max(az, bz), r); j++) for (let i = lo(Math.min(ax, bx), r); i <= hi(Math.max(ax, bx), r); i++){ const k = j * N + i; if (dd > Z[k] && segD2((i + 0.5) * cell, (j + 0.5) * cell, ax, az, bx, bz) < r * r) Z[k] = dd; } }
  const d = new Uint8Array(NN), z = new Uint8Array(NN), dmax = Math.round(cap / J.q);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const k = j * N + i; d[k] = Math.min(dmax, Math.floor(D[k] / J.q + 1e-6)); let m = Infinity;
    for (let b = j > 0 ? j - 1 : 0; b <= j + 1 && b < N; b++) for (let a = i > 0 ? i - 1 : 0; a <= i + 1 && a < N; a++){ const v = Z[b * N + a]; if (v !== v){ m = NaN; break; } if (v < m) m = v; }
    z[k] = m !== m ? 255 : m <= 0 ? 0 : Math.min(254, Math.floor(m * 10 + 1e-6)); }
  return {d, z, u:U, ms:Date.now() - t0}; }
// the outside pieces of the line a-b: [t0, t1] along it, where it does not lie in a box of PK
function farbSegOutParts(PK, ax, az, bx, bz){ const dx = bx - ax, dz = bz - az, ins = [];
  for (const b of PK){ const s0 = (ax - b.x) * b.ux + (az - b.z) * b.uz, ds = dx * b.ux + dz * b.uz, n0 = (ax - b.x) * b.nx + (az - b.z) * b.nz, dn = dx * b.nx + dz * b.nz; let t0 = 0, t1 = 1, ok = true;
    for (const [v0, dv, h] of [[s0, ds, b.l], [n0, dn, b.w]]){ if (Math.abs(dv) < 1e-12){ if (Math.abs(v0) > h){ ok = false; break; } continue; } let a = (-h - v0) / dv, c = (h - v0) / dv; if (a > c){ const q = a; a = c; c = q; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1){ ok = false; break; } }
    if (ok) ins.push([t0, t1]); }
  if (!ins.length) return [[0, 1]]; ins.sort((p, q) => p[0] - q[0]); const out = []; let t = 0;
  for (const [a, c] of ins){ if (a > t) out.push([t, a]); if (c > t) t = c; } if (t < 1) out.push([t, 1]); return out; }
// what the field's tiles were built from: a tile is built again when any of it has changed
const farbFieldVer = () => VEC.ver + '|' + COAST.built + '|' + MARKS.ver + '|' + UNITA.length + '|' + FDOCK.ver + '|' + (RORBU.ver || 0) + '|' + (S && S.naust && S.naust.o ? S.naust.o.join(',') : '') + '|' + FARB.F.dugV;
function* farbPackG(a){ const out = new Float32Array(a.length); for (let i = 0; i < a.length;){ const e = Math.min(a.length, i + 1024); for (; i < e; i++) out[i] = a[i]; yield; } return out; }
// What the tile fx, fz of `cell` m needs, as plain numbers from its own corner (m): null where the map is not in, or where the tile
// has no fine coast and the coarse one has land in it (the geometry answers there). In slices: it stops for breath as it goes
function* farbFieldJob(cell, fx, fz){ const F = FARB.F, N = F.N, Tf = N * cell, x0 = fx * Tf, z0 = fz * Tf, cap = F.cap, T = MAPD.man.tile * 1000, CC = COAST.CC, COX = COAST.COX, COY = COAST.COY, cl = (v, n) => v < 0 ? 0 : v > n ? n : v;
  if (!farbKnown(x0 + Tf / 2, z0 + Tf / 2, Tf * 0.7072 + cap + 20)) return null;   // (never from a neighbourhood that is half in)
  // what is land: the cells of the tile's own chart tile that it lies over
  F.at = 'kyst'; const tx = Math.floor((x0 + Tf / 2) / T), ty = Math.floor((z0 + Tf / 2) / T), pk = MAPD.byTile.get('chart:' + tx + ':' + ty); let co = null;
  if (pk && !pk.coast) return null;
  if (pk && pk.coast.N){ const I = pk.coast, lx0 = x0 - tx * T, lz0 = z0 - ty * T, i0 = cl(Math.floor((lx0 - COX) / CC) + 1, I.N - 1), i1 = cl(Math.floor((lx0 + Tf - COX) / CC) + 1, I.N - 1), j0 = cl(Math.floor((lz0 - COY) / CC) + 1, I.N - 1), j1 = cl(Math.floor((lz0 + Tf - COY) / CC) + 1, I.N - 1), n = i1 - i0 + 1, m = j1 - j0 + 1;
    const wl = new Int8Array(n * m), wb = new Int8Array(n * m), cs = new Int32Array(n * m + 1), ce = [], ed = [], K = [], at = new Map();
    for (let j = 0; j < m; j++){ for (let i = 0; i < n; i++){ const c = (j0 + j) * I.N + i0 + i, k = j * n + i; wl[k] = I.wl[c]; wb[k] = I.wb[c]; cs[k] = ce.length;
        for (let q = I.cs[c]; q < I.cs[c + 1]; q++){ const e = I.ce[q]; let a = at.get(e); if (a === undefined){ a = K.length; at.set(e, a); const o = e * 4; ed.push(I.ed[o] - lx0, I.ed[o + 1] - lz0, I.ed[o + 2] - lx0, I.ed[o + 3] - lz0); K.push(I.K[e]); } ce.push(a); if (!(q & 31)) yield; } yield; } }
    cs[n * m] = ce.length; co = {CC, n, m, cx0:COX + (i0 - 1) * CC - lx0, cz0:COY + (j0 - 1) * CC - lz0, wl, wb, cs, ce:Int32Array.from(ce), ed:Float32Array.from(ed), K:Uint8Array.from(K)}; }
  else if (!pk) for (let z = z0; z <= z0 + Tf; z += 50){ for (let x = x0; x <= x0 + Tf; x += 50){ let l; try { l = isLand({x:x / 1000, y:z / 1000}); } catch (e){ return null; } if (l) return null; } yield; }
  // the coast's line within reach of the tile, of every chart tile that has some of it
  F.at = 'kanter'; const eo = []; let nt = 0;
  for (let ty2 = Math.floor((z0 - cap) / T); ty2 <= Math.floor((z0 + Tf + cap) / T); ty2++) for (let tx2 = Math.floor((x0 - cap) / T); tx2 <= Math.floor((x0 + Tf + cap) / T); tx2++){
    const p2 = MAPD.byTile.get('chart:' + tx2 + ':' + ty2); if (!p2) continue; const I = p2.coast; if (!I) return null; if (!I.N) continue; const ox = tx2 * T, oz = ty2 * T, seen = new Set(); nt++;
    const i0 = cl(Math.floor((x0 - cap - ox - COX) / CC) + 1, I.N - 1), i1 = cl(Math.floor((x0 + Tf + cap - ox - COX) / CC) + 1, I.N - 1), j0 = cl(Math.floor((z0 - cap - oz - COY) / CC) + 1, I.N - 1), j1 = cl(Math.floor((z0 + Tf + cap - oz - COY) / CC) + 1, I.N - 1);
    for (let j = j0; j <= j1; j++){ for (let i = i0; i <= i1; i++){ const c = j * I.N + i; for (let q = I.cs[c]; q < I.cs[c + 1]; q++){ const e = I.ce[q]; if (seen.has(e)) continue; seen.add(e); const o = e * 4; eo.push(I.ed[o] + ox - x0, I.ed[o + 1] + oz - z0, I.ed[o + 2] + ox - x0, I.ed[o + 3] + oz - z0, I.K[e]); if (!(q & 31)) yield; } yield; } } }
  // the harbours' pockets over it: the line outside them, and their walls
  F.at = 'lommer'; const PKs = new Set(); for (let z = z0 - cap - 100; z <= z0 + Tf + cap + 100; z += 100){ for (let x = x0 - cap - 100; x <= x0 + Tf + cap + 100; x += 100){ const L = farbPockets(x, z); if (L) for (const b of L) PKs.add(b); } yield; }
  const PK = [...PKs], pkA = []; let ec = null; yield;
  if (PK.length){ ec = []; for (const b of PK) pkA.push(b.x - x0, b.z - z0, b.ux, b.uz, b.nx, b.nz, b.l, b.w);
    for (let k = 0; k < eo.length; k += 5){ const ax = eo[k] + x0, az = eo[k + 1] + z0, bx = eo[k + 2] + x0, bz = eo[k + 3] + z0; for (const [a, c] of farbSegOutParts(PK, ax, az, bx, bz)) if (c - a > 1e-9) ec.push(eo[k] + (eo[k + 2] - eo[k]) * a, eo[k + 1] + (eo[k + 3] - eo[k + 1]) * a, eo[k] + (eo[k + 2] - eo[k]) * c, eo[k + 1] + (eo[k + 3] - eo[k + 1]) * c, eo[k + 4]); if (!(k % 20)) yield; }
    for (const b of PK){ let W; try { W = yield* farbWallsG(b); } catch (e){ return null; } for (const w of W) ec.push(w[0] - x0, w[1] - z0, w[2] - x0, w[3] - z0, 0); yield; } }
  // the things within reach of the tile (the rocks cell by cell first: a cell's are shaped when first asked for)
  F.at = 'skjær'; const cx = x0 + Tf / 2, cz = z0 + Tf / 2, R = Tf * 0.7072 + cap + 20, th = [];
  for (let j = Math.floor((cz - R) / FARB.C); j <= Math.floor((cz + R) / FARB.C); j++) for (let i = Math.floor((cx - R) / FARB.C); i <= Math.floor((cx + R) / FARB.C); i++){ yield* farbRocksG(i, j); yield; }
  F.at = 'ting'; const all = yield* farbGatherG(cx, cz, R), n = all.length, list = []; for (let i = 0; i < n; i++){ if (!farbGone(all[i], n, all)) list.push(all[i]); if (!(i & 3)) yield; }
  const ring = P => { th.push(4, P.length); for (const q of P) th.push(q[0] - x0, q[1] - z0); }; let k = 0;
  for (const o of list){ if (!(++k & 3)) yield;
    if (o.k === 'c') th.push(1, o.x - x0, o.z - z0, o.r);
    else if (o.k === 'b') th.push(2, o.x - x0, o.z - z0, o.l, o.w, o.ux, o.uz);
    else if (o.k === 'l'){ th.push(3, o.r, o.P.length); for (const q of o.P) th.push(q[0] - x0, q[1] - z0); }
    else if (o.k === 'p') ring(o.P);
    else if (o.k === 'e') th.push(5, o.x - x0, o.z - z0, o.a, o.b, o.th);
    else if (o.k === 's') th.push(6, o.ax - x0, o.az - z0, o.bx - x0, o.bz - z0, o.r, farbUnder(o));
    else if (o.k === 'u') for (const P of o.G || (o.G = farbUnitRings(o.U))) ring(P); }
  // the chart's depth on a lattice (under 0 on land), a row at a time
  // (twice as close where a harbour's pockets or a naust's or a rorbu's berth lie: the dredged ramps there (07-harbours.js unitDredge,
  // siteDredge) meet the chart's depth in valleys a lattice of 12.5 m stepped over: 1 cell of 85 000 was 1.35 m deeper than the geometry)
  let fine = PK.length > 0; if (!fine) try { fine = rorbuIn((x0 - 100) / 1000, (z0 - 100) / 1000, (x0 + Tf + 100) / 1000, (z0 + Tf + 100) / 1000).some(Rb => Rb.site) || !!(S && S.naust && S.naust.o && Math.abs(S.naust.o[0] - cx) < Tf && Math.abs(S.naust.o[1] - cz) < Tf); } catch (e){}
  F.at = 'dybde'; const nl = fine ? F.lat * 2 : F.lat, ln = nl + 1, step = Tf / nl, v = new Float32Array(ln * ln);
  for (let j = 0; j < ln; j++) for (let i = 0; i < ln; i++){ const x = x0 + i * step, z = z0 + j * step, l = farbLand(x, z); v[j * ln + i] = l !== l ? NaN : l ? -1 : farbDepthRaw(x, z); yield; }
  const dug = []; for (const s of FARB.dugL) if (Math.max(s.ax, s.bx) + s.r > x0 && Math.min(s.ax, s.bx) - s.r < x0 + Tf && Math.max(s.az, s.bz) + s.r > z0 && Math.min(s.az, s.bz) - s.r < z0 + Tf) dug.push(s.ax - x0, s.az - z0, s.bx - x0, s.bz - z0, s.r, s.d);
  F.at = 'pakking'; yield; const eoA = yield* farbPackG(eo), ecA = ec ? yield* farbPackG(ec) : null, thA = yield* farbPackG(th);
  return {N, cell, cap, q:F.q, deck:F.deck, shore:FARB.shore, zc:farbZC(cx, cz), co, eo:eoA, ec:ecA, pk:Float32Array.from(pkA), th:thA, dep:{n:ln, step, v}, dug:Float32Array.from(dug)}; }
// the worker (false where one cannot start: then no field is built, and what asks goes to the geometry)
function farbFieldWorker(){ const F = FARB.F; if (F.worker !== null) return F.worker;
  try { const src = farbFieldBuild.toString() + '\nonmessage = e => { try { const r = farbFieldBuild(e.data.J); postMessage({id:e.data.id, r}, [r.d.buffer, r.z.buffer, r.u.buffer]); } catch (err){ postMessage({id:e.data.id, err:String(err)}); } };';
    const w = new Worker(URL.createObjectURL(new Blob([src], {type:'text/javascript'})));
    w.onmessage = e => { const q = F.wait.get(e.data.id); if (!q) return; F.wait.delete(e.data.id); if (e.data.err) q.rej(new Error(e.data.err)); else q.res(e.data.r); };
    w.onerror = () => { F.worker = false; for (const q of F.wait.values()) q.rej(new Error('the field worker failed')); F.wait.clear(); };
    F.worker = w; } catch (e){ F.worker = false; }
  return F.worker; }
// the tile of `cell` m at fx, fz where it is built and still holds; null where not
function farbFieldTile(cell, fx, fz){ const F = FARB.F, Y = F.fld.get(cell + '|' + fx + '|' + fz); if (!Y || Y.v !== farbFieldVer()) return null; Y.use = ++F.use; return Y; }
// The tiles of `cell` m over the box (m) built: each gathered in slices on this thread and worked out in the worker. True when every
// one is in; a tile the map has no answer for (farbFieldJob null) is kept as {none:true}. opt.here: worked out on this thread (tests)
async function farbFieldNeed(x0, z0, x1, z1, cell = 2, opt){ const F = FARB.F, Tf = F.N * cell; if (!MAPD.man) return false;
  if (!await farbNeed([{x:x0 / 1000, y:z0 / 1000}, {x:x1 / 1000, y:z1 / 1000}], F.pad)) return false;
  const here = !!(opt && opt.here), w = here ? null : farbFieldWorker(); if (!here && !w) return false; let all = true;
  for (let fz = Math.floor(z0 / Tf); fz <= Math.floor(z1 / Tf); fz++) for (let fx = Math.floor(x0 / Tf); fx <= Math.floor(x1 / Tf); fx++){ const key = cell + '|' + fx + '|' + fz, ver = farbFieldVer(), Y = F.fld.get(key); if (Y && Y.v === ver){ Y.use = ++F.use; continue; }
    await farbBlocks(fx * Tf - 100, fz * Tf - 100, (fx + 1) * Tf + 100, (fz + 1) * Tf + 100);
    const t0 = performance.now(), J = await farbRunA(farbFieldJob(cell, fx, fz)); F.n.job += performance.now() - t0;
    if (farbFieldVer() !== ver){ all = false; continue; }   // (the map changed under it: asked for again)
    if (!J){ F.fld.set(key, {none:true, v:ver, use:++F.use, cell, fx, fz}); continue; }
    let r; try { r = here ? farbFieldBuild(J) : await new Promise((res, rej) => { const id = ++F.id; F.wait.set(id, {res, rej}); w.postMessage({id, J}, [J.eo.buffer, J.th.buffer, J.dep.v.buffer]); }); } catch (e){ all = false; continue; }
    F.fld.set(key, {d:r.d, z:r.z, u:r.u, v:ver, use:++F.use, cell, fx, fz, x0:fx * Tf, z0:fz * Tf}); F.n.built++; F.n.ms += r.ms; F.n.bytes = r.d.byteLength + r.z.byteLength + r.u.byteLength;
    if (F.fld.size > F.max){ let old = null, ou = Infinity; for (const [k2, y] of F.fld) if (y.use < ou){ ou = y.use; old = k2; } F.fld.delete(old); } }
  return all; }
// one cell read: {d (m to the nearest thing nobody can pass, from the cell's middle), z (m of water at chart datum, the least round
// the cell; NaN not known), u (m, the lowest deck's underside near; Infinity none)}; null where the tile is not built or has no answer
function farbFieldAt(x, z, cell = 2){ const F = FARB.F, Tf = F.N * cell, Y = farbFieldTile(cell, Math.floor(x / Tf), Math.floor(z / Tf)); if (!Y || Y.none) return null;
  const k = Math.floor((z - Y.z0) / cell) * F.N + Math.floor((x - Y.x0) / cell), zz = Y.z[k], uu = Y.u[k]; return {d:Y.d[k] * F.q, z:zz === 255 ? NaN : zz / 10, u:uu === 255 ? Infinity : uu * 0.25}; }
