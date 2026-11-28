// ===== BANEN: THE WAY AS A TRAJECTORY SHE CAN SAIL (Autonav 2.0 F2, steg 142, 24.11.2026) =====
// Jonas 23.11.2026: «rene og naturlige ruter uten omveier … like presist for den minste båten som for det største fartøyet», and
// «konsistent mellom sanntid og bakgrunns-/fraværssimulering». Today's route is a line of points without a width: the boat model
// cuts its corners on purpose, the minute step jumps from point to point, and neither is what was checked. A bane is what she is
// sent along: straight pieces and arcs of a radius she can turn (her own, 16b-dyn.js dynCal), the speed she has at each metre of it
// (slowing for a turn and for the end by her own stopping distance), and a check of her whole hull swept along every piece of it
// against the one map of what she can sail over and under (17-farbar.js farbSweep). The planner (17c-plan.js) finds the points; the
// minute step follows the bane by the clock when the plan has one (baneSail: one call in 05-vessels.js sail); the boat model follows
// it from F3. Nothing of the old Autonav is changed: a plan without a bane sails as before.
// Metres on the grid (x east, z south), psi from north clockwise, speeds m/s, as 17-farbar.js.
const BANE = {snap:25, chord:0.12, ds:5, vEnd:0.5, vMin:0.3, own:1.3, piece:20, vTight:1.5, vSlow:1.5, vRev:1.0, vSide:0.3, OFF:[0, Math.PI, Math.PI / 2, -Math.PI / 2]};
// what a bane needs of her: R the radius she turns, vmax the speed she is sent at (m/s), stop(v) her stopping distance from v
function baneBoat(type, kn){ const k = type || S.boat.type, V = VESSELS[k] || VESSELS.skiff, cal = dynCal(k);
  return {type:k, L:V.len, R:clamp(V.turnR || 2 * V.len, 1.2 * V.len, 2 * V.len), vmax:Math.max(1, (kn || V.vcruise || 6) * KN_MS), stop:v => dynStopDist(cal, v)}; }
