// The bench's observer, its geometry (Autonav 2.0 F0, docs/planer/autonav-2-0.md; steg 140). Pure: no game names in here, so the page
// (tools/autonav/benk.py injects it) and Node (tests/unit/benkobs.test.mjs) load the same file. It defines one global, BKO.
//
// What it does that the hunt's observer (tools/autonav/jakt.py JK.watch) does not:
//   - the whole hull outline as a polygon, not 13 points on it: a stake inside the hull, between the points, is seen;
//   - the hull SWEPT from the last pose to this one (every STEP m of the farthest any point of her moves), so a thing she passes over
//     between two steps of the boat model (15 m at 20 knots) or between two minute steps (600 m) is seen;
//   - rocks, the foreshore as the 3D view draws it, and the keel at five points, when the world gives them.
// The world is the caller's: land(x, z) -> 0 water, 1 land, 2 a harbour unit's quay; landSeg(ax, az, bx, bz) -> the line crosses the
// coast; things(x0, z0, x1, z1) -> the things whose box touches the box; keel(x, z) -> metres of water under her keel there;
// beach(x, z) -> she touches the foreshore as drawn; free(x, z, R) -> metres of clear water beyond R round the point (0: something
// may be within R, or not known). All in metres on the grid: x east, z south, psi from north clockwise (as sjvHullPts).
(function (G){
  'use strict';
  // the waterline, fractions of L forward and B to starboard: a rounded bow, a square stern; convex
  const HULL = [[0.5, 0], [0.44, 0.27], [0.33, 0.45], [0.2, 0.5], [-0.5, 0.5], [-0.5, -0.5], [0.2, -0.5], [0.33, -0.45], [0.44, -0.27]];
  // where the keel is asked for: amidships, the bow and the stern on the centre line, and the two sides
  const KEEL = [[0, 0], [0.42, 0], [-0.45, 0], [0, 0.42], [0, -0.42]];
  const STEP = 0.5, KEEL_STEP = 12.5, FREE_CAP = 60;
  const at = (X, Z, psi, L, B, F) => { const s = Math.sin(psi), c = Math.cos(psi); return F.map(([f, g]) => { const xc = f * L, yc = g * B; return [X + xc * s + yc * c, Z - xc * c + yc * s]; }); };
  const hull = (X, Z, psi, L, B) => at(X, Z, psi, L, B, HULL);
  const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  // inside a convex polygon (either winding; on the edge counts as inside)
  function inConvex(P, x, z){ let sg = 0; for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length], cr = (q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]); if (Math.abs(cr) < 1e-12) continue; const s = cr > 0 ? 1 : -1; if (sg && s !== sg) return false; sg = s; } return true; }
  // inside any closed polygon (even-odd)
  function inPoly(P, x, z){ let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1]; if ((zi > z) !== (zj > z) && x < xi + (z - zi) * (xj - xi) / (zj - zi)) ins = !ins; } return ins; }
  function dSeg(x, z, ax, az, bx, bz){ const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0; return Math.hypot(x - ax - dx * u, z - az - dz * u); }
  function segSeg(ax, az, bx, bz, cx, cz, dx, dz){
    const o = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
    const d1 = o(cx, cz, dx, dz, ax, az), d2 = o(cx, cz, dx, dz, bx, bz), d3 = o(ax, az, bx, bz, cx, cz), d4 = o(ax, az, bx, bz, dx, dz);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }
  // the least distance between two segments (0 where they cross)
  function dSegSeg(ax, az, bx, bz, cx, cz, dx, dz){ if (segSeg(ax, az, bx, bz, cx, cz, dx, dz)) return 0; return Math.min(dSeg(ax, az, cx, cz, dx, dz), dSeg(bx, bz, cx, cz, dx, dz), dSeg(cx, cz, ax, az, bx, bz), dSeg(dx, dz, ax, az, bx, bz)); }
  // the convex hull polygon P against: a circle
  function polyCircle(P, cx, cz, r){ if (inConvex(P, cx, cz)) return true; for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; if (dSeg(cx, cz, p[0], p[1], q[0], q[1]) < r) return true; } return false; }
  // a line of points Q (open, or closed when `closed`) with half width r: any part of it within r of the hull, or (closed) the hull inside it
  function polyLine(P, Q, r, closed){
    const n = Q.length, m = closed ? n : n - 1; if (!n) return false;
    if (inConvex(P, Q[0][0], Q[0][1])) return true;
    if (closed && n > 2 && inPoly(Q, P[0][0], P[0][1])) return true;
    for (let j = 0; j < m; j++){ const c = Q[j], d = Q[(j + 1) % n];
      for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; if (dSegSeg(p[0], p[1], q[0], q[1], c[0], c[1], d[0], d[1]) <= r) return true; } }
    return n === 1 ? polyCircle(P, Q[0][0], Q[0][1], r) : false;
  }
  // a box: centre x, z, half length l along (ux, uz), half width w across
  const boxPts = o => { const nx = o.uz, nz = -o.ux; return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [o.x + o.ux * o.l * a + nx * o.w * b, o.z + o.uz * o.l * a + nz * o.w * b]); };
  // an ellipse (a rock's foot at her keel's depth): centre x, z, half axes a (along th) and b; th turns east towards south
  function polyEllipse(P, o){ const ct = Math.cos(o.th), st = Math.sin(o.th); return polyCircle(P.map(([x, z]) => { const dx = x - o.x, dz = z - o.z; return [(dx * ct + dz * st) / o.a, (-dx * st + dz * ct) / o.b]; }), 0, 0, 1); }
  // one thing against the hull: k 'c' circle {x, z, r}; 'b' box; 's' a piece of a line {ax, az, bx, bz, r} (a bridge's deck); 'p' a closed
  // outline {P}; 'l' an open line {P, r} (a breakwater mapped as a line); 'e' ellipse; 'h' another hull {P}
  function touches(P, o){
    switch (o.k){
      case 'c': return polyCircle(P, o.x, o.z, o.r);
      case 'b': return polyLine(P, o.P || (o.P = boxPts(o)), 0, true);
      case 's': return polyLine(P, [[o.ax, o.az], [o.bx, o.bz]], o.r, false);
      case 'p': case 'h': return polyLine(P, o.P, 0, true);
      case 'l': return polyLine(P, o.P, o.r, !!o.closed);   // (closed: a breakwater mapped as an area, with its slope's reach outside the outline)
      case 'e': return polyEllipse(P, o);
    }
    return false;
  }
  // a thing's box (m), for the caller's index and for free()
  function bbox(o){
    if (o.bb) return o.bb; let x0, z0, x1, z1;
    if (o.k === 'c'){ x0 = o.x - o.r; x1 = o.x + o.r; z0 = o.z - o.r; z1 = o.z + o.r; }
    else if (o.k === 'e'){ const m = Math.max(o.a, o.b); x0 = o.x - m; x1 = o.x + m; z0 = o.z - m; z1 = o.z + m; }
    else if (o.k === 's'){ x0 = Math.min(o.ax, o.bx) - o.r; x1 = Math.max(o.ax, o.bx) + o.r; z0 = Math.min(o.az, o.bz) - o.r; z1 = Math.max(o.az, o.bz) + o.r; }
    else { const Q = o.k === 'b' ? (o.P || (o.P = boxPts(o))) : o.P, r = o.k === 'l' ? o.r : 0; x0 = z0 = Infinity; x1 = z1 = -Infinity; for (const [x, z] of Q){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; } x0 -= r; x1 += r; z0 -= r; z1 += r; }
    return o.bb = [x0, z0, x1, z1];
  }
  // how far a point is from a thing's box (0 inside it): a floor under the distance to the thing itself
  const boxDist = (o, x, z) => { const b = bbox(o); return Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - z, 0, z - b[3])); };

  // the hull at one pose against the world: every thing touched as {what, id, x, z}, the land and the beach once each
  function testPose(X, Z, psi, boat, world, out){
    const P = hull(X, Z, psi, boat.L, boat.B); let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of P){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    let land = 0, lx = 0, lz = 0;
    if (world.land){ for (const [x, z] of P){ const k = world.land(x, z); if (k){ land = k; lx = x; lz = z; break; } }
      if (!land && world.landSeg) for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; if (world.landSeg(p[0], p[1], q[0], q[1])){ land = 1; lx = (p[0] + q[0]) / 2; lz = (p[1] + q[1]) / 2; break; } } }
    if (land) out.push({what:land === 2 ? 'kai' : 'land', id:(land === 2 ? 'unit@' : '') + Math.round(lx / 50) + ',' + Math.round(lz / 50), x:lx, z:lz});
    else if (world.beach) for (const [x, z] of P) if (world.beach(x, z)){ out.push({what:'fjære', id:Math.round(x / 50) + ',' + Math.round(z / 50), x, z}); break; }
    if (world.things) for (const o of world.things(x0, z0, x1, z1)){ const b = bbox(o); if (b[0] > x1 || b[2] < x0 || b[1] > z1 || b[3] < z0) continue; if (touches(P, o)) out.push({what:o.what, id:o.id, x:o.x != null ? o.x : (b[0] + b[2]) / 2, z:o.z != null ? o.z : (b[1] + b[3]) / 2, o}); }
  }
  function testKeel(X, Z, psi, boat, world, out){
    let worst = 0, wx = X, wz = Z; for (const [x, z] of at(X, Z, psi, boat.L, boat.B, KEEL)){ const k = world.keel(x, z); if (k < worst){ worst = k; wx = x; wz = z; } }
    if (worst < 0) out.push({what:'grunn', id:Math.round(wx / 50) + ',' + Math.round(wz / 50), x:wx, z:wz, keel:worst});
  }
  // One step of the observer: her hull swept from the pose of the last call (st.last) to this one. st: {} for a new trip, or with
  // last = null to start afresh from this pose (a kinematic boat at a corner has no turn to sweep). Returns the touches, a thing
  // more than once when she stays on it (the caller keeps one per thing per trip); st.n counts the poses tested, st.skip the metres
  // of open water passed without a test.
  function step(st, pose, boat, world){
    const out = [], from = st.last || pose; st.last = {X:pose.X, Z:pose.Z, psi:pose.psi};
    const dx = pose.X - from.X, dz = pose.Z - from.Z, dpsi = norm(pose.psi - from.psi), move = Math.hypot(dx, dz) + Math.abs(dpsi) * boat.L / 2;
    const R = Math.hypot(boat.L / 2, boat.B / 2); let u = move > 0 ? 0 : 1, keelAt = -Infinity; st.n = st.n || 0; st.skip = st.skip || 0;
    if (st.first === undefined) st.first = true;
    for (let guard = 0; guard < 2e5; guard++){
      const X = from.X + dx * u, Z = from.Z + dz * u, psi = from.psi + dpsi * u, s = u * move;
      // (the pose she left was tested by the last call, all but the trip's first)
      const free = world.free ? Math.min(FREE_CAP, world.free(X, Z, R) || 0) : 0;
      if (!(free > 0) && (u > 0 || st.first)){ testPose(X, Z, psi, boat, world, out); st.n++; }
      if (world.keel && s - keelAt >= KEEL_STEP - 1e-9 && (u > 0 || st.first)){ testKeel(X, Z, psi, boat, world, out); keelAt = s; }
      if (u >= 1) break;
      // on to the next pose: STEP on, or over the open water round her (nothing within R of any centre up to `free` on), the keel
      // asked for on the way
      let adv = free > STEP ? free : STEP; if (world.keel) adv = Math.min(adv, Math.max(STEP, keelAt + KEEL_STEP - s));
      if (adv > STEP) st.skip += Math.min(adv, move - s);
      u = Math.min(1, u + adv / move);
    }
    st.first = false; return out;
  }
  G.BKO = {HULL, KEEL, STEP, hull, at, norm, inConvex, inPoly, dSeg, segSeg, dSegSeg, polyCircle, polyLine, polyEllipse, boxPts, touches, bbox, boxDist, testPose, testKeel, step};
})(typeof globalThis !== 'undefined' ? globalThis : this);
