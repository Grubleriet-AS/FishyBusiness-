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
const BANE = {chord:0.12, ds:5, vEnd:0.5, vMin:0.3, own:1.3, piece:20, vTight:1.5};
// what a bane needs of her: R the radius she turns, vmax the speed she is sent at (m/s), stop(v) her stopping distance from v
function baneBoat(type, kn){ const k = type || S.boat.type, V = VESSELS[k] || VESSELS.skiff, cal = dynCal(k);
  return {type:k, L:V.len, R:clamp(V.turnR || 2 * V.len, 1.2 * V.len, 2 * V.len), vmax:Math.max(1, (kn || V.vcruise || 6) * KN_MS), stop:v => dynStopDist(cal, v)}; }
// The bane through the points [[X, Z] ...]: each inner corner rounded by an arc of her radius, or of what the two legs have room for
// (half of the shorter), where she then goes slower; a point's third number is the most the arc at it may have (the planner sets it
// where her own radius has no room). o: {R, vmax, stop, end (true: she stops at the last point)}. Q: the points it was built from.
// P: the pieces, each {k:'l', ax, az, bx, bz, psi} or {k:'a', cx, cz, r, a0, da}, with len, s0 (metres along from the start) and vl
// (the most she has there); len; S, V, T: the speed and the time at every BANE.ds metres along
function baneBuild(pts, o){ const Q = [pts[0]]; for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - Q[Q.length - 1][0], pts[i][1] - Q[Q.length - 1][1]) > 0.5) Q.push(pts[i]);
  const n = Q.length, P = [], cut = new Array(n).fill(0), rad = new Array(n).fill(0), phi = new Array(n).fill(0), sg = new Array(n).fill(0); let s = 0;
  const leg = i => Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]), U = i => { const l = leg(i); return [(Q[i][0] - Q[i - 1][0]) / l, (Q[i][1] - Q[i - 1][1]) / l]; };
  for (let i = 1; i < n - 1; i++){ const u1 = U(i), u2 = U(i + 1), f = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))); if (f < 0.02) continue;
    let t = Math.min(o.R, Q[i][2] > 0 ? Q[i][2] : Infinity) * Math.tan(Math.min(f, 3.0) / 2); const lim = Math.min(leg(i), leg(i + 1)) / 2; if (t > lim) t = lim; cut[i] = t; rad[i] = t / Math.tan(Math.min(f, 3.0) / 2); phi[i] = f; sg[i] = u1[0] * u2[1] - u1[1] * u2[0] >= 0 ? 1 : -1; }
  let prev = Q[0];
  for (let i = 1; i < n; i++){ const u1 = U(i), e = i < n - 1 ? [Q[i][0] - u1[0] * cut[i], Q[i][1] - u1[1] * cut[i]] : Q[i], l = Math.hypot(e[0] - prev[0], e[1] - prev[1]);
    if (l > 1e-6){ P.push({k:'l', ax:prev[0], az:prev[1], bx:e[0], bz:e[1], psi:Math.atan2(u1[0], -u1[1]), len:l, s0:s, vl:o.vmax}); s += l; }
    prev = e;
    if (i < n - 1 && cut[i] > 0 && rad[i] > 0.05){ const r = rad[i], g = sg[i], cx = e[0] - u1[1] * g * r, cz = e[1] + u1[0] * g * r, a0 = Math.atan2(e[1] - cz, e[0] - cx), da = g * phi[i], l2 = r * phi[i];
      P.push({k:'a', cx, cz, r, a0, da, len:l2, s0:s, c:i, vl:r >= o.R * 0.98 ? o.vmax : Math.min(o.vmax * Math.max(0.3, r / o.R), r < o.R * 0.5 ? Math.max(BANE.vTight, o.vmax * 0.3) : o.vmax)}); s += l2; prev = [cx + r * Math.cos(a0 + da), cz + r * Math.sin(a0 + da)]; } }
  const B = {P, len:s, o, Q, S:null, V:null, T:null}; baneSpeed(B); return B; }
// where she is s metres along it: {X, Z, psi, i (the piece)}
function baneAt(B, s){ const P = B.P; if (!P.length) return null; s = Math.max(0, Math.min(B.len, s)); let i = 0, lo = 0, hi = P.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (P[m].s0 <= s) lo = m; else hi = m - 1; } i = lo;
  const p = P[i], u = p.len > 0 ? Math.min(1, (s - p.s0) / p.len) : 0;
  if (p.k === 'l') return {X:p.ax + (p.bx - p.ax) * u, Z:p.az + (p.bz - p.az) * u, psi:p.psi, i};
  const a = p.a0 + p.da * u, g = p.da >= 0 ? 1 : -1; return {X:p.cx + p.r * Math.cos(a), Z:p.cz + p.r * Math.sin(a), psi:Math.atan2(-Math.sin(a) * g, -Math.cos(a) * g), i}; }