// The bane through the points [[X, Z] ...]: each inner corner rounded by an arc of her radius, or of what the two legs have room for
// (half of the shorter), where she then goes slower (o.start false: she has her speed from the first metre); a point's third number is the most the arc at it may have (the planner sets it
// where her own radius has no room), its fourth the most speed she may have on the leg to it, its fifth in the arc at it (where the
// water is too shallow for her squat at more). o: {R, vmax, stop, end (true: she stops at the last point)}. Q: the points it was built from.
// A point's sixth number says how she lies on the leg that ends at it (G2, 27.11.2026: by a quay she backs, turns and is warped off
// it, and her hull is then not along the way she goes): its two low bits 0 ahead, 1 astern (her heading the other way from the
// way she goes, BANE.vRev at most), 2 and 3 sideways (her heading the way she goes turned a quarter to starboard or to port,
// BANE.vSide at most); 4: the corner's radius (the third number) stands as it is given, the legs were made for it (the harbour
// search's corners lie a cut from each other, and half of the shorter leg would halve them). Where she changes between two of
// these, and at both ends of a sideways leg, there is no arc: she stops there (B.cusp: the places, metres along).
// P: the pieces, each {k:'l', ax, az, bx, bz, psi} or {k:'a', cx, cz, r, a0, da}, with off (her heading less the way she goes), len, s0 (metres along from the start) and vl
// (the most she has there); len; S, V, T: the speed and the time at every BANE.ds metres along
function baneBuild(pts, o){ const Q = [pts[0]]; for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - Q[Q.length - 1][0], pts[i][1] - Q[Q.length - 1][1]) > 0.5) Q.push(pts[i]);
  const n = Q.length, P = [], cut = new Array(n).fill(0), rad = new Array(n).fill(0), phi = new Array(n).fill(0), sg = new Array(n).fill(0); let s = 0;
  const md = i => (Q[i][5] || 0) & 3, stopAt = i => md(i) !== md(i + 1) || md(i) >= 2, cusp = [], vM = m => m === 1 ? BANE.vRev : m >= 2 ? BANE.vSide : Infinity;
  const leg = i => Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]), U = i => { const l = leg(i); return [(Q[i][0] - Q[i - 1][0]) / l, (Q[i][1] - Q[i - 1][1]) / l]; };
  for (let i = 1; i < n - 1; i++){ const u1 = U(i), u2 = U(i + 1), f = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))); if (f < 0.02 || stopAt(i)) continue;
    let t = Math.min(o.R, Q[i][2] > 0 ? Q[i][2] : Infinity) * Math.tan(Math.min(f, 3.0) / 2); const lim = (Q[i][5] || 0) & 4 ? Math.min(leg(i), leg(i + 1)) : Math.min(leg(i), leg(i + 1)) / 2; if (t > lim) t = lim; cut[i] = t; rad[i] = t / Math.tan(Math.min(f, 3.0) / 2); phi[i] = f; sg[i] = u1[0] * u2[1] - u1[1] * u2[0] >= 0 ? 1 : -1; }
  let prev = Q[0];
  for (let i = 1; i < n; i++){ const u1 = U(i), e = i < n - 1 ? [Q[i][0] - u1[0] * cut[i], Q[i][1] - u1[1] * cut[i]] : Q[i], l = Math.hypot(e[0] - prev[0], e[1] - prev[1]);
    if (l > 1e-6){ P.push({k:'l', ax:prev[0], az:prev[1], bx:e[0], bz:e[1], psi:Math.atan2(u1[0], -u1[1]) + BANE.OFF[md(i)], off:BANE.OFF[md(i)], len:l, s0:s, c:i, vl:Math.min(o.vmax, vM(md(i)), Q[i][3] > 0 ? Q[i][3] : Infinity)}); s += l; }
    prev = e; if (i < n - 1 && stopAt(i)) cusp.push(s);
    if (i < n - 1 && cut[i] > 0 && rad[i] > 0.05){ const r = rad[i], g = sg[i], cx = e[0] - u1[1] * g * r, cz = e[1] + u1[0] * g * r, a0 = Math.atan2(e[1] - cz, e[0] - cx), da = g * phi[i], l2 = r * phi[i];
      P.push({k:'a', cx, cz, r, a0, da, off:BANE.OFF[md(i)], len:l2, s0:s, c:i, vl:Math.min(vM(md(i)), r >= o.R * 0.98 ? o.vmax : (r < o.R * 0.5 ? Math.min(o.vmax, BANE.vTight) : o.vmax * r / o.R), Q[i][3] > 0 ? Q[i][3] : Infinity, Q[i + 1][3] > 0 ? Q[i + 1][3] : Infinity, Q[i][4] > 0 ? Q[i][4] : Infinity)}); s += l2; prev = [cx + r * Math.cos(a0 + da), cz + r * Math.sin(a0 + da)]; } }
  const B = {P, len:s, o, Q, cusp, S:null, V:null, T:null}; baneSpeed(B); return B; }
// where she is s metres along it: {X, Z, psi, i (the piece)}
function baneAt(B, s){ const P = B.P; if (!P.length) return null; s = Math.max(0, Math.min(B.len, s)); let i = 0, lo = 0, hi = P.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (P[m].s0 <= s) lo = m; else hi = m - 1; } i = lo;
  const p = P[i], u = p.len > 0 ? Math.min(1, (s - p.s0) / p.len) : 0;
  if (p.k === 'l') return {X:p.ax + (p.bx - p.ax) * u, Z:p.az + (p.bz - p.az) * u, psi:p.psi, i};
  const a = p.a0 + p.da * u, g = p.da >= 0 ? 1 : -1; return {X:p.cx + p.r * Math.cos(a), Z:p.cz + p.r * Math.sin(a), psi:Math.atan2(-Math.sin(a) * g, -Math.cos(a) * g) + (p.off || 0), i}; }
