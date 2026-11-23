// The page side of tools/autonav/farsjekk.py (Autonav 2.0 F1, steg 141): the map (src/js/core/17-farbar.js) held against the bench's
// observer (benkobs.js, benk.js), pose by pose. The observer reads the raw data itself; the map is what Autonav 2.0 is to ask. A pose
// where the observer sees a touch and the map says free is the one thing that must not be; the other way round is the map being
// careful, and is counted by what it was careful of. Loaded after benkobs.js and benk.js.
(function (){
  'use strict';
  const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const FARSJ = window.FARSJ = {
    // the observer at one pose: everything her hull touches, and the bottom under her
    obs(X, Z, psi, ob, world){ const out = []; BKO.testPose(X, Z, psi, ob, world, out); BKO.testKeel(X, Z, psi, ob, world, out); return out; },
    // The map's own copies of the game's rules for what the 3D view builds of a tile (17-farbar.js farbZonesG, farbGoneG, farbDrawnG:
    // the same rules in slices) against the game's (11b-obstacles.js portZones, vecGone, vecDrawn), for every tile decoded: how many
    // tiles, and those that differ
    drawn(){ const bad = []; let n = 0, zones = null;
      if (PORTZ.list){ const L0 = PORTZ.list, C0 = PORTZ.cells; PORTZ.list = null; PORTZ.cells = null; farbRun(farbZonesG()); const L1 = PORTZ.list;
        zones = L1 && L1.length === L0.length && L1.every((g, i) => g.every((v, k) => Math.abs(v - L0[i][k]) < 1e-9)) && PORTZ.cells.size === C0.size; PORTZ.list = L0; PORTZ.cells = C0; }
      for (const t of VEC.tiles.values()){ n++; VECDRAWN.delete(t); VECGONE.delete(t); const a = farbRun(farbDrawnG(t)), b = vecDrawn(t);
        const same = (p, q) => p.length === q.length && p.every((v, i) => v === q[i]);
        const ok = same(a.piers, b.piers) && a.flo.size === b.flo.size && [...a.flo].every(q => b.flo.has(q)) && a.slabs.length === b.slabs.length && a.slabs.every((s, i) => s[0] === b.slabs[i][0] && s[1] === b.slabs[i][1]) && same(a.molos, b.molos);
        if (!ok) bad.push(t.tx + ':' + t.ty + ' brygger ' + a.piers.length + '/' + b.piers.length + ', flater ' + a.slabs.length + '/' + b.slabs.length + ', moloer ' + a.molos.length + '/' + b.molos.length); }
      return {tiles:n, zones, bad}; },
    // One stretch and boat: n poses along the lines (km: the route that was sailed and the reference's way), in a strip to each side,
    // and at the edge of what the observer touches; and sweeps between two poses. She is put at the stretch's start first (BK.put), so
    // BOAT is hers, and the two are asked for the same boat: the observer's height is the old Autonav's (obsAir), so the map gets that.
    async run(o){ const lines = (o.lines || []).filter(l => l && l.length > 1); if (!lines.length) return {skip:'ingen linje'};
      const pts = [].concat(...lines).map(([x, y]) => ({x, y}));
      if (!await BK.vecReady(pts)) return {skip:'kystens pakker kom ikke inn'}; if (!await farbNeed(pts, 1.5)) return {skip:'kartet kom ikke inn'};
      BK.eng = 'farsjekk';   // (not the boat model's: the observer then has the vessels lying still, not those under way)
      const rand = rnd(o.seed || 1), L = BOAT.len, B = BOAT.beam, ob = {L, B}, fb = {L, B, T:BOAT.draft, air:obsAir() - FARB.airOver}, H = S.t / 60, world = BK.world(), opt = {boats:true}, RH = Math.hypot(L, B) / 2;
      // the lines in metres, with the length along each
      const LN = lines.map(l => { const P = l.map(([x, y]) => [x * 1000, y * 1000]), cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return {P, cum, len:cum[cum.length - 1]}; }).filter(l => l.len > 1);
      if (!LN.length) return {skip:'ingen linje'};
      const tot = LN.reduce((a, l) => a + l.len, 0);
      const at = s => { let l = LN[0]; for (const q of LN){ if (s <= q.len){ l = q; break; } s -= q.len; l = q; } s = Math.max(0, Math.min(l.len, s)); let i = 1; while (i < l.P.length - 1 && l.cum[i] < s) i++;
        const a = l.P[i - 1], b = l.P[i], d = l.cum[i] - l.cum[i - 1] || 1, u = (s - l.cum[i - 1]) / d, hx = (b[0] - a[0]) / d, hz = (b[1] - a[1]) / d; return {X:a[0] + (b[0] - a[0]) * u, Z:a[1] + (b[1] - a[1]) * u, psi:Math.atan2(hx, -hz), nx:-hz, nz:hx}; };
      const C = {n:0, fri:0, begge:0, bareKart:0, bareObs:0, ukjent:0, klaring:0, sveip:0, sveipObs:0, sveipKart:0, sveipBegge:0, kart:{}, obs:{}, av:{rute:0, stripe:0, kant:0}, msKart:0, msObs:0}, bad = [], seen = [];
      const ll = (X, Z) => { const q = natLL({x:X / 1000, y:Z / 1000}); return [+q.lat.toFixed(5), +q.lon.toFixed(5)]; };
      const test = (kind, X, Z, psi) => { let t0 = performance.now(); const hs = FARSJ.obs(X, Z, psi, ob, world); let t1 = performance.now(); const m = farbPose(X, Z, psi, fb, H, opt); C.msObs += t1 - t0; C.msKart += performance.now() - t1;
        C.n++; C.av[kind]++; const touch = hs.length > 0;
        if (m && m.what === 'ukjent') C.ukjent++;
        else if (touch && !m){ C.bareObs++; if (bad.length < 12) bad.push({hva:'stilling', kind, ll:ll(X, Z), psi:+psi.toFixed(3), X:+X.toFixed(2), Z:+Z.toFixed(2), obs:hs.slice(0, 3).map(h => h.what + ':' + h.id + (h.keel != null ? ' ' + h.keel.toFixed(2) : ''))}); }
        else if (!touch && m){ C.bareKart++; C.kart[m.what] = (C.kart[m.what] || 0) + 1; }
        else if (touch) C.begge++; else C.fri++;
        for (const h of hs) C.obs[h.what] = (C.obs[h.what] || 0) + 1;
        // the distance at her middle: where the observer's hull is on a thing, the map's distance there is not beyond her reach
        const hard = hs.filter(h => h.what !== 'grunn' && h.what !== 'fjære');
        if (hard.length){ const c = farbClear(X, Z, fb, 100, opt); if (c > RH + 0.01){ C.klaring++; if (bad.length < 12) bad.push({hva:'klaring', ll:ll(X, Z), c:+c.toFixed(2), R:+RH.toFixed(2), obs:hard.slice(0, 3).map(h => h.what + ':' + h.id)}); } }
        seen.push([X, Z, psi, touch]); return touch; };
      const n = o.n || 90, strip = o.strip || 150, n1 = Math.round(n * 0.3), n2 = Math.round(n * 0.4);
      // along the lines, about on them and about along them
      for (let i = 0; i < n1; i++){ const q = at(rand() * tot), off = (rand() * 2 - 1) * B; test('rute', q.X + q.nx * off, q.Z + q.nz * off, q.psi + (rand() * 2 - 1) * 0.3); }
      // in the strip to each side, any heading
      for (let i = 0; i < n2; i++){ const q = at(rand() * tot), off = (rand() * 2 - 1) * strip; test('stripe', q.X + q.nx * off, q.Z + q.nz * off, rand() * 2 * Math.PI); }
      // at the edge: from a pose the observer has free to one it has touching, halved till the two are a centimetre apart, and then
      // poses a few centimetres to each side of the edge
      const free = seen.filter(q => !q[3]), hit = seen.filter(q => q[3]); let left = n - n1 - n2;
      for (let k = 0; k < hit.length * 3 && left > 0 && free.length && hit.length; k++){ const T = hit[Math.floor(rand() * hit.length)]; let F = null, fd = 1e18;
        for (let j = 0; j < 6; j++){ const q = free[Math.floor(rand() * free.length)], d = Math.hypot(q[0] - T[0], q[1] - T[1]); if (d < fd){ fd = d; F = q; } }
        const dx = T[0] - F[0], dz = T[1] - F[1], dp = norm(T[2] - F[2]), move = Math.hypot(dx, dz) + Math.abs(dp) * L / 2; if (!(move > 0.05)) continue;
        const P = u => [F[0] + dx * u, F[1] + dz * u, F[2] + dp * u]; let lo = 0, hi = 1;
        for (let it = 0; it < 22 && (hi - lo) * move > 0.01; it++){ const u = (lo + hi) / 2, q = P(u); if (FARSJ.obs(q[0], q[1], q[2], ob, world).length) hi = u; else lo = u; }
        for (const d of [-0.3, -0.05, 0.02, 0.05, 0.15, 0.4]){ if (left <= 0) break; const u = Math.max(0, Math.min(1, hi + d / move)), q = P(u); test('kant', q[0], q[1], q[2]); left--; } }
      // what is left where the observer touched nothing at all: more of the strip
      for (; left > 0; left--){ const q = at(rand() * tot), off = (rand() * 2 - 1) * strip; test('stripe', q.X + q.nx * off, q.Z + q.nz * off, rand() * 2 * Math.PI); }
      // sweeps: from one pose to another 3 to 25 m on, the hull swept between them by both
      for (let i = 0; i < (o.sweeps || 0); i++){ const s = rand() * tot, q0 = at(s), q1 = at(Math.min(tot, s + 3 + rand() * 22)), off = (rand() * 2 - 1) * (rand() < 0.5 ? B : 40);
        const p0 = {X:q0.X + q0.nx * off, Z:q0.Z + q0.nz * off, psi:q0.psi + (rand() * 2 - 1) * 0.4}, p1 = {X:q1.X + q1.nx * off, Z:q1.Z + q1.nz * off, psi:q1.psi + (rand() * 2 - 1) * 0.4};
        const st = {}, hs = BKO.step(st, p0, ob, world).concat(BKO.step(st, p1, ob, world)), m = farbPose(p0.X, p0.Z, p0.psi, fb, H, opt) || farbSweep(p0, p1, fb, H, opt);
        C.sveip++; if (m && m.what === 'ukjent') C.ukjent++;
        else if (hs.length && !m){ C.sveipObs++; if (bad.length < 12) bad.push({hva:'sveip', ll:ll(p0.X, p0.Z), til:ll(p1.X, p1.Z), p0, p1, obs:hs.slice(0, 3).map(h => h.what + ':' + h.id)}); }
        else if (!hs.length && m){ C.sveipKart++; C.kart[m.what] = (C.kart[m.what] || 0) + 1; } else if (hs.length) C.sveipBegge++; }
      C.msKart = +C.msKart.toFixed(1); C.msObs = +C.msObs.toFixed(1); C.bad = bad; C.type = S.boat.type; C.L = L; C.m = Math.round(tot); return C; }
  };
})();