// the speed she can have d metres before a place where she is to have v1: her stopping distances say how fast she slows
function baneBefore(o, v1, d){ let lo = v1, hi = o.vmax; if (hi <= lo) return lo; const s1 = o.stop(v1); if (o.stop(hi) - s1 <= d) return hi;
  for (let k = 0; k < 14; k++){ const m = (lo + hi) / 2; if (o.stop(m) - s1 <= d) lo = m; else hi = m; } return lo; }
// the speed and the time along it: at most each piece's own, and never more than she can slow from before a slower piece or the end
function baneSpeed(B){ const o = B.o, ds = BANE.ds, n = Math.max(1, Math.ceil(B.len / ds)), S = new Float32Array(n + 1), V = new Float32Array(n + 1), T = new Float32Array(n + 1); let pi = 0;
  for (let k = 0; k <= n; k++){ const s = Math.min(B.len, k * ds); S[k] = s; while (pi < B.P.length - 1 && B.P[pi + 1].s0 <= s) pi++; V[k] = B.P.length ? B.P[pi].vl : o.vmax; }
  if (o.end) V[n] = Math.min(V[n], BANE.vEnd);
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
// already found free, so a bane built again with one corner changed sweeps only what is new
function* baneFriG(B, boat, H, opt, memo){
  for (let i = 0; i < B.P.length; i++){ const p = B.P[i], key = memo ? (p.k === 'l' ? 'l' + p.ax.toFixed(2) + ',' + p.az.toFixed(2) + ',' + p.bx.toFixed(2) + ',' + p.bz.toFixed(2) : 'a' + p.cx.toFixed(2) + ',' + p.cz.toFixed(2) + ',' + p.r.toFixed(2) + ',' + p.a0.toFixed(4) + ',' + p.da.toFixed(4)) : '';
    if (memo && memo.has(key)) continue;
    if (p.k === 'l'){ const m = Math.max(1, Math.ceil(p.len / BANE.piece));
      for (let j = 0; j < m; j++){ const u0 = j / m, u1 = (j + 1) / m, t = farbSweep({X:p.ax + (p.bx - p.ax) * u0, Z:p.az + (p.bz - p.az) * u0, psi:p.psi}, {X:p.ax + (p.bx - p.ax) * u1, Z:p.az + (p.bz - p.az) * u1, psi:p.psi}, boat, H, opt); if (t) return Object.assign({s:p.s0 + p.len * u0, i}, t); yield; } }
    else { const m = Math.max(1, Math.ceil(Math.abs(p.da) / BANE.chord)); let q0 = baneAt(B, p.s0 + 1e-6);
      for (let j = 1; j <= m; j++){ const q1 = baneAt(B, Math.min(B.len, p.s0 + p.len * j / m - (j === m ? 1e-6 : 0))), t = farbSweep(q0, q1, boat, H, opt); if (t) return Object.assign({s:p.s0 + p.len * (j - 1) / m, i}, t); q0 = q1; yield; } }
    if (memo) memo.set(key, 1); }
  return null; }
function baneFri(B, boat, H, opt){ const g = baneFriG(B, boat, H, opt); let r; while (!(r = g.next()).done); return r.value; }
// The minute step along a plan with a bane (05-vessels.js sail calls this instead of its own way from point to point): she goes as
// far along the bane as its own speeds take her in the minute, never faster than the minute's own speed (the weather, the plan's
// setting), and comes to the plan's points as she passes them (arrive: the quay, the logbook). left0: km she may go this minute
function baneSail(pl, b, left0){ const B = pl.bane; if (!B || !B.T){ return false; }
  const s0 = pl.baneS || 0; let s = s0, t = 0; const cap = left0 * 1000;
  while (t < 60 && s < B.len && s - s0 < cap){ const v = Math.max(BANE.vMin, baneV(B, s)), dt = Math.min(2, 60 - t); s = Math.min(B.len, s + v * dt, s0 + cap); t += dt; }
  pl.baneS = s; const q = baneAt(B, s); b.heading = q.psi; b.v = (s - s0) / 60 / KN_MS;
  // the plan's points she has passed (the points are the bane's own, banePts: pl.baneAt[i] is how far along each lies)
  while (pl.idx < pl.wps.length && (pl.baneAt ? pl.baneAt[pl.idx] : Infinity) <= s + 1e-3){ const w = pl.wps[pl.idx]; b.pos = {x:w.x, y:w.y}; if (arrive(w)) return true; }
  b.pos = {x:q.X / 1000, y:q.Z / 1000}; return true; }