// the speed she can have d metres before a place where she is to have v1: her stopping distances say how fast she slows
function baneBefore(o, v1, d){ let lo = v1, hi = o.vmax; if (hi <= lo) return lo; const s1 = o.stop(v1); if (o.stop(hi) - s1 <= d) return hi;
  for (let k = 0; k < 14; k++){ const m = (lo + hi) / 2; if (o.stop(m) - s1 <= d) lo = m; else hi = m; } return lo; }
// the speed and the time along it: at most each piece's own, and never more than she can slow from before a slower piece or the end
function baneSpeed(B){ const o = B.o, ds = BANE.ds, n = Math.max(1, Math.ceil(B.len / ds)), S = new Float32Array(n + 1), V = new Float32Array(n + 1), T = new Float32Array(n + 1); 
  for (let k = 0; k <= n; k++){ S[k] = Math.min(B.len, k * ds); V[k] = o.vmax; }
  // (each piece's limit at every place within it and at the two on either side, so a piece shorter than the step has its own too)
  for (const p of B.P){ const k0 = Math.max(0, Math.floor(p.s0 / ds)), k1 = Math.min(n, Math.ceil((p.s0 + p.len) / ds)); for (let k = k0; k <= k1; k++) if (p.vl < V[k]) V[k] = p.vl; }
  if (o.end) V[n] = Math.min(V[n], BANE.vEnd);
  for (const c of B.cusp || []){ const k = c / ds; for (const q of [Math.floor(k), Math.ceil(k)]) if (q >= 0 && q <= n) V[q] = Math.min(V[q], BANE.vEnd); }   // (she stops where she changes between ahead, astern and sideways)
  // (from the berth she gathers way as she would lose it: the speed she has d metres on is the one she could have stopped from in d)
  if (o.start !== false){ V[0] = Math.min(V[0], BANE.vEnd); for (let k = 0; k < n; k++) V[k + 1] = Math.min(V[k + 1], baneBefore(o, V[k], S[k + 1] - S[k])); }
  for (let k = n - 1; k >= 0; k--) V[k] = Math.min(V[k], baneBefore(o, V[k + 1], S[k + 1] - S[k]));
  for (let k = 0; k < n; k++) T[k + 1] = T[k] + (S[k + 1] - S[k]) / Math.max(BANE.vMin, (V[k] + V[k + 1]) / 2);
  B.S = S; B.V = V; B.T = T; B.time = T[n]; return B; }
// her speed s metres along it, and how far along she is t seconds after the start
function baneV(B, s){ const k = Math.min(B.S.length - 2, Math.max(0, Math.floor(s / BANE.ds))), u = Math.min(1, Math.max(0, (s - B.S[k]) / Math.max(1e-6, B.S[k + 1] - B.S[k]))); return B.V[k] + (B.V[k + 1] - B.V[k]) * u; }
function baneS(B, t){ const T = B.T, n = T.length - 1; if (t <= 0) return 0; if (t >= T[n]) return B.len; let lo = 0, hi = n; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  return B.S[lo] + (B.S[hi] - B.S[lo]) * (t - T[lo]) / Math.max(1e-6, T[hi] - T[lo]); }
// the bane as points for a plan (km): the ends of the straight pieces, and an arc as chords of BANE.chord radians
// (each with s, how far along the bane it lies)
function banePts(B){ const out = [], put = (X, Z, s) => out.push({x:X / 1000, y:Z / 1000, s});
  for (const p of B.P){ if (p.k === 'l') put(p.bx, p.bz, p.s0 + p.len); else { const m = Math.max(1, Math.ceil(Math.abs(p.da) / BANE.chord)); for (let j = 1; j <= m; j++) put(p.cx + p.r * Math.cos(p.a0 + p.da * j / m), p.cz + p.r * Math.sin(p.a0 + p.da * j / m), p.s0 + p.len * j / m); } }
  return out; }
