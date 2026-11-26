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
      { const G = portZones(), L0 = G.list, C0 = G.cells; PORTZ.list = null; FARB.pz = null; const M = farbRun(farbZonesG()), L1 = M.list; PORTZ.list = L0;   // (the game's own put back: the map's copy is built beside it)
        zones = M !== PORTZ && L1.length === L0.length && L1.every((g, i) => g.every((v, k) => Math.abs(v - L0[i][k]) < 1e-9)) && M.cells.size === C0.size && M.r === G.r; }
      for (const t of VEC.tiles.values()){ n++; VECDRAWN.delete(t); VECGONE.delete(t); const a = farbRun(farbDrawnG(t)), b = vecDrawn(t);
        const same = (p, q) => p.length === q.length && p.every((v, i) => v === q[i]);
        const ok = same(a.piers, b.piers) && a.flo.size === b.flo.size && [...a.flo].every(q => b.flo.has(q)) && a.slabs.length === b.slabs.length && a.slabs.every((s, i) => s[0] === b.slabs[i][0] && s[1] === b.slabs[i][1]) && same(a.molos, b.molos);
        if (!ok) bad.push(t.tx + ':' + t.ty + ' brygger ' + a.piers.length + '/' + b.piers.length + ', flater ' + a.slabs.length + '/' + b.slabs.length + ', moloer ' + a.molos.length + '/' + b.molos.length); }
      return {tiles:n, zones, bad}; },
    // The field round her (17-farbar.js farbFieldNeed: the tiles of o.cell m over a box of o.half m each way from where she lies),
    // built with the page's own thread watched: the longest it was held by one of the field's slices (FARB.F.n.slice), the longest
    // between two turns of the event loop while the field was built and for as long with nothing built, the worker's time and the
    // bytes a tile, the time of a read; and the field held against the geometry at o.n cells' middles: never farther off, at most a
    // step nearer; the water not deeper than the geometry has it; the same deck over.
    async field(o){ const cell = o.cell || 2, F = FARB.F, half = o.half || 400, b = BK.from, X = b.x * 1000, Z = b.y * 1000, rand = rnd(o.seed || 7);
      const gaps = [], probe = () => { const ch = new MessageChannel(); let last = performance.now(), gap = 0, on = true; ch.port1.onmessage = () => { const t = performance.now(); if (t - last > gap) gap = t - last; if (t - last > 6 && gaps.length < 30) gaps.push([Math.round(last), +(t - last).toFixed(1), F.at]); last = t; if (on) ch.port2.postMessage(0); }; ch.port2.postMessage(0); return () => { on = false; return gap; }; };
      F.n.long.length = 0; F.steps = !!o.steps; F.n.step = 0; F.n.h.fill(0);
      // (the game's own first look at the traffic of a new place takes a tenth of a second or more: looked up before the clock starts, as BK.cpu does)
      try { npcStates(S.t / 60); sjvNear(S.t / 60, X, Z); fixBoats(X, Z); } catch (e){}
      F.n.slice = 0; let t0 = performance.now(); if (!await farbNeed([{x:(X - half) / 1000, y:(Z - half) / 1000}, {x:(X + half) / 1000, y:(Z + half) / 1000}], F.pad)) return {skip:'kartet kom ikke inn'};
      const layMs = performance.now() - t0, laySlice = F.n.slice, hLay = F.n.h.slice(); F.n.slice = 0;
      const n0 = F.n.built, ms0 = F.n.ms, job0 = F.n.job; let stop = probe(); t0 = performance.now();
      const ok = await farbFieldNeed(X - half, Z - half, X + half, Z + half, cell), wall = performance.now() - t0, gap = stop(), slice = F.n.slice, hFelt = F.n.h.map((v, i) => v - hLay[i]);
      stop = probe(); await new Promise(r => setTimeout(r, Math.min(4000, Math.max(300, wall)))); const idle = stop();
      // the control: a job that only counts, run through the same slices for as long as the field took. What it has over 4 ms is the
      // machine's and the engine's own (a pause for the garbage, another process), not the field's
      const hist = F.n.h.slice(); F.n.h.fill(0); F.n.slice = 0; F.at = 'kontroll';
      await farbRunA((function* (){ const t = performance.now(), dur = Math.min(6000, Math.max(300, wall)); let x = 0; while (performance.now() - t < dur){ for (let i = 0; i < 300; i++) x += Math.sqrt(i + x % 7); yield; } return x; })());
      const ctrl = F.n.h.slice(), ctrlMax = F.n.slice; F.n.h.fill(0); F.n.slice = 0; F.at = 'kontroll2';
      // the second control: the same, but each step makes as much garbage as a step of the map's own work does (small arrays and a
      // function), so the engine has to clear up after it: what this one has over 4 ms is the engine's pauses for the garbage
      await farbRunA((function* (){ const t = performance.now(), dur = Math.min(6000, Math.max(300, wall)); let x = 0; while (performance.now() - t < dur){ const a = []; for (let i = 0; i < 40; i++) a.push([i, x, {v:i}]); const f = q => q[0] + q[2].v + x; x = a.reduce((sm, q) => sm + f(q), 0) % 7; yield; } return x; })());
      const ctrl2 = F.n.h.slice(), ctrl2Max = F.n.slice; F.n.h = hist;
      const Tf = F.N * cell, tiles = []; let none = 0;
      for (let fz = Math.floor((Z - half) / Tf); fz <= Math.floor((Z + half) / Tf); fz++) for (let fx = Math.floor((X - half) / Tf); fx <= Math.floor((X + half) / Tf); fx++){ const Y = farbFieldTile(cell, fx, fz); if (Y && !Y.none) tiles.push(Y); else if (Y) none++; }
      const R = {ok, cell, tiles:tiles.length, none, built:F.n.built - n0, workerMs:F.n.built > n0 ? +((F.n.ms - ms0) / (F.n.built - n0)).toFixed(1) : null, jobMs:F.n.built > n0 ? +((F.n.job - job0) / (F.n.built - n0)).toFixed(1) : null,
        wall:Math.round(wall), slice:+slice.toFixed(2), gap:+gap.toFixed(2), idle:+idle.toFixed(2), layMs:Math.round(layMs), laySlice:+laySlice.toFixed(2), bytes:F.n.bytes, step:+F.n.step.toFixed(2), hist:F.n.h.slice(), ctrl, ctrlMax:+ctrlMax.toFixed(2), ctrl2, ctrl2Max:+ctrl2Max.toFixed(2), hLay, hFelt, long:F.n.long.slice(), gaps:gaps.slice()};
      if (!tiles.length) return R;
      // a read
      t0 = performance.now(); let acc = 0; for (let i = 0; i < 100000; i++){ const q = farbFieldAt(X - half + ((i * 7919) % (2 * half)), Z - half + ((i * 104729) % (2 * half)), cell); if (q) acc += q.d; } R.readUs = +((performance.now() - t0) * 1000 / 100000).toFixed(3);
      // against the geometry
      const C = {n:0, over:0, under:0, maxOver:0, maxUnder:0, zOver:0, zOver05:0, zMax:0, zUnk:0, zLow:0, z10:0, uDiff:0, unk:0}, bad = [], nob = {air:-Infinity}, ll = (x, z) => { const q = natLL({x:x / 1000, y:z / 1000}); return [+q.lat.toFixed(5), +q.lon.toFixed(5)]; };
      for (let k = 0; k < (o.n || 3000); k++){ const Y = tiles[Math.floor(rand() * tiles.length)], i = Math.floor(rand() * F.N), j = Math.floor(rand() * F.N), x = Y.x0 + (i + 0.5) * cell, z = Y.z0 + (j + 0.5) * cell, q = j * F.N + i;
        const g = farbNearest(x, z, F.cap, nob), gd = g ? g.d : F.cap; if (gd !== gd){ C.unk++; continue; } C.n++; const fd = Y.d[q] * F.q;
        if (fd > gd + 1e-3){ C.over++; C.maxOver = Math.max(C.maxOver, fd - gd); if (bad.length < 8) bad.push({hva:'felt lenger unna', ll:ll(x, z), felt:fd, geo:+gd.toFixed(2), ting:g && g.what}); }
        else if (gd - fd > F.q + 1e-3){ C.under++; C.maxUnder = Math.max(C.maxUnder, gd - fd); if (bad.length < 8) bad.push({hva:'felt nærmere', ll:ll(x, z), felt:fd, geo:+gd.toFixed(2), ting:g && g.what}); }
        // (the water where the field has the cell open: a cell with a thing on it is shut whatever water the lattice has round it)
        // (the geometry's depth, with a breakwater's slope where one is near: the pose asks that by her draught, the field has it as depth)
        let gz = farbDepth(x, z); { const nm = farbGather(x, z, 20); for (let a = 0; a < nm; a++){ const t = FARB.buf[a]; if (!t.molo) continue; const v = farbCoreDp(t, x, z) - t.base; if (v < FARB.molo.run * FARB.molo.foot) gz = Math.min(gz, v / FARB.molo.run - farbZC(x, z)); } }
        const fz = Y.z[q]; if (fz === 255 || gz !== gz) C.zUnk++; else if (fd > 0){ const f = fz / F.zs, gg = Math.max(0, Math.min(254 / F.zs, gz)); if (f > gg + 1 / F.zs + 1e-6){ C.zOver++; if (f > gg + 0.5) C.zOver05++; C.zMax = Math.max(C.zMax, f - gg); if (bad.length < 8) bad.push({hva:'vann dypere i feltet', ll:ll(x, z), felt:f, geo:+gg.toFixed(2)}); } if (gg < 10){ C.z10++; if (gg - f > 0.5) C.zLow++; } }
        let gu = 255; const n = farbGather(x, z, F.deck + 30); for (let a = 0; a < n; a++){ const t = FARB.buf[a]; if (t.k === 's' && farbD(t, x, z) <= F.deck + 1e-6) gu = Math.min(gu, Math.max(0, Math.min(254, Math.floor(farbUnder(t) / 0.25)))); }
        if (gu !== Y.u[q] && !(farbD({k:'c', x, z, r:0}, x, z) > 0)){ let edge = false; for (let a = 0; a < n; a++){ const t = FARB.buf[a]; if (t.k === 's' && Math.abs(farbD(t, x, z) - F.deck) < 0.01) edge = true; } if (!edge){ C.uDiff++; if (bad.length < 8) bad.push({hva:'dekke', ll:ll(x, z), felt:Y.u[q], geo:gu}); } } }
      C.maxOver = +C.maxOver.toFixed(2); C.maxUnder = +C.maxUnder.toFixed(2); C.zMax = +C.zMax.toFixed(2); R.cmp = C; R.bad = bad; return R; },
    // The sweep against the poses on its way, along the outside of every harbour pocket (the independent control's own probe, steg 141,
    // 23.11.2026: the foreshore is drawn from the coast's line also where the line lies in a pocket, and the sweep's jump over open
    // water went over it at 20 harbour units, 1 336 sweeps). pockets(): every unit's basin and every drawn quay's 50 m, by its outer
    // side. basin(f): points 0.5 to 8 m outside that side; where a pose there is on the bottom, her hull is swept 12 m along the
    // side through it, and the sweep must find what the poses every 0.25 m find
    pockets(){ const out = []; for (const U of UNITA){ const g = ugeo(U), m = unitW(U, 0, g.basinZ); out.push({x:m[0], z:m[1], ux:U.u[0], uz:U.u[1], nx:U.n[0], nz:U.n[1], hl:g.basinX, out:0}); } for (const f of qPockets()) out.push({x:f.x, z:f.z, ux:f.ux, uz:f.uz, nx:f.nx, nz:f.nz, hl:f.hl + 4, out:POCKET}); return out; },
    async basin(f){ if (!await farbNeed([{x:f.x / 1000, y:f.z / 1000}], 0.4)) return {skip:'kartet kom ikke inn'};
      const L = BOAT.len, B = BOAT.beam, fb = {L, B, T:BOAT.draft, air:obsAir() - FARB.airOver}, H = S.t / 60, C = {pkt:0, grunn:0, sveipFri:0, sveipTreff:0, eks:[]};
      for (let s = -f.hl + 1; s <= f.hl - 1; s += 2) for (const d of [0.5, 2, 4, 6, 8]){ const x = f.x + f.ux * s + f.nx * (f.out + d), z = f.z + f.uz * s + f.nz * (f.out + d); C.pkt++;
        const raw = farbCoast(x, z, 20, true); if (!(raw > 0 && raw < FARB.shore.reach + 2)) continue;
        const off = B / 2 - 0.2, X = x + f.nx * off, Z = z + f.nz * off, psi = Math.atan2(f.ux, -f.uz), p = farbPose(X, Z, psi, fb, H); if (!p || p.what !== 'grunn') continue; C.grunn++;
        const p0 = {X:X - f.ux * 6, Z:Z - f.uz * 6, psi}, p1 = {X:X + f.ux * 6, Z:Z + f.uz * 6, psi}, m = farbSweep(p0, p1, fb, H);
        let pose = null; for (let k = 0; k <= 48 && !pose; k++){ const u = k / 48; pose = farbPose(p0.X + (p1.X - p0.X) * u, p0.Z + (p1.Z - p0.Z) * u, psi, fb, H); }
        if (!m && pose){ C.sveipFri++; if (C.eks.length < 2){ const q = natLL({x:X / 1000, y:Z / 1000}); C.eks.push({ll:[+q.lat.toFixed(5), +q.lon.toFixed(5)], pose:pose.what}); } } else if (m) C.sveipTreff++; }
      return C; },
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
      // (the channels the map digs (renner.json) and the 3D view does not yet: the observer sees the foreshore there as 3D draws it, so a
      // pose there with only water touched is counted apart, «renne», not as the map's fault; steg 142)
      const inDug = (X, Z, hs) => hs.every(h => h.what === 'fjære' || h.what === 'grunn') && farbDug().some(s => farbSegD(X, Z, s.ax, s.az, s.bx, s.bz) < s.r + L / 2);
      const C = {n:0, fri:0, begge:0, bareKart:0, bareObs:0, renne:0, ukjent:0, klaring:0, sveip:0, sveipObs:0, sveipKart:0, sveipBegge:0, kart:{}, obs:{}, av:{rute:0, stripe:0, kant:0, ting:0}, msKart:0, msObs:0}, bad = [], seen = [];
      const ll = (X, Z) => { const q = natLL({x:X / 1000, y:Z / 1000}); return [+q.lat.toFixed(5), +q.lon.toFixed(5)]; };
      const test = (kind, X, Z, psi) => { let t0 = performance.now(); const hs = FARSJ.obs(X, Z, psi, ob, world); let t1 = performance.now(); const m = farbPose(X, Z, psi, fb, H, opt); C.msObs += t1 - t0; C.msKart += performance.now() - t1;
        C.n++; C.av[kind]++; const touch = hs.length > 0;
        if (m && m.what === 'ukjent') C.ukjent++;
        else if (touch && !m && inDug(X, Z, hs)) C.renne++;
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
      // right on the things of every kind there are along the lines (the observer's own list, no vessels): a pose with her middle on
      // each, any heading, so the kinds a random pose seldom meets (a floating dock, a rorbu's quay, a turbine) are met
      { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const l of LN) for (const q of l.P){ if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < z0) z0 = q[1]; if (q[1] > z1) z1 = q[1]; }
        let TH = []; try { TH = BK.thingsIn(x0 - strip, z0 - strip, x1 + strip, z1 + strip, true); } catch (e){}
        const by = {}; for (const t of TH) (by[t.what] || (by[t.what] = [])).push(t); const kinds = Object.keys(by); C.ting = {};
        for (let i = 0; i < (o.things || 0) && kinds.length; i++){ const kd = kinds[i % kinds.length], t = by[kd][Math.floor(rand() * by[kd].length)], q = t.P ? t.P[Math.floor(rand() * t.P.length)] : [t.x != null ? t.x : (t.ax + t.bx) / 2, t.z != null ? t.z : (t.az + t.bz) / 2];
          C.ting[kd] = (C.ting[kd] || 0) + 1; test('ting', q[0], q[1], rand() * 2 * Math.PI); } }
      // sweeps: from one pose to another 3 to 25 m on, the hull swept between them by both
      for (let i = 0; i < (o.sweeps || 0); i++){ const s = rand() * tot, q0 = at(s), q1 = at(Math.min(tot, s + 3 + rand() * 22)), off = (rand() * 2 - 1) * (rand() < 0.5 ? B : 40);
        const p0 = {X:q0.X + q0.nx * off, Z:q0.Z + q0.nz * off, psi:q0.psi + (rand() * 2 - 1) * 0.4}, p1 = {X:q1.X + q1.nx * off, Z:q1.Z + q1.nz * off, psi:q1.psi + (rand() * 2 - 1) * 0.4};
        const st = {}, hs = BKO.step(st, p0, ob, world).concat(BKO.step(st, p1, ob, world)), m = farbPose(p0.X, p0.Z, p0.psi, fb, H, opt) || farbSweep(p0, p1, fb, H, opt);
        C.sveip++; if (m && m.what === 'ukjent') C.ukjent++;
        else if (hs.length && !m && inDug(p0.X, p0.Z, hs) && inDug(p1.X, p1.Z, hs)) C.renne++;
        else if (hs.length && !m){ C.sveipObs++; if (bad.length < 12) bad.push({hva:'sveip', ll:ll(p0.X, p0.Z), til:ll(p1.X, p1.Z), p0, p1, obs:hs.slice(0, 3).map(h => h.what + ':' + h.id)}); }
        else if (!hs.length && m){ C.sveipKart++; C.kart[m.what] = (C.kart[m.what] || 0) + 1; } else if (hs.length) C.sveipBegge++; }
      C.msKart = +C.msKart.toFixed(1); C.msObs = +C.msObs.toFixed(1); C.bad = bad; C.type = S.boat.type; C.L = L; C.m = Math.round(tot); return C; }
  };
})();
