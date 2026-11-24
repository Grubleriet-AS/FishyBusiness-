// ===== PLANLEGGEREN: THE WAY FOUND ON THE FIELD, AND CHECKED ON THE MAP (Autonav 2.0 F2, steg 142, 24.11.2026) =====
// Jonas 23.11.2026: «null kollisjoner og grunnstøtinger, rene og naturlige ruter uten omveier». The old planner is a chain of eleven
// repairs (A* in three window sizes, a corridor, the fairway net, lanes, a pocket search, a split, a reversal, mending, straightening,
// pulling and detours), each of them checking a line without a width. This one is two steps:
//  1. the search (planMake, in a worker): A* over the cells of the field (17-farbar.js: the distance to what nobody can pass, the
//     least water, the lowest deck), open to her where the distance is over half her beam and the margin, the water deep enough at
//     the lowest tide of the trip and no deck too low. The cost is the way's length, a little more near the land where there is room
//     to keep off it. The way is then pulled straight wherever the cells between two of its points are as open as the way itself was.
//     It asks for the field's tiles as it comes to them, so only the water it looks at is worked out;
//  2. the check (planBane, here): the way as a bane (17b-bane.js: arcs she can turn) with her whole hull swept along it on the
//     geometry (farbSweep), which is exact where the field is a floor. Where the sweep touches something, that place is shut and the
//     search goes again, a few times at most.
// Within a length and a half of the two ends her own quay does not count (the bench's rule for her own berth, tools/autonav/benk.js).
// Where there is no way, the answer says why and where. Nothing calls this but the bench (--autonav ny) and the flag (planOn).
const PLAN = {cell:4, k:1, tries:6, maxExp:6e6, w:null, id:0, wait:new Map(), n:{plans:0, ms:0, tiles:0}};
// The search: self-contained (it runs in the worker, and in Node for the unit tests). start(J) begins one; run() goes on till it has a
// way {path, exp}, has none {why, at, cause}, or needs tiles {need:[[fx, fz] ...]}, which put() gives it; block() shuts a disc.
// J: {cell, N, q (metres a step of d), a, b ([X, Z] metres), clr (metres she needs to the side: half her beam and the margin), needD (steps of q:
// clr and half a cell), rb (cells to the side a wide hull asks the water of), needZ (dm), needU (steps of 0.25 m), pref (metres off
// the land she keeps where there is room), k (how much longer a way she takes for that), endR (metres round the ends where only what
// is solid shuts a cell), maxExp}
function planMake(){
  const TL = new Map(), R2 = Math.SQRT2, DX = [1, 1, 0, -1, -1, -1, 0, 1], DZ = [0, 1, 1, 1, 0, -1, -1, -1];
  let J = null, N = 0, cell = 0, HF = new Float64Array(1024), HX = new Int32Array(1024), HZ = new Int32Array(1024), hn = 0, blocks = [], best = null, exp = 0, gx = 0, gz = 0, sx = 0, sz = 0, live = [];
  const tk = (fx, fz) => fx * 100003 + fz, tileAt = (ix, iz) => TL.get(tk(Math.floor(ix / N), Math.floor(iz / N)));
  const push = (f, x, z) => { if (hn === HF.length){ const n2 = hn * 2, a = new Float64Array(n2), b = new Int32Array(n2), c = new Int32Array(n2); a.set(HF); b.set(HX); c.set(HZ); HF = a; HX = b; HZ = c; }
    let i = hn++; while (i > 0){ const p = (i - 1) >> 1; if (HF[p] <= f) break; HF[i] = HF[p]; HX[i] = HX[p]; HZ[i] = HZ[p]; i = p; } HF[i] = f; HX[i] = x; HZ[i] = z; };
  const pop = () => { const f = HF[0], x = HX[0], z = HZ[0]; hn--; if (hn > 0){ const lf = HF[hn], lx = HX[hn], lz = HZ[hn]; let i = 0;
      for (;;){ let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && HF[c + 1] < HF[c]) c++; if (HF[c] >= lf) break; HF[i] = HF[c]; HX[i] = HX[c]; HZ[i] = HZ[c]; i = c; } HF[i] = lf; HX[i] = lx; HZ[i] = lz; } return [f, x, z]; };
  const nearEnd = (x, z) => { const e = J.endR; return (x - J.a[0]) * (x - J.a[0]) + (z - J.a[1]) * (z - J.a[1]) < e * e || (x - J.b[0]) * (x - J.b[0]) + (z - J.b[1]) * (z - J.b[1]) < e * e; };
  // whether the cell is open to her (0 shut; else 1): t its tile, k its place in it; why: counts what shut it
  const open = (t, k, ix, iz, why) => { if (t.none){ if (why) why.ukjent++; return 0; } const zz = t.z[k], u = t.u[k], x = (ix + 0.5) * cell, z = (iz + 0.5) * cell;
    if (zz === 255){ if (why) why.ukjent++; return 0; } if (zz < J.needZ){ if (why && t.d[k] > 0) why.grunt++; else if (why) why.land++; return 0; }
    if (u !== 255 && u < J.needU){ if (why) why.bru++; return 0; }
    if (t.d[k] < (nearEnd(x, z) ? 1 : J.needD)){ if (why){ if (t.d[k] === 0) why.land++; else why.trangt++; } return 0; }
    for (const b of blocks) if ((x - b[0]) * (x - b[0]) + (z - b[1]) * (z - b[1]) < b[2] * b[2]){ if (why) why.trangt++; return 0; }
    return 1; };
  // (the field's water is the least within a cell and a half of the cell's middle: a hull wider than that asks the cells J.rb out
  // on every side too, so a shoal under her side shuts the cell as one under her keel does)
  const okAt = (ix, iz, why) => { const t = tileAt(ix, iz); if (!t) return -1; const o = open(t, (iz - Math.floor(iz / N) * N) * N + ix - Math.floor(ix / N) * N, ix, iz, why); if (!o || !J.rb) return o;
    for (let i = 0; i < 8; i++){ const jx = ix + DX[i] * J.rb, jz = iz + DZ[i] * J.rb, t2 = tileAt(jx, jz); if (!t2 || t2.none) continue; const k2 = (jz - Math.floor(jz / N) * N) * N + jx - Math.floor(jx / N) * N, zz = t2.z[k2];
      if (zz !== 255 && zz < J.needZ && t2.d[k2] > 0){ if (why) why.grunt++; return 0; } }
    return 1; };
  const state = t => { if (!t.g){ t.g = new Float32Array(N * N).fill(Infinity); t.par = new Int8Array(N * N).fill(-1); t.st = new Uint8Array(N * N); live.push(t); } return t; };
  const missing = (ix, iz) => { const out = [], mg = 1 + (J.rb || 0); for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++){ const fx = Math.floor((ix + a * mg) / N), fz = Math.floor((iz + b * mg) / N); if (!TL.has(tk(fx, fz)) && !out.some(q => q[0] === fx && q[1] === fz)) out.push([fx, fz]); } return out; };
  // the nearest open cell to a cell within the ends' reach (a port's point may lie on the quay)
  const nearest = (ix, iz) => { if (okAt(ix, iz) === 1) return [ix, iz]; const m = Math.ceil(J.endR / cell) + 2; let bd = Infinity, out = null;
    for (let b = -m; b <= m; b++) for (let a = -m; a <= m; a++){ const d = a * a + b * b; if (d < bd && okAt(ix + a, iz + b) === 1){ bd = d; out = [ix + a, iz + b]; } } return out; };
  function start(job){ J = job; N = J.N; cell = J.cell; for (const t of live){ t.g.fill(Infinity); t.par.fill(-1); t.st.fill(0); } hn = 0; exp = 0; best = null; J.ready = false; }
  function put(fx, fz, t){ TL.set(tk(fx, fz), t && !t.none ? {d:t.d, z:t.z, u:t.u} : {none:true}); }
  function block(x, z, r){ blocks.push([x, z, r]); }
  function clear(){ blocks = []; }
  function run(){
    if (!J.ready){ const ax = Math.floor(J.a[0] / cell), az = Math.floor(J.a[1] / cell), bx = Math.floor(J.b[0] / cell), bz = Math.floor(J.b[1] / cell), m = Math.ceil(J.endR / cell) + 3, need = [];
      for (const [cx, cz] of [[ax, az], [bx, bz]]) for (let fz = Math.floor((cz - m) / N); fz <= Math.floor((cz + m) / N); fz++) for (let fx = Math.floor((cx - m) / N); fx <= Math.floor((cx + m) / N); fx++) if (!TL.has(tk(fx, fz)) && !need.some(q => q[0] === fx && q[1] === fz)) need.push([fx, fz]);
      if (need.length) return {need};
      const s = nearest(ax, az), g = nearest(bx, bz); if (!s) return {why:'start', at:J.a, cause:cause(ax, az)}; if (!g) return {why:'mål', at:J.b, cause:cause(bx, bz)};
      sx = s[0]; sz = s[1]; gx = g[0]; gz = g[1]; const t = state(tileAt(sx, sz)), k = (sz - Math.floor(sz / N) * N) * N + sx - Math.floor(sx / N) * N; t.g[k] = 0; push(Math.hypot(gx - sx, gz - sz) * cell, sx, sz); J.ready = true; }
    const mg = 1 + (J.rb || 0);
    while (hn){ const top = pop(), ix = top[1], iz = top[2], t = state(tileAt(ix, iz)), lx = ix - Math.floor(ix / N) * N, lz = iz - Math.floor(iz / N) * N, k = lz * N + lx; if (t.st[k] === 2) continue;
      if (lx < mg || lz < mg || lx >= N - mg || lz >= N - mg){ const need = missing(ix, iz); if (need.length){ push(top[0], ix, iz); return {need}; } }
      t.st[k] = 2; exp++; if (ix === gx && iz === gz) return finish();
      const h = Math.hypot(gx - ix, gz - iz) * cell; if (!best || h < best[0]) best = [h, ix, iz];
      if (exp > J.maxExp) return {why:'for langt', at:[(best[1] + 0.5) * cell, (best[2] + 0.5) * cell], cause:cause(best[1], best[2], true), exp};
      const g0 = t.g[k]; let ok = 0;   // (bit i: the neighbour i is open)
      for (let i = 0; i < 8; i++) if (okAt(ix + DX[i], iz + DZ[i]) === 1) ok |= 1 << i;
      for (let i = 0; i < 8; i++){ if (!(ok & (1 << i))) continue; if (i & 1){ if (!(ok & (1 << (i - 1))) || !(ok & (1 << ((i + 1) & 7)))) continue; }   // (no cutting a corner of what is shut)
        const nx = ix + DX[i], nz = iz + DZ[i], nt = state(tileAt(nx, nz)), nk = (nz - Math.floor(nz / N) * N) * N + nx - Math.floor(nx / N) * N; if (nt.st[nk] === 2) continue;
        const dm = nt.d[nk] * J.q, ng = g0 + cell * (i & 1 ? R2 : 1) * (1 + (dm >= J.pref ? 0 : J.k * (1 - dm / J.pref)));
        if (ng < nt.g[nk]){ nt.g[nk] = ng; nt.par[nk] = i; push(ng + Math.hypot(gx - nx, gz - nz) * cell, nx, nz); } } }
    return best ? {why:'ingen vei', at:[(best[1] + 0.5) * cell, (best[2] + 0.5) * cell], cause:cause(best[1], best[2], true), exp} : {why:'ingen vei', at:J.a, cause:'ukjent', exp}; }
  // What shuts her out. At an end (no water for her within reach of the place): what the cells round it are shut by. For a search
  // that came to nothing (wall): what she would have to be without to come on from where it came nearest the goal: under a deck
  // too low, over water too shallow, or through a gap too narrow; else it is land (or a chart that is not in)
  function cause(ix, iz, wall){ const w = {grunt:0, bru:0, trangt:0, land:0, ukjent:0}; for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) if (okAt(ix + a, iz + b, w) === -1) w.ukjent++;
    if (!wall) return w.ukjent > 40 ? 'ukjent' : w.grunt ? 'grunt' : w.bru ? 'bru' : 'land';
    for (const kind of ['bru', 'grunt', 'trangt']){ const seen = new Set([ix * 100003 + iz]), qx = [ix], qz = [iz];
      for (let h = 0; h < qx.length && h < 30000; h++) for (let i = 0; i < 8; i += 2){ const nx = qx[h] + DX[i], nz = qz[h] + DZ[i], key = nx * 100003 + nz; if (seen.has(key)) continue; seen.add(key);
        const t = tileAt(nx, nz); if (!t || t.none) continue; const k = (nz - Math.floor(nz / N) * N) * N + nx - Math.floor(nx / N) * N, zz = t.z[k], u = t.u[k], d = t.d[k]; if (zz === 255 || d < 1) continue;
        if (kind !== 'grunt' && zz < J.needZ) continue; if (kind !== 'bru' && u !== 255 && u < J.needU) continue; if (kind !== 'trangt' && d < J.needD) continue;
        if (!t.st || t.st[k] !== 2){ if (okAt(nx, nz) === 1) return kind; }
        qx.push(nx); qz.push(nz); } }
    return w.ukjent > 8 ? 'ukjent' : 'land'; }
  // what the straight way between two points costs (as the search counts: its length, more near the land); -1 where a cell on it is shut
  const los = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (cell * 0.5))), st = L / n; let c = 0;
    for (let i = 0; i <= n; i++){ const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n, ix = Math.floor(x / cell), iz = Math.floor(z / cell); if (okAt(ix, iz) !== 1) return -1;
      const t = tileAt(ix, iz), dm = t.d[(iz - Math.floor(iz / N) * N) * N + ix - Math.floor(ix / N) * N] * J.q;
      if (dm - Math.hypot(x - (ix + 0.5) * cell, z - (iz + 0.5) * cell) < J.clr + st * 0.5 && !nearEnd(x, z)) return -1;   // (the distance is from the cell's middle: no nearer than that less the way from the middle)
      c += st * (i === 0 || i === n ? 0.5 : 1) * (1 + (dm >= J.pref ? 0 : J.k * (1 - dm / J.pref))); }
    return c; };
  function finish(){ const C = []; let ix = gx, iz = gz;
    for (let guard = 0; guard < 4e6; guard++){ const t = tileAt(ix, iz), k = (iz - Math.floor(iz / N) * N) * N + ix - Math.floor(ix / N) * N; C.push([(ix + 0.5) * cell, (iz + 0.5) * cell, t.g[k]]); if (ix === sx && iz === sz) break; const p = t.par[k]; if (p < 0) break; ix -= DX[p]; iz -= DZ[p]; }
    C.reverse(); const n = C.length, out = [C[0]]; let i = 0;
    // Pulled straight: from each point the farthest one the straight way to is open and costs no more than the way found between
    // them did (so where she kept off the land because there was room, she still does)
    const see = (a, b) => { const c = los(C[a][0], C[a][1], C[b][0], C[b][1]); return c >= 0 && c <= (C[b][2] - C[a][2]) * 1.002 + 0.01; };
    while (i < n - 1){ let k = i + 1;
      for (;;){ if (k === n - 1) break; const nx = Math.min(n - 1, k + Math.max(1, k - i));
        if (see(i, nx)){ k = nx; continue; }
        let a = k, b = nx; while (b - a > 1){ const mid = (a + b) >> 1; if (see(i, mid)) a = mid; else b = mid; }
        k = a; break; }
      out.push(C[k]); i = k; }
    const path = out.map(q => [q[0], q[1]]);
    // (the ends as they were given: the first and the last cell's middle give way to them where they are in the same cell)
    if (Math.hypot(path[0][0] - J.a[0], path[0][1] - J.a[1]) < cell * 1.5) path[0] = J.a.slice(); else path.unshift(J.a.slice());
    const e = path.length - 1; if (Math.hypot(path[e][0] - J.b[0], path[e][1] - J.b[1]) < cell * 1.5 && e > 0) path[e] = J.b.slice(); else path.push(J.b.slice());
    return {path, exp, cells:n}; }
  return {start, put, run, block, clear};
}
// the worker (false where one cannot start): the search and its tiles live there
function planWorker(){ if (PLAN.w !== null) return PLAN.w;
  try { const src = 'const PL = (' + planMake.toString() + ')();\nonmessage = e => { const m = e.data; try { if (m.op === "start"){ PL.clear(); PL.start(m.J); } else if (m.op === "tiles"){ for (const t of m.tiles) PL.put(t.fx, t.fz, t.none ? null : t); } else if (m.op === "block"){ PL.block(m.x, m.z, m.r); PL.start(m.J); } postMessage(Object.assign({id:m.id}, PL.run())); } catch (err){ postMessage({id:m.id, why:"feil", err:String(err)}); } };';
    const w = new Worker(URL.createObjectURL(new Blob([src], {type:'text/javascript'})));
    w.onmessage = e => { const res = PLAN.wait.get(e.data.id); if (res){ PLAN.wait.delete(e.data.id); res(e.data); } };
    w.onerror = () => { PLAN.w = false; for (const res of PLAN.wait.values()) res({why:'feil', err:'the planner worker failed'}); PLAN.wait.clear(); };
    PLAN.w = w; } catch (e){ PLAN.w = false; }
  return PLAN.w; }