// Her hull swept along the whole of it (17-farbar.js farbSweep), a straight piece in parts of BANE.piece metres and an arc as chords
// with her heading turning along it: null when it is free, else the first touch {what, id, x, z, px, pz (where she stood), s (metres
// along), i (the piece)}. opt as farbSweep's. baneFriG is the same in slices (a yield between the parts); memo: a Map of the pieces
// already found free, so a bane built again with one corner changed sweeps only what is new. opt.sqV(v): her squat at the speed v,
// asked for each part at the most she has on it (else opt.squat the whole way)
function* baneFriG(B, boat, H, opt, memo){
  for (let i = 0; i < B.P.length; i++){ const p = B.P[i], key = memo ? (p.k === 'l' ? 'l' + p.ax.toFixed(2) + ',' + p.az.toFixed(2) + ',' + p.bx.toFixed(2) + ',' + p.bz.toFixed(2) : 'a' + p.cx.toFixed(2) + ',' + p.cz.toFixed(2) + ',' + p.r.toFixed(2) + ',' + p.a0.toFixed(4) + ',' + p.da.toFixed(4)) + '|' + p.vl.toFixed(2) : '';   // (the speed too: her squat is asked at it)
    if (memo && memo.has(key)) continue;
    const sq = opt && opt.sqV, at = (a, b) => sq ? Object.assign({}, opt, {squat:sq(Math.max(baneV(B, a), baneV(B, b), baneV(B, (a + b) / 2)))}) : opt;
    if (p.k === 'l'){ const m = Math.max(1, Math.ceil(p.len / BANE.piece));
      for (let j = 0; j < m; j++){ const u0 = j / m, u1 = (j + 1) / m, t = farbSweep({X:p.ax + (p.bx - p.ax) * u0, Z:p.az + (p.bz - p.az) * u0, psi:p.psi}, {X:p.ax + (p.bx - p.ax) * u1, Z:p.az + (p.bz - p.az) * u1, psi:p.psi}, boat, H, at(p.s0 + p.len * u0, p.s0 + p.len * u1)); if (t) return Object.assign({s:p.s0 + p.len * u0, i}, t); yield; } }
    else { const m = Math.max(1, Math.ceil(Math.abs(p.da) / BANE.chord)); let q0 = baneAt(B, p.s0 + 1e-6);
      for (let j = 1; j <= m; j++){ const q1 = baneAt(B, Math.min(B.len, p.s0 + p.len * j / m - (j === m ? 1e-6 : 0))), t = farbSweep(q0, q1, boat, H, at(p.s0 + p.len * (j - 1) / m, p.s0 + p.len * j / m)); if (t) return Object.assign({s:p.s0 + p.len * (j - 1) / m, i}, t); q0 = q1; yield; } }
    if (memo) memo.set(key, 1); }
  return null; }
function baneFri(B, boat, H, opt){ const g = baneFriG(B, boat, H, opt); let r; while (!(r = g.next()).done); return r.value; }
// A plan that follows banes has pl.b2: {len (how many points the plan had when it was made), legs:[{i0, n, q, kn, end, type}], at, s}.
// A leg is the plan's points i0 .. i0 + n - 1 (the bane's own, banePts) and what the bane is built again from: q its points (with
// each corner's radius), kn the speed and the boat's type. The bane itself (typed arrays) is never in the plan, which is saved:
// it is built when it is asked for and kept by the leg (BANE.of). at, s: the leg she is on and how far along it
BANE.of = new WeakMap();
// (a leg is the plan's still only while the point it ends in is where the bane ends: a plan whose rest was changed for as many
// points as it had, the operations plan, kept its count and was followed along the old bane, the control 28.11.2026)
function baneLeg(pl){ const Y = pl.b2; if (!Y || Y.len !== pl.wps.length) return null;
  for (const g of Y.legs) if (pl.idx >= g.i0 && pl.idx < g.i0 + g.n){ const w = pl.wps[g.i0 + g.n - 1], e = g.q[g.q.length - 1]; return w && Math.abs(w.x * 1000 - e[0]) < 0.5 && Math.abs(w.y * 1000 - e[1]) < 0.5 ? g : null; }
  return null; }
