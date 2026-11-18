// ===== HOW THE BOAT MOVES: a manoeuvring model (Fysikk 1; Jonas 18.10.2026) =====
// The player's own boat under way (a route, Autonav, or the hand on the helm) moves by a manoeuvring model with three degrees of
// freedom, surge u, sway v and yaw r in the hull's own frame (Fossen 2011, ch. 7): the hull's linear derivatives after Clarke, Gedling
// and Hine (1983) from the length, beam, draught and block coefficient; the rudder a lifting surface in the screw's race (so she steers
// a little in gear at a standstill, and the other way astern); the engine a thrust from the horsepower that falls off with speed, and
// a resistance that grows with the square of the speed, set so full throttle holds the vessel's top speed, and the sea's cap on it
// (speedCap). Every vessel is calibrated once from its own numbers (dynCal): the time to speed, the turning circle at full rudder (the
// rudder sized so the steady radius is the vessel's turnR, held between 1.2 and 2 lengths, where fishing boats lie), the way she
// needs to stop from every speed, and the Nomoto constants K and T the autopilot's gains come from.
// The autopilot (dynAuto) steers along the line the chart plotter draws: line of sight with a look-ahead point on the line, the rudder
// by the error in the course and the yaw rate, slower before sharp corners, braking for every stop so she stands exactly on it,
// astern out from the quay on the line (fenders and a hand on the quay do that, which the model has not got yet) and in to the harbour
// point, where the quay's lines take her alongside (3D moorStep). By hand (16-helm.js) the throttle and the rudder go straight into the
// same model.
// The wind and the sea push on her (Fysikk 2, dynEnv): the wind across her above the water gives leeway and a yaw, the waves a mean
// drift where they run, the speed she can hold falls by where the sea comes from (Kwon's direction factors, 03b-sea.js seaDirF), the
// propeller and the rudder come out of the water in a heavy sea (less thrust, less bite), the screw walks the stern to port astern,
// and a quartering or following sea sets her off her course now and then, which the autopilot or the hand on the helm must meet.
// It runs in game time on every tick while the game is open (dynTick): what the player sees is the physics, GAME_RATE times faster than
// life, as the rest of the world is. Time caught up (the game was closed, a tab slept, an admin pace) and the company's other vessels
// keep the kinematic minute step (sail), which is what the model does on average. The state lives in S.boat.dyn (metres, radians, m/s)
// and is written back to b.pos, b.heading and b.v every tick, which is what the rest of the game reads.
const DYN = {on:false, b:null, cal:{}, line:null, dep:null, nm:0, hold:false, holdAt:0, debt:0, dbg:null};   // hold: the map round her is not in, she waits (as the minute step does) from holdAt; debt: the real seconds she waited, made up at double pace once it is in
const DYN_RUD = 35 * Math.PI / 180, DYN_H = 0.2, KN_MS = NM * 1000 / 3600, DYN_AIR = 1.25;   // hard over; the integration step (game s); m/s a knot; the air's density
// the wave-making hump (Ø9 F5, docs/planer/fysikk-4-sjo-og-skrog.md): the resistance has a wave part on top of the quadratic one,
// C_w(Fr) growing as Fr^4 up to a top at Fr 0.45 (hull speed: the bow wave's length is the hull's) and falling off as 1 / Fr^4 above it,
// cw times the quadratic part at its top. A displacement hull meets it at her top speed (Fr 0.4-0.5) and hangs there: most of the
// last knot is wave; a planing hull goes over it and on to the plane, where the wave part is gone. The resistance at top speed is the
// same as before (dynPar solves k2 with the hump in), so full ahead still holds the vessel's own top speed; only the road there and
// the throttle each speed needs change (dynThrEq, dynAuto's feed-forward). The fuel is the economy's (fuelLph) and is not touched.
const DYN_HUMP = {Fr:0.45, cw:1.5};
// the hump's shape: x^4 low, 1 at Fr 0.45, 1 / x^4 high (2 x^4 / (1 + x^8), x = Fr / 0.45)
function dynHumpG(Fr){ const x = (Math.abs(Fr) / DYN_HUMP.Fr) ** 4; return 2 * x / (1 + x * x); }
// the hull's resistance (N) at u m/s through the water, the quadratic and wave parts scaled by the sea's capF
function dynRes(P, u, capF = 1){ const a = Math.abs(u); return P.k1 * u + P.k2 * capF * u * a * (1 + P.cw * dynHumpG(a / P.sgL)); }
const dynAng = (from, to) => { let d = (to - from) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
// the hull's numbers, from the vessel's own (02-species-gear.js)
function dynPar(V){
  const L = V.len, B = V.beam, T = V.draft, m = Math.max(300, (V.disp || 1) * 1000), rho = 1025;
  const Cb = clamp(m / (rho * L * B * T), 0.35, 0.75), k = Math.PI * (T / L) ** 2, BL = B / L, BT = B / T, TL = T / L;
  const q2 = 0.5 * rho * L * L, q3 = q2 * L, q4 = q3 * L, q5 = q4 * L;
  // Clarke's regressions (per unit of speed through the water: multiplied by U when used)
  const Yv = -k * (1 + 0.40 * Cb * BT) * q2, Yr = -k * (-0.5 + 2.2 * BL - 0.080 * BT) * q3;
  const Nv = -k * (0.5 + 2.4 * TL) * q3, Nr = -k * (0.25 + 0.039 * BT - 0.56 * BL) * q4;
  const Yvd = -k * (1 + 0.16 * Cb * BT - 5.1 * BL * BL) * q3, Nrd = -k * (1 / 12 + 0.017 * Cb * BT - 0.33 * BL) * q5;
  const mx = m * 1.05, my = m + Math.max(0, -Yvd), Iz = m * (0.25 * L) ** 2 + Math.max(0, -Nrd);
  // course stability: the regressions are for ships' hulls, and on a small boat with a keel they leave the sway-yaw coupling nearly
  // as big as the damping, so the rudder would spin her. The yaw damping is raised until the stability margin is half the damping
  // product (a fishing hull is steady on her course, if only just)
  const prod = Yv * Nr, X = Nv * (Yr - mx), kNr = Math.max(1, X / (0.5 * prod)), NrS = Nr * kNr;
  // the engine: thrust from the power at top speed, falling with speed; resistance quadratic with a little linear
  // (with the wave hump, F5: k1 as before, k2 solved so the resistance at top speed is what it was, 1.03 of the thrust there)
  const umax = Math.max(1, V.vmax * KN_MS), Tmax = 0.55 * V.hp * 745.7 / umax, sgL = Math.sqrt(9.81 * L), cw = DYN_HUMP.cw;
  const k1 = 0.03 * 0.65 * Tmax / umax, k2 = 0.65 * Tmax / (umax * umax * (1 + cw * dynHumpG(umax / sgL)));
  // the rudder: area 2.5 % of L x T (fishing boats carry big rudders), lift slope of a low aspect ratio, 0.45 L abaft the pivot;
  // rs is the calibration's scale on it. Hard over at 35 degrees in 1.2 s + L/8 (a tiller flicks, a steering gear takes its time)
  const AR = 0.025 * L * T, Ydc = 0.5 * rho * AR * 1.8, xR = -0.45 * L, drate = DYN_RUD / (1.2 + L / 8);   // (lift slope 1.8 a radian: 1.1 at hard over, where a low rudder stalls)
  // a little nonlinear yaw damping, and the lateral acceleration a hull can take in a turn (planing boats more)
  const Nrr = -0.003 * q5, alat = (V.planing ? 0.45 : 0.25) * 9.81;
  return {L, B, T, Cb, m, mx, my, Iz, Yv, Yr, Nv, Nr:NrS, kNr, Nrr, umax, Tmax, k2, k1, cw, sgL, race:0.35 * umax * umax / Tmax, planing:!!V.planing, Ydc, xR, drate, rs:1, alat};
}
// one step of h game seconds of the hull's own motion (u, v, r, the rudder dl), with the commands thr (-1..1) and rud (-1..1);
// capF scales the resistance up when the sea caps the speed; E is the wind and the sea on her (dynEnv; none in the calibration, which
// is calm water). The damping terms are implicit, so the step is stable at any size.
function dynInt(P, s, thr, rud, h, capF, E){
  s.dl += clamp(clamp(rud, -1, 1) * DYN_RUD - s.dl, -P.drate * h, P.drate * h);
  thr = clamp(thr, -1, 1);
  const u = s.u, U = Math.max(Math.abs(u), 0.12 * P.umax), kT = E ? E.kT : 1, kR = E ? E.kR : 1;
  const Tx = kT * (thr >= 0 ? P.Tmax * thr * (1 - 0.35 * Math.max(0, u) / P.umax) : 0.6 * P.Tmax * thr * (1 - 0.35 * Math.max(0, -u) / P.umax));
  const R = dynRes(P, u, capF);
  // the water over the rudder: the way she has and the screw's race (sign with the direction; less when the screw is in the air)
  // (the race goes with the thrust the screw gives, P.race = 0.35 umax^2 / Tmax of the type's own engine, so a bigger engine at the same
  // thrust puts the same race over the rudder, F5: with the wave hump a Trim's thrust no longer goes as sx^2)
  const uR2 = u * Math.abs(u) + P.race * kT * thr * P.Tmax * (thr > 0 ? 1 : 0.5);
  const Yd = -P.Ydc * P.rs * kR * (s.dl + (E ? E.dq * (E.side == null ? 1 : E.side) : 0)) * uR2, Nd = P.xR * Yd;   // the lift on a rudder put to starboard is to port: the stern goes to port, the bow to starboard (E.dq: the sea setting her off, as a rudder angle)
  let Ye = 0, Ne = 0, Nvu = U, Uv = U;
  if (E){
    // the wind across her above the water (the pressure on the side, 0.9 of it, from the wind she feels: the true wind less her own
    // way, and less what her own way alone gives, which the calibration has in the resistance), its centre at P.xw; the waves' drift
    const c = Math.cos(s.psi), sn = Math.sin(s.psi), wrV = (E.wE - (u * sn + s.v * c)) * c - (E.wN - (u * c - s.v * sn)) * sn;
    const sd = E.side == null ? 1 : E.side, Yw = sd * 0.5 * DYN_AIR * 0.9 * P.AL * (wrV * Math.abs(wrV) + s.v * Math.abs(s.v));
    // the screw walks the stern: to port astern (a right-handed screw), a little to starboard ahead, mostly at low speed
    const Ypw = (thr < 0 ? 0.07 : 0.012) * Tx * Math.exp(-Math.abs(u) / (0.25 * P.umax));
    // (and the water across her at low speed: the cross-flow drag on her side, 0.5 of L x her mean draught, which the linear hull has not got)
    const Ycf = -0.5 * 1025 * 0.5 * P.L * P.Tm * s.v * Math.abs(s.v) * Math.exp(-Math.abs(u) / (0.2 * P.umax));
    Ye = Yw + sd * (E.fe * c - E.fn * sn) + Ypw + Ycf; Ne = P.xw * Yw + P.xR * Ypw;
    // the bank (F5, dynBank): the water between her and a wall close abeam runs faster, its pressure drops, and her stern is drawn in
    // to the wall while the bow is pushed off (Norrbin's bank suction), as the square of her way
    if (E.bY){ Ye += E.bY * u * u; Ne += E.bN * u * u; }
    // with no way on she falls off across the wind and lies there, as a drifting boat does (the moment of the wind on her ends,
    // 0.08 of the side's pressure times the length, towards beam-on, gone by a sixth of her top speed); the hull's own sway-yaw
    // coupling comes of her way (Munk's moment goes as u v), so drifting she does not spin
    const wrU = (E.wE - (u * sn + s.v * c)) * sn + (E.wN - (u * c - s.v * sn)) * c, gam = Math.atan2(-wrV, -wrU);
    Ne -= sd * 0.5 * DYN_AIR * (wrU * wrU + wrV * wrV) * P.AL * P.L * 0.08 * Math.sin(2 * gam) * Math.exp(-Math.abs(u) / (0.15 * P.umax));
    Nvu = Math.abs(u); Uv = Math.max(Math.abs(u), 0.04 * P.umax);   // (at low speed the cross-flow drag holds her against the side, not the linear hull's floor)
  }
  s.u += h * (Tx - R + P.my * s.v * s.r) / P.mx;
  const vd = (P.Yr * U * s.r + Yd + Ye - P.mx * s.u * s.r) / P.my, va = -P.Yv * Uv / P.my;
  s.v = (s.v + h * vd) / (1 + h * va);
  const rd = (P.Nv * Nvu * s.v + Nd + Ne) / P.Iz, ra = (-P.Nr * U + Math.abs(P.Nrr * s.r)) / P.Iz;
  s.r = (s.r + h * rd) / (1 + h * ra);
  const rcap = P.alat / Math.max(0.5, Math.abs(s.u)); s.r = clamp(s.r, -rcap, rcap);
}
// ... and where that takes her: X east, Y south (metres), psi the heading (grid, clockwise from north)
// (E: the stream carries her over the ground with the water she moves through, F8b; E.side eases it out in the last lengths to a
// stop, where the skipper holds her up to the point, as for the wind)
function dynMove(s, h, E){
  // (the model's metres are true ones; on the grid they are k of them, gridScale, H1b of the ocean step)
  const c = Math.cos(s.psi), sn = Math.sin(s.psi), hk = h * gridScale({x:s.X / 1000, y:s.Y / 1000});
  s.X += (s.u * sn + s.v * c) * hk; s.Y -= (s.u * c - s.v * sn) * hk; s.psi += s.r * h;
  if (E && E.cm){ const sd = E.side == null ? 1 : E.side; s.X += E.cx * sd * hk; s.Y += E.cy * sd * hk; }
}
// ---- the stream (Ø9 F8b, docs/planer/fysikk-4-sjo-og-skrog.md F8) ----
// The water she moves through moves itself (curAt, 06e-anchor.js; as she feels it: curBoat, curEff). Her speed through the water is
// the engine's as before; over the ground the stream is added (dynMove), so against Saltstraumen she stands nearly still and with it
// she is through in minutes. The autopilot steers by her course over the ground and so heads up into a stream across the line (dynAuto).
// Lying with no way on she is carried with it (lieDrift). The waves that run on to the stream change with it (curWave, 03b-sea.js),
// and so does what she meets of them (dynEnv). The GPS shows her speed and course over the ground (dynSog).
// How much of her speed through the water v (m/s) is made good over the ground on the course hd (grid, radians) in the stream C: she
// heads up so the stream's part across the course is met (v^2 - cross^2 is left for the way ahead), and the part along it is added.
// Under 3 % she cannot stem the stream: 0, she holds up to it where she is until the tide slackens, as the manoeuvring model has her
// (dynAuto); never over three times.
function curSogF(C, hd, v){
  if (!C || !C.m || !(v > 0.05)) return 1;
  const sn = Math.sin(hd), c = Math.cos(hd), al = C.x * sn - C.y * c, cr = C.x * c + C.y * sn, f = (al + Math.sqrt(Math.max(0, v * v - cr * cr))) / v;
  return f < 0.03 ? 0 : Math.min(f, 3);
}
// the hours a leg from a to w takes at vKn knots through the water, leaving a at the game hour H: the stream sampled along it at the
// time she is there, every 250 m where a sound's stream may reach and every 2 km elsewhere (kept per leg, speed and ten game
// minutes: the route's cards and the estimate ask on every draw)
const CURLEG = new Map();
function curLegH(a, w, vKn, H){
  const d = dist(a, w), h0 = kmTrue(a, w) / NM / Math.max(0.1, vKn); if (!(d > 1e-6)) return 0;
  const key = a.x.toFixed(3) + ',' + a.y.toFixed(3) + ',' + w.x.toFixed(3) + ',' + w.y.toFixed(3) + ',' + vKn.toFixed(1) + ',' + Math.floor(H * 6); let r = CURLEG.get(key); if (r !== undefined) return r;
  const hd = Math.atan2(w.x - a.x, -(w.y - a.y)), v = vKn * KN_MS; let t = 0, s = 0;
  // (where she cannot stem it she waits, five game minutes at a time, for the tide to slacken; outside the sounds' reach every 2 km)
  try { while (s < d - 1e-9 && t < 96){ const p = {x:a.x + (w.x - a.x) * s / d, y:a.y + (w.y - a.y) * s / d}, st = Math.min(d - s, stromNear(p).length ? 0.25 : 2), m = {x:p.x + (w.x - a.x) * st / 2 / d, y:p.y + (w.y - a.y) * st / 2 / d};
    const f = curSogF(curEff(curAt(m, H + t)), hd, v); if (!f){ t += 1 / 12; continue; } t += st / d * h0 / f; s += st; } } catch (e){ return h0; }   // (the map not in: the leg as in still water, and asked again)
  if (CURLEG.size > 400) CURLEG.clear(); CURLEG.set(key, t); return t;
}
// her speed (knots) and course (grid, radians) over the ground, as the GPS has them: the model's while it has her, the minute step's
// way with the stream's share (sail, below), the drift lying still, else none
const SOGM = new WeakMap();
function dynSog(b = S.boat){
  if (b === S.boat && dynLive()){ const q = dynPose(); return {kn:q.sog / KN_MS, cog:q.cog}; }
  if (b.status === 'sailing'){ const m = SOGM.get(b); return m && m.t >= S.t - 1 ? {kn:m.kn, cog:m.cog} : {kn:b.v || 0, cog:b.heading || 0}; }
  const dv = b.drv; if (dv && dv.t >= S.t - 1 && !b.port){ const km = Math.hypot(dv.x, dv.y); if (km > 1e-5) return {kn:km / gridScale(b.pos) / NM * 60, cog:Math.atan2(dv.x, -dv.y)}; }
  return {kn:b.gop || b.status === 'tow' ? (b.v || 0) : 0, cog:b.heading || 0};   // (setting, hauling or under tow: the minute's own pace)
}
// the share of her speed through the water the minute step made good over the ground last minute (for the pose between the minutes)
function sailSogF(b = S.boat){ const m = SOGM.get(b); return m && m.t >= S.t - 1 ? m.f : 1; }
// The minute step (sail, 05-vessels.js: time caught up, the game closed, the company's other vessels) with the stream: she has gone
// the minute's way through the water along the route, and over the ground that is curSogF of it. Put on here round sail and not in
// it, because another session has 05-vessels.js while F8b is built (11.11.2026); to be moved into sail (the backlog, «F8b»). A minute
// in which she passes a waypoint is left as sailed (the stream's share of it is lost, a minute a waypoint at the most).
const sailStill = sail;
sail = function (H, W, hs){
  const b = S.boat, pl = S.plan, p0 = b.pos, i0 = pl ? pl.idx : -1;
  sailStill(H, W, hs);
  if (!pl || S.plan !== pl || b.status !== 'sailing' || dynLive()) return;
  const dx = b.pos.x - p0.x, dy = b.pos.y - p0.y, km = Math.hypot(dx, dy); if (km < 1e-6) return;
  const C = curBoat(b, H), hd = Math.atan2(dx, -dy), f = curSogF(C, hd, (b.v || 0) * KN_MS);
  SOGM.set(b, {t:S.t, kn:(b.v || 0) * f, cog:hd, f});
  if (pl.idx !== i0 || Math.abs(f - 1) < 1e-3) return;
  let k = f; const w = pl.wps[pl.idx];
  if (f > 1){ const dw = w ? dist(p0, w) : 0; if (w && km * f >= dw - 1e-4) k = Math.max(1, (dw - 1e-4) / km);   // (not past the waypoint: the next minute arrives there)
    let gp = true; try { gp = groundCheck(b.pos, {x:p0.x + dx * k, y:p0.y + dy * k}); } catch (e){} if (gp) return; }
  b.pos = {x:p0.x + dx * k, y:p0.y + dy * k};
};
const dynZero = () => ({u:0, v:0, r:0, dl:0, psi:0, X:0, Y:0});
// the throttle that holds the speed u
function dynThrEq(P, u, capF){ return u <= 0 ? 0 : clamp(dynRes(P, u, capF) / (P.Tmax * (1 - 0.35 * u / P.umax)), 0, 1); }
// the speed full ahead holds in calm water (the thrust meets the resistance; the hump makes it no closed form)
function dynUeq(P){ let lo = 0, hi = 2 * P.umax; for (let i = 0; i < 50; i++){ const m = (lo + hi) / 2; if (P.Tmax * (1 - 0.35 * m / P.umax) > dynRes(P, m)) lo = m; else hi = m; } return (lo + hi) / 2; }
// ---- the calibration: measured on the model itself, once a vessel ----
function dynTurn(P, V, u0 = V.vcruise * KN_MS){
  const s = dynZero(); s.u = u0; const thr = dynThrEq(P, s.u, 1), h = 0.1, rs = [];
  let t = 0, adv = null, tr = null, td = null;
  while (t < 1200 && s.psi < 3 * Math.PI){
    dynInt(P, s, thr, 1, h, 1); dynMove(s, h); t += h; rs.push(s.r);
    if (adv === null && s.psi >= Math.PI / 2){ adv = -s.Y; tr = s.X; }
    if (td === null && s.psi >= Math.PI) td = s.X;
  }
  const rss = s.r, uss = s.u, i63 = rs.findIndex(r => r >= 0.63 * rss), T = Math.max(0.3, (i63 < 0 ? rs.length : i63) * h);
  return {R:uss / Math.max(1e-6, rss), adv, tr, td, rss, uss, T, K:rss / DYN_RUD, Uc:u0, t};
}
function dynAccel(P){
  const ueq = dynUeq(P), s = dynZero(); let t = 0;
  while (s.u < 0.9 * ueq && t < 900){ dynInt(P, s, 1, 0, 0.1, 1); t += 0.1; }
  return {t90:t, ueq};
}
// how far she goes before she stands still from every speed, braking gently (a third astern), in steps of a quarter m/s
function dynStops(P){
  const out = [0]; for (let v = 0.25; v <= P.umax + 0.25; v += 0.25){ const s = dynZero(); s.u = v; let d = 0, t = 0; while (s.u > 0.05 && t < 600){ d += s.u * 0.1; dynInt(P, s, -0.3, 0, 0.1, 1); t += 0.1; } out.push(d); }
  return out;
}
// sx: the boat's own engine over the type's (dynCalOf): the same hull, rudder and areas, measured again with that engine (dynCalEng)
function dynCal(key, sx = 1){
  sx = Math.round(sx * 1000) / 1000; const ck = sx === 1 || !(sx > 0) ? key : key + '@' + sx;
  if (DYN.cal[ck]) return DYN.cal[ck];
  if (ck !== key) return DYN.cal[ck] = dynCalEng(dynCal(key), sx, ck);
  const V = VESSELS[key] || VESSELS.skiff, P = dynPar(V), want = clamp(V.turnR || 2 * V.len, 1.2 * V.len, 2 * V.len);
  // the wind's areas: the side above the water (the freeboard along her, and the wheelhouse, a hardtop or the people at the console
  // over a share of her length) and the front; the centre of the side at the middle of a small boat (she drifts across the wind), a
  // little forward on the big ones with the wheelhouse forward (her bow falls off); the propeller tips about 0.45 of the draught down
  // (the draught is to the keel's foot)
  { const h = hullOf(V === VESSELS[key] ? key : 'skiff'), hs = {hus:[0.35, 2.0], hardtop:[0.3, 1.5]}[(V.fac || {}).house] || [0.15, 1.0];
    P.AL = V.len * h.f + hs[0] * V.len * hs[1] * (V.len >= 30 ? 1.6 : 1); P.AF = V.beam * (h.f + 0.8 * hs[1] * (V.len >= 30 ? 1.6 : 1)); P.xw = V.len >= 14 ? 0.04 * V.len : 0; P.hp = 0.45 * V.draft; P.Tm = h.T; }
  let lo = 0.02, hi = 20; for (let i = 0; i < 16; i++){ P.rs = Math.sqrt(lo * hi); if (dynTurn(P, V).R > want) lo = P.rs; else hi = P.rs; } P.rs = Math.sqrt(lo * hi);
  return DYN.cal[key] = dynCalRun(key, V, P, 1);
}
// the boat's own engine (Trim, the yard's bigger engine, the 90 hp outboard: BOAT.vmax over the type's, core/03-simulation.js
// applyVessel). Until 06.11.2026 the model had only the type's engine (dynCal(type)), so full ahead held the type's top speed whatever
// was bought: a Trim paid for gave no speed by Autonav or by hand, only on paper (tilbakemelding 06.11.2026). Now the hull, the rudder
// and the areas are the type's, and the screw pushes sx^2 as hard, so full ahead holds sx times her top speed against the same
// resistance; the stops, the acceleration and the autopilot's gains are measured again with that engine
function dynCalEng(base, sx, ck){
  // (the screw pushes as much harder as the resistance is at sx times the speed, so full ahead holds sx times it also where the wave
  // hump lies between, F5: before the hump it was sx^2)
  const P0 = base.P, P = Object.assign({}, P0, {umax:P0.umax * sx, Tmax:P0.Tmax * dynRes(P0, P0.umax * sx) / dynRes(P0, P0.umax)});
  return dynCalRun(ck, base.V, P, sx);
}
// the calibration for the player's own boat with the engine she has now (BOAT), which the helm, Autonav and the rules of the road use
function dynCalOf(b = S.boat){ const V = VESSELS[b.type] || VESSELS.skiff; return dynCal(b.type, b === S.boat && V.vmax > 0 && BOAT.vmax > 0 ? BOAT.vmax / V.vmax : 1); }
// what is measured on the model once the hull and the rudder are set (sx: the engine over the type's, 1 for the type's own)
function dynCalRun(key, V, P, sx){
  const turn = dynTurn(P, V), acc = dynAccel(P), stop = dynStops(P);
  // Nomoto's K and T measured again at a quarter, half and three quarters of cruising speed, for the autopilot's gains at the way she
  // has (on a planing hull they do not follow the textbook scaling: T stays about the same, K falls with the speed); with a stronger
  // engine also at her own cruising speed, so the gains above the type's are measured and not stretched
  const nom = [0.25, 0.5, 0.75].map(f => { const t = dynTurn(P, V, f * turn.Uc); return {u:f * turn.Uc, K:t.K, T:t.T, R:t.R}; }).concat([{u:turn.Uc, K:turn.K, T:turn.T, R:turn.R}]);
  if (sx > 1.01){ const t = dynTurn(P, V, sx * turn.Uc); nom.push({u:sx * turn.Uc, K:t.K, T:t.T, R:t.R}); }
  // the autopilot's rudder: a second-order loop on Nomoto's K and T (at cruising speed; K grows and T shrinks with speed), not faster
  // than 0.6 rad/s so she does not flap the rudder, critically damped
  const wn = Math.min(1.2 / turn.T, 0.6), Kp = wn * wn * turn.T / turn.K, Kd0 = Math.max(0, (2 * wn * turn.T - 1) / turn.K);
  // the deceleration a skipper eases her down with before a corner or a stop: 60 % of what a third astern gives on average from
  // cruising speed, at most 0.08 m/s2 (0.25 for a planing hull, which comes off the plane quickly; at 6x on the screen the hard stop
  // looked like a jolt)
  const uc = V.vcruise * KN_MS, aC = clamp(0.6 * uc * uc / (2 * Math.max(1, dynStopDist({stop}, uc))), 0.02, V.planing ? 0.25 : 0.08);
  return {key, V, P, turn, acc, stop, Kp, Kd0, aC, nom, sx};
}
// the way to stop from the speed v, and the speed she can have with d metres to stop in
function dynStopDist(cal, v){ const S = cal.stop, i = Math.min(S.length - 2, Math.floor(Math.abs(v) / 0.25)), f = Math.abs(v) / 0.25 - i; return S[i] + (S[i + 1] - S[i]) * f; }
// easing down: the speed she may have with d metres to come down to vT, and the way she needs to ease down from v
const dynVEase = (cal, d, vT = 0) => Math.sqrt(vT * vT + 1.4 * cal.aC * Math.max(0, d));   // (planned at 70 % of aC: the margin the lever needs to follow it)
const dynEaseDist = (cal, v) => v * v / (1.4 * cal.aC);
function dynVStop(cal, d){ const S = cal.stop; if (d <= 0) return 0; let i = 1; while (i < S.length && S[i] <= d) i++; if (i >= S.length) return (S.length - 1) * 0.25; return ((i - 1) + (d - S[i - 1]) / Math.max(1e-6, S[i] - S[i - 1])) * 0.25; }
// ---- the wind and the sea on her this tick (Fysikk 2) ----
// What the hull feels, from the sea state the rest of the game has (03b-sea.js hsParts: the wind sea and the swell, their heights,
// periods and where they come from) and the wind (windAt, windDir), in game time, so it is the same whatever the screen shows:
// - cap/capF: the speed she can hold on this heading (speedCap with Kwon's direction factor) and the resistance that holds her to
//   it at full throttle (solved exactly, with the thrust she has);
// - kT, kR: the share of the thrust and of the rudder's bite left when the propeller comes out of the water. The stern's motion
//   against the sea is a share of the wave height (more in waves about her own length, which she cannot ride; more into the sea),
//   and the propeller is out when that motion passes the tips' depth: exp(-h^2 / 2 sigma^2) of the time (Rayleigh);
// - fe, fn: the waves' mean drift where they run (rho g m0 L Kr^2 / 2, Kr = tanh(1.3 k T): a hull reflects the short waves only);
// - dq: the yaw the sea sets her off with, as a rudder angle, a smooth random on her own clock with the encounter period, most in a
//   quartering and following sea (where a boat yaws and wants to broach), least into it;
// - wE, wN: the true wind (m/s, the way it blows, east and north on the grid), for the pressure on her side in dynInt.
const DYN_YAWF = [[0, 0.25], [90, 0.5], [135, 1], [180, 0.8]];
function dynEnv(b, d, cal, H, dtG = 0){
  const P = cal.P, p = b.pos, g = gridGamma(p), psi = d.psi; let q = null;
  try { q = seaPartsNear(p, H); } catch (e){ q = null; }
  const E = {cap:P.umax, capF:1, kT:1, kR:1, fe:0, fn:0, dq:0, wE:0, wN:0, Pem:0, hs:0, cb:1, tau:6, cx:0, cy:0, cm:0};
  // the stream she is in (F8b): it carries her (dynMove), and the sea that runs on to it changes (below)
  const C = curBoat(b, H); if (C.m){ E.cx = C.x; E.cy = C.y; E.cm = C.m; }
  if (q){
    let hs = Math.max(0.05, Math.hypot(q.w, q.sw)); const cb = seaDirF(p, H, psi); E.cb = cb;
    if (C.m){ let e = 0; for (const [h0, tp, from] of [[q.w, q.tp, q.dir], [q.sw, q.swTp, q.swDir]]) e += (h0 * (tp > 0.3 ? curWave(2 * Math.PI / tp, curAlong(C, from, g)).af : 1)) ** 2; E.hs0 = hs; hs = Math.max(0.05, Math.sqrt(e)); }
    E.hs = hs;
    E.cap = Math.max(0.3, speedCap(hs, cb) * KN_MS);
    let s2 = 0, dq2 = 0, te = 0, ws = 0;
    for (let [h0, tp, from] of [[q.w, q.tp, q.dir], [q.sw, q.swTp, q.swDir]]){
      if (!(h0 > 0.02) || !(tp > 0.3)) continue;
      const w = 2 * Math.PI / tp, mu = dynAng(psi, (from - g) * Math.PI / 180), cm = Math.cos(mu), am = Math.abs(mu) * 180 / Math.PI;
      // (in a stream the sea is shorter and higher against it, longer and lower with it, curWave; sg is the frequency the water has)
      let k = w * w / 9.81, sg = w; if (C.m){ const U = curAlong(C, from, g), cw = curWave(w, U); k *= cw.kf; h0 *= cw.af; sg = Math.max(0.05, w - k * U); }
      const fL = 1 / (1 + (k * P.L * Math.abs(cm) / Math.PI) ** 2), sr = h0 / 4 * (0.2 + 0.65 * (1 - fL)) * (0.6 + 0.4 * (1 + cm) / 2);
      s2 += sr * sr;
      let fq = DYN_YAWF[DYN_YAWF.length - 1][1]; for (let i = 1; i < DYN_YAWF.length; i++) if (am <= DYN_YAWF[i][0]){ const [a0, f0] = DYN_YAWF[i - 1], [a1, f1] = DYN_YAWF[i]; fq = f0 + (f1 - f0) * (am - a0) / (a1 - a0); break; }
      dq2 += (0.12 * h0 / 2 * fq) ** 2;
      const we = Math.max(0.05, Math.abs(sg + k * d.u * cm)); te += h0 * h0 * 2 * Math.PI / we; ws += h0 * h0;
      const Fd = 0.5 * 1025 * 9.81 * (h0 * h0 / 16) * P.L * Math.tanh(1.3 * k * P.T) ** 2, a = (from - g + 180) * Math.PI / 180;
      E.fe += Fd * Math.sin(a); E.fn += Fd * Math.cos(a);
    }
    const sig = Math.sqrt(s2); E.Pem = sig > 0.01 ? Math.exp(-P.hp * P.hp / (2 * sig * sig)) : 0; E.kT = 1 - 0.6 * E.Pem; E.kR = 1 - 0.5 * E.Pem;
    E.tau = clamp(ws ? te / ws : 6, 2, 20);
    d.yph = ((d.yph || 0) + dtG / E.tau) % 1e6; E.dq = Math.sqrt(dq2) * 2.2 * (vn(d.yph, 991) - 0.5);
  }
  // the shallow water under her (F5): the depth with the tide, a narrow sound, and the cap on her speed where it is under two draughts
  { let h = NaN; try { h = depthNav(p) + tideCD(H); } catch (e){}   // (the tide as groundCheck reads it)
    E.h = h; E.narrow = false; E.bY = E.bN = 0; E.bk = null;
    if (h > 0) E.cap = Math.max(0.3, E.cap * dynShallowF(P, h, E.cap));
    try { dynBank(E, d, P, true); } catch (e){ E.bY = E.bN = 0; } }
  const c = E.cap; E.capF = Math.max(1, (E.kT * P.Tmax * (1 - 0.35 * c / P.umax) - P.k1 * c) / (P.k2 * c * c * (1 + P.cw * dynHumpG(c / P.sgL))));
  // (the wind she feels is the wind over the water she is in: less the stream)
  const U = windAt(H, p), a = (windDir(H, p) - g + 180) * Math.PI / 180; E.wE = U * Math.sin(a) - E.cx; E.wN = U * Math.cos(a) + E.cy;
  DYN.env = E; return E;
}
// ---- squat, the bank and the shallow water (Ø9 F5, docs/planer/fysikk-4-sjo-og-skrog.md; Barrass, Norrbin, Schlichting) ----
// Squat after Barrass (2004): under way the water under and round her runs faster, its level drops, and she sinks with it, Cb V^2 / 100 m
// (V in knots) in open water and twice that in a narrow channel (here a sound narrower than eight of her beams). The formula is for
// displacement speeds: the knots are held at Fr 0.6, and a planing hull comes up out of it from Fr 0.5 to 1 (she rises on to the
// plane). Cb is the hull's (dynPar, held to 0.35-0.75): 0.22 m for the sjark at 8 knots in open water, 0.45 m in a sound.
// 3D: the trim at speed is the hull's own wave in hullStep (03c-stability.js), which is not touched here (another session has the file).
function dynSquat(P, u, narrow){
  const a = Math.abs(u || 0), Fr = a / P.sgL, vk = Math.min(a, 0.6 * P.sgL) / KN_MS;
  return P.Cb * vk * vk / 100 * (narrow ? 2 : 1) * (P.planing ? 1 - sstep(0.5, 1, Fr) : 1);
}
// The speed she keeps in water shallower than two of her draughts, as a share of her speed in deep water (Schlichting, in Lackenby's
// form, 1963: dV/V = 0.1242 (Ax / h^2 - 0.05) + 1 - sqrt(tanh(g h / V^2)); Ax the midship section, 0.9 B and the mean draught), full
// from 1.5 draughts and faded in from two, so nothing changes where she has the water she needs
function dynShallowF(P, h, v){
  const w = clamp((2 * P.T - h) / (0.5 * P.T), 0, 1); if (!(w > 0) || !(v > 0.1)) return 1;
  const Ax = 0.9 * P.B * (P.Tm || P.T), hh = Math.max(0.3, h), dv = 0.1242 * (Ax / (hh * hh) - 0.05) + 1 - Math.sqrt(Math.tanh(9.81 * hh / (v * v)));
  return 1 - w * clamp(dv, 0, 0.6);
}
// the distance (m) from x, z (metres, east and south) to a wall: the fine coast, a quay's deck, a breakwater, a harbour unit's block or
// fill (not the open piers on piles, which the water runs under); cap when none is within it
function dynWall(O, x, z, cap){
  let d = cap; const cm = coastDistM({x:x / 1000, y:z / 1000}, cap); if (cm >= 0) d = Math.min(d, cm);
  if (O){ for (const q of O.boxes){ if (!(q.made || q.k === 'molo')) continue; d = Math.min(d, Math.max(0, fixDist(q, x, z).d)); }
    for (const U of O.units){ const [lx, lz] = unitL(U, x, z); d = Math.min(d, groundOut(U, lx, lz)); } }
  return d;
}
// The bank effect and the narrow sound, worked out where she is (once a tick in dynEnv, and again in the sub-steps when she has moved
// a quarter of her beam or turned 3 degrees): the wall's distance from her middle and the side it is on (from the distance a half-beam
// to each side), and the width of the water across her (marched out to each side on the distance to the nearest wall, up to eight
// beams). The force towards the wall and the moment that turns the bow off it, per (m/s)^2 of her way (dynInt), when the wall is within
// three beams of her side: 0.5 rho L T (B / d)^2 cY, at 0.2 L abaft the middle, faded out over the last beam, and stronger the
// shallower the water (a quarter of it at three draughts and deeper, all of it at one).
const DYN_BANK = {cY:0.03, xb:0.2};
function dynBankF(P, d0, gl, h){
  const gap = d0 - P.B / 2; if (!(gap < 3 * P.B) || !gl) return {Y:0, N:0};
  const dd = Math.max(d0, 0.6 * P.B), fh = 0.25 + 0.75 * clamp((3 - (h > 0 ? h : 99) / P.T) / 2, 0, 1);
  const Y = DYN_BANK.cY * 0.5 * 1025 * P.L * P.T * (P.B / dd) ** 2 * clamp(gl, -1, 1) * fh * (1 - sstep(2 * P.B, 3 * P.B, gap));
  return {Y, N:-DYN_BANK.xb * P.L * Y};
}
function dynBank(E, d, P, force){
  if (!E || !Number.isFinite(d.X)) return;
  const k = E.bk; if (!force && (!k || (Math.hypot(d.X - k.X, d.Y - k.Y) < 0.25 * P.B && Math.abs(dynAng(k.psi, d.psi)) < 0.05))) return;
  try { dynBankAt(E, d, P, k, force); } catch (e){ E.bY = E.bN = 0; }   // (a tile not in yet: no bank, as in open water)
}
// (the width across her, for the squat, once a tick (force); the force and the moment on every sub-step she has moved)
function dynBankAt(E, d, P, k, force){
  const B = P.B, cap = 8 * B + 5, c = Math.cos(d.psi), sn = Math.sin(d.psi), sx = c, sz = sn;   // (starboard, east and south: her heading turned a quarter clockwise)
  const O = k && Math.hypot(d.X - k.oX, d.Y - k.oY) < 50 ? k.O : dynObsNear(d.X, d.Y, cap + 60), d0 = dynWall(O, d.X, d.Y, cap);
  E.bk = {X:d.X, Y:d.Y, psi:d.psi, O, oX:k && k.O === O ? k.oX : d.X, oY:k && k.O === O ? k.oY : d.Y};
  if (d0 >= cap){ E.bY = E.bN = 0; if (force) E.narrow = false; return; }
  const dS = dynWall(O, d.X + sx * B / 2, d.Y + sz * B / 2, cap), dP = dynWall(O, d.X - sx * B / 2, d.Y - sz * B / 2, cap), gl = (dP - dS) / B;
  const F = dynBankF(P, d0, gl, E.h); E.bY = F.Y; E.bN = F.N;
  // the width of the water across her
  if (!force) return;
  let w = 0; for (const sg of [1, -1]){ let t = 0; for (let i = 0; i < 24 && t < 8 * B; i++){ const r = dynWall(O, d.X + sg * sx * t, d.Y + sg * sz * t, cap); if (r < 0.5) break; t += Math.max(r, 0.5); } w += t; }
  E.narrow = w < 8 * B;
}
// the water under her keel now (m): the depth with the tide, less her draught and her squat at the way she has (the chart plotter)
function keelClear(b = S.boat, H = S.t / 60){
  const h = depthNav(b.pos) + tideCD(H), cal = dynCalOf(b), E = DYN.env, live = dynLive && dynLive();
  return h - BOAT.draft - dynSquat(cal.P, live && b.dyn ? b.dyn.u : (b.v || 0) * KN_MS, !!(live && E && E.narrow));
}
// ---- contact: the hull against the piers, the breakwaters and the harbour units' quays (Fysikk 2) ----
// Seven points round her waterline (the stem, the shoulders, the middle and the quarters, both sides) are tested against the boxes
// of the piers, breakwaters and quay decks (07-harbours.js PIERBOX) and the harbour units' blocks. A point inside is put out again
// along the nearest face, and the hull gets the impulse a fendered hull gets: the speed into the face is turned back with a fifth of
// it (fenders and rubbing strakes take the rest), with a little friction along it, as a rigid body with her added masses, so a bow
// that touches swings the stern in. The energy of the blow (half the effective mass times the speed into the face squared) is kept
// for the damage of Fysikk 3 (b.hits); under a knot the fenders take it and nothing is said. Land itself is the minute step's and the
// helm's as before (over 3 knots she runs aground, slower she stops against it).
const DYN_HULL = [[0.5, 0], [0.3, 0.5], [0.3, -0.5], [0, 0.5], [0, -0.5], [-0.45, 0.5], [-0.45, -0.5]];   // fractions of L and B
// (everything fixed in the sea, 11b-obstacles.js fixNear: the coast's piers, quay decks, breakwaters and floating docks too, not Senja's
// PIERBOX alone, and the vessels lying still near her; the autonav routine 18.11.2026: the boat went through what the model did not
// know, without a knock and without the safety net seeing it. free: [x, z, r] where the things within r of the point are left out,
// her own berth's quay at the end of the route. Not the vessels lying still: the way to and from the berth goes round them (fixBoats), but
// she does not strike them, as she does not the vessels under way (SJV.ghost, Jonas 16.11.2026: no damage, no tow); a blow from a boat that
// swung on her lines after the line was laid gave the hull damage at Meløy verft)
function dynObsNear(X, Y, R, free){
  const boxes = [], units = [], own = o => free && free.some(f => fixDist(o, f[0], f[1]).d < f[2]);
  for (const o of fixNear(X, Y, R)){ if (o.t === 3 ? o.x1 < X - R || o.x0 > X + R || o.z1 < Y - R || o.z0 > Y + R : Math.abs(o.x - X) > o.l + o.w + R || Math.abs(o.z - Y) > o.l + o.w + R) continue; if (!own(o)) boxes.push(o); }
  for (const U of UNITA){ const g = ugeo(U); if (Math.hypot(U.o[0] - X, U.o[1] - Y) < g.E + g.B + R) units.push(U); }
  return {boxes, units};
}
// where a point (x east, z south, metres) is inside an obstacle: how deep, and the way out (east, north)
function dynInside(O, x, z){
  let best = null;
  for (const q of O.boxes){
    const f = fixDist(q, x, z); if (f.d >= 0) continue;
    if (!best || -f.d < best.d) best = {d:-f.d, e:f.ox, n:-f.oz, k:q.k || 'brygge'};
  }
  for (const U of O.units){ const [lx, lz] = unitL(U, x, z), g = ugeo(U); if (Math.abs(lx) <= g.E && lz <= 0 && lz >= -g.B){ const o = {d:-lz, e:U.n[0], n:-U.n[1], k:'kai'}; if (!best || o.d < best.d) best = o; } }
  return best;
}
function dynContact(b, d, P, O){
  sjvTouch(b, d, P);   // the other vessels, the sea marks and the buoys (Ø11.3, 05e-sjovei.js: the collision and the fault)
  if (!O || (!O.boxes.length && !O.units.length)) return null;
  const c = Math.cos(d.psi), sn = Math.sin(d.psi); let hit = null;
  for (const [fx, fy] of DYN_HULL){
    const xc = fx * P.L, yc = fy * P.B, X = d.X + xc * sn + yc * c, Z = d.Y - (xc * c - yc * sn), I = dynInside(O, X, Z); if (!I) continue;
    // the way out in her own frame, the point's velocity into it
    const nu = I.e * sn + I.n * c, nv = I.e * c - I.n * sn, vpu = d.u - d.r * yc, vpv = d.v + d.r * xc, vn = vpu * nu + vpv * nv, arm = xc * nv - yc * nu;
    d.X += I.e * (I.d + 0.02); d.Y -= I.n * (I.d + 0.02);
    if (vn >= 0) continue;
    const den = nu * nu / P.mx + nv * nv / P.my + arm * arm / P.Iz, J = -(1 + 0.2) * vn / den;
    d.u += J * nu / P.mx; d.v += J * nv / P.my; d.r += J * arm / P.Iz;
    // a little friction along the face
    const tu = -nv, tv = nu, vt = (vpu * tu + vpv * tv), Jt = clamp(-vt / (tu * tu / P.mx + tv * tv / P.my + (xc * tv - yc * tu) ** 2 / P.Iz), -0.3 * J, 0.3 * J);
    d.u += Jt * tu / P.mx; d.v += Jt * tv / P.my; d.r += Jt * (xc * tv - yc * tu) / P.Iz;
    const E = 0.5 * vn * vn / den; if (!hit || E > hit.E) hit = {E, kn:-vn / KN_MS, k:I.k};
  }
  if (hit){
    const last = b.hits && b.hits[b.hits.length - 1], fresh = !last || S.t - last.t > 1 || hit.kn > last.kn + 0.5;
    if (fresh){ b.hits = (b.hits || []).concat([{t:S.t, E:Math.round(hit.E), kn:+hit.kn.toFixed(1), k:hit.k}]).slice(-20);
      if (hit.kn >= 1){ const what = {kai:['kaia', 'the quay'], brygge:['brygga', 'the pier'], molo:['moloen', 'the breakwater'], flytebrygge:['flytebrygga', 'the floating dock'], 'båt':['en båt som ligger stille', 'a boat lying still']}[hit.k] || ['brygga', 'the pier'], kn = (Math.round(hit.kn * 10) / 10).toFixed(1);
        const say = typeof hullHit === 'function' ? hullSay(hullHit(hit.kn, hit.E, hit.k, b)) : null;   // what it did to the hull (Fysikk 3, 16c-hull.js)
        const no = (hit.kn >= 3 ? 'Hardt støt mot ' : 'Smell i ') + what[0] + ', ' + kn.replace('.', ',') + ' knop.' + (say ? say.no : ''), en = (hit.kn >= 3 ? 'A hard blow against ' : 'A knock against ') + what[1] + ', ' + kn + ' knots.' + (say ? say.en : '');
        log(no, en, 'nav'); if (typeof toast === 'function') toast(S.lang === 'en' ? en : no); } }
  }
  return hit;
}
// ---- with no way on: she drifts (Fysikk 2) ----
// Lying still at sea (fishing, lying, out of fuel; not at anchor, not on the gear, not by the hand on the helm) she falls off across
// the wind and drifts with it and the waves, as the model has her with nothing on (dynInt): the speed where the push of the wind on
// her side and the waves' drift meet the water's hold on her (the linear hull at a crawl and the cross-flow drag), solved here for the
// minute step, so the drift is the same with the game closed. 2-6 % of the wind for the fishing boats (a 15 m fishing vessel drifted at
// 4.0 % of the wind, 30 +/- 15 degrees off downwind, in the US Coast Guard's field test off Florida, 1997). Returns m/s east and north.
function dynDrift(type, p, H){
  const cal = dynCal(type), P = cal.P, g = gridGamma(p), U = windAt(H, p), a = (windDir(H, p) - g + 180) * Math.PI / 180; let q = null;
  try { q = seaPartsNear(p, H); } catch (e){}
  let fe = 0, fn = 0;
  if (q) for (const [h0, tp, from] of [[q.w, q.tp, q.dir], [q.sw, q.swTp, q.swDir]]){ if (!(h0 > 0.02) || !(tp > 0.3)) continue;
    const k = (2 * Math.PI / tp) ** 2 / 9.81, Fd = 0.5 * 1025 * 9.81 * (h0 * h0 / 16) * P.L * Math.tanh(1.3 * k * P.T) ** 2, w = (from - g + 180) * Math.PI / 180;
    fe += Fd * Math.sin(w); fn += Fd * Math.cos(w); }
  // across her (she lies across the wind): the waves' drift along the wind, and what runs along her hull she does not drift with
  const Fw = fe * Math.sin(a) + fn * Math.cos(a), hold = v => -P.Yv * Math.max(0, 0.04 * P.umax) * v + 0.5 * 1025 * 0.5 * P.L * P.Tm * v * v;
  const push = v => 0.5 * DYN_AIR * 0.9 * P.AL * Math.max(0, U - v) ** 2 + Math.max(0, Fw);
  let lo = 0, hi = Math.max(0.05, 0.2 * U + 1); for (let i = 0; i < 40; i++){ const m = (lo + hi) / 2; if (push(m) > hold(m)) lo = m; else hi = m; }
  const v = (lo + hi) / 2; return {e:v * Math.sin(a), n:v * Math.cos(a), v, a};
}
// the minute step: move her by the last minute's drift (b.drv, km a game minute, which the chart plotter and the 3D view draw her
// along), and work out the next: across the wind, held off the land by the engine (she never drifts ashore with someone awake aboard;
// asleep and alone is 15-energy.js sleepDrift), and jigging, driven back up over the ground she started on when she has drifted 400 m
// off it, as jiggers do (once a stop it is said)
// The engine runs her only with someone at the helm (Jonas 15.11.2026: «så lenge ingen står ved roret på en båt, så skal den jo ikke
// kunne gå av seg selv»; alone with the jig on the old wooden boat she sped back to where the jigging began). The run back up over the
// ground takes a hand of the crew at the helm while the others jig; alone at the rail there is nobody, so she drifts on, and the log says
// so once. Back to the gear and off the land take someone awake aboard, who leaves what they do for the helm. While the engine has her,
// b.lieHelm is the minute, and workCtx puts someone at the helm (13-work.js), so the deck shows who steers.
// (sw: how she turns with no way on, Jonas the same day: «når båten står i ro så vil den sakte men sikkert dreie på vinden». She falls off
// to where the wind's moment on her side is nothing: across it when the push is amidships, with her bow further off downwind when the
// windage sits forward (P.xw, the big boats with the wheelhouse forward); slowly, at a pace set by the wind's push on her and her yaw
// inertia: a time constant tau minutes at 8 m/s, longer in a light wind and for a big boat (the push goes as U², the moment of inertia
// as L⁴ against the arm and area as L²), and none under calm (min m/s). The 3D view and the chart turn her over the minute, lieTurn.)
// drogue: the share of the wind's drift left with the drift anchor out (EQUIP.drivanker; a start value: a drogue takes most of it off,
// manufacturers' tables give a half to three quarters), while she lies jigging
const LIE = {up:0.4, land:0.06, sw:{tau:4, min:1, maxTau:40}, drogue:0.35};
// the drift anchor is out: jigging, with one aboard (the boat's own equipment)
const lieDrogue = b => b.status === 'fishing' && !!(S.equip && S.equip.drivanker);
// someone to take the helm while the engine runs her lying still: why 'up' (back up over the jigging ground: a hand of the crew, since
// you or they stand at the rail jigging, and alone you are there yourself), else (to the gear, off the land) anyone awake aboard
// (an ocean vessel's watch on deck counts as hands, 04-crew.js lagOnDeck)
// Alone (Jonas 17.11.2026, on the plan with the wooden boat: «så drifter jeg avgårde mens jeg bruker juksa siden ingen kjører båten»;
// his choice, A: «Begge»): you reel in, take the helm and run her back up yourself, as one jigging alone does; the jig stands while you
// steer (workAssign puts you at the helm, so nobody is at the rail). Not while you jig by hand yourself («Jukse selv», window.jigActive):
// then you are at the rail and she drifts on (the 15.11 rule: she never runs off by herself while you stand there jigging)
function lieHelmCan(why){
  let lag = 0; try { lag = typeof lagOnDeck === 'function' ? lagOnDeck(S.t / 60, false).length : 0; } catch (e){}
  if (why === 'up') return crewAboard(S.t / 60).length + lag > 0 || (meAboard() && !asleep() && !(typeof window !== 'undefined' && window.jigActive));
  return gearLieCrew() || lag > 0;
}
// the heading she turns to lying still (radians, grid), and how much of the way she goes in a minute
function lieTurn(type, hd, D, U, drogue){
  const cal = dynCal(type), P = cal.P, off = drogue ? Math.PI : clamp(Math.PI / 2 - (P.xw || 0) / Math.max(1, P.L) * 10, 0.6, Math.PI / 2);   // (0.04 L forward: 68 degrees off downwind; on the drogue, bow to the wind)
  const to = [D.a + off, D.a - off].reduce((m, c) => Math.abs(dynAng(hd, c)) < Math.abs(dynAng(hd, m)) ? c : m);
  if (!(U > LIE.sw.min)) return {to:hd, k:0};
  const tau = clamp(LIE.sw.tau * (8 / U) ** 2 * Math.sqrt(Math.max(1, P.L) / 10), 0.5, LIE.sw.maxTau);
  return {to, k:1 - Math.exp(-1 / tau)};
}
// lying by her own gear (spilltest 3, U2; Jonas 05.11.2026, V2 B): she keeps within half a nautical mile of the nearest of her buoys
// (r), run back to a quarter mile (back) at five knots on the engine, and the alarm goes when she is a mile off (alarm)
const GEARLIE = {r:0.5 * NM, back:0.25 * NM, alarm:1 * NM, kn:5};
// the nearest of the vessel's own buoys: {d (km), p, s}, or null
function gearBuoyNear(p){ let best = null; for (const s of mySets()) for (const e of [s.a, s.b]){ if (!e) continue; const d = dist(p, e); if (!best || d < best.d) best = {d, p:e, s}; } return best; }
// someone awake aboard to work the engine: you (not asleep), or a hand not in the bunk
function gearLieCrew(){ return (meAboard() && !asleep()) || crewAboard(S.t / 60).length > 0; }
// the alarm: once when she goes from within a mile of her gear to beyond it while lying still or adrift (not when she sails off)
function gearWatch(b){
  const nb = gearBuoyNear(b.pos), far = !!(nb && nb.d > GEARLIE.alarm);
  if (far && !b.gearFar && ['idle', 'adrift', 'fishing'].includes(b.status)){
    log('Båten har drevet ' + fmt1(nb.d / NM) + ' nm fra blåsa.', 'The boat has drifted ' + fmt1(nb.d / NM) + ' nm from the buoy.', 'nav');
    if (hooks.onGearFar && !VTAG) hooks.onGearFar(nb);
  }
  b.gearFar = far;
}
function lieDrift(H){
  const b = S.boat, dv = b.drv, ok = ['fishing', 'idle', 'adrift'].includes(b.status) && !b.anch && !b.port && !b.gop && !helmOn() && !(typeof tutOn === 'function' && tutOn());
  b.drv = null; b.lieHelm = null; b.lieHd = null;
  if (!ok){ b.driftHome = null; return; }
  if (dv && dv.t === S.t - 1 && dv.st === b.status) b.pos = {x:b.pos.x + dv.x, y:b.pos.y + dv.y};
  if (!b.driftHome || b.driftHome.st !== b.status) b.driftHome = {x:b.pos.x, y:b.pos.y, st:b.status, said:false};
  let D; try { D = dynDrift(b.type, b.pos, H); } catch (e){ return; }
  const drg = lieDrogue(b); if (drg) D = {e:D.e * LIE.drogue, n:D.n * LIE.drogue, v:D.v * LIE.drogue, a:D.a};
  // she falls off across the wind (the nearer side), slowly, as the wind turns her (lieTurn); the 3D view and the chart turn her over the
  // minute from where she lay (b.lieHd, ui/04-panels-instruments.js livePose)
  { const h0 = b.heading || 0; let U = 0; try { U = windAt(H, b.pos); } catch (e){} const T = lieTurn(b.type, h0, D, U, drg);
    b.heading = ((h0 + dynAng(h0, T.to) * T.k) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); b.lieHd = {t:S.t, h0, h1:b.heading}; }
  const home = b.driftHome;
  // lying by her gear: beyond half a mile, the engine runs her back up to within a quarter (V2 B); asleep and alone, or with no diesel,
  // she drifts as before
  if (b.status === 'idle'){
    const nb = gearBuoyNear(b.pos);
    if (!nb || nb.d <= GEARLIE.back) b.lieRun = false; else if (nb.d > GEARLIE.r) b.lieRun = true;
    if (nb && b.lieRun && b.fuel > 0 && lieHelmCan('gear')){
      const st = Math.min(nb.d - GEARLIE.back * 0.8, GEARLIE.kn * NM / 60), to = {x:b.pos.x + (nb.p.x - b.pos.x) / nb.d * st, y:b.pos.y + (nb.p.y - b.pos.y) / nb.d * st};
      let clear = true; try { clear = !isLand(to) && !groundCheck(b.pos, to); } catch (e){}
      if (clear){
        fuelUse(b, fuelLph(GEARLIE.kn, windAt(H)) / 60);
        if (!home.lieSaid){ home.lieSaid = true; log('Ligger på været ved blåsa: motoren holder båten innen en halv nautisk mil.', 'Lying by the buoy: the engine keeps her within half a nautical mile.', 'nav'); }
        b.heading = Math.atan2(nb.p.x - b.pos.x, -(nb.p.y - b.pos.y)); b.lieHd = null; b.lieHelm = S.t;
        b.drv = {x:to.x - b.pos.x, y:to.y - b.pos.y, t:S.t, st:b.status, up:true}; return;
      }
    }
  }
  // jigging: back up over the ground (at five knots, the minute it takes)
  // (only with a hand at the helm: alone at the rail she drifts on, and it is said once)
  if (b.status === 'fishing' && dist(b.pos, home) > LIE.up){
    if (lieHelmCan('up') && b.fuel > 0){
      const d = dist(b.pos, home), st = Math.min(d, 5 * NM / 60);
      if (!home.said){ home.said = true; const solo = !crewAboard(S.t / 60).length;
        log(solo ? 'Du har drevet av feltet. Sveiver inn juksa, kjører opp igjen og driver over det på nytt.' : 'Dere har drevet av feltet. Kjører opp igjen og driver over det på nytt.',
          solo ? 'You have drifted off the ground. Reeling in, running back up and drifting over it again.' : 'You have drifted off the ground. Running back up to drift over it again.', 'nav'); }
      b.heading = Math.atan2(home.x - b.pos.x, -(home.y - b.pos.y)); b.lieHd = null; b.lieHelm = S.t; b.drv = {x:(home.x - b.pos.x) / d * st, y:(home.y - b.pos.y) / d * st, t:S.t, st:b.status, up:true}; return;
    }
    if (!home.off){ home.off = true; log('Båten har drevet av feltet. Ingen står ved roret, så hun driver videre.', 'The boat has drifted off the ground. Nobody is at the helm, so she drifts on.', 'nav'); }
  }
  // (only what turns with the tide, tx and ty: the coastal current runs one way and would take a boat left lying far down the coast)
  const C = curBoat(b, H), step = {x:(D.e + C.tx) * 60 / 1000, y:(-D.n + C.ty) * 60 / 1000}, km = Math.hypot(step.x, step.y), to = {x:b.pos.x + step.x, y:b.pos.y + step.y};
  if (km < 1e-4) return;
  let held = true; try { held = isLand(to) || !!groundCheck(b.pos, to) || coastDist(to) < LIE.land; } catch (e){}
  // (nobody awake to take the helm, or no diesel: no engine, she lies against the land as one adrift does)
  if (held){ const eng = b.status !== 'adrift' && b.fuel > 0 && lieHelmCan('land'); if (eng) b.lieHelm = S.t; if (!home.held){ home.held = true; log(!eng ? 'Båten driver mot land og blir liggende der.' : 'Båten driver mot land. Motoren holder henne unna.', !eng ? 'The boat drifts in toward the land and lies there.' : 'The boat drifts toward the land. The engine holds her off.', 'nav'); } return; }
  b.drv = {x:step.x, y:step.y, t:S.t, st:b.status};
}
// ---- the state, in step with the boat the rest of the game reads ----
function dynState(b){
  let d = b.dyn; const fresh = !d;
  if (fresh) d = b.dyn = {u:0, v:0, r:0, dl:0, psi:0, X:0, Y:0, wall:0, key:null};
  // someone else moved her (a minute step while the model was not running, a tow, «Sitter båten fast?», a new vessel): start from there
  if (fresh || d.key !== b.type || Math.hypot(d.X - b.pos.x * 1000, d.Y - b.pos.y * 1000) > 4 || Math.abs(dynAng(d.psi, b.heading || 0)) > 0.3){
    d.X = b.pos.x * 1000; d.Y = b.pos.y * 1000; d.psi = b.heading || 0; d.u = (b.v || 0) * KN_MS; d.v = 0; d.r = 0; d.dl = 0; d.thr = null; d.key = b.type;
    // the line she followed stays when it is the same plan and she is still on it (a stall of slow frames, not a move)
    const T = DYN.line; if (!(T && T.plan === S.plan && T.n === (S.plan ? S.plan.wps.length : -1) && (() => { T.s = dynLineProj(T, d.X, d.Y, 0, 1e9); const q = dynLineAt(T, T.s); return Math.hypot(q[0] - d.X, q[1] - d.Y) < 30; })())) DYN.line = null;
  }
  return d;
}
function dynWrite(b, d){
  d.psi = ((d.psi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  b.pos = {x:d.X / 1000, y:d.Y / 1000}; b.heading = d.psi; b.v = Math.abs(d.u) / KN_MS; d.wall = Date.now();
}
// the model has the boat: the tick runs it, the minute step leaves her be (sail), the chart and the 3D view draw its pose
function dynCan(){
  const b = S.boat; if (!DYN.on || typeof SIMREADY === 'undefined' || !SIMREADY || simRate() > 12 || b.status !== 'sailing' || b.anch) return false;   // (at anchor she lies to it until it is up: 06e-anchor.js)
  if (b.hopHold && hopHeld(b)) return false;   // (held for a hop, core/06j-hopp.js: she does not move)
  if (helmOn()) return !sleepAlone();
  return !!(S.plan && S.plan.wps.length > S.plan.idx);
}
function dynLive(){ const b = S.boat; return DYN.on && b === DYN.b && !!b.dyn && b.status === 'sailing' && !b.anch; }
// (time caught up, more than ten minutes behind the world's clock after a freeze or a long wait for the map, plays the kinematic
// minute step with the model off (tick): she keeps the world's clock, and the model starts again from where that put her)
// where she is now, a little on from the last tick (km, radians, m/s): for the chart plotter and the 3D view
// (waiting for the map, she stands where the last frame had her: the way on from the tick is frozen at the hold, never taken back)
function dynPose(){
  const d = S.boat.dyn, s = clamp(((DYN.hold ? DYN.holdAt : wallNow()) - d.wall) / 1000, -0.02, 0.5) * simRate(), c = Math.cos(d.psi), sn = Math.sin(d.psi);
  // (over the ground the stream is added, F8b: gE, gN her way east and north; sog and cog are the GPS's)
  const E = DYN.env, sd = E && E.cm ? (E.side == null ? 1 : E.side) : 0, cx = sd ? E.cx * sd : 0, cy = sd ? E.cy * sd : 0, gE = d.u * sn + d.v * c + cx, gN = d.u * c - d.v * sn - cy;
  const X = d.X + gE * s, Y = d.Y - gN * s, psi = d.psi + d.r * s;
  return {x:X / 1000, y:Y / 1000, hd:psi, cog:sd ? (Math.hypot(gE, gN) > 0.3 ? Math.atan2(gE, gN) : psi) : Math.abs(d.u) > 0.3 ? psi + Math.atan2(d.v, Math.abs(d.u)) : psi, u:d.u, v:d.v, r:d.r, spd:Math.abs(d.u), sog:sd ? Math.hypot(gE, gN) : Math.abs(d.u)};
}
// the model has just stopped her and nothing else has moved her since (not a minute step caught up, not «Sitter båten fast?»): the 3D
// view stands where the model left her for the moment before it takes the simulation's spot (view3d updateBoat)
function dynRest(){ const b = S.boat, d = b.dyn; return !!d && Date.now() - d.wall < 4000 && Math.hypot(d.X - b.pos.x * 1000, d.Y - b.pos.y * 1000) < 5; }
function dynLivePose(frac){ const q = dynPose(); return {p:{x:q.x, y:q.y}, hd:q.hd, frac, idx:S.plan ? S.plan.idx : 0}; }
// «Stopp»: how far ahead (km) she needs to come to a gentle stop from the way she has
function dynHaltNeed(){ const b = S.boat; if (!dynLive()) return 0; return (dynEaseDist(dynCalOf(b), Math.max(0, b.dyn.u)) + 5) / 1000; }
// ---- the tick ----
function dynTick(dt){
  const b = S.boat; DYN.on = true;
  if (!dynCan()){ DYN.b = null; DYN.hold = false; return; }
  const d = dynState(b); DYN.b = b;
  // the map round her is not in yet: she waits where she is, as the minute step does (the 3D view keeps her, no follower takes over)
  // (the time she waited, up to twenty seconds, is made up at double pace once the map is in: no jump, and she keeps the world's clock
  // as nearly as the minute step does)
  if (typeof simAreaReady === 'function' && !simAreaReady()){ if (!DYN.hold){ DYN.hold = true; DYN.holdAt = Date.now(); } DYN.debt = Math.min(DYN.debt + dt, 20); return; }
  DYN.hold = false;
  const dtR = Math.min(dt, 20), pay = Math.min(DYN.debt, dtR), dtG = (dtR + pay) * simRate(); DYN.debt -= pay;   // a stall longer than twenty seconds is lost (the minute steps go on without moving her)
  if (helmOn()) dynHelm(d, dtG); else dynAuto(d, dtG);
}
// the minute step while the model has her: the fuel, the detours round obstacles, the distance for the tattoos; nothing moves her
function dynMinute(H, W){
  const b = S.boat, pl = S.plan;
  if (b.fuel <= 0){ b.fuel = 0; b.status = 'adrift'; b.v = 0; log('Tom for drivstoff. Båten driver.', 'Out of fuel. The boat is adrift.'); return; }
  if (!DYN.hold) fuelUse(b, fuelLph(b.v || 0, W) / 60);   // (held for the map, or a minute caught up without moving her: no fuel)
  if (pl){ obsSail(pl, b); landSail(pl, b); }
  if (meAboard() && DYN.nm){ tatAdd('nm', DYN.nm); DYN.nm = 0; }
}
// ---- by hand (16-helm.js): the throttle and the rudder into the model ----
function dynHelm(d, dtG){
  const b = S.boat, h = S.helm, cal = dynCalOf(b), P = cal.P, H = S.t / 60;
  if (Math.abs(h.v * KN_MS - d.u) > 0.6) d.u = h.v * KN_MS;   // set from outside (a test, «Fortøy» undone): the model takes it
  const E = dynEnv(b, d, cal, H, dtG), capF = E.capF, X0 = d.X, Y0 = d.Y, O = dynObsNear(d.X, d.Y, P.L + Math.abs(d.u) * dtG + 20);
  for (let left = dtG; left > 1e-6;){ const s = Math.min(DYN_H, left); left -= s; dynBank(E, d, P); dynInt(P, d, h.thr, h.rud, s, capF, E); dynMove(d, s, E); dynContact(b, d, P, O); }
  if (!h.thr && Math.abs(d.u) < 0.04){ d.u = 0; }
  // land: over 3 knots she runs aground on it, slower she comes to a stop against it (every 10 m, then the thin breakwaters, then
  // the depth under her)
  const a = {x:X0 / 1000, y:Y0 / 1000}, to = {x:d.X / 1000, y:d.Y / 1000}, dd = Math.hypot(d.X - X0, d.Y - Y0) / 1000;
  if (dd){ const n = Math.max(1, Math.ceil(dd / 0.01)); let last = a;
    for (let i = 1; i <= n; i++){ const q = {x:a.x + (to.x - a.x) * i / n, y:a.y + (to.y - a.y) * i / n};
      if (isLand(q)){ if (Math.abs(d.u) > 3 * KN_MS){ dynWrite(b, d); runAground(last); helmOff(); } else { d.X = last.x * 1000; d.Y = last.y * 1000; d.u = 0; d.v = 0; dynWrite(b, d); h.v = 0; } return; } last = q; }
    if (coastSegHit(a, to)){ if (Math.abs(d.u) > 3 * KN_MS){ dynWrite(b, d); runAground(a); helmOff(); } else { d.X = X0; d.Y = Y0; d.u = 0; d.v = 0; dynWrite(b, d); h.v = 0; } return; }
    const gp = groundCheck(a, to, dynSquat(P, d.u, E.narrow));   // (her squat at the way she has, F5)
    // the sea ice (H1b R5): she stops at the edge, she does not run aground on it; said once a minute at most
    if (gp && gp.ice){ d.X = X0; d.Y = Y0; d.u = 0; d.v = 0; dynWrite(b, d); h.v = 0; if (!(HELM.iceT > S.t - 1)){ HELM.iceT = S.t; const w = seaIceWords(gp); log(w.no, w.en, 'nav'); if (typeof toast === 'function') toast(S.lang === 'en' ? w.en : w.no); } return; }
    if (gp){ dynWrite(b, d); runAground(gp); helmOff(); return; } }
  dynWrite(b, d); h.v = d.u / KN_MS; h.yaw = d.r;
  fuelUse(b, fuelLph(Math.abs(h.v), windAt(H)) / 3600 * dtG);
  HELM.nm += dd / gridScale(a) / NM; if (HELM.nm > 0.05 && meAboard()){ tatAdd('nm', HELM.nm); HELM.nm = 0; }
}
// ---- the line she follows: out from the quay, the route's waypoints as the chart plotter draws them, to the harbour she ends in ----
const dynSig = pl => pl.wps.length + ':' + pl.wps.map(w => w.x.toFixed(5) + ',' + w.y.toFixed(5) + (w.port || '')).join(';');
function dynLineBuild(pl, dep){
  const b = S.boat, P = [], wpAt = [];
  const add = (x, z) => { const q = P[P.length - 1]; if (!q || Math.hypot(q[0] - x, q[1] - z) > 0.3) P.push([x, z]); };
  let back = 0, hd0 = null, iOut = 0;
  // (from Father's naust straight out to the route's first point: the harbour point is the plant's, tilbakemelding #20)
  if (dep){ const pt = portById(dep.pid), w0 = pl.wps[pl.idx], from = dep.naust && w0 ? w0 : pt && pt.p; let W = from ? berthPath(from, dep.bp).reverse() : [dep.bp];
    // from the last turn out from the quay straight on to the route when that is clear (Senjahopen: the harbour point lies by the berth)
    // (and clear of the shallows and the rocks as the route's own legs are: the route's first leg was found from the harbour point, and
    // the shortcut from the turn passed 10 m from a rock the route kept clear of, Klokkarstua verft, 15.11.2026, tests/allesteder.py: she
    // stopped for it and found no way round)
    const w1 = pl.wps[pl.idx], sc = W.length > 2 ? W[W.length - 2] : null, scBad = () => { try { return !!groundCheck(sc, w1) || !!rockOnLeg(sc, w1, 0.012); } catch (e){ return true; } };
    if (sc && w1 && berthClear(sc, w1, (dep.bp.Bb || 3) / 2) && !scBad()) W = W.slice(0, -1);
    for (const q of W) add(q.x * 1000, q.y * 1000); hd0 = dep.bp.hd; iOut = P.length - 1;
    if (P.length > 1) back = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]); }
  else add(b.pos.x * 1000, b.pos.y * 1000);
  // up to the first harbour on it: she docks there and the route is over (arrive)
  let iEnd = pl.wps.length - 1; for (let i = pl.idx; i < pl.wps.length; i++) if (pl.wps[i].port){ iEnd = i; break; }
  // (into Father's naust: the way in to its berth as the way out from it, berthPath, from astern of the berth and out from the quay, not
  // straight from the plant's harbour point onto the quay: at Sandshamn, Risør, Engenes and four more the 14.99 m boat came in from the
  // sea and struck the quay at 3-5 knots, steg 126, 15.11.2026, tests/allesteder.py with the way in)
  const bz = new Set();   // (the line's points on the way in to the naust: its corners are taken by the hands, below)
  for (let i = pl.idx; i <= iEnd; i++){ const w = pl.wps[i];
    if (w.berth === 'naust' && w.port && P.length){ let bp = null; try { bp = berthPose(w.port, b.type, 'naust'); } catch (e){}
      // (and the line ends where the way along the quay begins, astern of the berth and out from it, as a harbour's ends at its point in
      // the water: within two of her lengths there and slow, the lines take her in, arrive; the berth itself is at the quay's face, and
      // she ran onto it at 4 knots at Engenes)
      if (bp){ const q = P[P.length - 1], fq = {x:q[0] / 1000, y:q[1] / 1000};
        // (her beam and three metres from the plant's quay and the piers: at Engenes the way along the quay passed 4 m from the plant's
        // quay's end, and she struck it in the turn; when no such way is found, the berth's own margin as on the way out)
        let W = berthPath(fq, bp, (bp.Bb || 3) + 3); if (W.length <= 3 && (!berthClear(fq, W[1], (bp.Bb || 3) + 3, (bp.Bb || 3) + 3) || groundCheck(fq, W[1]))) W = berthPath(fq, bp);
        // (nor a way round far longer than the berth's own: at Smøla nord the wider way went 400 m north round the island's point into
        // the shallows, and the way round those all round the island)
        else { const W0 = berthPath(fq, bp), len = A => A.reduce((s, q, k) => k ? s + dist(A[k - 1], q) : 0, 0); if (len(W) > 1.5 * len(W0) + 0.05) W = W0; }
        // (not where the way along the quay goes far round where the route's own last point lies off the berth: naustTarget's point 116 m
        // from it at Flatanger, and the way from there doubled back on itself, a hairpin she stood still in, allesteder 15.11.2026; she
        // goes to the route's point as before, and the mooring takes her in)
        // (only where it truly doubles back, a turn of over 150 degrees in it, or runs over ground she stops for (at Flatanger the way
        // round went 320 m for 148 m straight, and set off back the way she came): the length alone sent Botnhamn,
        // Sørvågen, Risør and five more naust in from the route's point straight onto the quay, allesteder-13, whose ways were 1.4-2.6 times)
        const lw = (A => A.reduce((s0, q0, k) => k ? s0 + dist(A[k - 1], q0) : 0, 0))(W), lp = dist(fq, w) + dist(w, bp);
        // (and the turn from the route's last leg onto it, where it goes straight back, over 175 degrees: at Flatanger the way set off
        // back along that leg, the line lay on itself there, and her place on it, dynLineProj, fell back onto the leg in for good, so the hands held her at the turn)
        const Wj = P.length > 1 ? [{x:P[P.length - 2][0] / 1000, y:P[P.length - 2][1] / 1000}].concat(W) : W;
        const pin = Wj.some((r, k) => k > 0 && k < Wj.length - 1 && Math.abs(dynAng(Math.atan2(r.x - Wj[k - 1].x, Wj[k - 1].y - r.y), Math.atan2(Wj[k + 1].x - r.x, r.y - Wj[k + 1].y))) > (Wj === W || k > 1 ? 2.6 : 3.05));
        // (and ground on it anywhere, long or not: at Seløy the way along the quay from a point after a replan ran 480 m over the shallows
        // at the lowest tide, «Grunt vann forut» and no way round, 16.11.2026; the route's own point is searched for depth, the way is not)
        const shoal = W.slice(1).some((r, k) => groundCheck(W[k], r)), long = shoal || (lw > 1.25 * lp + 0.03 && pin);
        if (W.length > 2 && !long){ bz.add(P.length - 1); for (const r of W.slice(1, -1)){ add(r.x * 1000, r.y * 1000); bz.add(P.length - 1); } wpAt[i] = P.length - 1; continue; } } }
    add(w.x * 1000, w.y * 1000); wpAt[i] = P.length - 1; }
  dynLineNudge(P, wpAt, pl, iEnd, dep ? iOut : 0, bz);
  const HZ = dynLineHarb(P, wpAt, pl, iEnd, dep ? iOut : 0, dep && iOut >= 1 ? 1 : 0, bz);
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const stops = []; for (let i = pl.idx; i <= iEnd; i++) if (wpStop(pl.wps[i]) && wpAt[i] != null) stops.push({i, s:L[wpAt[i]]});
  // the corners: where the line turns, by how much
  const corners = []; for (let i = 1; i < P.length - 1; i++){ const a = Math.atan2(P[i][0] - P[i - 1][0], -(P[i][1] - P[i - 1][1])), c = Math.atan2(P[i + 1][0] - P[i][0], -(P[i + 1][1] - P[i][1])), th = Math.abs(dynAng(a, c)); if (th > 0.2) corners.push({s:L[i], th, i, bz:bz.has(i)}); }
  // the hands take her round the sharp turns just past the harbour point too (13.11.2026, tests/allesteder.py, steg 126 AS1: the 21 m
  // coastal vessel at Vannvåg met a hairpin 15 m past it, crept into it at a knot and a half with no bite in her rudder and went round
  // in a circle 100 m wide, onto the marks of the lead; a turn of more than 60 degrees within three of her lengths of the last one)
  let sOut = L[HZ.out != null ? HZ.out : iOut]; const Lb = (dep && dep.bp.Lb) || 8;
  if (dep) for (const c of corners){ if (c.s <= sOut) continue; if (c.s - sOut > 3 * Lb || c.th < Math.PI / 3) break; sOut = c.s; }
  const bzS = bz.size ? L[Math.min(...bz)] : null;
  // (the coast's piers and quays round her ends not decoded yet, vecTile: the line is laid again when they are, dynAuto, while she is
  // still backing off the berth; at Ålesund utstyrsbutikk the way out was laid before the breakwater by it was in, and ran onto its head)
  let vecWait = false; try { const T0 = MAPD.man ? MAPD.man.tile * 1000 : 0, chk = q => { if (!T0) return; for (const dx of [-500, 500]) for (const dz of [-500, 500]){ const tx = Math.floor((q[0] + dx) / T0), ty = Math.floor((q[1] + dz) / T0); if (vecHas(tx, ty) && !vecTile(tx, ty)) vecWait = true; } };
    if (dep) chk(P[0]); } catch (e){}   // (the end: the line is laid again 600 m from it, dynAuto)
  return {plan:pl, n:pl.wps.length, sig:dynSig(pl), chk:0, P, L, end:L[L.length - 1], wpAt, stops, corners, bzS, iEnd, back, turnL:Math.max(10, Lb * 1.5), hd0, sOut, s:0, gchk:0, ghit:null, hzS:HZ.in != null ? L[HZ.in] : null, dep, vecWait, vecVer:VEC.ver};
}
// Off the shore by half her beam and 3 m where the line passes nearer (pattern 2 of the autonav routine, 18.11.2026: the route's legs are
// checked along their middle, groundCheck and legClear, and passed 1-5 m off an islet at Vallersund and the shore at Forsøl, where her
// side struck it at 10-21 knots): on each leg outside the harbours (dynLineHarb has those), the point of each run of the leg nearer the
// coast than that (coastDistM, every 8 m) is moved away from it, to the side with no land, as a new point of the line; not where there is
// land on both sides (a sound narrower than that: as the route has it), nor where the moved point would be nearer land. The route's points
// keep their places on the line (wpAt)
function dynLineNudge(P, wpAt, pl, iEnd, iOut, bz){
  // (not within 400 m of her ends, where dynLineHarb looks at the way among the piers (a rorbu and the naust are no harbour to inHarbour),
  // nor on the way in to Father's naust (bz))
  const E0 = P[0], eI = wpAt[iEnd], E1 = eI != null ? P[eI] : P[P.length - 1], bzMin = bz && bz.size ? Math.min(...bz) : Infinity;
  const far = (x, z) => Math.hypot(x - E0[0], z - E0[1]) >= 400 && Math.hypot(x - E1[0], z - E1[1]) >= 400;
  const out = [P[0]], map = [0];
  for (let i = 1; i < P.length; i++){
    if (i > iOut && i <= bzMin) for (const q of landPush(out[out.length - 1], P[i], far)) out.push(q);
    out.push(P[i]); map.push(out.length - 1);
  }
  if (out.length === P.length) return;
  for (let i = pl.idx; i <= iEnd; i++) if (wpAt[i] != null) wpAt[i] = map[wpAt[i]];
  if (bz && bz.size){ const nb = [...bz].map(k => map[k]); bz.clear(); for (const k of nb) bz.add(k); }
  P.length = 0; P.push(...out);
}
// the points (metres) to put between a and b (metres) so the leg keeps half her beam and 3 m off the coast, as dynLineNudge has it: the
// nearest point of each run nearer the coast than that, moved away from it, when there is land on that side only, and the two new legs are
// as clear of land, of the things a route keeps clear of and of the ground as a route's legs are. ok(x, z): where the leg may be looked at
// (coastDistM knows only the tiles whose chart is in: there nothing is moved)
function landPush(a, b, ok){
  const need = (BOAT.beam || 3) / 2 + 3, km = (x, z) => ({x:x / 1000, y:z / 1000}), out = [];
  const legOk = (u, v) => { try { const p = km(u[0], u[1]), q = km(v[0], v[1]); return legClear(p, q) && obsClear(p, q) && !groundCheck(p, q) && !coastSegHit(p, q); } catch (e){ return false; } };
  const cd = (x, z) => { try { const d = coastDistM(km(x, z), need + 2); return d < 0 ? 1e9 : d; } catch (e){ return 1e9; } };
  const land = (x, z) => { try { return isLand(km(x, z)); } catch (e){ return true; } };
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), n = Math.floor(L / 8); if (n < 2) return out;
  const ux = dx / L, uz = dz / L, nx = -uz, nz = ux; let run = null;
  const flush = () => { if (!run) return; const [x, z, d] = run; run = null;
    const lf = land(x + nx * need, z + nz * need), rt = land(x - nx * need, z - nz * need); if (lf === rt) return;
    const sg = lf ? -1 : 1, q = [x + sg * nx * (need - d + 1), z + sg * nz * (need - d + 1)];
    if (land(q[0], q[1]) || cd(q[0], q[1]) < d + 0.5 || inHarbour(km(q[0], q[1])) || !legOk(out.length ? out[out.length - 1] : a, q) || !legOk(q, b)) return; out.push(q); };
  for (let k = 1; k < n; k++){ const x = a[0] + dx * k / n, z = a[1] + dz * k / n; if (k * L / n < 10 || (n - k) * L / n < 10){ flush(); continue; }
    const d = inHarbour(km(x, z)) || (ok && !ok(x, z)) ? 1e9 : cd(x, z); if (d < need){ if (!run || d < run[2]) run = [x, z, d]; } else flush(); }
  flush(); return out;
}
// and in the minute step, the leg she is on and the next (5 km at most), once a leg and every 5 km she sails: the coast of a tile is in only
// as she comes near it, and the line was laid before (the kontroll 18.11.2026; laying the whole line again in a new tile put the 3D boat
// back along it, trackfollow). The points go into the route as a way round does (obsSail), so the line takes them
function landSail(pl, b){
  if (pl.idx >= pl.wps.length || pl.replan) return;
  const key = pl.idx + '|' + pl.wps.length + '|' + Math.round(b.pos.x / 5) + ',' + Math.round(b.pos.y / 5); if (pl.landK === key) return; pl.landK = key;
  let end = null; for (let i = pl.idx; i < pl.wps.length; i++) if (pl.wps[i].port){ end = pl.wps[i]; break; }
  const ok = (x, z) => Math.hypot(x / 1000 - b.pos.x, z / 1000 - b.pos.y) >= 0.1 && !(end && Math.hypot(x / 1000 - end.x, z / 1000 - end.y) < 0.4);
  let from = b.pos, left = 5;
  for (let i = pl.idx; i < pl.wps.length && left > 0; i++){ const w = pl.wps[i], L = dist(from, w);
    if (L <= left){ const add = landPush([from.x * 1000, from.y * 1000], [w.x * 1000, w.y * 1000], ok);
      if (add.length){ pl.wps.splice(i, 0, ...add.map(q => ({x:q[0] / 1000, y:q[1] / 1000, port:null, fish:0, obs:true}))); if (pl.unsafe) pl.unsafe.splice(i, 0, ...add.map(() => false)); pl.landK = pl.idx + '|' + pl.wps.length + '|' + Math.round(b.pos.x / 5) + ',' + Math.round(b.pos.y / 5); return; } }
    left -= L; if (wpStop(w)) break; from = w; }
}
// The line's last 400 m in to a harbour and its first 400 m out from the quay, where they pass within half her beam and a metre of a
// pier, a quay, a floating dock or a boat lying there (11b-obstacles.js fixLegOk): the way among them over a 4 m grid instead, fixWay
// (the autonav routine, 18.11.2026: 95 % of the touches by a quay were within 300 m of the route's ends, the route's legs passing
// through what is by the harbour point). The route's points in the stretch it stands in for are passed where it begins (wpAt); a stop
// in it, and the way in to Father's naust (its own, berthPath), are left as they were
// (iFrom: where the check out begins, the point she backs to from the berth (berthPath's PL): the way from there to the harbour point
// is the berth's way, and it ran by piers and floating docks the hands then took her through, Uthaug, Ålesund, Dønna)
function dynLineHarb(P, wpAt, pl, iEnd, iOut, iFrom, bz){
  const B = BOAT.beam || 3, m = B / 2 + 1.5, look = 400, pilot = 200, km = q => ({x:q[0] / 1000, y:q[1] / 1000});
  // (and the ground as the route's legs ask it, outside the harbours: the hands do not stop for it)
  const Lb = BOAT.len || 10, corners = (i0, i1) => fixCornersOk(P.slice(i0, i1 + 1).map(km), Lb, B);
  const bad = (i0, i1) => { for (let i = i0 + 1; i <= i1; i++){ if (!fixLegOk(km(P[i - 1]), km(P[i]), m - 0.5)) return true; let g = null; try { g = groundCheck(km(P[i - 1]), km(P[i])); } catch (e){ return true; } if (g) return true; } return !corners(i0, i1); };
  const stopIn = (k0, k1) => { for (let i = pl.idx; i <= iEnd; i++) if (wpAt[i] != null && wpAt[i] > k0 && wpAt[i] < k1 && wpStop(pl.wps[i])) return true; return false; };
  // (with room first, her beam and three metres either side, else half her beam and a metre and a half: the snekke at Dønna was led
  // through a gap of six metres between two floating docks and touched one in the turn)
  // (the margins tried, widest first: half her length beside her for a long boat, whose corners then swing clear; the first way whose
  // corners are clear, fixCornersOk, else the widest found)
  // (and last half her beam and half a metre: a sound as narrow as Brosundet in Ålesund, by the breakwater's head, the hands take her
  // through at a knot and a half, clear of it)
  const swap = (k0, k1) => { const F = fixWay(km(P[k0]), km(P[k1]), [Math.max(B / 2 + 3, Lb / 2 + 1), B / 2 + 3, m, B / 2 + 0.5], w => fixCornersOk(w, Lb, B)); if (!F) return -1; const W = F.W;
    const ins = W.slice(1, -1).map(q => [q.x * 1000, q.y * 1000]), d = ins.length - (k1 - k0 - 1); P.splice(k0 + 1, k1 - k0 - 1, ...ins);
    for (let i = pl.idx; i <= iEnd; i++) if (wpAt[i] != null){ if (wpAt[i] > k0 && wpAt[i] < k1) wpAt[i] = k0; else if (wpAt[i] >= k1) wpAt[i] += d; }
    if (bz && bz.size){ const nb = [...bz].map(q => q >= k1 ? q + d : q); bz.clear(); for (const q of nb) bz.add(q); }   // (the way in to the naust after it: moved with it; never in it, bzMin)
    return k1 + d; };
  const bzMin = bz && bz.size ? Math.min(...bz) : Infinity;
  // (among the piers the model does not hold a line closely enough: a 15 m boat swung her bow 4-5 m out in the turn off the quay at
  // Ålesund onto a breakwater's head the line passed clear of, a snekke touched a floating dock in the gap she was led through at Dønna.
  // The hands take her along a way found here, as out from the quay and in to the naust, the whole of it (R.in, R.out: the line's points
  // where it begins and ends); a line that is clear as it is (its legs, the ground and its corners, bad), a boat under 14 m sails herself
  // at harbour speed (Jonas 18.11.2026: the small boats crawled over long stretches at under three knots), and a bigger one, which swings
  // wide in a turn, is taken its last 200 m in and first 200 m out (on her own the 38 m purse seiner swung onto a breakwater at Oldervik
  // at 3.9 knots, the hunt the same day))
  const R = {in:null, out:null}, along = (k, dir, len, lim) => { let s = 0; while ((dir > 0 ? k < lim : k > lim) && s < len){ const k2 = k + dir; s += Math.hypot(P[k2][0] - P[k][0], P[k2][1] - P[k][1]); k = k2; } return k; };
  try {
    // out: on along the line from where the way from the quay ends
    // (not into the way in to Father's naust, bz: that is its own, berthPath, and the hands take her along it)
    if (iOut > 0){ const e2 = Math.min(wpAt[iEnd] != null ? wpAt[iEnd] : P.length - 1, bzMin - 1), f = iFrom > 0 && iFrom < iOut ? iFrom : iOut; let k = along(iOut, 1, look, e2);
      // (a way found here: the hands take her the whole of it; a line clear as it was: its first 200 m on from the way out from the quay)
      if (k > iOut && !stopIn(f, k)){ let sw = false, ok = !bad(f, k) ? k : (sw = true, swap(f, k));
        if (ok < 0 && f < iOut){ sw = false; ok = !bad(iOut, k) ? k : (sw = true, swap(iOut, k)); }
        if (ok >= 0) R.out = sw ? ok : Lb >= 14 ? along(iOut, 1, pilot, ok) : null; } }
    // in: back along the line from the harbour point (not into the way out from the quay)
    const w = pl.wps[iEnd], e = wpAt[iEnd], i0 = R.out != null ? R.out : iOut;
    // (only where the harbour is within 1.5 km along the line: further off, the line is laid again 600 m from it, dynAuto, with the
    // vessels lying there then, and the search is not done twice)
    let toE = 0; if (e != null) for (let i = 1; i <= e && toE <= 1500; i++) toE += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (w && w.port && w.berth !== 'naust' && e != null && e > i0 && toE <= 1500){ const k = along(e, -1, look, i0);
      if (k < e && !stopIn(k, e)){ const sw = bad(k, e); if (sw ? swap(k, e) >= 0 : Lb >= 14) R.in = sw ? k : along(wpAt[iEnd], -1, pilot, k); } }
  } catch (e){ console.error('dynLineHarb', e); }
  return R;
}
// the hands take her on along the line past the shallows it runs into (500 m at most) and three of her lengths: south of Egersund the line
// ran on over water too shallow for her at that tide for 70 m, and the ground ahead stopped her again 3 m past where the hands left her.
// Counted as held
function dynHandsPast(T, pl, L){
  const st = T.stops.find(q => q.i >= pl.idx);
  // (past shallow water only: land, a breakwater or a skerry thinner than the steps, or the ice, on the line ahead, and the hands do not
  // take her, false; the kontroll of steg 126, 14.11.2026: a leg called safe when the route was made can cross an islet once she has been
  // set off it)
  let sG = T.s; try { const tl = tideCD(S.t / 60); let clr = 0; for (let s = T.s; s < T.s + 500 && clr < 3 && s < T.end - 10; s += 10){ const p0 = dynLineAt(T, s), p1 = dynLineAt(T, s + 10), q1 = {x:p1[0] / 1000, y:p1[1] / 1000}, g = groundCheck({x:p0[0] / 1000, y:p0[1] / 1000}, q1);
    if (g){ if (g.ice || g === q1 || isLand(g) || !(depthNav(g) + tl < BOAT.draft)) return false; sG = s + 10; clr = 0; } else clr++; } } catch (e){ return false; }
  T.assist = Math.min(T.end - 1, (st ? st.s : T.end) - 0.5, Math.max(T.s + Math.max(60, 3 * L), sG + 20)); T.prog = {s:T.s, t:S.t}; dynHands(T, 'held'); return true;
}
// the same from sailReplan (05-vessels.js): the way round found before on this leg was the leg itself, no point put in, so a search again
// would give the same (Træna utstyrsbutikk, 14.11.2026). True when the model has her and the hands took her
function dynHandsOn(pl){ const T = DYN.line; if (!dynLive() || !T || T.plan !== pl) return false; return dynHandsPast(T, pl, BOAT.len || 10); }
// the hands start (T.assist set ahead of her): counted by kind for the tests (knock, stuck, held, tight)
function dynHands(T, k){ if (!(T.assist > T.s)) return; DYN.hands = (DYN.hands || 0) + 1; DYN.handsK = DYN.handsK || {}; DYN.handsK[k] = (DYN.handsK[k] || 0) + 1; }
// a sharp corner (over 60 degrees) with a mark, a pile or a bridge's pier on the outside of the turn, where she swings out by about her
// radius (2.5 lengths): within two of her lengths, half her beam and 4 m of the first five lengths of the leg out of it, on its outside
// (the marks the 21 m coastal vessel struck stood 40 m off the leg out, 84 m on, at Stamsund, and 25 m off, 90 m on, at Sund in Lofoten).
// A mark on the inside is dynAvoid's (she holds the leg until it is abeam). dynAuto's hands take her round those on the line (Jonas
// 14.11.2026, the last way out). Asked once, as she comes within two lengths of it (the packs within a few hundred metres of her are in)
function dynTight(T, c){
  const idx = obsIndex(), Lk = BOAT.len || 10, Rr = 2 * Lk + (BOAT.beam || 3) / 2 + 4, C = HIND.C, i = c.i, V = T.P[i], A = T.P[i - 1], Q = T.P[i + 1];
  const lo = Math.hypot(Q[0] - V[0], Q[1] - V[1]) || 1, ox = (Q[0] - V[0]) / lo, oz = (Q[1] - V[1]) / lo, far = Math.min(lo, 5 * Lk);
  // (the side she turns to, + to starboard; the outside of the leg out is the other: x east, z south, so starboard of (ox, oz) is (-oz, ox))
  const turn = dynAng(Math.atan2(V[0] - A[0], -(V[1] - A[1])), Math.atan2(ox, -oz)), out = turn > 0 ? -1 : 1;
  const ext = far + Rr;
  for (let gi = Math.floor((V[0] - ext) / C); gi <= Math.floor((V[0] + ext) / C); gi++) for (let gj = Math.floor((V[1] - ext) / C); gj <= Math.floor((V[1] + ext) / C); gj++)
    for (const o of idx.get(gi * 1048576 + gj) || []){ if (o.t !== 0) continue;
      const dx = o.x - V[0], dz = o.z - V[1], along = dx * ox + dz * oz, side = (dx * -oz + dz * ox) * out;   // (side > 0: on the outside)
      if (side <= 0 || along < -Rr || along > far + Rr) continue;
      const u = clamp(along, 0, far), dd = Math.hypot(dx - ox * u, dz - oz * u);
      if (dd - (o.r || 0) < Rr) return true; }
  return false;
}
function dynLineAt(T, s){
  const L = T.L, n = L.length; if (n < 2) return T.P[0]; s = clamp(s, 0, T.end);
  let lo = 1, hi = n - 1; while (lo < hi){ const m = (lo + hi) >> 1; if (L[m] < s) lo = m + 1; else hi = m; }
  const a = T.P[lo - 1], c = T.P[lo], f = (s - L[lo - 1]) / Math.max(1e-6, L[lo] - L[lo - 1]); return [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f];
}
// the leg (1..n-1) that s lies on, and a leg's heading
function dynSeg(T, s){ const L = T.L; let i = 1; while (i < L.length - 1 && L[i] < s) i++; return i; }
function dynSegHd(T, i){ const a = T.P[i - 1], c = T.P[i]; return Math.atan2(c[0] - a[0], -(c[1] - a[1])); }
function dynLineProj(T, x, z, s0, back = 30){
  let best = s0, bd = 1e18;
  for (let i = 1; i < T.P.length; i++){
    if (T.L[i] < s0 - back) continue; if (T.L[i - 1] > s0 + 4000) break;
    const a = T.P[i - 1], c = T.P[i], vx = c[0] - a[0], vz = c[1] - a[1], l2 = vx * vx + vz * vz || 1, u = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / l2, 0, 1);
    const d = (x - a[0] - u * vx) ** 2 + (z - a[1] - u * vz) ** 2; if (d < bd){ bd = d; best = T.L[i - 1] + u * Math.sqrt(l2); }
  }
  return best;
}
// the heading along the line at s, the corners rounded a little (and out from the quay: astern first, turning over to the way out)
function dynLineHd(T, s, r0){
  const r = Math.max(2, r0), A = dynLineAt(T, s - r), C = dynLineAt(T, s + r);
  let hd = Math.hypot(C[0] - A[0], C[1] - A[1]) > 0.1 ? Math.atan2(C[0] - A[0], -(C[1] - A[1])) : null;
  if (hd !== null && T.back > 0 && T.hd0 != null) hd = T.hd0 + dynAng(T.hd0, hd) * clamp((s - T.back) / T.turnL, 0, 1) ** 2 * (3 - 2 * clamp((s - T.back) / T.turnL, 0, 1));
  return hd;
}
// ground on the line ahead, within the way she needs to stop and a little more: looked for once a second
function dynGroundAhead(T, s, look){
  const n = T.P.length; let a = dynLineAt(T, s), sa = s, i = 1; while (i < n && T.L[i] <= s) i++;
  for (; i < n && sa < s + look; i++){
    const c = sa + (T.L[i] - sa) > s + look ? dynLineAt(T, s + look) : T.P[i], gp = groundCheck({x:a[0] / 1000, y:a[1] / 1000}, {x:c[0] / 1000, y:c[1] / 1000});
    if (gp) return {gp, s:sa + Math.hypot(gp.x * 1000 - a[0], gp.y * 1000 - a[1])};
    a = c; sa = Math.min(T.L[i], s + look);
  }
  return null;
}
// A mark, a pile or a bridge's pier near her way ahead (13.11.2026, tests/allesteder.py, steg 126 AS1: the 21 m coastal vessel on Autonav
// rounded the corners of a winding lead on her own radius, 20-25 m inside the line, and struck marks the line passed 25-30 m off, at
// Vannvåg, Stamsund, Napp and Sund in Lofoten; the route keeps its legs clear of them, obsRoute, but not the arcs she turns on): what
// the skipper does, bear away from it so it passes at half her beam and four metres. Each thing (the circles of obsIndex: marks, piles,
// piers) from half her length astern to her length and the way she covers in twelve seconds ahead (two lengths at least), nearer than that across her way,
// turns her course away by the angle that clears it there; on both sides they weigh against each other (a narrow lead between two
// marks keeps her in the middle). {dh (rad, + to starboard), n} or null
function dynAvoid(d, P){
  const idx = obsIndex();
  const C = HIND.C, sn = Math.sin(d.psi), c = Math.cos(d.psi), look = Math.max(2 * P.L, P.L + Math.max(0, d.u) * 12), need = P.B / 2 + 4;
  const i0 = Math.floor((d.X - look) / C), i1 = Math.floor((d.X + look) / C), j0 = Math.floor((d.Y - look) / C), j1 = Math.floor((d.Y + look) / C), seen = new Set();
  let dh = 0, n = 0, aMin = 1e9;   // (aMin: how far ahead the nearest fixed thing is that she must bear away from)
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++){ const L = idx.get(i * 1048576 + j); if (!L) continue;
    for (const o of L){ if (o.t !== 0 || seen.has(o)) continue; seen.add(o);
      const dx = o.x - d.X, dz = o.z - d.Y, a = dx * sn - dz * c, l = dx * c + dz * sn; if (a < -P.L / 2 || a > look) continue;
      const gap = Math.abs(l) - (o.r || 0); if (gap >= need) continue;
      dh -= (l >= 0 ? 1 : -1) * Math.atan2(need - gap, Math.max(a, P.L / 2)); n++; if (a < aMin) aMin = a; } }
  // (and a vessel lying still near her way, a ferry waiting at her quay or a boat stopped: her hull as circles of half her beam along
  // her length, steered round as a pier is. Under way the rules have them (sjvEval), but not in a harbour, where a ferry lying still at
  // Sørarnøy stood 17 m off the way in to the plant and the coastal vessel ran into her, 14.11.2026, tests/allesteder.py, steg 126)
  // (fresh: the last ten game seconds, near her; the look's clock is the views' one, the minute and the part of it gone, sjvClock: against
  // the whole minute alone it was fresh only in the first ten seconds of each)
  const Hn = (S.t + (typeof liveFrac === 'function' ? liveFrac() : 0)) / 60;
  const T = typeof SJV !== 'undefined' && SJV.tl && SJV.tl.vid === S.cur && Math.abs(Hn - SJV.tl.H) < 10 / 3600 && Math.hypot(SJV.tl.X - d.X, SJV.tl.Z - d.Y) < 200 ? SJV.tl : null;
  if (T) for (const q of T.s ? T.v.concat(T.s) : T.v){ if (Math.hypot(q.ve, q.vz) > 0.5 || Math.hypot(q.x - d.X, q.z - d.Y) > look + q.L) continue;
    const hx = Math.sin(q.hd), hz = -Math.cos(q.hd), r = q.B / 2, k = Math.max(0, Math.ceil((q.L - q.B) / q.B / 2));
    let best = null;   // (the circle of her hull that stands nearest across the way: one vessel, one push)
    for (let m = -k; m <= k; m++){ const t = k ? m / k * (q.L - q.B) / 2 : 0, ox = q.x + hx * t, oz = q.z + hz * t;
      const dx = ox - d.X, dz = oz - d.Y, a = dx * sn - dz * c, l = dx * c + dz * sn; if (a < -P.L / 2 || a > look) continue;
      const gap = Math.abs(l) - r; if (gap < need && (!best || gap < best.gap)) best = {gap, a, l}; }
    if (best){ dh -= (best.l >= 0 ? 1 : -1) * Math.atan2(need - best.gap, Math.max(best.a, P.L / 2)); n++; } }
  return n ? {dh:clamp(dh, -0.7, 0.7), n, a:aMin} : null;
}
// ---- the autopilot ----
function dynAuto(d, dtG){
  const b = S.boat, pl = S.plan, cal = dynCalOf(b), P = cal.P, L = P.L, H = S.t / 60;
  let T = DYN.line;
  if (!T || T.plan !== pl || T.n !== pl.wps.length || ((T.chk = (T.chk + 1) % 30) === 0 && dynSig(pl) !== T.sig)){
    const dep = !T && DYN.dep && Math.hypot(DYN.dep.bp.x * 1000 - d.X, DYN.dep.bp.y * 1000 - d.Y) < 60 ? DYN.dep : null; DYN.dep = null;
    T = DYN.line = dynLineBuild(pl, dep); T.s = dep ? 0 : dynLineProj(T, d.X, d.Y, 0, 1e9);
  }
  // (none of the lines below laid again until her place on the line is where she is: after time caught up with the model off (catchUp),
  // T.s is the place before it, and a line laid then put her back to where she had been, trackfollow 18.11.2026)
  const onT = (() => { const q = dynLineAt(T, T.s); return Math.hypot(q[0] - d.X, q[1] - d.Y) < 60; })();
  // (the piers and quays round her ends came after the line was laid: laid again, from the berth while she backs off it)
  if (T.vecWait && T.dep && T.vecVer !== VEC.ver && T.s < T.back){ const s0 = T.s; T = DYN.line = dynLineBuild(pl, T.dep); T.s = Math.min(s0, T.back); }
  // (600 m from a harbour she stops at, the line in to it again, dynLineHarb with the vessels lying there now: the line was laid when she
  // left, and a ferry that has come in to her quay since lay across it at Strønstad, the autonav routine 18.11.2026; once a stop)
  { const st0 = T.stops.find(q => q.i >= pl.idx);
    if (st0 && onT && pl.wps[st0.i].port && pl.harbRe !== st0.i && st0.s - T.s < 600 && !(T.assist > T.s) && !(T.back > 0 && T.s < T.sOut + T.turnL + 50)){
      pl.harbRe = st0.i; T = DYN.line = dynLineBuild(pl, null); T.s = dynLineProj(T, d.X, d.Y, 0, 1e9); } }
  const E = dynEnv(b, d, cal, H, dtG), cap = E.cap, capF = E.capF;
  let vc = Math.min((pl.speed || BOAT.vcruise) * KN_MS, cap), near = 1e9; for (const q of PORTS){ const dq = dist(q.p, b.pos); if (dq < near) near = dq; }
  if (near < 0.25) vc = Math.min(vc, 5 * KN_MS);
  const X0 = d.X, Y0 = d.Y;
  for (let left = dtG; left > 1e-6;){
    const h = Math.min(DYN_H, left); left -= h;
    T.s = dynLineProj(T, d.X, d.Y, T.s);
    // waypoints passed on the way (not the stops: she must stand on those first)
    while (pl.idx < T.iEnd && T.wpAt[pl.idx] != null && !wpStop(pl.wps[pl.idx]) && T.s >= T.L[T.wpAt[pl.idx]] - 0.5){ const w = pl.wps[pl.idx]; if (arrive(w) || S.plan !== pl){ dynWrite(b, d); return; } }
    if (pl.idx >= pl.wps.length){ dynWrite(b, d); return; }
    // the next stop on the line, and what stands in the way before it
    const st = T.stops.find(q => q.i >= pl.idx); let sStop = st ? st.s : T.end, stopW = st ? pl.wps[st.i] : null;
    if (T.gchk-- <= 0){ T.gchk = Math.round(1 / h); try { T.ghit = T.s >= Math.max(T.back + T.turnL, T.sOut + T.turnL) && !(T.assist > T.s) ? dynGroundAhead(T, T.s, dynEaseDist(cal, Math.max(0, d.u)) + 40) : null; } catch (e){ T.ghit = null; } }
    const unsafe = pl.unsafe && pl.unsafe[pl.idx];
    // (the stop is 25 m short of it, also when that is behind her already: she then stops where she is and the replan runs; with a
    // floor a metre ahead of her she crept on at a tenth of a metre a second and never reached the stop, a route drawn straight into
    // land from a rorbu's berth left her lying «under way» for good, 19.10.2026)
    if (T.ghit && !unsafe && T.ghit.s - 25 < sStop){ sStop = T.ghit.s - 25; stopW = null; }
    const ds = sStop - T.s;
    // (the last lengths in to a stop the skipper holds her up to it against the wind and the sea, with the engine's kicks a model
    // without a bow thruster cannot give: she stands on the point, as Jonas asked 06.10.2026, and drifts from there when she lies)
    E.side = clamp((ds - 0.5 * L) / Math.max(2.5 * L, 80), 0, 1);
    // out from the quay: astern on the line, turning over to the way out, and on along it to the harbour point and round on to the
    // route, at a knot and a half, then three (not the model's: the fenders and a hand on the quay do that, and she has neither
    // yet; the turn at the harbour point is often a hairpin, which the old follower pivoted through too)
    const sScr = Math.max(T.back + T.turnL, T.sOut + T.turnL);
    // stuck against a quay, a pier or a breakwater on the way (13.11.2026, tests/allesteder.py: the 21 m coastal vessel at Skjervøy, Fredvang,
    // Uthaug, Roan and Nordmela knocked against the quay by the line for good, «Smell i kaia» every minute and no way on: the line passes
    // a corner closer than she turns): the same hands take her on along the line for three of her lengths (60 m at least), as they do
    // out from the quay, and the model has her again after it. «Stuck»: knocks within the last two minutes and under 5 m along the line in three
    if (!T.prog || T.s > T.prog.s + 5) T.prog = {s:T.s, t:S.t};
    else if (!(T.assist > T.s) && !unsafe && S.t - T.prog.t >= 3 && b.hits && b.hits.length && S.t - b.hits[b.hits.length - 1].t <= 2){ T.assist = Math.min(T.end - 1, sStop - 0.5, T.s + Math.max(60, 3 * L)); T.prog = {s:T.s, t:S.t}; dynHands(T, 'knock'); }
    // (and the last way out, Jonas 14.11.2026: «båten kan få lov til å bryte fysikkens regler og lover i enkelte situasjoner slik at vi
    // ikke ødelegger for oss selv mer enn vi må … men jeg ønsker jo helst at vi klarer å løse problemet på en annen måte»: no way on along
    // the line for four game minutes with no knock, away from a stop, not waiting for a way round, against a stream or giving way: backing
    // and filling before a bridge, held against the shallows the line runs into. The hands take her on as above)
    else if (!(T.assist > T.s) && !unsafe && S.t - T.prog.t >= 4 && ds > 3 * L && !pl.replan && !(T.stem > 0) && !(SJV.own && SJV.own.t1 == null)){ T.assist = Math.min(T.end - 1, sStop - 0.5, T.s + Math.max(60, 3 * L)); T.prog = {s:T.s, t:S.t}; dynHands(T, 'stuck'); }
    // (a boat of 12 m or more, whose radius of 30 m and more swings her well out of a corner; a smaller one turns round it on her own)
    // (and every sharp corner on the way in to the naust, by the plant's quay and the piers round it, which the marks do not hold: at
    // Engenes she swung 40 m wide of the turn in to it and struck the plant's quay at 4 knots, 15.11.2026)
    // (a sharp corner with a mark, a pile or a pier close by it, dynTight: the hands take her round on the line, which keeps the
    // route's margin from it, where her own radius swings her onto it: Stamsund, Grimstad, Sund in Lofoten, 14.11.2026, tests/allesteder.py)
    if (!(T.assist > T.s) && !unsafe && L >= 12){ const c = T.corners.find(q => q.s > T.s && q.s - T.s < Math.max(2 * L, 30)); if (c && !c.done && c.th >= Math.PI / 3 && (c.done = true) && (c.bz || dynTight(T, c))){ T.assist = Math.min(T.end - 1, sStop - 0.5, c.s + Math.max(30, 1.5 * L)); T.prog = {s:T.s, t:S.t}; dynHands(T, 'tight'); } }
    // (the last 200 m in to Father's naust, along the quay and the piers of the plant's harbour, the hands take her on the line at a knot
    // and a half to three, as a harbour's lines take her its last two lengths: the 14.99 m boat swung 20-40 m off the line in the turns and
    // struck the plant's quay at Engenes, Vannareid and a dozen more, 15.11.2026, tests/allesteder.py with the way in at the lowest tide;
    // the naust's own stop, not the next one: a way round put in on the way has its own, and the hands go on from it)
    // (and the way among the piers in to a harbour that dynLineHarb found: from where it begins, to the harbour point)
    if (T.hzS != null && !T.hzDone && !(T.assist > T.s) && !unsafe && T.s >= T.hzS - 1 && sStop > T.s + 1 && stopW && stopW.port){ T.assist = sStop - 0.5; T.hzDone = true; T.prog = {s:T.s, t:S.t}; dynHands(T, 'harb'); }
    const sN = T.bzS != null && !T.bzDone ? T.stops.find(q => q.i >= pl.idx && pl.wps[q.i].berth === 'naust') : null;
    if (sN && !(T.assist > T.s) && !unsafe && !T.ghit && T.s >= sN.s - 200 && sStop > T.s + 1){ T.assist = Math.min(sN.s, sStop) - 0.5; T.bzDone = T.assist >= sN.s - 0.6; T.prog = {s:T.s, t:S.t}; dynHands(T, 'naust'); }
    if ((T.back > 0 && T.s < sScr) || T.assist > T.s){
      // (the speed: astern off the quay and in the turn 0.8 m/s; then up to five knots, the harbours' speed limit, where the line runs
      // straight, a knot and a half to three a length before a corner of it and over the last lengths of the stretch: under three knots the
      // whole way, the small boats crawled over long stretches, Jonas 18.11.2026)
      const sTo = Math.max(T.back > 0 ? sScr : 0, T.assist || 0), vHi = 5 * KN_MS, vLo = 1.5, Lh = Math.max(L, 8);
      let vS = T.back > 0 && T.s < T.back + T.turnL ? 0.8 : Math.min(vHi, 0.8 + Math.max(0, T.s - T.back - T.turnL) * 0.05);
      if (vS > vLo){ const c = T.corners.find(q => q.th > 0.35 && q.s > T.s - Lh / 2 && q.s - T.s < 4 * Lh); if (c) vS = Math.min(vS, vLo + (vHi - vLo) * clamp((c.s - T.s - Lh) / (2 * Lh), 0, 1));
        vS = Math.max(vLo, Math.min(vS, vLo + (vHi - vLo) * clamp((sTo - T.s - 2 * Lh) / (3 * Lh), 0, 1), Math.abs(d.u || 0) + 0.4 * h)); }
      const psi0 = d.psi; T.s = Math.min(T.s + vS * h, sTo + 0.01); const q = dynLineAt(T, T.s), hd = dynLineHd(T, T.s, 3);
      d.X = q[0]; d.Y = q[1]; if (hd !== null) d.psi = hd; d.u = T.s < T.back ? -vS : vS; d.v = 0; d.r = dynAng(psi0, d.psi) / h; d.dl = 0; continue;
    }
    // arrived at a harbour: within two lengths of its point and slow, the quay's lines take her the rest of the way (3D moorStep)
    if (stopW && stopW.port && ds < Math.max(2 * L, 10) && Math.abs(d.u) < 2.5){ dynWrite(b, d); if (arrive(stopW) || S.plan !== pl) return; continue; }
    // standing on a stop: exactly on it
    // (cl: the stream along her heading, as dynMove gives it her; her way over the ground along the line is d.u + cl)
    const cs = E.cm ? E.side : 0, cl = cs ? (E.cx * Math.sin(d.psi) - E.cy * Math.cos(d.psi)) * cs : 0;
    if (ds < 0.5 && (Math.abs(d.u + cl) < 0.08 || ds < 0.05)){
      if (stopW){ d.X = stopW.x * 1000; d.Y = stopW.y * 1000; } d.u = d.v = d.r = 0; dynWrite(b, d);
      if (stopW){ if (arrive(stopW) || S.plan !== pl) return; T.s = dynLineProj(T, d.X, d.Y, T.s); continue; }
      // (a way round already being looked for: she lies here till it answers. Before, the ground ahead was seen again each game second
      // while she lay stopped, each sight asked again and counted a try, and the fourth stopped her, «fant ingen trygg vei rundt», before
      // the first search had answered: Træna utstyrsbutikk, 14.11.2026, tests/allesteder.py). Ten game minutes waited here with the model
      // running (a tab asleep does not count: no frames) and a real minute at least: a search that has not answered by then stops her, «fant
      // ingen trygg vei rundt», and no second one is started beside it
      if (T.ghit && pl.replan){ T.ghit = null; pl.replan.k = (pl.replan.k || 0) + dtG; if (pl.replan.k < 600 || Date.now() - (pl.replan.w || 0) < 60000) return; const ice = pl.replan.ice; pl.replan = null; sailStop(pl, b, ice ? iceWhy(ice, true) : SAIL_NONE); return; }
      if (T.ghit){ const gp = T.ghit.gp; T.ghit = null; if (!sailReplan(pl, b, gp)) runAground(gp); return; }
      if (T.s >= T.end - 1){ const w = pl.wps[pl.wps.length - 1];   // the end of the route (or «Stopp»): exactly on the point; arrive says so and clears the plan
        if (Math.hypot(w.x * 1000 - d.X, w.y * 1000 - d.Y) < 2){ d.X = w.x * 1000; d.Y = w.y * 1000; dynWrite(b, d); }
        if (arrive(w) || S.plan !== pl) return; }
    }
    // the speed: the route's, the sea's cap, slow near harbours, slower into sharp corners, and never more than she can stop from
    // (vc and the manoeuvring speed are through the water; what the corners and the stops ask is over the ground, vG, which the
    // stream along her is taken from, so she is on the point with no way over the ground: F8b)
    let vCmd = pl.replan ? 0 : vc, vG = 1e9;
    if ((T.back > 0 && T.s < T.sOut + T.turnL + 20) || T.assist > T.s - 20) vCmd = Math.min(vCmd, 3 * KN_MS);   // (just out from a quay: manoeuvring speed)
    const vBase = vCmd;
    // (into a corner she slows with how sharp it is, but a planing hull no slower than a third of her cruising speed: below that her
    // rudder has no bite without the screw's race, and at two knots she ran 50 m past the corner before it took, 19.10.2026)
    const vTmin = cal.V.planing ? 0.35 * cal.turn.Uc : 1.5 * KN_MS;
    for (const c of T.corners){ if (c.s <= T.s - 2 * L) continue; if (c.s > T.s + 600) break; const vTurn = Math.min(vc, Math.max(vTmin, vc * (1 - c.th / Math.PI))); if (c.s - T.s > -L) vG = Math.min(vG, dynVEase(cal, c.s - T.s - L, vTurn)); else vG = Math.min(vG, vTurn); }
    vG = Math.min(vG, dynVEase(cal, ds - 0.3));
    if (ds < 4) vG = Math.min(vG, Math.sqrt(2 * 0.12 * Math.max(0, ds - 0.25)) + 0.04);
    // room for the bow (tilbakemelding #104, 01.11.2026): the ground check above looks along the line, but a boat lying with her bow
    // to the shore when Autonav starts must turn before she is on the line, and went full ahead into the land first (the new 11 m sjark
    // 25 m off the shore south of Finnsnes: aground at 5-8 knots within 10-80 m, even with the route leading straight away behind her).
    // Once a second, when her heading is over 30 degrees off the leg's, the water ahead of her bow is checked as far as she needs to
    // stop, turn on her slowest calibrated radius and clear half her length. With ground there she turns at the speed that radius was
    // measured at (slower, the rudder has no bite and she lay still), and with too little room for the turn she first backs straight
    // astern (the wheel over to turn her on the same way, below), until she has it and 20 m more (as long as the water behind her is clear, and at most four lengths)
    if (!(T.bchk-- > 0)){ T.bchk = Math.round(1 / h); const was = T.bow; T.bow = null; const err = Math.abs(dynAng(d.psi, dynSegHd(T, dynSeg(T, T.s))));
      if (err > 0.5){ const N0 = cal.nom[0], Rb = Math.max(N0.R, d.u * d.u / P.alat), need = Rb + L / 2 + 5, look = dynEaseDist(cal, Math.max(0, d.u)) + need + 10, fx = Math.sin(d.psi), fy = -Math.cos(d.psi), a0 = {x:d.X / 1000, y:d.Y / 1000};
        let gp = null; try { gp = groundCheck(a0, {x:a0.x + fx * look / 1000, y:a0.y + fy * look / 1000}); } catch (e){}
        if (gp){ const gd = dist(a0, gp) * 1000, bk = was && was.astern ? was.bk : {x:d.X, y:d.Y}; let astern = false;
          if (gd < (was && was.astern ? need + 25 : need) && Math.hypot(d.X - bk.x, d.Y - bk.y) < 4 * L) try { astern = !groundCheck(a0, {x:a0.x - fx * 2 * L / 1000, y:a0.y - fy * 2 * L / 1000}); } catch (e){}
          // (the turn goes to the side with the most open water, kept once chosen: the shorter way round the controller takes may be
          // the one towards the shore, and she backed and filled there for minutes in the stikkprøve at Bergen)
          let side = was && was.side; if (!side){ const room = sg => { const hh = d.psi + sg * 0.8; let q = null; try { q = groundCheck(a0, {x:a0.x + Math.sin(hh) * look / 1000, y:a0.y - Math.cos(hh) * look / 1000}); } catch (e){} return q ? dist(a0, q) : 1e9; };
            const rs = room(1), rp = room(-1); side = rs === rp ? (dynAng(d.psi, dynSegHd(T, dynSeg(T, T.s))) >= 0 ? 1 : -1) : rs > rp ? 1 : -1; }
          T.bow = {gd, astern, bk, u:N0.u, side}; } } }
    if (T.bow) vG = Math.min(vG, T.bow.astern ? 0 : T.bow.u);
    // (a thing near her way ahead, dynAvoid: looked for twice a game second; not on the last lengths in to a harbour, which the quay's
    // lines take, nor while she backs or turns off the shore)
    // (her speed is left as the corners have it: slowed down for it, her rudder lost its bite and she swung wider onto it, Vannvåg)
    if (!(T.achk-- > 0)){ T.achk = Math.round(0.5 / h); T.av = !T.bow && !(stopW && stopW.port && ds < 3 * L) ? dynAvoid(d, P) : null; }
    // (a mark, a pile or a bridge's pier close across her way ahead: she takes it at manoeuvring speed, three knots or the least her rudder
    // bites at, as a skipper takes a pier in a winding lead. At seven knots the push came too late and the coastal vessel on 14.99 m struck
    // the pier of the bridge by Bergen verft from Veo and from Ytre Bruvik, 14.11.2026, tests/allesteder.py, steg 126)
    if (T.av && T.av.a < 1e8) vG = Math.min(vG, Math.max(vTmin, 3 * KN_MS));
    const sj = sjvAuto(d, h, ds, T); if (sj) vG = Math.min(vG, sj.v);
    // (away from a stop never under the speed her rudder bites at, vTmin: in a following stream stronger than a corner's speed
    // she would else be told to go astern through it; into a stop she may, to stand on the point)
    vCmd = Math.min(vCmd, cl && ds > 3 * L ? Math.max(vG - cl, Math.min(vTmin, vG)) : vG - cl);
    // she cannot stem the stream (F8b): said once a stream, with what runs against her; she holds up to it till the tide slackens
    if (cl < -1 && d.u + cl < 0.15 && vCmd > 1){ T.stem = (T.stem || 0) + h; if (T.stem > 120 && !T.stemSaid){ T.stemSaid = true; const kn = fmt1(-cl / KN_MS); log('Strømmen er for sterk: ' + kn + ' knop imot. Båten holder seg opp mot den til den løyer.', 'The stream is too strong: ' + kn + ' knots against her. She holds up to it until it slackens.', 'nav'); } } else if (cl > -0.5){ T.stem = 0; T.stemSaid = false; }   // giving way (Ø11.1, 05e-sjovei.js): off the line to starboard, or slower
    // (the lever goes over gradually, a quarter of its travel a game second, as a hand moves it)
    // the throttle for the acceleration that brings her to the commanded speed in three game seconds, and along the easing curve
    // when she is slackening off (the resistance she has at this speed counted in, so she follows the curve and does not lag it)
    const aDes = (vCmd - d.u) / 3 + (vCmd < vBase - 0.05 && d.u > 0.1 ? -0.7 * cal.aC : 0), F = P.mx * aDes + dynRes(P, d.u, capF);
    const thrT = vCmd < 0.05 && d.u < 0.3 && !(cl && vCmd < -0.05) ? (d.u > 0.02 ? -0.15 : 0) : F >= 0 ? clamp(F / (E.kT * P.Tmax * (1 - 0.35 * Math.max(0, d.u) / P.umax)), 0, 1) : clamp(F / (0.6 * E.kT * P.Tmax), -0.6, 0);
    const thrB = T.bow && T.bow.astern ? (d.u > -0.6 ? -0.35 : 0) : thrT;   // (backing out from the shore: slow astern)
    const thr = d.thr = d.thr == null ? thrB : d.thr + clamp(thrB - d.thr, -0.25 * h, 0.25 * h);
    // the rudder: line of sight on the leg she is on, or on the next one from where a turn on her own radius must begin to meet it
    // (so she cuts the corner by R(1/cos(th/2) - 1) and never swings outside); the course wanted is the leg's, bent towards it by
    // the cross-track error over a look-ahead of a radius and a half (stable: the heading loop is much faster than that)
    // (the wheel goes over a response time before the arc must begin: Nomoto's T and half the rudder's travel, at the way she has)
    // (Nomoto's constants at the way she has, between the ones measured in the calibration (dynCal nom); the loop's gains follow, so
    // a planing hull at harbour speed is steered as firmly as at speed: with the cruising gains the fast boats ran 50-80 m past a
    // corner at 5-6 knots, 19.10.2026)
    const N = cal.nom, us = clamp(Math.abs(d.u), N[0].u, N[N.length - 1].u); let j = 1; while (j < N.length - 1 && N[j].u < us) j++;
    const fN = (us - N[j - 1].u) / Math.max(1e-6, N[j].u - N[j - 1].u), Tn = N[j - 1].T + (N[j].T - N[j - 1].T) * fN, Kn = (N[j - 1].K + (N[j].K - N[j - 1].K) * fN) * Math.max(Math.abs(d.u), 0.5 * N[0].u) / us, wn = Math.min(1.2 / Tn, 0.6);
    const Kp = wn * wn * Tn / Kn, Kd = Math.max(0, (2 * wn * Tn - 1) / Kn), Rn = N[j - 1].R + (N[j].R - N[j - 1].R) * fN;
    const Rt = Math.max(Rn, d.u * d.u / P.alat), n = T.P.length; let seg = dynSeg(T, T.s);
    // (in a stream the wheel goes over earlier, by what the stream carries her while she turns: F8b)
    if (seg + 1 <= n - 1){ const turn = dynAng(dynSegHd(T, seg), dynSegHd(T, seg + 1)), th = Math.abs(turn), lead0 = Rt * Math.tan(Math.min(th, 2.6) / 2) + Math.abs(d.u) * (Tn + 0.5 * DYN_RUD / P.drate) + (cs ? E.cm * cs * th * Rt / Math.max(Math.abs(d.u), 0.5) : 0), lead = Math.min(lead0, 0.5 * (T.L[seg] - T.L[seg - 1]));
      // (a thing near her way ahead, dynAvoid, on the outside of the turn: she turns as early as her radius asks, so she does not swing
      // out onto it, Vannvåg; on the inside: she holds on along this leg, which passes it with the route's margin, and turns once it is
      // abeam: the early turn cut the corner on her radius onto it)
      const avT = T.av ? T.av.dh * turn : 0;
      if (avT > 0 ? T.L[seg] - T.s < Math.min(lead0, T.L[seg] - T.L[seg - 1]) : T.L[seg] - T.s < lead && !(avT < 0)) seg++; }
    const sa = T.P[seg - 1], hdP = dynSegHd(T, seg), ye = (d.X - sa[0]) * Math.cos(hdP) + (d.Y - sa[1]) * Math.sin(hdP) - (sj ? sj.off : 0);
    // (in a stream she heads up into what sets her off the line: her course through the water and the angle the stream sets her by,
    // d.crab, eased over eight game seconds, so a slow corner, where the course over the ground turns with the stream before her bow
    // has come round, does not ease the wheel too soon. She still runs 2-3 m wider out of a corner in a third of a knot than in still
    // water, dyntest 11.11.2026: the backlog, «F8b»)
    let chi = Math.abs(d.u) > 0.3 ? d.psi + Math.atan2(d.v, d.u) : d.psi;
    if (cs && d.u < 0.3) chi = d.psi;   // (holding astern against a following stream at a stop: her bow is her course)
    if (cs){ const sp = Math.sin(d.psi), cp = Math.cos(d.psi), gE = d.u * sp + d.v * cp + E.cx * cs, gN = d.u * cp - d.v * sp - E.cy * cs, to = Math.hypot(gE, gN) > 0.3 ? clamp(dynAng(chi, Math.atan2(gE, gN)), -1.2, 1.2) : 0;
      d.crab = (d.crab || 0) + (to - (d.crab || 0)) * (1 - Math.exp(-h / 8)); chi += d.crab; } else if (d.crab) d.crab = 0;
    const chiD = hdP - Math.atan(ye / Math.max(1.5 * Rt, L)) + (T.av ? T.av.dh : 0);
    // (turning off the shore: the wheel hard over to the side chosen ahead, and to the other side astern, where the water over the rudder
    // runs the other way, so each stroke astern turns her on the same way: back and fill. With the wheel amidships astern the 21 m coastal
    // vessel north of Karmsundbrua undid on each stroke astern the few degrees she had turned ahead, and lay there for good: 14.11.2026,
    // tests/allesteder.py, steg 126)
    const rud = T.bow ? (T.bow.astern ? -T.bow.side : T.bow.side) : clamp((Kp * dynAng(chi, chiD) - Kd * d.r) / DYN_RUD, -1, 1);
    dynBank(E, d, P); dynInt(P, d, thr, rud, h, capF, E); dynMove(d, h, E);
    // (a line drawn through a pier: she touches it on her fenders and is put off it; also in the last lengths into a harbour, where
    // before 18.11.2026 nothing was felt and the hunt found her through the piers by the harbour point (Dønna, Sleneset), but not her
    // own quay there: what lies within half her beam and two metres of the harbour point she stops at)
    { const fk = Math.round(T.s / 50) + '|' + (stopW && stopW.port ? stopW.x + ',' + stopW.y : '');
      if (!T.obs || T.obsAt !== fk){ T.obs = dynObsNear(d.X, d.Y, 80 + P.L, stopW && stopW.port ? [[stopW.x * 1000, stopW.y * 1000, P.B / 2 + 2]] : null); T.obsAt = fk; } dynContact(b, d, P, T.obs); }
    // the last creep on to a stop is the model's, held so she never runs past it
    if (ds < 4 && d.u > vCmd + 0.02 && !cl) d.u = Math.max(vCmd + 0.02, d.u - cal.aC * h);
  }
  // what the model could not see: the last bit of land under her (a route the player drew through it, or a corner cut too fine)
  // (on a leg the route called safe she is held back where she was and the net under Autonav finds a way round from there, as for
  // the shallows seen on the line ahead (sailReplan, 05-vessels.js); only the player's own unsafe leg puts her aground. Before, a
  // corner cut on her radius or a drift off the line at speed ran her aground on an Autonav route, tilbakemelding #96, 26.10.2026;
  // not while the hands take her along the line, the last way out, which may cross what the model would be held by)
  const a = {x:X0 / 1000, y:Y0 / 1000}, to = {x:d.X / 1000, y:d.Y / 1000}; let gp = null; try { gp = Math.hypot(d.X - X0, d.Y - Y0) > 0.01 && !(T.assist > T.s - 1 && !(pl.unsafe && pl.unsafe[pl.idx])) ? groundCheck(a, to, dynSquat(P, d.u, E.narrow)) : null; } catch (e){}
  // (only where the leg runs: ground met off the leg's line, in the turn on to it at the start, is held as on a safe leg. The trebåt
  // turning off a quay at Kvitsøy touched 23 m off her first leg at 1.3 kn and was put aground on it, tilbakemelding #130, 17.11.2026;
  // the leg's start is where she left (S.plan.from, ui/08-actions.js) or the stop before)
  const legA = pl.idx > 0 ? pl.wps[pl.idx - 1] : pl.from, legB = pl.wps[pl.idx], onLeg = !gp || !legA || !legB || segDist(gp, legA, legB) <= (P.B / 2 + 10) / 1000;
  if (gp){ if (pl.unsafe && pl.unsafe[pl.idx] && !gp.ice && onLeg){ dynWrite(b, d); runAground(gp); return; }
    const fast = Math.abs(d.u) > 1.5; d.X = X0; d.Y = Y0; d.u = 0; d.v = 0;
    // (held back slowly for half a game minute, her bow on the shallows the line runs into: a way round is found from there as at speed
    // (and where none is found, she stops and says so). Before, she lay held against it with the throttle open for good: the 21 m coastal
    // vessel in the sound south of Egersund, after a way round whose first 50 m crossed water the search lets a start point have,
    // 14.11.2026, tests/allesteder.py, steg 126)
    // (counted while she stays within 3 m of where she was first held: in the game a frame moves her less than the centimetre the check
    // asks for once she is held, so a count cleared on every frame without the check never got there; the independent check, 14.11.2026)
    // (and on every frame between, below, while she stays there)
    if (fast || !T.heldAt || Math.hypot(X0 - T.heldAt[0], Y0 - T.heldAt[1]) > 3){ T.held = 0; T.heldAt = fast ? null : [X0, Y0]; } if (!fast) T.held += dtG;
    // (held so again within 20 game minutes and 300 m of a way round on this route: the hands take her on along the line, the last way out, Jonas
    // 14.11.2026; south of Egersund the way round led her back onto the same shallows, and the next search found none, so she stopped)
    if (!fast && !gp.ice && T.held > 30 && pl.rp && S.t - pl.rp.t < 20 && Math.hypot(X0 - pl.rp.X, Y0 - pl.rp.Y) < 300 && !pl.replan){ T.held = 0; dynHandsPast(T, pl, L); dynWrite(b, d); return; }
    if ((fast || gp.ice || T.held > 30) && !pl.replan){ pl.rp = {t:S.t, X:X0, Y:Y0}; T.held = 0; d.r = 0; dynWrite(b, d); if (!sailReplan(pl, b, gp)){ if (gp.ice) sailStop(pl, b, iceWhy(gp)); else runAground(gp); } return; } }
  else if (T.heldAt){ if (Math.hypot(d.X - T.heldAt[0], d.Y - T.heldAt[1]) > 3){ T.heldAt = null; T.held = 0; } else T.held = (T.held || 0) + dtG; }
  DYN.nm += Math.hypot(d.X - X0, d.Y - Y0) / 1000 / gridScale(a) / NM;
  dynWrite(b, d);
}
// for the 3D view's tests: the line and where she is on it, in the shape the old follower had (trackfollow.py)
function dynTrackView(){ const T = DYN.line; if (!T || !dynLive()) return null; const d = S.boat.dyn; return {s:T.s, v:Math.abs(d.u) * simRate(), end:T.end, done:false, n:T.P.length, P:T.P, back:T.back, sOut:T.sOut}; }