// why there is no way, in words (Norwegian, English)
function planWhy(r){ const c = {grunt:['for grunt for båten', 'too shallow for the boat'], bru:['brua er for lav for båten', 'the bridge is too low for the boat'], trangt:['for trangt for båten', 'too narrow for the boat'], land:['land i veien', 'land in the way'], ukjent:['kartet er ikke lastet der', 'the chart is not loaded there']}[r.cause] || ['ingen vei', 'no way'];
  const p = r.at ? natLL({x:r.at[0] / 1000, y:r.at[1] / 1000}) : null, at = p ? ' (' + p.lat.toFixed(4) + '° N, ' + p.lon.toFixed(4) + '° Ø)' : '';
  return r.why === 'for langt' ? ['Fant ingen bane: søket ble for stort' + at, 'Found no way: the search grew too large' + at] : ['Fant ingen bane: ' + c[0] + at, 'Found no way: ' + c[1] + at]; }
// The bane from a to b (km) for a boat of the type (hers when left out): {bane, pts (for a plan, each with s), nm, ms, tiles, tries,
// exp, Hmin} or {why (words), cause, at ([X, Z] m), ms}. opt: {kn (the speed she is sent at), end (false: she does not stop at b),
// side (the margin to the side, m)}. Asynchronous: the tiles are built as the search asks for them
async function planBane(a, b, type, opt){ const t0 = performance.now(), ty = type || S.boat.type, boat = farbBoat(ty), bb = baneBoat(ty, opt && opt.kn), F = FARB.F, cell = PLAN.cell, Tf = F.N * cell, H0 = S.t / 60;
  const ax = a.x * 1000, az = a.y * 1000, bx = b.x * 1000, bz = b.y * 1000, fail = (r, extra) => Object.assign({why:planWhy(r), cause:r.cause || r.why, at:r.at || null, ms:Math.round(performance.now() - t0)}, extra || {});
  const w = planWorker(); if (!w) return fail({why:'feil', cause:'ukjent'});
  // the lowest water while she is on the way (the tide where she starts: it is the same within a trip of this length)
  const hrs = Math.hypot(bx - ax, bz - az) / bb.vmax / 3600 * 1.5 + 0.25; let Hmin = H0, lv = Infinity; for (let h = 0; h <= hrs + 1e-9; h += 1 / 6){ const v = farbTide(H0 + h, ax, az); if (v < lv){ lv = v; Hmin = H0 + h; } }
  let sq = 0; try { sq = dynSquat(dynCal(ty).P, bb.vmax, false); } catch (e){}
  const side = opt && opt.side != null ? opt.side : FARB.side, own = BANE.own * boat.L;
  const J = {cell, N:F.N, q:F.q, a:[ax, az], b:[bx, bz], clr:boat.B / 2 + side, needD:Math.ceil((boat.B / 2 + side + cell * 0.5) / F.q), needZ:Math.ceil((boat.T + sq + FARB.keel - lv + FARB.eps) * 10), needU:Math.ceil((boat.air + FARB.airOver) / 0.25),
    pref:Math.min(F.cap - 1, Math.max(25, boat.B * 3)), k:PLAN.k, endR:own + cell, maxExp:PLAN.maxExp, rb:boat.B / 2 + side > cell * 1.5 ? Math.ceil((boat.B / 2 + side - cell * 1.5) / cell) : 0};
  const send = msg => new Promise(res => { const id = ++PLAN.id; PLAN.wait.set(id, res); w.postMessage(Object.assign({id}, msg)); });
  const skip = h => Math.hypot(h.x - ax, h.z - az) < own || Math.hypot(h.x - bx, h.z - bz) < own;   // (her own berth, by where the touch is)
  let r = await send({op:'start', J}), tiles = 0, tries = 0, exp = 0;
  const o = Object.assign({}, bb, {end:!(opt && opt.end === false)}), sw = {m:side, keel:FARB.keel, squat:sq, boats:true, skip}, memo = new Map(), rMin = Math.max(boat.B / 2, bb.R / 16);
  for (;;){
    if (r.need){ const out = [], tr = [];
      for (const [fx, fz] of r.need){ await farbFieldNeed(fx * Tf + 1, fz * Tf + 1, (fx + 1) * Tf - 1, (fz + 1) * Tf - 1, cell); const Y = farbFieldTile(cell, fx, fz); tiles++;
        if (Y && !Y.none){ const d = Y.d.slice(), z = Y.z.slice(), u = Y.u.slice(); out.push({fx, fz, d, z, u}); tr.push(d.buffer, z.buffer, u.buffer); } else out.push({fx, fz, none:true}); }
      r = await new Promise(res => { const id = ++PLAN.id; PLAN.wait.set(id, res); w.postMessage({id, op:'tiles', tiles:out}, tr); }); continue; }
    if (r.why){ PLAN.n.plans++; return fail(r, {tiles, tries, exp:exp + (r.exp || 0)}); }
    exp += r.exp || 0;
    // The way as a bane she can sail, her hull swept along it on the geometry at the lowest water. An arc that touches is made
    // tighter (she goes slower round it) till it is free or as tight as she can be turned; what touches then shuts the place
    let Q = r.path.map(q => [q[0], q[1], 0]), B = null, hit = null;
    for (let i = 0; i + 1 < Q.length; i++){ const n = Math.max(1, Math.ceil(Math.hypot(Q[i + 1][0] - Q[i][0], Q[i + 1][1] - Q[i][1]) / 2000));
      for (let j = 0; j < n; j++) if (!await farbNeed([{x:(Q[i][0] + (Q[i + 1][0] - Q[i][0]) * j / n) / 1000, y:(Q[i][1] + (Q[i + 1][1] - Q[i][1]) * j / n) / 1000}, {x:(Q[i][0] + (Q[i + 1][0] - Q[i][0]) * (j + 1) / n) / 1000, y:(Q[i][1] + (Q[i + 1][1] - Q[i][1]) * (j + 1) / n) / 1000}], 0.4)) return fail({why:'ingen vei', cause:'ukjent', at:[Q[i][0], Q[i][1]]}, {tiles, tries, exp}); }
    for (let guard = 0; guard < 200; guard++){ B = baneBuild(Q, o); Q = B.Q; hit = await farbRunA(baneFriG(B, boat, Hmin, sw, memo)); if (!hit || hit.what === 'ukjent') break;
      const p = B.P[hit.i]; if (p.k !== 'a' || p.r / 2 < rMin) break; Q[p.c][2] = p.r / 2; }
    if (!hit){ PLAN.n.plans++; PLAN.n.tiles += tiles; const ms = Math.round(performance.now() - t0); PLAN.n.ms += ms; return {bane:B, pts:banePts(B), nm:B.len / 1852, ms, tiles, tries, exp, Hmin, need:J}; }
    const cs = hit.what === 'ukjent' ? 'ukjent' : hit.what === 'grunn' ? 'grunt' : hit.what === 'brudekke' ? 'bru' : 'trangt';
    if (hit.what === 'ukjent' || ++tries > PLAN.tries){ PLAN.n.plans++; return fail({why:'ingen vei', cause:cs, at:[hit.x, hit.z]}, {tiles, tries, exp, hit:hit.what + ':' + hit.id}); }
    // shut round what she touched, a cell wider for each time, and search again
    r = await send({op:'block', J, x:hit.x, z:hit.z, r:boat.B / 2 + side + cell * (1 + tries)}); } }
// The plan's points replaced by a bane's (the bench, and the flag): pl.bane, pl.baneAt (how far along each point lies), pl.baneS (how
// far she has come). The last point keeps what the plan's last point was (the harbour she docks in)
function planInto(pl, R){ const last = pl.wps[pl.wps.length - 1], n = R.pts.length;
  pl.wps = R.pts.map((q, i) => i === n - 1 ? Object.assign({}, last, {x:q.x, y:q.y}) : {x:q.x, y:q.y, port:null, fish:0, leia:true}); pl.baneAt = R.pts.map(q => q.s); pl.bane = R.bane; pl.baneS = 0; pl.idx = 0; return pl; }