// a way out of the plan's banes: its points stand, and are sailed from where she is as before the banes
function baneDrop(pl, g){ const Y = pl.b2, i = Y ? Y.legs.indexOf(g) : -1; if (i >= 0){ Y.legs.splice(i, 1); Y.at = -1; } }
// whether she is not where a way that starts at sea starts (g.sea: after a stop on the fishing ground, where she drifts): more than BANE.snap m off
function baneAdrift(pl, g, x, z){ return !!g.sea && pl.idx === g.i0 && pl.b2.at !== g.i0 && Math.hypot(x - g.q[0][0], z - g.q[0][1]) > BANE.snap; }
function baneOf(g){ let Y = BANE.of.get(g); if (Y) return Y.B ? Y : null;
  try { const B = baneBuild(g.q.map(q => q.slice()), Object.assign(baneBoat(g.type, g.kn), {end:g.end !== false})), at = banePts(B).map(q => q.s); Y = at.length === g.n ? {B, at} : {}; } catch (e){ Y = {}; }
  BANE.of.set(g, Y); return Y.B ? Y : null; }
// The minute step along a plan with a bane (05-vessels.js sail calls this before its own way from point to point): she goes as far
// along the bane as its own speeds take her in the minute, never faster than the minute's own speed (the weather, the plan's
// setting), and comes to the plan's points as she passes them (arrive: the quay, the logbook). left0: km she may go this minute.
// False where the plan has no bane for where she is (it then sails as before)
// The most she may have s metres along a plan's bane besides the bane's own speed (m/s): the plan's setting, what the sea lets her
// make (speedCap), the speed limit where she is (05e-sjovei.js fartKn) and 5 knots within 250 m of a harbour, as the minute step
// has had them (05-vessels.js sailV). Asked by where she is, so the minute step and the boat model's tick get the same, and she is
// at the same place at the same time whichever moves her (the minute's own ramp of sailV made the time away take twice the bane's
// time, the bench, steg 142 point 5). Kept for 15 m of way and the game minute
function baneCap(pl, B, s){ const R = pl.b2, C = R.cap; if (C && C.t === S.t && Math.abs(s - C.s) < 15) return C.v;
  const q = baneAt(B, s), p = {x:q.X / 1000, y:q.Z / 1000}, H = S.t / 60; let kn = pl.speed > 0 ? pl.speed : 99;
  try { kn = Math.min(kn, speedCap(hsAt(p, H), seaDirF(p, H, q.psi))); } catch (e){}
  try { const l = fartKn(p, H); if (l > 0) kn = Math.min(kn, l); } catch (e){}
  try { for (const P of PORTS) if (Math.abs(P.p.x - p.x) < 0.25 && Math.abs(P.p.y - p.y) < 0.25 && Math.hypot(P.p.x - p.x, P.p.y - p.y) < 0.25){ kn = Math.min(kn, 5); break; } } catch (e){}
  R.cap = {s:+s.toFixed(1), t:S.t, v:+(Math.max(0.5, kn) * KN_MS).toFixed(3)}; return R.cap.v; }
function baneSail(pl, b, left0, W){ const g = baneLeg(pl), Y = g && baneOf(g); if (!Y) return false; const B = Y.B, R = pl.b2;
  // (she has drifted from where the way starts and nobody is looking, so no new way is searched, 17d-styr.js styrLeg: the way's points
  // are sailed from where she is as before the banes, not her set back on its start across whatever lies between)
  if (baneAdrift(pl, g, b.pos.x * 1000, b.pos.y * 1000)){ baneDrop(pl, g); return false; }
  // (how far along she is, from the plan's own place where something else has moved her on: the boat model while the game was open, a jump)
  if (R.at !== g.i0 || R.i !== pl.idx){ R.at = g.i0; R.s = pl.idx > g.i0 ? Y.at[pl.idx - g.i0 - 1] : 0; }
  const s0 = R.s; let s = s0, t = 0; const cap = left0 * 1000;
  while (t < 60 && s < B.len && s - s0 < cap){ const v = Math.max(BANE.vMin, Math.min(baneV(B, s), baneCap(pl, B, s))), dt = Math.min(1, 60 - t); s = Math.min(B.len, s + v * dt, s0 + cap); t += dt; }
  const q = baneAt(B, s);
  // (sea ice on the minute's way stops her as it does on any trip: the planner's map knows the land and the water, not the ice)
  if (typeof groundCheck === 'function'){ let gp = null; try { gp = groundCheck(b.pos, {x:q.X / 1000, y:q.Z / 1000}, 0); } catch (e){} if (gp && gp.ice){ sailStop(pl, b, iceWhy(gp)); return true; } }
  R.s = s; b.heading = q.psi; b.v = (s - s0) / 60 / KN_MS; if (W !== undefined) try { fuelUse(b, fuelLph(b.v, W) / 60); } catch (e){}   // (the diesel by the speed she had, not the minute's own before the bane)
  if (banePass(pl, b, g, Y, s)) return true;
  R.i = pl.idx; b.pos = {x:q.X / 1000, y:q.Z / 1000}; return true; }
