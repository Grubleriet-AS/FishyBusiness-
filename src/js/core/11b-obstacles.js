// ===== WHAT A ROUTE MUST NOT SAIL THROUGH (Jonas 05.10.2026: «autoruter aldri skal gå gjennom 3d elementer eller landmasse», along
// the whole coast: «broer, staker, påler, lykter, kardinal og lateralmerker og det meste») =====
// The things the 3D view builds in the water, as the simulation sees them, in metres in the national frame:
//  - a road bridge (BRIDGES on Senja, the coast's vec packs elsewhere): its piers where view3d.js bridgeInto sets them (one in each
//    70 m along the deck), and the deck itself as a wall where its underside is lower than the boat (a bridge under 60 m lies low
//    over the water all along; a long one near its ends). The underside is reckoned with the ends at 1 m, which the 3D view's ends
//    are at or above, so where a route goes under, the drawn deck is at least as high
//  - the piers and breakwaters on piles (PIERBOX and the packs' piers; not the quay decks, which stand on the land behind a face)
//  - Father's naust's pile quay, and the rorbuer's quays (07d-rorbu.js)
//  - the sea marks the 3D view builds: beacons, stakes, lights and buoys (SEAMARKS.marks, and the coast's from the chart packs, 01e-marks.js)
//  - the wind turbines standing in the sea (VIND, 01c-vec.js); the power lines over the sea hang 30 m or more over it (view3d/17d-vind.js),
//    higher than any boat (obsAir), so they are no obstacle
// A harbour unit's block and fill are land already (isLand). Each thing is a circle, a box or a piece of deck, indexed per 250 m cell;
// the index is built again when the coast's packs or marks change (VEC.ver, MARKS.ver) or the naust moves.
// obsSegHit(a, b) gives the first thing a straight leg comes too near (or null); obsDetour(a, b) the points that take a leg round it:
// under a bridge between its piers, where the deck is high enough, and round a pier or a mark on the shorter side.
const HIND = {C:250, idx:null, key:'', list:[], stamp:0, ctx:null, br:new WeakMap()};
// how high the boat stands over the water (m; an estimate from her length: a 7 m snekke 2.5 m, a 15 m sjark 5 m, a 28 m ocean boat
// 10 m), and 1 m for the tide and the sea
const obsAir = () => Math.min(16, Math.max(2, (BOAT.len || 8) * 0.35)) + 1;
// how near a leg may pass (m): half the boat's beam and a margin, which grows with her length (13.11.2026, tests/allesteder.py: the 21 m
// coastal vessel on Autonav cut the turn under the bridge at Reine and by a mark at Bøvågen and struck them at 3-5 knots with 6 m; a long
// boat swings wider off the line in a turn)
const obsClr = () => HIND.clrMin ? (BOAT.beam || 3) / 2 + 2 : (BOAT.beam || 3) / 2 + Math.max(6, (BOAT.len || 8) * 0.5);
// a way round with the full margin first, and where there is none (a narrow lead with marks on both sides: Bøvågen, 13.11.2026, where the
// leg was left passing 4 m from a mark and she struck it), one with two metres beside her half beam; null when neither is found
function obsDetourAny(a, b){ let d = obsDetour(a, b); if (d) return d; HIND.clrMin = true; try { d = obsDetour(a, b); } finally { HIND.clrMin = false; } return d; }
const obsMarkR = {M:3, m:1, P:1, D:0.5, L:0.5, B:1, C:1, S:0.5, K:1.5, I:1, i:0.5, A:1, a:0.5, Y:1, y:0.5};   // (I, A, Y and their beacons: Ø13 K3, 01e-marks.js)
// a bridge's piers and deck pieces (as bridgeInto builds them), worked out once per bridge
function obsBridge(br){
  let o = HIND.br.get(br); if (o) return o;
  const cls = br[0], L = br[1], n = (br.length - 4) / 2, X = k => br[4 + k * 2], Z = k => br[5 + k * 2];
  const cum = [0]; for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(X(k) - X(k - 1), Z(k) - Z(k - 1)));
  const tot = cum[n - 1] || 1, clear = L < 60 ? 0 : clamp(tot * 0.036, 6, 42), wdt = [9, 8.5, 7.5, 7, 5][cls] || 7, hw = wdt / 2, gd = clamp(L / 450, 1.1, 2.6), gw = hw * 0.55;
  const under = s => 1 + clear * Math.pow(Math.sin(Math.PI * clamp(s / tot, 0, 1)), 0.55) - gd;
  o = {br, piers:[], deck:[], tot, hw, under};
  for (let k = 0; k < n - 1; k++){
    const ax = X(k), az = Z(k), bx = X(k + 1), bz = Z(k + 1), segL = Math.hypot(bx - ax, bz - az); if (segL < 0.01) continue;
    const ux = (bx - ax) / segL, uz = (bz - az) / segL;
    // the deck in pieces of 8 m or less, each with its lowest underside
    const st8 = Math.max(1, Math.ceil(segL / 8));
    for (let q = 0; q < st8; q++){ const u0 = q / st8, u1 = (q + 1) / st8, s0 = cum[k] + segL * u0, s1 = cum[k] + segL * u1;
      o.deck.push({t:2, ax:ax + (bx - ax) * u0, az:az + (bz - az) * u0, bx:ax + (bx - ax) * u1, bz:az + (bz - az) * u1, r:hw + 0.4, under:Math.min(under(s0), under(s1)), s0, s1, ux, uz, B:o}); }
    // the piers: in the 18 m step where the deck passes a multiple of 70 m (and the first), in its middle, 3 m along and pw across
    const st18 = Math.max(1, Math.ceil(segL / 18)), pw = Math.min(gw * 1.6, 5);
    for (let q = 0; q < st18; q++){ const u0 = q / st18, u1 = (q + 1) / st18, s0 = cum[k] + segL * u0, s1 = cum[k] + segL * u1;
      if (Math.floor(s0 / 70) !== Math.floor(s1 / 70) || (q === 0 && k === 0)) o.piers.push({t:0, x:ax + (bx - ax) * (u0 + u1) / 2, z:az + (bz - az) * (u0 + u1) / 2, r:Math.hypot(pw / 2, 1.5), s:(s0 + s1) / 2, ux, uz, B:o}); }
  }
  HIND.br.set(br, o); return o;
}
// A fixed sea mark on a bridge: a bridge's own lights and the signs of the passage under it (Puddefjordsbroen in Bergen has a red, a
// white and a green light on each side, ten metres apart across the passage). OpenStreetMap has them on the deck's edge, 1.5 to 3.5 m
// outside the deck as bridgeInto draws it, so they stood as posts in the water across the passage, and a boat on Autonav ran into them
// (tilbakemelding #6 fra testutgaven, 13.11.2026). One within 4 m of a deck's edge hangs on the bridge: no post in the water, nothing
// to steer round or run into (the bridge's piers and deck are), and its light hangs under the deck (06-buildings-lights.js lightY). The
// lighthouses and cairns stand on land and the buoys float; they stay. The marks stay for the fairway's sides (05e-sjovei.js
// farvWrongSide) and the chart
const MK_HUNG = new Set(['m', 'L', 'D', 'S', 'i', 'a', 'y']);   // (not P: a pile stands in the sea, by a bridge's pier too)
const markCell = mk => Math.floor(mk[0] * 1000 / HIND.C) * 1048576 + Math.floor(mk[1] * 1000 / HIND.C);
// the deck piece among L (a cell of the index; obsBridge's pieces have r = half the deck and 0.4 m) within 4 m of whose edge the point
// x, z (m) is, the highest where two are; or null
function deckAt(L, x, z){ let b = null; if (L) for (const o of L) if (o.t === 2 && obsDist(o, x, z, x, z) < 3.6 && (!b || o.under > b.under)) b = o; return b; }
const markOnDeck = (L, mk) => MK_HUNG.has(mk[2]) && !!deckAt(L, mk[0] * 1000, mk[1] * 1000);
const markOnBridge = mk => markOnDeck(obsIndex().get(markCell(mk)), mk);
// the deck piece a light at x, y (km) hangs on, or null where it is on no bridge
const bridgeDeckAt = (x, y) => deckAt(obsIndex().get(markCell([x, y])), x * 1000, y * 1000);
// everything there is now, in a grid of 250 m cells (each thing in every cell within 40 m of it)
function obsIndex(){
  const nk = S.naust && S.naust.o ? S.naust.o.join(',') : '', key = VEC.ver + '|' + MARKS.ver + '|' + nk + '|' + (RORBU.ver || 0) + '|' + FDOCK.ver;
  if (HIND.idx && HIND.key === key) return HIND.idx;
  const idx = new Map(), list = [], C = HIND.C, pad = 40;
  const put = o => { let x0, z0, x1, z1;
    if (o.t === 2){ x0 = Math.min(o.ax, o.bx) - o.r; x1 = Math.max(o.ax, o.bx) + o.r; z0 = Math.min(o.az, o.bz) - o.r; z1 = Math.max(o.az, o.bz) + o.r; }
    else { const e = o.t === 1 ? o.l + o.w : o.r; x0 = o.x - e; x1 = o.x + e; z0 = o.z - e; z1 = o.z + e; }
    o.id = list.length; o.st = 0; list.push(o);
    for (let j = Math.floor((z0 - pad) / C); j <= Math.floor((z1 + pad) / C); j++) for (let i = Math.floor((x0 - pad) / C); i <= Math.floor((x1 + pad) / C); i++){ const k = i * 1048576 + j; let a = idx.get(k); if (!a) idx.set(k, a = []); a.push(o); } };
  const bridges = BRIDGES.slice(); for (const t of VEC.tiles.values()) for (const q of t.bridges) bridges.push(q);
  for (const br of bridges){ if (bridgeUnderUnit(br)) continue; const o = obsBridge(br); o.piers.forEach(put); o.deck.forEach(put); }
  // (and the quay decks, made: a quay's line drawn as a 6 m deck on its land side, which stands in the water where the mapped quay is
  // off the coast's mask; the autonav routine 18.11.2026)
  const box = (q, why) => put({t:1, x:q.x, z:q.z, l:q.l / 2, w:q.w / 2, ux:Math.sin(q.ang), uz:Math.cos(q.ang), why:q.made ? 'quay' : why});
  for (const q of PIERBOX) box(q, 'pier');
  for (const t of VEC.tiles.values()) for (const q of vecDrawn(t).piers) box(q, 'pier');   // as the 3D view builds them (not under a harbour unit, vecDrawn)
  if (S.naust && S.naust.o){ const n = S.naust, f = {x:n.o[0] - n.u[0] * 0.5, z:n.o[1] - n.u[1] * 0.5}, nx = -n.u[1], nz = n.u[0];
    put({t:1, x:f.x - nx * 1.7, z:f.z - nz * 1.7, l:8.1, w:1.7, ux:n.u[0], uz:n.u[1], why:'naust'}); }
  // the quays of the rorbuer found so far (07d-rorbu.js), the deck behind the face
  for (const R of RORBUER) if (R.site){ const n = R.site, nx = -n.u[1], nz = n.u[0], w = RORBU.out / 2;
    put({t:1, x:n.o[0] - nx * w, z:n.o[1] - nz * w, l:RORBU.hl, w, ux:n.u[0], uz:n.u[1], why:'rorbu'}); }
  // the coast harbours' floating docks (05-vessels.js moorHarbour): the pontoons, and the gangway down to them (too low to pass under);
  // and the mooring buoys with the circle their boats swing on
  for (const t of VEC.tiles.values()) for (const h of t.npc || []){
    for (const d of h.docks || []){ const L = d.np * FDOCK.PL, sm = d.s0 + L / 2;
      put({t:1, x:d.o[0] + d.n[0] * sm, z:d.o[1] + d.n[1] * sm, l:L / 2, w:FDOCK.PW / 2, ux:d.n[0], uz:d.n[1], why:'dock'});
      put({t:1, x:d.o[0] + d.n[0] * d.s0 / 2, z:d.o[1] + d.n[1] * d.s0 / 2, l:d.s0 / 2, w:0.8, ux:d.n[0], uz:d.n[1], why:'dock'}); }
    if (h.moorVer === MOOR.ver) for (const b of h.boats) if (b.moored && b.moored.buoy) put({t:0, x:b.moored.buoy.x * 1000, z:b.moored.buoy.y * 1000, r:b.L + MOOR.PEN, why:'buoy'});
  }
  const mark = mk => { const r = obsMarkR[mk[2]]; if (r && !markOnDeck(idx.get(markCell(mk)), mk)) put({t:0, x:mk[0] * 1000, z:mk[1] * 1000, r, why:'mark'}); };
  SEAMARKS.marks.forEach(mark); for (const t of MARKS.tiles.values()) if (t) t.marks.forEach(mark);   // and the coast's (01e-marks.js)
  // the wind turbines that stand in the sea (the floating ones off Karmøy, a few on skerries; tools/vind/vind.py): the tower and its
  // foundation (view3d/17d-vind.js draws it 0.045 x the hub across at the foot, the ring 0.11)
  // (only where the map is in, mapReadyAt: isLand throws for a block not loaded and counts it as a miss; the index is built again as
  // the packs come, VEC.ver)
  if (VIND) for (const q of VIND.t){ const p = {x:q[0] / 1000, y:q[1] / 1000}; if (!mapReadyAt(p, 0)) continue; let land = true; try { land = isLand(p); } catch (e){ continue; } if (!land) put({t:0, x:q[0], z:q[1], r:Math.max(5, q[2] * 0.11), why:'turbine'}); }
  HIND.idx = idx; HIND.list = list; HIND.key = key; return idx;
}
// ===== WHAT IS FIXED IN THE SEA AT A POINT (the autonav routine, 18.11.2026, docs/planer/autonav-null-treff.md, pattern 1) =====
// Everything the 3D view builds in the water by a quay, in one index, so the way out from a berth and in to it (07-harbours.js
// berthBlocked), the boat model's contact and the safety net (16b-dyn.js dynObsNear) and the route's ends (obsCounts) see the same:
//  - Senja's piers, breakwaters and quay decks (PIERBOX, the made decks too)
//  - the coast's piers, breakwaters and quay decks from the vec packs (t.piers, the made decks too; not under a harbour unit, which
//    is drawn without them), a pier mapped as an area in its own outline (t.slabs) rather than the box round it, and a breakwater
//    mapped as an area as its outline (t.molos, closed)
//  - the coast harbours' floating docks and their gangways (h.docks), Father's naust's pile quay and the rorbuer's quays
// A harbour unit's block and fill are tested where they were (UNITA). Before, the model and the way to the berth saw only PIERBOX and
// the units, and Autonav's boat went through the rest without a knock: 83 % of the 211 touches by a quay in the hunt's first run.
// Boxes are as obsIndex's (t 1: middle x, z, half length l along ux, uz, half width w across), outlines t 3 (P, its bounds); in metres,
// per 100 m cell (each thing in every cell within 30 m of it). k: what it is, for the log (kai, brygge, molo, flytebrygge).
const FIX = {C:100, idx:null, key:'', pad:30, boats:null};
// A tile's piers, slabs and breakwaters as the 3D view builds them (view3d/04-vec-packs.js tileStatics, whose rules these are, but for
// the rorbu and naust sites, onSite, which only the view knows: their quays are in the index): not a pier or a slab under a harbour
// unit (any of a slab's corners within 3 m of one), not a box that reaches onto a unit's ground or into its basin, not a breakwater that
// does; and the piers and slabs that are floating docks (flyteTile) as floating docks. {piers, flo (the floating ones), slabs [[P, floating]], molos}
const VECDRAWN = new WeakMap();
// The floating docks and open piers where a trade place's boats lie and back out are taken away (Jonas 18.11.2026: «Om noen flytebrygger
// eller noe sånt ligger i veien så får du lov å fjerne dem»; the hunt: at Ålesund utstyrsbutikk and Dønna the point she backs to from the
// berth lay among the pontoons beside it, and there was no way out that did not go through them). The zone of a place: 20 m either side of
// its quay face and 30 m past its ends (she backs a length and a half along it), and of the way from the face to the harbour point. Not the
// quays, the breakwaters or the piers mapped as areas (often the quay itself); the 3D view leaves them out too (vecGone).
const PORTZ = {list:null, cells:null, r:20, past:30};
function portZones(){
  if (PORTZ.list) return PORTZ;
  const list = [], cells = new Map(), put = (z, x0, z0, x1, z1) => { for (let i = Math.floor((x0 - 60) / 1000); i <= Math.floor((x1 + 60) / 1000); i++) for (let j = Math.floor((z0 - 60) / 1000); j <= Math.floor((z1 + 60) / 1000); j++){ const k = i * 65536 + j; let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(z); } };
  for (const pt of PORTS){ if (pt.havOnly) continue; let f = null; try { f = quayFace(pt.id, 'main'); } catch (e){}
    const px = pt.p.x * 1000, pz = pt.p.y * 1000, segs = [];
    if (f){ const e = f.hl + PORTZ.past; segs.push([f.x - f.ux * e, f.z - f.uz * e, f.x + f.ux * e, f.z + f.uz * e], [px, pz, f.x, f.z]); }
    else if (pt.coast) segs.push([px, pz, pt.coast.x * 1000, pt.coast.y * 1000]);
    else segs.push([px, pz, px, pz]);
    for (const g of segs){ list.push(g); put(g, Math.min(g[0], g[2]), Math.min(g[1], g[3]), Math.max(g[0], g[2]), Math.max(g[1], g[3])); } }
  PORTZ.list = list; PORTZ.cells = cells; return PORTZ;
}
// whether x, z (m) is within the zone of a trade place
function inPortZone(x, z){
  const Z = portZones(), L = Z.cells.get(Math.floor(x / 1000) * 65536 + Math.floor(z / 1000)); if (!L) return false;
  for (const [ax, az, bx, bz] of L){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1) : 0; if (Math.hypot(x - ax - dx * u, z - az - dz * u) < Z.r) return true; }
  return false;
}
// a tile's floating docks and open piers taken away: {piers: Set of the pack's pier boxes (a pier whole, by its middle fm, where any of its
// boxes reaches into a zone), fd: Set of the floating docks' keys (flyteTile: Math.round(mx) + ':' + Math.round(mz)) one of whose lines does}
const VECGONE = new WeakMap();
function vecGone(t){
  let o = VECGONE.get(t); if (o) return o;
  const box = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (const s of [-1, -0.5, 0, 0.5, 1]) for (const k of [-1, 0, 1]) if (inPortZone(q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
  const fmK = q => q.fm ? Math.round(q.fm[0]) + ':' + Math.round(q.fm[1]) : null, hit = new Set(), piers = new Set(), fd = new Set();
  for (const q of t.piers || []) if (!q.made && !q.bw && !q.closed && fmK(q) && box(q)) hit.add(fmK(q));
  for (const q of t.piers || []) if (!q.made && !q.bw && !q.closed && hit.has(fmK(q))) piers.add(q);
  for (const d of flyteTile(t.tx, t.ty)) if (d.L.some(l => l.p.some(([x, z]) => inPortZone(x, z)))) fd.add(Math.round(d.mx) + ':' + Math.round(d.mz));
  // (and the piers that are those floating docks, by the pier's middle as the 3D view finds them, isF: they would else be drawn as piers)
  if (fd.size) for (const q of t.piers || []) if (q.fm){ const rx = Math.round(q.fm[0]), rz = Math.round(q.fm[1]); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (fd.has((rx + a) + ':' + (rz + b))) piers.add(q); }
  o = {piers, fd}; VECGONE.set(t, o); return o;
}
// a slab (an outline) that is one of the floating docks taken away
function vecGoneSlab(G, P){ if (!G.fd.size) return false; let cx = 0, cz = 0; for (const [x, z] of P){ cx += x; cz += z; } const rx = Math.round(cx / P.length), rz = Math.round(cz / P.length);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (G.fd.has((rx + a) + ':' + (rz + b))) return true; return false; }
function vecDrawn(t){
  let o = VECDRAWN.get(t); if (o && o.n === UNITA.length) return o;
  const T = MAPD.man ? MAPD.man.tile * 1000 : 50000, UN = UNITA.filter(U => U.o[0] > t.x0 - 300 && U.o[0] < t.x0 + T + 300 && U.o[1] > t.z0 - 300 && U.o[1] < t.z0 + T + 300);
  const under = (x, z) => unitCovers(x, z, 3), slabUnder = P => { let cx = 0, cz = 0; for (const [x, z] of P){ if (under(x, z)) return true; cx += x; cz += z; } return under(cx / P.length, cz / P.length); };
  const onU = (x, z) => UN.some(U => { const [lx, lz] = unitL(U, x, z), g = ugeo(U); return groundOut(U, lx, lz) <= 2 || (Math.abs(lx) <= g.basinX && lz >= 0 && lz <= g.basinZ); });
  const lineOnU = P => { for (let k = 0; k < P.length; k++){ const [ax, az] = P[k], [bx, bz] = P[Math.min(k + 1, P.length - 1)], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3)); for (let s = 0; s <= n; s++) if (onU(ax + (bx - ax) * s / n, az + (bz - az) * s / n)) return true; } return false; };
  const boxOnU = q => { const ax = Math.sin(q.ang), az = Math.cos(q.ang), nx = Math.cos(q.ang), nz = -Math.sin(q.ang); for (let s = -1; s <= 1; s += 0.25) for (const k of [-1, 0, 1]) if (onU(q.x + ax * s * q.l / 2 + nx * k * q.w / 2, q.z + az * s * q.l / 2 + nz * k * q.w / 2)) return true; return false; };
  const G = vecGone(t), FD = flyteTile(t.tx, t.ty).filter(d => !under(d.mx, d.mz) && !G.fd.has(Math.round(d.mx) + ':' + Math.round(d.mz))), FK = new Set(FD.map(d => Math.round(d.mx) + ':' + Math.round(d.mz)));
  const isF = (x, z) => { if (!FK.size) return false; const rx = Math.round(x), rz = Math.round(z); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (FK.has((rx + a) + ':' + (rz + b))) return true; return false; };
  const slabF = P => { let cx = 0, cz = 0; for (const [x, z] of P){ cx += x; cz += z; } return isF(cx / P.length, cz / P.length); };
  const flo = new Set(), piers = (t.piers || []).filter(q => { if (G.piers.has(q)) return false; if (q.fm && isF(q.fm[0], q.fm[1])){ flo.add(q); return !under(q.x, q.z); } return !under(q.x, q.z) && !(UN.length && boxOnU(q)); });
  o = {n:UNITA.length, piers, flo, slabs:(t.slabs || []).filter(P => P && P.length > 3 && !slabUnder(P) && !vecGoneSlab(G, P)).map(P => [P, slabF(P)]), molos:(t.molos || []).filter(P => !UN.length || !lineOnU(P))};
  VECDRAWN.set(t, o); return o;
}
function fixIndex(){
  const nk = S.naust && S.naust.o ? S.naust.o.join(',') : '', key = VEC.ver + '|' + nk + '|' + (RORBU.ver || 0) + '|' + FDOCK.ver;
  if (FIX.idx && FIX.key === key) return FIX.idx;
  const idx = new Map(), C = FIX.C, pad = FIX.pad;
  const put = (o, x0, z0, x1, z1) => { for (let j = Math.floor((z0 - pad) / C); j <= Math.floor((z1 + pad) / C); j++) for (let i = Math.floor((x0 - pad) / C); i <= Math.floor((x1 + pad) / C); i++){ const k = i * 1048576 + j; let a = idx.get(k); if (!a) idx.set(k, a = []); a.push(o); } };
  const box = (x, z, l, w, ux, uz, k, made) => { const o = {t:1, x, z, l, w, ux, uz, k, made:!!made}, e = l + w; put(o, x - e, z - e, x + e, z + e); };
  const poly = (P, k) => { let x0 = 1e18, z0 = 1e18, x1 = -1e18, z1 = -1e18; for (const [x, z] of P){ x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } put({t:3, P, x0, z0, x1, z1, k}, x0, z0, x1, z1); };
  const pier = q => box(q.x, q.z, q.l / 2, q.w / 2, Math.sin(q.ang), Math.cos(q.ang), q.made ? 'kai' : q.bw ? 'molo' : 'brygge', q.made);
  for (const q of PIERBOX) pier(q);
  for (const t of VEC.tiles.values()){ const V = vecDrawn(t);
    for (const q of V.piers){ if (q.closed && !q.bw && !q.made && t.slabs && t.slabs[q.src]) continue; if (V.flo.has(q)) box(q.x, q.z, q.l / 2, q.w / 2, Math.sin(q.ang), Math.cos(q.ang), 'flytebrygge'); else pier(q); }   // (an area pier: its outline, below)
    for (const [P, f] of V.slabs) poly(P, f ? 'flytebrygge' : 'brygge');
    for (const P of V.molos) if (P && P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1) poly(P, 'molo');
    for (const h of t.npc || []) for (const d of h.docks || []){ const L = d.np * FDOCK.PL, sm = d.s0 + L / 2;
      box(d.o[0] + d.n[0] * sm, d.o[1] + d.n[1] * sm, L / 2, FDOCK.PW / 2, d.n[0], d.n[1], 'flytebrygge');
      box(d.o[0] + d.n[0] * d.s0 / 2, d.o[1] + d.n[1] * d.s0 / 2, d.s0 / 2, 0.8, d.n[0], d.n[1], 'flytebrygge'); }
  }
  if (S.naust && S.naust.o){ const n = S.naust, f = {x:n.o[0] - n.u[0] * 0.5, z:n.o[1] - n.u[1] * 0.5}, nx = -n.u[1], nz = n.u[0];
    box(f.x - nx * 1.7, f.z - nz * 1.7, 8.1, 1.7, n.u[0], n.u[1], 'kai'); }
  for (const R of RORBUER) if (R.site){ const n = R.site, nx = -n.u[1], nz = n.u[0], w = RORBU.out / 2;
    box(n.o[0] - nx * w, n.o[1] - nz * w, RORBU.hl, w, n.u[0], n.u[1], 'kai'); }
  FIX.idx = idx; FIX.key = key; return idx;
}
// the things within R m of x, z (metres; R up to FIX.pad, more with a wider look over the cells)
function fixNear(x, z, R = 0){
  const idx = fixIndex(), C = FIX.C, out = [], seen = new Set(), e = Math.max(0, R - FIX.pad);
  for (let i = Math.floor((x - e) / C); i <= Math.floor((x + e) / C); i++) for (let j = Math.floor((z - e) / C); j <= Math.floor((z + e) / C); j++){ const L = idx.get(i * 1048576 + j); if (L) for (const o of L) if (!seen.has(o)){ seen.add(o); out.push(o); } }
  return out;
}
// the vessels lying still near x, z (metres) now (05e-sjovei.js sjvNear: at a quay, at anchor, a ferry waiting at hers), as boxes of their
// hulls, and the circles the boats on mooring buoys swing on; kept for the game minute, per 1 km cell (those within 1.5 km of its middle:
// the way to a berth asks thousands of points, and a cache by the last point asked was looked up afresh across the search)
function fixBoats(x, z){
  const ci = Math.floor(x / 1000), cj = Math.floor(z / 1000), key = ci * 65536 + cj;
  // (the vessels within AIS range of her, npcStates, once a game minute: those at a quay or at anchor, as sjvNear sorts them, and any
  // not under way; not sjvNear itself, which keeps the 300 m round her for her own look-out)
  if (!FIX.boats || FIX.boats.t !== S.t){ const all = [];
    try { if (typeof npcStates === 'function') for (const n of npcStates(S.t / 60)){ if (!n.p || n.hidden || n.rs || n.kv) continue;
      const cls = n.cls || (typeof colregCls === 'function' ? colregCls(n) : ''); if (!(cls === 'moor' || cls === 'anch' || !(n.v > 0.3))) continue;
      const L = n.L || 10; all.push({t:1, x:n.p.x * 1000, z:n.p.y * 1000, l:L / 2, w:(n.B || L / 3) / 2, ux:Math.sin(n.hd || 0), uz:-Math.cos(n.hd || 0), k:'båt', boat:true}); } } catch (e){}
    FIX.boats = {t:S.t, m:new Map(), all}; }
  let list = FIX.boats.m.get(key); if (list) return list;
  const X = (ci + 0.5) * 1000, Z = (cj + 0.5) * 1000, R = 1500;
  list = FIX.boats.all.filter(o => Math.hypot(o.x - X, o.z - Z) < R);
  // (and a boat on a mooring buoy (05-vessels.js moorHarbour): the circle she swings on, as obsIndex has it; she lies where the wind puts her)
  try { for (const t of vecTilesIn(X - R, Z - R, X + R, Z + R)) for (const h of t.npc || []) if (h.moorVer === MOOR.ver) for (const q of h.boats) if (q.moored && q.moored.buoy){ const bx = q.moored.buoy.x * 1000, bz = q.moored.buoy.y * 1000;
    if (Math.hypot(bx - X, bz - Z) < R) list.push({t:0, x:bx, z:bz, r:q.L + MOOR.PEN, k:'båt', boat:true}); } } catch (e){}
  FIX.boats.m.set(key, list); return list;
}
// how far x, z (metres) is outside a thing (negative inside it: how deep), and the way out (unit vector east, south) from the nearest edge
function fixDist(o, x, z){
  if (o.t === 0){ const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz) || 1e-6; return {d:d - o.r, ox:dx / d, oz:dz / d}; }
  if (o.t === 3){ if (x < o.x0 - 60 || x > o.x1 + 60 || z < o.z0 - 60 || z > o.z1 + 60) return {d:60, ox:0, oz:0};
    const P = o.P; let m = 1e18, bx = 0, bz = 0;
    for (let i = 1; i < P.length; i++){ const ax = P[i - 1][0], az = P[i - 1][1], dx = P[i][0] - ax, dz = P[i][1] - az, L2 = dx * dx + dz * dz, u = L2 ? clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1) : 0, qx = ax + dx * u, qz = az + dz * u, d = Math.hypot(x - qx, z - qz); if (d < m){ m = d; bx = qx; bz = qz; } }
    const ins = inQuad(P, x, z), s = m > 1e-6 ? 1 / m : 0; return ins ? {d:-m, ox:(bx - x) * s, oz:(bz - z) * s} : {d:m, ox:(x - bx) * s, oz:(z - bz) * s}; }
  const dx = x - o.x, dz = z - o.z, p = dx * o.ux + dz * o.uz, q = -dx * o.uz + dz * o.ux, ep = Math.abs(p) - o.l, eq = Math.abs(q) - o.w;
  if (ep <= 0 && eq <= 0) return ep > eq ? {d:ep, ox:o.ux * Math.sign(p || 1), oz:o.uz * Math.sign(p || 1)} : {d:eq, ox:-o.uz * Math.sign(q || 1), oz:o.ux * Math.sign(q || 1)};
  const cp = Math.max(0, ep) * Math.sign(p), cq = Math.max(0, eq) * Math.sign(q), d = Math.hypot(cp, cq) || 1;
  return {d:Math.hypot(Math.max(0, ep), Math.max(0, eq)), ox:(cp * o.ux - cq * o.uz) / d, oz:(cp * o.uz + cq * o.ux) / d};
}
// the distance (m, up to cap) from x, z (metres) to a bridge's pier or a piece of its deck lower than the boat (obsIndex, obsAir): the
// way among the piers did not know them, and the hands took kyst15 under a deck 1-2 m lower than her by Namsos verft, the hunt 18.11.2026
function fixBridgeD(x, z, cap){
  let d = cap; const idx = obsIndex(), C = HIND.C, air = obsAir();
  for (let i = Math.floor((x - cap) / C); i <= Math.floor((x + cap) / C); i++) for (let j = Math.floor((z - cap) / C); j <= Math.floor((z + cap) / C); j++){ const L = idx.get(i * 1048576 + j); if (L) for (const o of L){
    if (!(o.t === 2 ? o.under < air : o.t === 0 && o.B)) continue; const e = obsDist(o, x, z, x, z); if (e < d) d = e; } }
  return d;
}
// whether x, z (metres) is within m of anything fixed in the sea (boats: and of a vessel lying still; and of a bridge too low for her)
function fixBlocked(x, z, m, boats){
  for (const o of fixNear(x, z, m)) if (fixDist(o, x, z).d < m) return true;
  if (fixBridgeD(x, z, m) < m) return true;
  if (boats) for (const o of fixBoats(x, z)){ const e = o.t === 0 ? o.r : o.l + o.w; if (Math.abs(o.x - x) < e + m && Math.abs(o.z - z) < e + m && fixDist(o, x, z).d < m) return true; }
  return false;
}
// ---- the way through a harbour among the piers: the line's last few hundred metres in to a harbour and first out of it ----
// The route is found over the 25 m mask and keeps its legs clear of what obsIndex has, with a smaller margin near its ends; among the
// piers, floating docks and boats lying at a quay by a harbour point that left the line through them (the hunt: Dønna, where the point
// lies in a basin behind a pier the route came straight over, Varangerbotn among the boats on their moorings, Son verft among the
// fingers of an area pier). fixLegOk: a leg (km) clear of land, of everything fixed in the sea and of the vessels lying still by m
// metres, every 3 m; fixWay: a way from a to b over a 4 m grid round them (at most FIXW.R m beyond either), pulled tight, or null. The
// ends themselves may lie within the margin of their own quay: the cells within the margin and a cell of them are open if they are
// water and not inside anything. The depth is asked outside the harbours only (in them it is dredged, as groundCheck has it).
const FIXW = {cell:4, R:100, max:40000};
function fixLegOk(a, b, m){
  const was = FIX.useBoats; FIX.useBoats = true;
  try { const n = Math.max(1, Math.ceil(dist(a, b) / 0.003)), r = m / 1000;
    for (let i = 1; i < n; i++){ const p = {x:a.x + (b.x - a.x) * i / n, y:a.y + (b.y - a.y) * i / n}; if (berthBlocked(p, m)) return false;
      // (the shore within the margin, across the leg on either side: her side scraped it where the middle passed)
      const dx = b.y - a.y, dy = a.x - b.x, L = Math.hypot(dx, dy) || 1; if (isLand({x:p.x + dx / L * r, y:p.y + dy / L * r}) || isLand({x:p.x - dx / L * r, y:p.y - dy / L * r})) return false; }
    return !coastSegHit(a, b); }
  finally { FIX.useBoats = was; }
}
// fixWay(a, b, ms, ok): the margins ms tried in turn, widest first, over one grid: the first way found that ok(way) accepts (the corners
// clear, fixCornersOk), else the first found at all; {W, m} or null. The grid is worked out once for all of them (the autonav routine
// 18.11.2026: a search per margin, each asking the land, the things and the units at every cell, held the game for 0.6-7 s as she left the
// quay): the land at each cell's middle and the distance to it over the grid (a chamfer transform; less half a cell's diagonal), the
// distance to the nearest thing fixed in the sea, vessel lying still or harbour unit (looked up as a cell is first reached), and the depth
function fixWay(a, b, ms, ok){
  const was = FIX.useBoats; FIX.useBoats = true;
  try { return fixWay0(a, b, Array.isArray(ms) ? ms : [ms], ok); } finally { FIX.useBoats = was; }
}
function fixWay0(a, b, ms, ok){
  const C = FIXW.cell, c = C / 1000, R = FIXW.R / 1000, x0 = Math.min(a.x, b.x) - R, y0 = Math.min(a.y, b.y) - R, nx = Math.ceil((Math.max(a.x, b.x) + R - x0) / c), ny = Math.ceil((Math.max(a.y, b.y) + R - y0) / c), N = nx * ny;
  if (N > FIXW.max) return null;   // (the land is asked at every cell first: 40 000 cells are a third of a second)
  const ctr = (i, j) => ({x:x0 + (i + 0.5) * c, y:y0 + (j + 0.5) * c}), ci = p => [clamp(Math.floor((p.x - x0) / c), 0, nx - 1), clamp(Math.floor((p.y - y0) / c), 0, ny - 1)];
  const tl = tideCD(S.t / 60), dr = (BOAT.draft || 1) + 0.3, Mx = Math.max(...ms) + 1;
  // the land and the distance to it (m, between cells' middles; 1e9 none)
  const landD = new Float32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){ let L = true; try { L = isLand(ctr(i, j)); } catch (e){} landD[j * nx + i] = L ? 0 : 1e9; }
  const d1 = C, d2 = C * Math.SQRT2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){ const k = j * nx + i; let v = landD[k]; if (!v) continue;
    if (i > 0) v = Math.min(v, landD[k - 1] + d1); if (j > 0){ v = Math.min(v, landD[k - nx] + d1); if (i > 0) v = Math.min(v, landD[k - nx - 1] + d2); if (i < nx - 1) v = Math.min(v, landD[k - nx + 1] + d2); } landD[k] = v; }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--){ const k = j * nx + i; let v = landD[k]; if (!v) continue;
    if (i < nx - 1) v = Math.min(v, landD[k + 1] + d1); if (j < ny - 1){ v = Math.min(v, landD[k + nx] + d1); if (i < nx - 1) v = Math.min(v, landD[k + nx + 1] + d2); if (i > 0) v = Math.min(v, landD[k + nx - 1] + d2); } landD[k] = v; }
  // the distance to the nearest thing (capped at Mx), and the depth, as a cell is first reached
  const thD = new Float32Array(N).fill(-1), dp = new Int8Array(N);
  const things = k => { if (thD[k] >= 0) return thD[k]; const i = k % nx, j = (k - i) / nx, q = ctr(i, j), x = q.x * 1000, z = q.y * 1000; let d = Mx;
    try { for (const o of fixNear(x, z, Mx)){ const f = fixDist(o, x, z).d; if (f < d) d = f; }
      for (const o of fixBoats(x, z)){ const e = o.t === 0 ? o.r : o.l + o.w; if (Math.abs(o.x - x) < e + Mx && Math.abs(o.z - z) < e + Mx){ const f = fixDist(o, x, z).d; if (f < d) d = f; } }
      for (const U of unitsAt(x, z)){ const [lx, lz] = unitL(U, x, z), g = ugeo(U), f = Math.hypot(Math.max(0, Math.abs(lx) - g.E), Math.max(0, lz, -g.B - lz)); if (f < d) d = f; }
      d = Math.min(d, fixBridgeD(x, z, Mx)); } catch (e){ d = -1e9; }
    return thD[k] = Math.max(-1e9, d); };
  const deep = k => { if (dp[k]) return dp[k] === 1; const i = k % nx, q = ctr(i, (k - i) / nx); let v; try { v = inHarbour(q) || depthF(q) + tl >= dr; } catch (e){ v = false; } dp[k] = v ? 1 : 2; return v; };
  const [ia, ja] = ci(a), [ib, jb] = ci(b), ka = ja * nx + ia, kb = jb * nx + ib;
  const RING = [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]), hw = C * 0.71;
  const run = m => {
    const near = (m + C) / 1000, ring = new Map();
    // (the land within m: by the grid where it is sure, else by eight points round the cell's middle at m, so a gap a cell wider than she
    // needs is not shut by the grid's coarseness)
    const landOk = k => { if (landD[k] - hw >= m) return true; if (landD[k] + hw < m) return false; let v = ring.get(k); if (v === undefined){ const i = k % nx, q = ctr(i, (k - i) / nx); v = true;
      for (const [cx, cz] of RING){ let L = true; try { L = isLand({x:q.x + cx * m / 1000, y:q.y + cz * m / 1000}); } catch (e){} if (L){ v = false; break; } } ring.set(k, v); } return v; };
    // (the ends may lie within the margin of their own quay: there water and outside everything is enough)
    const open = k => { const i = k % nx, q = ctr(i, (k - i) / nx), e = dist(q, a) < near || dist(q, b) < near; return e ? landD[k] > 0 && things(k) >= 0.5 && deep(k) : things(k) >= m && landOk(k) && deep(k); };
    const prev = new Int32Array(N).fill(-2), Q = [ka]; prev[ka] = -1; let found = -1;
    for (let h = 0; h < Q.length && h < FIXW.max; h++){
      const k = Q[h], i = k % nx, j = (k - i) / nx; if (Math.abs(i - ib) <= 1 && Math.abs(j - jb) <= 1){ found = k; break; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++){ if (!di && !dj) continue; const I = i + di, J = j + dj; if (I < 0 || J < 0 || I >= nx || J >= ny) continue; const K = J * nx + I;
        if (prev[K] !== -2) continue; if (!open(K) || (di && dj && !(open(j * nx + I) && open(J * nx + i)))) continue; prev[K] = k; Q.push(K); }
    }
    if (found < 0) return null;
    const cells = []; for (let k = found; k >= 0; k = prev[k]){ const i = k % nx; cells.push(ctr(i, (k - i) / nx)); }
    cells.reverse(); cells[0] = a; cells.push(b);
    // pulled tight: from each point the furthest one a clear leg reaches, every 2 m over the cells it crosses
    const clr = (p, q) => { const n = Math.max(1, Math.ceil(dist(p, q) / 0.002)); for (let i = 1; i < n; i++){ const [I, J] = ci({x:p.x + (q.x - p.x) * i / n, y:p.y + (q.y - p.y) * i / n}); if (!open(J * nx + I)) return false; } return !coastSegHit(p, q); };
    const out = [cells[0]];
    for (let i = 0; i < cells.length - 1;){ let j = cells.length - 1; while (j > i + 1 && !clr(cells[i], cells[j])) j--; out.push(cells[j]); i = j; }
    return out; };
  let first = null;
  for (const m of ms){ const W = run(m); if (!W) continue; if (!first) first = {W, m}; if (!ok || ok(W)) return {W, m}; }
  return first;
}
// the corners of a way (km points): where it turns by th, her ends swing out off the legs by up to half her length times sin th as the
// hands turn her on it (they turn her on her middle); nothing fixed, no vessel lying still and no land within that and half her beam and
// half a metre of the corner (the 15 m boat's bow swung onto the breakwater's head at Ålesund, the line 5 m off it). The ends are left
// (her berth, the harbour point)
function fixCornersOk(W, L, B){
  const was = FIX.useBoats; FIX.useBoats = true;
  try { for (let i = 1; i < W.length - 1; i++){ const a = W[i - 1], v = W[i], c = W[i + 1], h1 = Math.atan2(v.x - a.x, a.y - v.y), h2 = Math.atan2(c.x - v.x, v.y - c.y);
      let th = Math.abs(h2 - h1); if (th > Math.PI) th = 2 * Math.PI - th; if (th < 0.2) continue;
      const r = B / 2 + 0.5 + L / 2 * Math.min(1, Math.sin(Math.min(th, Math.PI / 2)));
      if (berthBlocked(v, r)) return false;
      for (let k = 0; k < 8; k++) if (isLand({x:v.x + Math.cos(k * Math.PI / 4) * r / 1000, y:v.y + Math.sin(k * Math.PI / 4) * r / 1000})) return false; }
    return true; } finally { FIX.useBoats = was; }
}
// the distance (m) from the leg a-b (metres) to a thing, 0 inside it
function obsDist(o, ax, az, bx, bz){
  const ps = (px, pz, x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz, u = L2 ? clamp(((px - x0) * dx + (pz - z0) * dz) / L2, 0, 1) : 0; return Math.hypot(px - x0 - dx * u, pz - z0 - dz * u); };
  const cross = (x0, z0, x1, z1, x2, z2, x3, z3) => { const d = (x1 - x0) * (z3 - z2) - (z1 - z0) * (x3 - x2); if (!d) return false; const s = ((x2 - x0) * (z3 - z2) - (z2 - z0) * (x3 - x2)) / d, t = ((x2 - x0) * (z1 - z0) - (z2 - z0) * (x1 - x0)) / d; return s >= 0 && s <= 1 && t >= 0 && t <= 1; };
  if (o.t === 0) return Math.max(0, ps(o.x, o.z, ax, az, bx, bz) - o.r);
  if (o.t === 2){ if (cross(ax, az, bx, bz, o.ax, o.az, o.bx, o.bz)) return 0;
    return Math.max(0, Math.min(ps(o.ax, o.az, ax, az, bx, bz), ps(o.bx, o.bz, ax, az, bx, bz), ps(ax, az, o.ax, o.az, o.bx, o.bz), ps(bx, bz, o.ax, o.az, o.bx, o.bz)) - o.r); }
  // a box: in its frame, the leg against the rectangle (a segment and a convex shape are nearest at an end or a corner, if they do not cross)
  const loc = (x, z) => [(x - o.x) * o.ux + (z - o.z) * o.uz, -(x - o.x) * o.uz + (z - o.z) * o.ux], [pa, qa] = loc(ax, az), [pb, qb] = loc(bx, bz), l = o.l, w = o.w;
  const inR = (p, q) => Math.abs(p) <= l && Math.abs(q) <= w; if (inR(pa, qa) || inR(pb, qb)) return 0;
  const K = [[-l, -w], [l, -w], [l, w], [-l, w]];
  for (let i = 0; i < 4; i++){ const c = K[i], d = K[(i + 1) % 4]; if (cross(pa, qa, pb, qb, c[0], c[1], d[0], d[1])) return 0; }
  const out = (p, q) => Math.hypot(Math.max(0, Math.abs(p) - l), Math.max(0, Math.abs(q) - w));
  return Math.min(out(pa, qa), out(pb, qb), ...K.map(c => ps(c[0], c[1], pa, qa, pb, qb)));
}
// the things that count for this leg: a bridge's deck only where it is lower than the boat; not her own berth at the ends of the
// route being planned (a boat lying at a pier, a route that ends at the naust's quay): what the end itself lies within obsOwn of
// (before 18.11.2026 everything whose middle was within 40 m of an end, and the hunt found the route's last leg through the piers by
// the harbour point: Dønna, Sleneset, the autonav routine)
const obsOwn = () => (BOAT.beam || 3) / 2 + 2;
function obsCounts(o, air){
  if (o.t === 2 && o.under >= air) return false;
  const c = HIND.ctx; if (c && c.free){ const r = obsOwn(); for (const p of c.free) if (obsDist(o, p[0], p[1], p[0], p[1]) < r) return false; }
  return true;
}
// near the ends (within HIND.ctx.freeR of one), what counts is passed at half her beam and two metres, not the full margin: the way
// in to a quay among piers is narrower than the way along a lead
function obsNearEnd(o){ const c = HIND.ctx; if (c && c.free) for (const p of c.free) if (obsDist(o, p[0], p[1], p[0], p[1]) < c.freeR) return true; return false; }
// the first thing (nearest a) that the leg a-b (km) passes within clr metres of, or null
function obsSegHit(a, b, clr){
  const idx = obsIndex(); if (!idx.size) return null;
  clr = clr === undefined ? obsClr() : clr; const air = obsAir(), C = HIND.C, ax = a.x * 1000, az = a.y * 1000, bx = b.x * 1000, bz = b.y * 1000, st = ++HIND.stamp;
  let best = null, bt = Infinity;
  // the cells the leg passes through (each thing is in every cell within 40 m of it, and clr is less)
  let i = Math.floor(ax / C), j = Math.floor(az / C); const i1 = Math.floor(bx / C), j1 = Math.floor(bz / C), dx = bx - ax, dz = bz - az;
  const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1, tdx = dx ? Math.abs(C / dx) : Infinity, tdz = dz ? Math.abs(C / dz) : Infinity;
  let tx = dx ? ((dx > 0 ? (i + 1) * C : i * C) - ax) / dx : Infinity, tz = dz ? ((dz > 0 ? (j + 1) * C : j * C) - az) / dz : Infinity;
  for (let guard = 0; guard < 100000; guard++){
    const L = idx.get(i * 1048576 + j);
    if (L) for (const o of L){ if (o.st === st) continue; o.st = st; if (!obsCounts(o, air)) continue;
      if (obsDist(o, ax, az, bx, bz) < (obsNearEnd(o) ? Math.min(clr, obsOwn()) : clr)){ const cx = o.t === 2 ? (o.ax + o.bx) / 2 : o.x, cz = o.t === 2 ? (o.az + o.bz) / 2 : o.z, u = (dx * (cx - ax) + dz * (cz - az)) / (dx * dx + dz * dz || 1); if (u < bt){ bt = u; best = o; } } }
    if (best && Math.min(tx, tz) > bt + 0.05) break;
    if ((i === i1 && j === j1) || Math.min(tx, tz) > 1) break;
    if (tx < tz){ i += si; tx += tdx; } else { j += sj; tz += tdz; }
  }
  return best;
}
const obsClear = (a, b, clr) => !obsSegHit(a, b, clr);
// a new leg of a way round: no land, nothing too near, and no more dangerous than the leg it stands in for (ref, legHazard of it): as
// deep, and clear of rocks, or where that leg passed rocks within 25 m, at least 15 m from them or as far as that leg (groundCheck runs
// aground within 12 m; trip2's way back under Gisundbrua passed 7 m nearer a rock than the drawn leg and ran onto it, 05.10.2026)
// (a rock inside a harbour is not counted, as the search and the legs' check do not count it, the harbours being dredged (11-route.js
// leiaRocks, leiaLegFail): the way round a mark by Tustna took its leave to pass 9 m from two rocks outside the harbour from a rock 1 m
// off the last leg inside it, and groundCheck stops her for those, tests/allpairs.py 16.11.2026)
function obsRock(a, b){
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-12; let m = Infinity;
  for (const q of rocksAlong(a, b, 0.03)){ if (inHarbour({x:q[0], y:q[1]})) continue;
    const u = clamp(((q[0] - a.x) * dx + (q[1] - a.y) * dy) / L2, 0, 1); m = Math.min(m, Math.hypot(a.x + dx * u - q[0], a.y + dy * u - q[1])); }
  return m;
}
function obsSafe(a, b, ref){
  // (never within 13 m of a rock, whatever the leg it stands in for: groundCheck stops her for one within 12 m of her way ahead, and the
  // search from there, to the way round's point by the rock, finds none. Tussøy utstyrsbutikk, 15.11.2026, tests/allesteder.py: the way
  // round a mark passed 10 m from a rock that legHazard's count did not have)
  // (where the leg it stands in for has rocks near it already, no nearer than that leg, below: trip2's drawn route under Gisundbrua, obstest)
  if (!(ref && ref.rocks) && rockOnLeg(a, b, 0.013)) return false;
  // (Autonav's own route, HIND.auto: never a rock within 12 m ahead outside a harbour, as groundCheck stops her for one, whatever the leg
  // it stands in for had: by Tustna that leg ran into the harbour, where no rock is asked, and the way round stepped out of it, 9 m from
  // two, tests/allpairs.py 16.11.2026. A drawn route keeps the rule above, trip2 under Gisundbrua)
  if (HIND.auto && !inHarbour(b) && rockOnLeg(a, b, 0.0125)) return false;
  const sd = safeDepth(), h = legHazardMemo(a, b, sd);
  // (the second try round a thing, obsDetourAny: a leg deep enough for the boat and 8 m from rocks will do, where none as good as the
  // drawn leg goes round it; that leg ran over the mark; 13 m from rocks, above)
  if (HIND.clrMin) return h.minD >= Math.min(sd, leiaLim()) - 0.2;
  if (h.minD < Math.min(sd, ref ? ref.minD : sd) - 0.2) return false;
  if (h.rocks === 0) return true;
  if (!ref || !ref.rocks) return false;
  if (ref.rock === undefined) ref.rock = obsRock(ref.a, ref.b);
  return obsRock(a, b) >= Math.min(0.015, ref.rock - 0.001);
}
const obsLegOk = (a, b, ref) => legClear(a, b) && obsClear(a, b) && obsSafe(a, b, ref);
// the ways round the thing o that a-b hits: lists of points (km), shortest first
function obsWays(o, a, b){
  const clr = obsClr(), ax = a.x * 1000, az = a.y * 1000, bx = b.x * 1000, bz = b.y * 1000, out = [], km = (x, z) => ({x:x / 1000, y:z / 1000});
  if (o.B){
    // under the bridge: in the middle of a gap between its piers where the deck is high enough, from a point off it on each side
    const B = o.B, air = obsAir(), need = clr + 4, D = Math.max(45, (BOAT.len || 8) * 1.5 + 20), gaps = [];
    let s0 = null; const cut = [];
    for (const d of B.deck){ if (d.under >= air){ if (s0 === null) s0 = d.s0; } else if (s0 !== null){ cut.push([s0, d.s0]); s0 = null; } }
    if (s0 !== null) cut.push([s0, B.tot]);
    // and the piers of a bridge beside it, put onto this one's length: a road's two carriageways are often two bridges side by side,
    // each with its piers every 70 m from its own end (bridgeInto), so the middle of a gap in one stood behind a pier of the other, and
    // the way under was never clear (Puddefjordsbroen in Bergen, 13 m apart: Autonav sailed on straight at a pier and a light,
    // tilbakemelding #6 fra testutgaven)
    const side = [], idx = obsIndex(), C = HIND.C, ox = o.t === 2 ? (o.ax + o.bx) / 2 : o.x, oz = o.t === 2 ? (o.az + o.bz) / 2 : o.z, seen = new Set();
    for (let i = Math.floor(ox / C) - 1; i <= Math.floor(ox / C) + 1; i++) for (let j = Math.floor(oz / C) - 1; j <= Math.floor(oz / C) + 1; j++) for (const q of idx.get(i * 1048576 + j) || []){
      if (q.t !== 0 || !q.B || q.B === B || seen.has(q)) continue; seen.add(q); let bd = Infinity, bs = 0, bp = 0;
      for (const d of B.deck){ const L = Math.hypot(d.bx - d.ax, d.bz - d.az) || 1, u = clamp(((q.x - d.ax) * d.ux + (q.z - d.az) * d.uz) / L, 0, 1), dd = Math.hypot(q.x - d.ax - (d.bx - d.ax) * u, q.z - d.az - (d.bz - d.az) * u); if (dd < bd){ bd = dd; bs = d.s0 + (d.s1 - d.s0) * u; bp = Math.abs(q.ux * d.ux + q.uz * d.uz); } }
      if (bd < 30 && bp > 0.94) side.push(bs); }   // (alongside: within 30 m of it and no more than 20° off its line)
    for (const [c0, c1] of cut){ let p = c0; const ps = B.piers.map(q => q.s).concat(side).filter(s => s > c0 && s < c1).sort((x, y) => x - y);
      for (const s of ps.concat([c1])){ const e0 = p + (p === c0 ? need : 1.5 + need), e1 = s - (s === c1 ? need : 1.5 + need); if (e1 > e0) gaps.push((e0 + e1) / 2); p = s; } }
    const lx = bx - ax, lz = bz - az, LL = Math.hypot(lx, lz) || 1;
    for (const s of gaps){
      const d = B.deck.find(q => s >= q.s0 && s <= q.s1); if (!d) continue;
      const u = (s - d.s0) / Math.max(0.01, d.s1 - d.s0), mx = d.ax + (d.bx - d.ax) * u, mz = d.az + (d.bz - d.az) * u, nx = -d.uz, nz = d.ux, sd = (ax - mx) * nx + (az - mz) * nz >= 0 ? 1 : -1;
      const p1 = km(mx + nx * D * sd, mz + nz * D * sd), p2 = km(mx - nx * D * sd, mz - nz * D * sd);
      out.push([p1, p2]);
      // and back onto the leg itself beyond the bridge (and off it before), so the way on is the leg's own: as far along as the gap's
      // middle is off the leg two and a half times, so she steps over to it at 20 degrees or less (Karmsundbrua, 14.11.2026, steg 126:
      // the 21 m coastal vessel was given a way out 24 m to the side and back over 25 m along, turned at right angles, and backed and
      // filled before the bridge for good)
      const off = Math.abs((mx - ax) * lz - (mz - az) * lx) / LL;
      const u0 = ((mx - ax) * lx + (mz - az) * lz) / (LL * LL), du = (D + 25 + 2.5 * off) / LL, on = t => km(ax + lx * t, az + lz * t);
      if (u0 + du < 0.97) out.push([p1, p2, on(u0 + du)]);
      if (u0 + du < 0.97 && u0 - du > 0.03) out.push([on(u0 - du), p1, p2, on(u0 + du)]);
    }
  } else if (o.t === 0){
    // round a mark or a pile: on either side of the leg, off it by its size and the margin
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, R = o.r + clr + 8;
    for (const sd of [1, -1]) out.push([km(o.x + nx * R * sd, o.z + nz * R * sd)]);
  } else {
    // round a box: by its corners, a little out
    const e = clr + 8, K = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [o.x + o.ux * p * (o.l + e) - o.uz * q * (o.w + e), o.z + o.uz * p * (o.l + e) + o.ux * q * (o.w + e)]);
    for (let i = 0; i < 4; i++){ out.push([km(K[i][0], K[i][1])]); out.push([km(K[i][0], K[i][1]), km(K[(i + 1) % 4][0], K[(i + 1) % 4][1])]); out.push([km(K[(i + 1) % 4][0], K[(i + 1) % 4][1]), km(K[i][0], K[i][1])]); }
  }
  const len = w => { let s = dist(a, w[0]); for (let i = 1; i < w.length; i++) s += dist(w[i - 1], w[i]); return s + dist(w[w.length - 1], b); };
  // a way she cannot turn through comes last: a corner needs her radius times tan(half the turn) of each leg beside it, and a leg
  // between two corners both their shares (obsTurnable; a sharper way is still better than none)
  return out.filter(w => w.every(p => !isLand(p))).map(w => [w, len(w) + (obsTurnable(a, w, b) ? 0 : 1e3)]).sort((x, y) => x[1] - y[1]).slice(0, 9).map(x => x[0]);
}
// can she turn through a, the points w, b (and pre, the point she comes to a from, when there is one): a corner needs of each leg beside
// it her radius times tan(half the turn) and half her length for the wheel to go over, and a leg between two corners both their shares
// (her radius taken as two and a half times her length: the 21 m coastal vessel turns on 47-54 m, dynCal)
function obsTurnable(a, w, b, pre){
  const Lk = (BOAT.len || 8) / 1000, R = 2.5 * Lk, q = (pre ? [pre] : []).concat([a], w, [b]); let prev = 0;
  for (let i = 1; i < q.length; i++){ const l = dist(q[i - 1], q[i]); let nxt = 0;
    if (i < q.length - 1){ const ux = q[i].x - q[i - 1].x, uy = q[i].y - q[i - 1].y, vx = q[i + 1].x - q[i].x, vy = q[i + 1].y - q[i].y, n = Math.hypot(ux, uy) * Math.hypot(vx, vy);
      const th = n > 0 ? Math.min(2.6, Math.acos(clamp((ux * vx + uy * vy) / n, -1, 1))) : 0; nxt = th > 0.15 ? R * Math.tan(th / 2) + 0.5 * Lk : 0; }
    if (prev + nxt > l + 1e-6 && !(pre && i === 1)) return false; prev = nxt; }
  return true;
}
// the points to put between a and b so every leg keeps clear of land and of the things (depth: how many things in a row it goes
// round); [] when a-b is clear already, null when no way was found
function obsDetour(a, b, depth = 3, ref){
  if (!legClear(a, b) || (ref && !obsSafe(a, b, ref))) return null;   // the legs it makes are no worse than the one given (the route's)
  if (!ref){ const h = legHazardMemo(a, b, safeDepth()); ref = {minD:h.minD, rocks:h.rocks, a, b}; }
  const o = obsSegHit(a, b); if (!o) return [];
  if (depth <= 0) return null;
  for (const w of obsWays(o, a, b)){
    let ok = true; for (let i = 1; i < w.length && ok; i++) ok = obsLegOk(w[i - 1], w[i], ref); if (!ok) continue;
    const left = obsDetour(a, w[0], depth - 1, ref); if (!left) continue;
    const right = obsDetour(w[w.length - 1], b, depth - 1, ref); if (!right) continue;
    return left.concat(w, right);
  }
  return null;
}
// a route's waypoints (after a) with the detours put in; a leg with no way round is left as it was
// (a way round she cannot turn through, obsTurnable, where the route's own points stand close by the thing: the way round from the point
// before to the one after instead, skipping up to two plain points (not a stop), and no worse than the legs it stands in for, as deep
// and as far from rocks as the worst of them. Bokn and Kopervik, 14.11.2026, tests/allesteder.py, steg 126: the route's points 100 m
// apart with a mark or a bridge's pier between them, and the way round a zigzag of 35-40 m legs that the 21 m coastal vessel ran
// through wide, onto the mark)
function obsRoute(a, wps, auto){
  const was = HIND.auto; HIND.auto = !!auto;
  try { return obsRoute0(a, wps); } finally { HIND.auto = was; }
}
function obsRoute0(a, wps){
  const out = []; let p = a;
  for (let i = 0; i < wps.length; i++){ const q = wps[i];
    if (obsClear(p, q)){ out.push(q); p = q; continue; }
    const pre = out.length > 1 ? out[out.length - 2] : out.length ? a : null;
    let d = obsDetourAny(p, q), k = i;
    if (!d || !obsTurnable(p, d, q, pre)) for (let j = i + 1; j <= Math.min(i + 2, wps.length - 1) && !wpStop(wps[j - 1]); j++){
      const sd = safeDepth(), legs = [[p, wps[i]]]; for (let m = i + 1; m <= j; m++) legs.push([wps[m - 1], wps[m]]);
      const ref = {minD:Infinity, rocks:0, rock:Infinity, a:p, b:wps[j]};
      for (const [u, v] of legs){ const h = legHazardMemo(u, v, sd); ref.minD = Math.min(ref.minD, h.minD); if (h.rocks){ ref.rocks = Math.max(ref.rocks, h.rocks); ref.rock = Math.min(ref.rock, obsRock(u, v)); } }
      if (!ref.rocks) ref.rock = undefined;
      let d2 = null; try { d2 = obsDetour(p, wps[j], 3, ref); if (!d2){ HIND.clrMin = true; try { d2 = obsDetour(p, wps[j], 3, ref); } finally { HIND.clrMin = false; } } } catch (e){ d2 = null; }
      if (d2 && obsTurnable(p, d2, wps[j], pre)){ d = d2; k = j; break; } }
    if (d) for (const x of d) out.push(Object.assign({}, x, {obs:true}));
    out.push(wps[k]); p = wps[k]; i = k;
  }
  return out;
}
// the coast's packs along a way (km points), and the tiles decoded: a route is checked against what is there, so the packs come
// first (at most ms milliseconds; a build without them, the artifact's, has Senja's embedded things only)
async function obsLoad(pts, ms = 4000){
  if (!MAPD.man || !pts.length) return;
  const T = MAPD.man.tile, want = new Set();
  for (let i = 0; i < pts.length; i++){ const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], n = Math.max(1, Math.ceil(dist(p, q) / (T / 2)));
    for (let u = 0; u <= n; u++){ const x = p.x + (q.x - p.x) * u / n, y = p.y + (q.y - p.y) * u / n; want.add(Math.floor(x / T) + ':' + Math.floor(y / T)); } }
  const tiles = [...want].map(k => k.split(':').map(Number)).filter(([tx, ty]) => vecHas(tx, ty)); if (!tiles.length) return;
  for (const [tx, ty] of tiles) vecWant(tx * T, ty * T, (tx + 1) * T - 0.001, (ty + 1) * T - 0.001);
  const t0 = performance.now();
  while (performance.now() - t0 < ms){
    if (tiles.every(([tx, ty]) => vecTile(tx, ty))) return;
    await new Promise(r => setTimeout(r, 60));
  }
}
// while a boat sails: the leg she is on checked against the things there now (the packs near her come as she does), once per
// waypoint and change of the packs; a way round goes in before the next waypoint. Any route, drawn or found.
function obsSail(pl, b){
  if (pl.idx >= pl.wps.length) return;
  const key = () => pl.idx + '|' + pl.wps.length + '|' + VEC.ver + '|' + MARKS.ver + '|' + (S.naust && S.naust.o ? S.naust.o.join(',') : '') + '|' + (RORBU.ver || 0) + '|' + (BOAT.len || 0);
  if (pl.obsK === key()) return; pl.obsK = key();
  const w = pl.wps[pl.idx], ctx = HIND.ctx; HIND.ctx = {free:[[b.pos.x * 1000, b.pos.y * 1000]].concat(w.port ? [[w.x * 1000, w.y * 1000]] : []), freeR:40};
  try {
    if (obsClear(b.pos, w)) return;
    const d = obsDetourAny(b.pos, w); if (!d || !d.length) return;
    pl.wps.splice(pl.idx, 0, ...d.map(p => ({x:p.x, y:p.y, port:null, fish:0, obs:true}))); if (pl.unsafe) pl.unsafe.splice(pl.idx, 0, ...d.map(() => false)); pl.obsK = key();
  } finally { HIND.ctx = ctx; }
}