// the plan's points she has come to s metres along the leg's bane: the bane's own are passed without a line in the log (one in the
// trail every 250 m), a stop is come to as on any trip (arrive). True where the trip ended or the plan changed there
function banePass(pl, b, g, Y, s){ const R = pl.b2;
  while (pl.idx < g.i0 + g.n && Y.at[pl.idx - g.i0] <= s + 1e-3){ const w = pl.wps[pl.idx], i = pl.idx;
    if (w.bane){ pl.idx++; const l = S.trail[S.trail.length - 1]; if (!l || Math.hypot(l.x - w.x, l.y - w.y) > 0.25) S.trail.push({x:w.x, y:w.y, port:null}); continue; }
    b.pos = {x:w.x, y:w.y}; R.i = pl.idx + 1; if (arrive(w) || S.plan !== pl || pl.idx === i) return true; }
  return false; }
// The boat model's tick along a plan with a bane (16b-dyn.js dynTick asks this before its own steering; Jonas 27.11.2026, choice 10:
// «Ført langs banen»): while the game is looked at she is carried along the bane as the minute step carries her when it is not,
// to the same place by the same clock: where she is, her heading and her speed are the bane's, dt seconds on (game seconds). What
// was checked free is what is sailed; the wind and the sea move her in the waves (the view's) and never off the bane. d: the model's
// state (16b-dyn.js dynState), written as the views read it: X, Y, psi, and her way through the water ahead (u, under 0 astern) and
// to the side (v). o.hold: the watch has her stopped (she keeps her place). False where the plan has no bane for where she is
function baneTick(pl, b, d, dt, o){ const g = baneLeg(pl), Y = g && baneOf(g); if (!Y) return false; const B = Y.B, R = pl.b2;
  if (R.at !== g.i0 || R.i !== pl.idx){ R.at = g.i0; R.s = pl.idx > g.i0 ? Y.at[pl.idx - g.i0 - 1] : 0; }
  const s0 = R.s; let s = s0; if (!(o && o.hold)) for (let t = dt; t > 1e-9 && s < B.len;){ const h = Math.min(0.25, t), v = Math.max(BANE.vMin, Math.min(baneV(B, s), baneCap(pl, B, s), o && o.v > 0 ? o.v : 1e9)); s = Math.min(B.len, s + v * h); t -= h; }   // (o: the watch's word, 17d-styr.js styrWatch: lie still, or no faster than o.v)
  const q0 = baneAt(B, s0), q = baneAt(B, s), vx = dt > 0 ? (q.X - q0.X) / dt : 0, vz = dt > 0 ? (q.Z - q0.Z) / dt : 0, sn = Math.sin(q.psi), cs = Math.cos(q.psi);
  d.X = q.X; d.Y = q.Z; d.psi = ((q.psi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); d.u = vx * sn - vz * cs; d.v = vx * cs + vz * sn; d.r = 0; d.wall = Date.now();
  R.s = s; b.heading = d.psi; b.v = Math.hypot(vx, vz) / KN_MS; b.pos = {x:q.X / 1000, y:q.Z / 1000};
  if (banePass(pl, b, g, Y, s)) return true;
  R.i = pl.idx; b.pos = {x:q.X / 1000, y:q.Z / 1000}; return true; }
