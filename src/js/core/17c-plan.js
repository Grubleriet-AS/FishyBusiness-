// ===== PLANLEGGEREN: THE WAY FOUND ON THE FIELD, AND CHECKED ON THE MAP (Autonav 2.0 F2, steg 142, 24.11.2026) =====
// Jonas 23.11.2026: «null kollisjoner og grunnstøtinger, rene og naturlige ruter uten omveier». The old planner is a chain of eleven
// repairs (A* in three window sizes, a corridor, the fairway net, lanes, a pocket search, a split, a reversal, mending, straightening,
// pulling and detours), each of them checking a line without a width. This one is two steps:
//  1. the search (planMake, in a worker): A* over the cells of the field (17-farbar.js: the distance to what nobody can pass, the
//     least water, the lowest deck; cells of 2 m near the ends and where it is narrow, 4 m elsewhere), open to her where the distance is over half her beam and the margin, the water deep enough at
//     the lowest tide of the trip and no deck too low. The cost is the way's length, a little more near the land where there is room
//     to keep off it. The way is then pulled straight wherever the cells between two of its points are as open as the way itself was.
//     It asks for the field's tiles as it comes to them, so only the water it looks at is worked out;
//  2. the check (planBane, here): the way as a bane (17b-bane.js: arcs she can turn) with her whole hull swept along it on the
//     geometry (farbSweep), which is exact where the field is a floor. Where the sweep touches something, that place is shut and the
//     search goes again, a few times at most.
// Within a length and a half of the two ends her own quay does not count (the bench's rule for her own berth, tools/autonav/benk.js).
// Where there is no way, the answer says why and where. Nothing calls this but the bench (--autonav ny) and the flag (planOn).
const PLAN = {on:null, realAir:false, digK:8, ver:'', sent:0, cell:2, co:100, fineR:350, k:1, w8:1.15, tries:6, maxExp:6e6, w:null, id:0, wait:new Map(), n:{plans:0, ms:0, tiles:0}};
// The search: self-contained (it runs in the worker, and in Node for the unit tests). start(J) begins one; run() goes on till it has a
// way {path, exp}, has none {why, at, cause}, or needs tiles {need:[[cell, fx, fz] ...]}, which put() gives it; block() shuts a disc.
// Two sizes of cell on one lattice: the fine one (J.c2 m; a tile of it is a block) within J.fineR of the two ends and where a search
// that came to nothing found water behind something narrow or shallow (the field's water is the least within a cell and a half,
// so a harbour's mouth of 20 m is shut on cells of 4 m and open on cells of 2), and cells twice as big everywhere else. A place is a
// pair of whole numbers on the fine lattice; a big cell is come to at its even ones.
// J: {c2, N, q (metres a step of d), a, b ([X, Z] metres), clr (metres she needs to the side: half her beam and the margin), needD2,
// needD4 (steps of q: clr and half a cell), rb2, rb4 (cells to the side a wide hull asks the water of), needZ (dm: the water she
// needs to float over a place slowly), needZf (with her squat at full speed), slow (how much longer the way takes where she must go
// slowly), needU (steps of 0.25 m),
// turnR (her turning radius, m: finish's gentle; left out, a jog is left as it is),
// dig (where a channel is to be dredged, planDig: water too shallow for her does not shut a cell, the way over it costs this many times as much),
// side (with dig: the water to her sides shuts a cell all the same, the second search's), cap (the search gives up past this many cells),
// pref (metres off the land she keeps where there is room), k (how much longer a way she takes for that), w (the weight on what is
// left), endR (metres round the ends where only what is solid shuts a cell), fineR, maxExp}
function planMake(){
  const T2 = new Map(), T4 = new Map(), R2 = Math.SQRT2, DX = [1, 1, 0, -1, -1, -1, 0, 1], DZ = [0, 1, 1, 1, 0, -1, -1, -1];
  let J = null, N = 0, c2 = 0, HF = new Float64Array(1024), HX = new Int32Array(1024), HZ = new Int32Array(1024), hn = 0, blocks = [], best = null, exp = 0, gx = 0, gz = 0, sx = 0, sz = 0, fine = new Set(), refined = 0, behind = null, far = false, lim = 0, pre = 2, fineN = 0, decks = 0, h0 = 0;   // (h0: how long the way is where only what is solid shuts a cell, m: preDone)
  let cT = null, cK = 0, cS = 1, cX = 0, cZ = 0, cFx = 0, cFz = 0;   // (the cell last looked up: its tile, its place in it, its size in fine cells, its middle, the tile's own place)
  const key = (a, b) => a * 100003 + b;
  const at = (ix, iz) => { const bx = Math.floor(ix / N), bz = Math.floor(iz / N);
    if (fine.has(key(bx, bz))){ cT = T2.get(key(bx, bz)); cK = (iz - bz * N) * N + ix - bx * N; cS = 1; cX = (ix + 0.5) * c2; cZ = (iz + 0.5) * c2; cFx = bx; cFz = bz; }
    else { const jx = Math.floor(ix / 2), jz = Math.floor(iz / 2), fx = Math.floor(jx / N), fz = Math.floor(jz / N); cT = T4.get(key(fx, fz)); cK = (jz - fz * N) * N + jx - fx * N; cS = 2; cX = (jx + 0.5) * c2 * 2; cZ = (jz + 0.5) * c2 * 2; cFx = fx; cFz = fz; }
    return cT; };
  const push = (f, x, z) => { if (hn === HF.length){ const n2 = hn * 2, a = new Float64Array(n2), b = new Int32Array(n2), c = new Int32Array(n2); a.set(HF); b.set(HX); c.set(HZ); HF = a; HX = b; HZ = c; }
    let i = hn++; while (i > 0){ const p = (i - 1) >> 1; if (HF[p] <= f) break; HF[i] = HF[p]; HX[i] = HX[p]; HZ[i] = HZ[p]; i = p; } HF[i] = f; HX[i] = x; HZ[i] = z; };
  const pop = () => { const f = HF[0], x = HX[0], z = HZ[0]; hn--; if (hn > 0){ const lf = HF[hn], lx = HX[hn], lz = HZ[hn]; let i = 0;
      for (;;){ let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && HF[c + 1] < HF[c]) c++; if (HF[c] >= lf) break; HF[i] = HF[c]; HX[i] = HX[c]; HZ[i] = HZ[c]; i = c; } HF[i] = lf; HX[i] = lx; HZ[i] = lz; } return [f, x, z]; };
  // (what is left to the goal at least, as the cells are walked: straight and diagonal steps; J.w a little over 1 makes the search
  // go for the goal over open water instead of widening evenly, for a way that is at most that much longer before it is pulled straight)
  // And where the chart's own cells are given (J.co: {x0, z0, c, W, H, v: 1 water, 0 land, 2 not known}), the way to the goal over
  // them (CD, metres from each cell): round an island the straight line says nothing of how far it is, and the search would widen
  // over all the water nearer the goal than the way round. It is counted as the search itself counts (straight and diagonal steps),
  // less a cell and a half, so it is seldom more than what is truly left; in a sound the chart's cells shut, the straight line is
  // what there is.
  let CO = null, CD = null;
  const coarse = () => { CO = J.co || null; CD = null; if (!CO) return; const W = CO.W, H = CO.H, c = CO.c, v = CO.v, n = W * H, wt = new Uint8Array(n);
    for (let k = 0; k < n; k++) wt[k] = v[k] ? 1 : 0;
    const D = new Float64Array(n).fill(Infinity), hf = [], hi = [], put = (f, k) => { let i = hf.length; hf.push(f); hi.push(k); while (i > 0){ const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hi[i] = hi[p]; i = p; } hf[i] = f; hi[i] = k; };
    const take = () => { const k = hi[0], lf = hf.pop(), lk = hi.pop(), m = hf.length; if (m){ let i = 0; for (;;){ let q = 2 * i + 1; if (q >= m) break; if (q + 1 < m && hf[q + 1] < hf[q]) q++; if (hf[q] >= lf) break; hf[i] = hf[q]; hi[i] = hi[q]; i = q; } hf[i] = lf; hi[i] = lk; } return k; };
    const gi = Math.floor((J.b[0] - CO.x0) / c), gj = Math.floor((J.b[1] - CO.z0) / c);
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++){ const x = gi + a, z = gj + b; if (x < 0 || z < 0 || x >= W || z >= H) continue; const d = Math.hypot((x + 0.5) * c + CO.x0 - J.b[0], (z + 0.5) * c + CO.z0 - J.b[1]); D[z * W + x] = d; put(d, z * W + x); }   // (the goal may lie on a quay the chart calls land)
    while (hf.length){ const f = hf[0], k = take(); if (f > D[k]) continue; const i = k % W, j = (k - i) / W;
      for (let q = 0; q < 8; q++){ const x = i + DX[q], z = j + DZ[q]; if (x < 0 || z < 0 || x >= W || z >= H) continue; const k2 = z * W + x; if (!wt[k2]) continue;
        if (LT && LT.length === n && ((LC[k] && !LT[k2]) || (LC[k2] && !LT[k]))) continue;   // (what the search has seen: learn)
        const nd = f + c * (q & 1 ? R2 : 1); if (nd < D[k2]){ D[k2] = nd; put(nd, k2); } } }
    CD = D; };
  // (what is left to the goal at least, as the cells are walked: straight and diagonal steps; J.w a little over 1 makes the search
  // go for the goal over open water instead of widening evenly, for a way that is at most that much longer before it is pulled straight)
  const hh = (ix, iz) => { const a = Math.abs(gx - ix), b = Math.abs(gz - iz); let h = (a > b ? a + b * (R2 - 1) : b + a * (R2 - 1)) * c2;
    if (CD){ const c = CO.c, W = CO.W, fx = ((ix + 0.5) * c2 - CO.x0) / c - 0.5, fz = ((iz + 0.5) * c2 - CO.z0) / c - 0.5, i = Math.floor(fx), j = Math.floor(fz);
      if (i >= 0 && j >= 0 && i < W - 1 && j < CO.H - 1){ const k = j * W + i, p = CD[k], q = CD[k + 1], r = CD[k + W], t = CD[k + W + 1];
        const u = fx - i, w = fz - j, wp = p < Infinity ? (1 - u) * (1 - w) : 0, wq = q < Infinity ? u * (1 - w) : 0, wr = r < Infinity ? (1 - u) * w : 0, wt = t < Infinity ? u * w : 0, ws = wp + wq + wr + wt;   // (between the four cells round her that have a way; a cell of land has none)
        if (ws > 1e-6){ const cd = ((wp ? p * wp : 0) + (wq ? q * wq : 0) + (wr ? r * wr : 0) + (wt ? t * wt : 0)) / ws - c * 1.5; if (cd > h) h = cd; } } }
    return h * (J.w || 1); };
  // the water she needs at a place (dm) to float over it slowly; where there is less than she needs at full speed (J.needZf, with her
  // squat), she goes slowly and the way there costs J.slow times as much (the cost is the time it takes)
  const zNeed = (x, z) => J.needZ;
  const nearEnd = (x, z) => { const e = J.endR; return (x - J.a[0]) * (x - J.a[0]) + (z - J.a[1]) * (z - J.a[1]) < e * e || (x - J.b[0]) * (x - J.b[0]) + (z - J.b[1]) * (z - J.b[1]) < e * e; };
  // whether the cell last looked up is open to her (-1 its tile is not in, 0 shut, 1 open); why: counts what shut it
  const openC = why => { const t = cT; if (!t) return -1; if (t.none){ if (why) why.ukjent++; return 0; } const zz = t.z[cK], u = t.u[cK], d = t.d[cK], x = cX, z = cZ;
    if (pre === 1){ if (zz === 255 || d < 1 || (u !== 255 && u < J.needU && !nearEnd(x, z))) return 0; for (const b of blocks) if ((x - b[0]) * (x - b[0]) + (z - b[1]) * (z - b[1]) < b[2] * b[2]) return 0; return 1; }
    if (zz === 255){ if (why) why.ukjent++; return 0; } if (zz < zNeed(x, z) && !(J.dig && d > 0 && !(t.m && t.m[cK] < zNeed(x, z)))){ if (why && d > 0) why.grunt++; else if (why) why.land++; return 0; }   // (J.dig: where to dredge is what is asked, and water too shallow costs instead of shutting; but for a breakwater's foot, the tile's m, which is stone)
    const ne = nearEnd(x, z);   // (at her own berth a quay's deck over her is the quay she lies at: the check on the geometry has the rule)
    if (u !== 255 && u < J.needU && !ne){ if (why) why.bru++; return 0; }
    if (d < (ne ? 1 : cS === 1 ? J.needD2 : J.needD4)){ if (why){ if (d === 0) why.land++; else why.trangt++; } return 0; }
    for (const b of blocks) if ((x - b[0]) * (x - b[0]) + (z - b[1]) * (z - b[1]) < b[2] * b[2]){ if (why) why.trangt++; return 0; }
    return 1; };
  // The cell at a place, open or not (kept per cell till the search is begun again). The field's water is the least within a cell and a
  // half of the cell's middle: a hull wider than that asks the cells rb out on every side too, so a shoal under her side shuts the
  // cell as one under her keel does
  const okAt = (ix, iz, why) => { at(ix, iz); const t = cT, k = cK; if (t && t.op && !why){ const v = t.op[k]; if (v) return v === 1 ? 1 : 0; }
    let o = openC(why); if (o === 1 && pre !== 1 && (!J.dig || J.side) && !sideOk(ix, iz)){ if (why) why.grunt++; o = 0; }
    if (t && t.op && o >= 0) t.op[k] = o === 1 ? 1 : 2; return o; };
  // (the water under her side: the cells rb out from the one at a place, whose size is the last looked up)
  const sideOk = (ix, iz) => { const rb = cS === 1 ? J.rb2 : J.rb4; if (!rb) return true; const s = cS * rb;
    for (let i = 0; i < 8; i++){ at(ix + DX[i] * s, iz + DZ[i] * s); const t2 = cT; if (!t2 || t2.none) continue; const zz = t2.z[cK]; if (zz !== 255 && t2.d[cK] > 0 && zz < zNeed(cX, cZ)) return false; } return true; };
  // the tiles that are not in round a place, mg fine cells out: [[cell, fx, fz] ...]
  const missing = (ix, iz, mg) => { const out = []; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++){ if (at(ix + a * mg, iz + b * mg)) continue; const c = cS * c2, fx = cFx, fz = cFz; if (!out.some(q => q[0] === c && q[1] === fx && q[2] === fz)) out.push([c, fx, fz]); } return out; };
  // the nearest open cell to a place within the ends' reach (a port's point may lie on the quay)
  const nearest = (ix, iz) => { if (okAt(ix, iz) === 1) return [ix, iz]; const m = Math.ceil(J.endR / c2) + 2; let bd = Infinity, out = null;
    for (let b = -m; b <= m; b++) for (let a = -m; a <= m; a++){ const d = a * a + b * b; if (d < bd && okAt(ix + a, iz + b) === 1){ bd = d; out = [ix + a, iz + b]; } } return out; };
  const reset = () => { for (const M of [T2, T4]) for (const t of M.values()) if (t.g){ t.g.fill(Infinity); t.st.fill(0); t.op.fill(0); } hn = 0; best = null; far = false; J.ready = false; };
  const fineAt = (x, z, r) => { const Tb = N * c2; for (let bz = Math.floor((z - r) / Tb); bz <= Math.floor((z + r) / Tb); bz++) for (let bx = Math.floor((x - r) / Tb); bx <= Math.floor((x + r) / Tb); bx++) fine.add(key(bx, bz)); };
  function start(job){ J = job; N = J.N; c2 = J.c2; fine = new Set(); fineAt(J.a[0], J.a[1], J.fineR); fineAt(J.b[0], J.b[1], J.fineR); for (const f of J.fine || []) fineAt(f[0], f[1], f[2]); exp = 0; refined = 0; fineN = 0; decks = 0; h0 = 0; LT = null; LC = null; pre = J.pre === false ? 2 : 1; coarse(); reset(); }
  function put(c, fx, fz, t){ const Y = t && !t.none ? {d:t.d, z:t.z, u:t.u, m:t.m || null, g:new Float32Array(N * N).fill(Infinity), par:new Int8Array(N * N), st:new Uint8Array(N * N), op:new Uint8Array(N * N)} : {none:true}; (c === c2 ? T2 : T4).set(key(fx, fz), Y); }
  function block(x, z, r){ blocks.push([x, z, r]); }
  // What the search has seen, for the chart's cells: LT a cell of theirs the search has been in (one of its own cells there was come
  // to), LC one it is done with (been in, and nothing there left to look at). From a cell it is done with there is no way into a
  // neighbour it was never in, whatever the chart says: had there been, it would have been in it. Kept from one search to the next;
  // true when something new was learnt
  let LT = null, LC = null;
  const learn = () => { const c = CO.c, W = CO.W, H = CO.H, n = W * H; if (!LT || LT.length !== n){ LT = new Uint8Array(n); LC = new Uint8Array(n); } const tn = new Uint8Array(n), pn = new Uint8Array(n);
    for (const [M, sz] of [[T2, c2], [T4, c2 * 2]]) for (const [kk, t] of M){ if (t.none) continue; const fz = kk % 100003, fx = (kk - fz) / 100003, x0 = fx * N * sz, z0 = fz * N * sz;
      for (let k = 0; k < N * N; k++){ if (t.g[k] === Infinity) continue; const i = Math.floor((x0 + (k % N + 0.5) * sz - CO.x0) / c), j = Math.floor((z0 + (Math.floor(k / N) + 0.5) * sz - CO.z0) / c); if (i < 0 || j < 0 || i >= W || j >= H) continue; tn[j * W + i] = 1; if (t.st[k] !== 2) pn[j * W + i] = 1; } }
    let ch = 0; for (let q = 0; q < n; q++) if (tn[q]){ if (!LT[q]){ LT[q] = 1; ch++; } if (!pn[q] && !LC[q]){ LC[q] = 1; ch++; } } return ch; };
  // (wider cells of the chart's, given when the way round was not within the first: what the search has seen is put on them as on
  // those before; none to give, and the search goes on with what it has)
  function co(c){ if (c){ J.co = c; CO = c; LT = null; learn(); coarse(); } else J.coDone = true; reset(); }
  function again(){ exp = 0; refined = 0; pre = 2; reset(); }   // (the same search once more, after a place was shut: the fine cells it had stay)
  function clear(){ blocks = []; }
  function run(){ for (;;){ const r = search(); if (!r.again) return r; } }
  function search(){
    if (!J.ready){ const ax = Math.floor(J.a[0] / c2), az = Math.floor(J.a[1] / c2), bx = Math.floor(J.b[0] / c2), bz = Math.floor(J.b[1] / c2), m = Math.min(N - 1, Math.ceil(J.endR / c2) + 3 + 2 * (J.rb2 || 0)), need = [];
      for (const [cx, cz] of [[ax, az], [bx, bz]]) for (const q of missing(cx, cz, m)) if (!need.some(v => v[0] === q[0] && v[1] === q[1] && v[2] === q[2])) need.push(q);
      if (need.length) return {need};
      const s = nearest(ax, az), g = nearest(bx, bz); if (!s) return {why:'start', at:J.a, cause:cause(ax, az)}; if (!g) return {why:'mål', at:J.b, cause:cause(bx, bz)};
      sx = s[0]; sz = s[1]; gx = g[0]; gz = g[1]; at(sx, sz); cT.g[cK] = 0; push(hh(sx, sz), sx, sz); J.ready = true;
      lim = exp + Math.min(J.maxExp, 5e5 + 600 * hh(sx, sz) / (c2 * 2)); if (J.cap) lim = Math.min(lim, J.cap); }   // (a search that finds no way stops when it has looked at 600 cells for each one of the way it took to be left: the way round a bridge too low for her, which the chart's cells know nothing of, is found by filling the water this side of it)
    while (hn){ const top = pop(), ix = top[1], iz = top[2]; at(ix, iz); const t = cT, k = cK, s = cS, px = cX, pz = cZ; if (t.st[k] === 2) continue;
      const m = 1 + (s === 1 ? J.rb2 : J.rb4), lx = k % N, lz = (k - lx) / N;
      if (lx < m || lz < m || lx >= N - m || lz >= N - m){ const need = missing(ix, iz, m * s); if (need.length){ push(top[0], ix, iz); return {need}; } }
      // (her neighbours first, bit i: the neighbour i is open. One whose tile is not in is asked for before the search is done with this
      // cell: a block of fine cells begins in the middle of a big tile, so a tile's own edge is not where they are all met)
      let ok = 0, nd = null;
      for (let i = 0; i < 8; i++){ const v = okAt(ix + DX[i] * s, iz + DZ[i] * s); if (v === 1) ok |= 1 << i; else if (v === -1){ const c = cS * c2, fx = cFx, fz = cFz; nd = nd || []; if (!nd.some(q => q[0] === c && q[1] === fx && q[2] === fz)) nd.push([c, fx, fz]); } }
      if (nd){ push(top[0], ix, iz); return {need:nd}; }
      t.st[k] = 2; exp++; if (ix === gx && iz === gz) return pre === 1 ? preDone(true) : finish();
      const h = hh(ix, iz); if (!best || h < best[0]) best = [h, ix, iz];
      if (exp > lim){ hn = 0; far = true; break; }
      const g0 = t.g[k];
      for (let i = 0; i < 8; i++){ if (!(ok & (1 << i))) continue; if (i & 1){ if (!(ok & (1 << (i - 1))) || !(ok & (1 << ((i + 1) & 7)))) continue; }   // (no cutting a corner of what is shut)
        let nx = ix + DX[i] * s, nz = iz + DZ[i] * s; at(nx, nz); const nt = cT, nk = cK, ns = cS, qx = cX, qz = cZ, ox = ns === 2 ? nx & 1 : 0, oz = ns === 2 ? nz & 1 : 0;
        nx -= ox; nz -= oz;   // (a big cell is come to at its own place: its even one)
        if (ns === 1 && s === 2 && okAt(ix + DX[i], iz + DZ[i]) !== 1) continue;   // (from a big cell into the fine ones: the fine cell stepped over is open too)
        if (nt.st[nk] === 2) continue;
        const dm = nt.d[nk] * J.q, ng = g0 + Math.hypot(qx - px, qz - pz) * (1 + (dm >= J.pref ? 0 : J.k * (1 - dm / J.pref))) * (nt.z[nk] < J.needZf ? J.slow : 1) * (J.dig && nt.z[nk] < J.needZ ? J.dig : 1);
        if (ng < nt.g[nk]){ nt.g[nk] = ng; nt.par[nk] = i + (s === 2 ? 8 : 0) + ox * 16 + oz * 32; push(ng + hh(nx, nz), nx, nz); } } }
    if (pre === 1) return preDone(false);
    if (far && J.cap) return {why:'for langt', at:J.b, cause:'ukjent', exp};   // (a search with a cap of its own, the second one for a shorter way: it gives up there, the way it is held against stands)
    if (!best) return {why:'ingen vei', at:J.a, cause:'ukjent', exp};
    // Nothing more to try. What shut her out, and where the water goes on behind it; where that is behind something narrow or
    // shallow on the big cells, the same is searched again on the fine ones there (three times at most)
    at(best[1], best[2]); const bxm = cX, bzm = cZ, cs = cause(best[1], best[2], true); if (cs && cs.need) return cs;
    // What the chart's cells do not know: a bridge too low for her, a causeway thinner than a cell. The way they showed went through
    // it, and the search filled the water on this side. What the search has now seen is given to the chart's cells (learn), the way
    // over them is counted again, and the search goes once more with the way round as its sense of how far it is (four times at most)
    if (CO && decks < 4 && learn()){ decks++; coarse();
      // (and where that leaves her no way to the goal over the cells she was given, the way round lies outside them: wider ones are asked for)
      const i = Math.floor((J.a[0] - CO.x0) / CO.c), j = Math.floor((J.a[1] - CO.z0) / CO.c); let ok = false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++){ const x = i + a, z = j + b; if (x >= 0 && z >= 0 && x < CO.W && z < CO.H && CD[z * CO.W + x] < Infinity) ok = true; }
      if (!ok && !J.coDone) return {needCo:true}; reset(); return {again:true}; }
    if (far) return {why:'for langt', at:[bxm, bzm], cause:cs, exp, decks, refined, fineN};
    if (behind && (cs === 'grunt' || cs === 'trangt') && refined < 3 && behind.some(q => q[2] === 2)){ refined++; for (const q of behind) fineAt(q[0], q[1], 60); fineAt(bxm, bzm, 60); reset(); return {again:true}; }
    return {why:'ingen vei', at:[bxm, bzm], cause:cs, exp, decks, refined, fineN}; }
  // What shuts her out. At an end (no water for her within reach of the place): what the cells round it are shut by. For a search
  // that came to nothing (wall): what she would have to be without to come on from where it came nearest the goal: under a deck
  // too low, over water too shallow, or through a gap too narrow; else it is land (or a chart that is not in). behind: the cells
  // the way through went over that were shut to her ([x, z, their size]), for the search on finer cells
  function cause(ix, iz, wall){ const w = {grunt:0, bru:0, trangt:0, land:0, ukjent:0}; behind = null; for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) if (okAt(ix + a * 2, iz + b * 2, w) === -1 && !wall) w.ukjent++;
    if (!wall) return w.ukjent > 40 ? 'ukjent' : w.grunt ? 'grunt' : w.bru ? 'bru' : 'land';
    const reach = Math.ceil(300 / c2), need = [];   // (the way through is looked for within 300 m; the tiles it comes to that are not in are asked for first)
    // whether she could be at a place were she without what the kind names (-1: the tile is not in, and is asked for)
    const pass = (nx, nz, kind) => { const t = at(nx, nz); if (!t){ const c = cS * c2, fx = cFx, fz = cFz; if (!need.some(v => v[0] === c && v[1] === fx && v[2] === fz)) need.push([c, fx, fz]); return -1; } if (t.none) return 0;
      const k = cK, zz = t.z[k], u = t.u[k], d = t.d[k]; if (zz === 255 || d < 1) return 0;
      if (kind === 'bru' && zz < zNeed(cX, cZ)) return 0;   // (through a gap too narrow the water is not asked for either: a cell's water is the least a cell and a half round it, land too)
      if (kind !== 'bru' && u !== 255 && u < J.needU) return 0; if (kind !== 'trangt' && d < (cS === 1 ? J.needD2 : J.needD4)) return 0;
      // (and were she without a deck's height, the water under her side still shuts the cell as the search has it: asked last, for it looks up the cells round this one)
      if (kind === 'bru'){ const ok = sideOk(nx, nz); at(nx, nz); if (!ok) return 0; } return 1; };
    for (const kind of ['bru', 'grunt', 'trangt']){ const seen = new Map([[key(ix, iz), -1]]), qx = [ix], qz = [iz], shut = [0];
      for (let h = 0; h < qx.length && h < 40000; h++){ at(qx[h], qz[h]); const s = cS; for (let i = 0; i < 8; i += 2){ let nx = qx[h] + DX[i] * s, nz = qz[h] + DZ[i] * s; at(nx, nz); if (cS === 2){ nx -= nx & 1; nz -= nz & 1; } const kk = key(nx, nz); if (seen.has(kk)) continue; seen.set(kk, h);
        if (Math.abs(nx - ix) > reach || Math.abs(nz - iz) > reach) continue;
        if (pass(nx, nz, kind) !== 1) continue; const t = cT, k = cK, st = t.st[k], sz2 = cS, mx = cX, mz = cZ;
        if (sz2 === 1 && s === 2 && pass(qx[h] + DX[i], qz[h] + DZ[i], kind) !== 1) continue;   // (the fine cell stepped over, as in the search)
        const o = okAt(nx, nz);
        if (st !== 2 && o === 1 && (sz2 === 2 || s === 1 || okAt(qx[h] + DX[i], qz[h] + DZ[i]) === 1)){ behind = []; for (let q = h; q >= 0; q = seen.get(key(qx[q], qz[q]))){ if (shut[q]) behind.push([shut[q][0], shut[q][1], shut[q][2]]); if (behind.length > 200) break; } if (behind.length) return kind; behind = null; }   // (open water come to over nothing that was shut is no answer)
        qx.push(nx); qz.push(nz); shut.push(o === 1 ? 0 : [mx, mz, sz2]); } }
      if (need.length) return {need}; }
    return w.ukjent > 8 ? 'ukjent' : 'land'; }
  // what the straight way between two points costs (as the search counts: its length, more near the land); -1 where a cell on it is shut
  const los = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az); let c = 0, u = 0;
    for (let guard = 0; guard < 1e6; guard++){ const x = ax + (bx - ax) * (L ? u / L : 0), z = az + (bz - az) * (L ? u / L : 0), ix = Math.floor(x / c2), iz = Math.floor(z / c2); if (okAt(ix, iz) !== 1) return -1;
      at(ix, iz); const dm = cT.d[cK] * J.q, st = Math.min(cS * c2 * 0.5, Math.max(L - u, 1e-9));
      if (dm - Math.hypot(x - cX, z - cZ) < J.clr + cS * c2 * 0.25 && !nearEnd(x, z)) return -1;   // (the distance is from the cell's middle: no nearer than that less the way from the middle)
      if (u >= L) break; c += st * (1 + (dm >= J.pref ? 0 : J.k * (1 - dm / J.pref))) * (cT.z[cK] < J.needZf ? J.slow : 1) * (J.dig && cT.z[cK] < J.needZ ? J.dig : 1); u = Math.min(L, u + st); }
    return c; };
  // The first time round (pre 1) only what is solid shuts a cell: the way then found shows where she would go were the big cells not
  // too coarse for a narrow sound or a harbour's mouth, and the big cells on it that are shut to her are made fine before the search
  // proper (16 blocks at most). So a sound of 13 m is tried also where a longer way round is open on the big cells
  // And that way's own length, pulled straight where the cells between two of its points are open (h0): what the way proper is held
  // against, to tell a clear detour without a reference (planOmvei)
  const seeP = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / c2)); for (let i = 0; i <= n; i++) if (okAt(Math.floor((ax + (bx - ax) * i / n) / c2), Math.floor((az + (bz - az) * i / n) / c2)) !== 1) return false; return true; };
  const preLen = C => { const P = []; for (let q = 0; q < C.length; q += 2){ at(C[q], C[q + 1]); P.push([cX, cZ]); } const n = P.length; let i = 0, len = 0;
    while (i < n - 1){ let k = i + 1; for (;;){ if (k === n - 1) break; const nx = Math.min(n - 1, k + Math.max(1, k - i)); if (seeP(P[i][0], P[i][1], P[nx][0], P[nx][1])){ k = nx; continue; }
        let a = k, b = nx; while (b - a > 1){ const mid = (a + b) >> 1; if (seeP(P[i][0], P[i][1], P[mid][0], P[mid][1])) a = mid; else b = mid; } k = a; break; }
      len += Math.hypot(P[k][0] - P[i][0], P[k][1] - P[i][1]); i = k; } return len; };
  function preDone(found){ const C = []; if (found){ let ix = gx, iz = gz; for (let guard = 0; guard < 4e6; guard++){ at(ix, iz); C.push(ix, iz); if (ix === sx && iz === sz) break; const p = cT.par[cK], s = p & 8 ? 2 : 1; ix += (p & 16 ? 1 : 0) - DX[p & 7] * s; iz += (p & 32 ? 1 : 0) - DZ[p & 7] * s; } }
    if (C.length && !h0) h0 = preLen(C);
    pre = 2; reset(); const n0 = fine.size; // (and where the water costs instead of shutting, J.dig, a big cell with too little of it is not shut but is as coarse: its water
    // is the least within 6 m, the foreshore's on both sides of a sound that has enough down its middle. Left big, the sound cost
    // J.dig and J.slow times its length in the second search, and the way round won: Stamsund with kyst21, steg 142)
    for (let q = 0; q < C.length && fine.size - n0 < 16; q += 2){ const o = okAt(C[q], C[q + 1]); at(C[q], C[q + 1]); if (cS === 2 && (o === 0 || (J.dig && cT && !cT.none && cT.z[cK] < J.needZ))) fineAt(cX, cZ, 30); }
    fineN += fine.size - n0; reset(); return {again:true}; }
  function finish(){ const C = []; let ix = gx, iz = gz;
    for (let guard = 0; guard < 4e6; guard++){ at(ix, iz); C.push([cX, cZ, cT.g[cK]]); if (ix === sx && iz === sz) break; const p = cT.par[cK], s = p & 8 ? 2 : 1; ix += (p & 16 ? 1 : 0) - DX[p & 7] * s; iz += (p & 32 ? 1 : 0) - DZ[p & 7] * s; }
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
    if (Math.hypot(path[0][0] - J.a[0], path[0][1] - J.a[1]) < c2 * 1.5) path[0] = J.a.slice(); else path.unshift(J.a.slice());
    const e = path.length - 1; if (Math.hypot(path[e][0] - J.b[0], path[e][1] - J.b[1]) < c2 * 1.5 && e > 0) path[e] = J.b.slice(); else path.push(J.b.slice());
    return {path:gentle(path), exp, cells:n, refined, fineN, decks, h0}; }
  // A jog she cannot sail (her turning radius given, J.turnR): a leg between two corners that is shorter than the two turns need
  // (the radius times the tangents of the half angles). The way stepped a few metres to the side past a bridge's pier over a leg
  // of 8 m, and a 75 m ship turned 45 degrees on the spot there, her bow sweeping 26 m to the side (the bench, steg 142,
  // bru-karmsund). The two corners are slid apart along the legs before and after them, by half the radius and then double that
  // each time, till the straight way between them is open; the cost is not asked, for the leg is no way at all as it is. The first
  // and the last leg are left: by her berth she manoeuvres
  const gentle = path => { const R = J.turnR; if (!(R > 0)) return path; const D = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
    const tn = (P, i) => { const a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), b = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d; return Math.tan(Math.min(d, 3) / 2); };
    for (let round = 0; round < 60; round++){ let moved = false;
      for (let i = 1; i + 2 < path.length && !moved; i++){ const A1 = path[i], B1 = path[i + 1]; if (D(A1, B1) >= R * (tn(path, i) + tn(path, i + 1))) continue;
        const A0 = path[i - 1], B0 = path[i + 2], la = D(A0, A1), lb = D(B1, B0);
        for (let s = R / 2; ; s *= 2){ const sa = Math.min(s, la), sb = Math.min(s, lb), A = sa > la - 1 ? A0 : [A1[0] + (A0[0] - A1[0]) * sa / la, A1[1] + (A0[1] - A1[1]) * sa / la], B = sb > lb - 1 ? B0 : [B1[0] + (B0[0] - B1[0]) * sb / lb, B1[1] + (B0[1] - B1[1]) * sb / lb];
          if (los(A[0], A[1], B[0], B[1]) >= 0){ const mid = []; if (A !== A0) mid.push(A); if (B !== B0) mid.push(B); path.splice(i, 2, ...mid); moved = true; break; }
          if (sa >= la && sb >= lb) break; } }
      if (!moved) break; }
    return path; };
  // (for the bench's pictures and the tests: whether the cell at a place is open to her, whether the search has been there, and its size)
  const peek = (x, z) => { const ix = Math.floor(x / c2), iz = Math.floor(z / c2); if (!at(ix, iz)) return null; const st = cT.st ? cT.st[cK] : 0, s = cS; return [okAt(ix, iz), st, s]; };
  const left = (x, z) => hh(Math.floor(x / c2), Math.floor(z / c2));   // (what the search takes to be left to the goal from a place, metres)
  return {start, put, run, block, again, co, clear, peek, left, gentle:p => gentle(p)};
}
// the worker (false where one cannot start): the search and its tiles live there
function planWorker(){ if (PLAN.w !== null) return PLAN.w;
  try { const src = 'const MK = ' + planMake.toString() + '; let PL = MK();\nonmessage = e => { const m = e.data; try { if (m.op === "reset"){ PL = MK(); postMessage({id:m.id, ok:1}); return; } if (m.op === "start"){ PL.clear(); PL.start(m.J); } else if (m.op === "tiles"){ for (const t of m.tiles) PL.put(t.c, t.fx, t.fz, t.none ? null : t); } else if (m.op === "co"){ PL.co(m.co); } else if (m.op === "block"){ for (const b of m.list || [[m.x, m.z, m.r]]) PL.block(b[0], b[1], b[2]); PL.again(); } postMessage(Object.assign({id:m.id}, PL.run())); } catch (err){ postMessage({id:m.id, why:"feil", err:String(err)}); } };';
    const w = new Worker(URL.createObjectURL(new Blob([src], {type:'text/javascript'})));
    w.onmessage = e => { const res = PLAN.wait.get(e.data.id); if (res){ PLAN.wait.delete(e.data.id); res(e.data); } };
    w.onerror = () => { PLAN.w = false; for (const res of PLAN.wait.values()) res({why:'feil', err:'the planner worker failed'}); PLAN.wait.clear(); };
    PLAN.w = w; } catch (e){ PLAN.w = false; }
  return PLAN.w; }
// why there is no way, in words (Norwegian, English)
function planWhy(r){ const c = {grunt:['for grunt for båten', 'too shallow for the boat'], bru:['brua er for lav for båten', 'the bridge is too low for the boat'], trangt:['for trangt for båten', 'too narrow for the boat'], land:['land i veien', 'land in the way'], båt:['et fartøy som ligger stille, stenger veien', 'a vessel lying still blocks the way'], ukjent:['kartet er ikke lastet der', 'the chart is not loaded there']}[r.cause] || ['ingen vei', 'no way'];
  const p = r.at ? natLL({x:r.at[0] / 1000, y:r.at[1] / 1000}) : null, at = p ? ' (' + p.lat.toFixed(4) + '° N, ' + p.lon.toFixed(4) + '° Ø)' : '', atE = at.replace('Ø', 'E');
  return r.why === 'for langt' && r.cause !== 'båt' ? ['Fant ingen bane: søket ble for stort' + at, 'Found no way: the search grew too large' + atE] : ['Fant ingen bane: ' + c[0] + at, 'Found no way: ' + c[1] + atE]; }
// The chart's own cells over the water between the two ends and a way round them, for the search's sense of how far it is (planMake,
// J.co): cells of PLAN.co m, each 1 where one of the depth layer's cells in it is water, 0 land, 2 where the chart is not in.
// null where it would be too big, or the layer is not there. In slices
function planCoarseM(ax, az, bx, bz, grow){ return Math.min(30000, Math.max(4000, Math.min(10000, Math.hypot(bx - ax, bz - az) + 3000)) * Math.pow(2.5, grow || 0)); }   // (how far round the two ends the chart's cells are taken, m: wider each time the way round was not in them)
function* planCoarseG(ax, az, bx, bz, grow){ const L = MAPD.L && MAPD.L.depth; if (!L) return null; const c = L.c * 1000, M = planCoarseM(ax, az, bx, bz, grow), span = Math.max(Math.abs(bx - ax), Math.abs(bz - az)) + 2 * M, m = Math.max(1, Math.round(PLAN.co / c)) * (span > 60000 ? 4 : span > 30000 ? 2 : 1), C = c * m;
  const i0 = Math.floor((Math.min(ax, bx) - M) / C), j0 = Math.floor((Math.min(az, bz) - M) / C), W = Math.floor((Math.max(ax, bx) + M) / C) - i0 + 1, H = Math.floor((Math.max(az, bz) + M) / C) - j0 + 1; if (W * H > 400000) return null;
  const v = new Uint8Array(W * H), r0 = L.ix0 + 1, r1 = L.ix0 + L.nx - 2, s0 = L.iy0 + 1, s1 = L.iy0 + L.ny - 2; if (FARB.F) FARB.F.at = 'plan:kart';
  for (let j = 0; j < H; j++){ for (let i = 0; i < W; i++){ let o = 0; for (let b = 0; b < m && o !== 1; b++) for (let a = 0; a < m; a++){ const ri = (i0 + i) * m + a, rj = (j0 + j) * m + b; if (ri < r0 || ri > r1 || rj < s0 || rj > s1 || !mapPackOf(L, Math.floor(ri / L.n), Math.floor(rj / L.n))){ o = 2; continue; }
        let q; try { q = rcell(L, ri, rj); } catch (e){ o = 2; continue; } if (q > 0){ o = 1; break; } } v[j * W + i] = o; if (!(i & 63)) yield; } yield; }
  return {x0:i0 * C, z0:j0 * C, c:C, W, H, v}; }
// What the search needs of the field for her (planMake's J): clr (m to the side: half her beam and the margin), needD2, needD4 (the
// same and half a cell, in the field's steps of F.q), rb2, rb4 (cells to the side a wide hull asks the water of), needZ (the water
// she needs to float over a place slowly, in the field's steps of 1 / F.zs m: her draught and FARB.keel, less the lowest tide lv) and
// needZf (with her squat sq at full speed). Half a metre under her keel is what a harbour is dredged to for the deepest boat it
// takes (07-harbours.js HARB_DRAFT, SITE_DRAFT, a unit's basin), so nothing is put on top of it here: FARB.eps is the map's own
// tolerance where the question is whether she touches, and the check asks with planKeel(), which takes it off again
function planNeeds(boat, sq, lv, side, F, c2){ const clr = boat.B / 2 + side, nd = c => Math.ceil((clr + c * 0.5) / F.q), rb = c => clr > c * 1.5 ? Math.ceil((clr - c * 1.5) / c) : 0, nz = m => Math.max(1, Math.min(254, Math.ceil(m * F.zs - 1e-6)));
  return {clr, needD2:nd(c2), needD4:nd(c2 * 2), rb2:rb(c2), rb4:rb(c2 * 2), needZ:nz(boat.T + FARB.keel - lv), needZf:nz(boat.T + sq + FARB.keel - lv)}; }
const planKeel = () => FARB.keel - FARB.eps - 1e-6;
// Her squat at the speed v for the check (sqV: hers by the speed). At BANE.vSlow and under it is counted as nothing: it is under
// 7 cm for every boat at 3 knots (16b-dyn.js dynSquat: Cb v² / 100, v in knots), and a harbour dredged to her draught and half a
// metre is water she is to pass slowly, not water that is shut. (Jonas' choice 4 says «dypgang + squat + 0,5 m»: this is the one
// place less is asked, and one line turns it.)
function planSquat(sqV, v){ return v <= BANE.vSlow + 1e-6 ? 0 : sqV(v); }
// What is shut after the check on the geometry found a touch, {x, z, r}: round the touch where that is known (the land's and the
// water's, and a vessel lying still), a cell wider for each time; round where she stood for a thing, whose touch is its middle;
// and round where she stood when the same touch comes again (seen: a Map kept through one planning). Her bow or her stern reaches
// 37 m from her middle on a 75 m ship: the touch then lies off the way itself, and shutting the cells round it changes nothing
// (the bench, steg 142: the same touch seven times over at eight places)
const planTouchP = h => /^-?\d+,-?\d+$/.test(h.id);
// A vessel lying still (hit.box: her axis, half her length and half her beam) is shut as her own box widened by the margins: circles
// along her axis (a list), not one circle round her middle as wide as she is long, which shut the only way past a boat lying along a
// floating dock (Urangsvåg with the skiff, steg 142)
function planBlockOf(hit, boat, side, c2, tries, seen){ const key = hit.what + ':' + hit.id, n = seen.get(key) || 0; seen.set(key, n + 1);
  const tp = (hit.R || planTouchP(hit) || hit.px == null) && !n, half = boat.B / 2 + side;
  if (tp && hit.box){ const [ux, uz, l, w] = hit.box, r = w + half + c2 * (1 + tries), k = Math.max(1, Math.ceil(2 * l / r)), list = [];
    for (let i = 0; i <= k; i++){ const s = -l + 2 * l * i / k; list.push([hit.x + ux * s, hit.z + uz * s, r]); }
    return {x:hit.x, z:hit.z, r:Math.hypot(l, r), list}; }
  return tp ? {x:hit.x, z:hit.z, r:(hit.R || 0) + half + c2 * (1 + tries)} : {x:hit.px != null ? hit.px : hit.x, z:hit.pz != null ? hit.pz : hit.z, r:half / 2 + c2 * (1 + tries)}; }
// Whether a touch at X, Z (her middle) is her own berth (the bench's rule, tools/autonav/benk.js), a and b the ends ([x, z] m), own
// how far from them (m), L her length, dig: the water does not count (a channel is looked for). The water by where it is; a vessel
// lying still (her box) by her middle, as the observer counts her (Sandshamn with the autoliner, steg 142: a ship of 75 m whose middle
// lay 97 m from the quay was let pass by her nearest point, and touched); a boat on a mooring buoy by the edge of the circle she swings
// on; a touch with a place of its own (the land's, by its id) where it is; a thing, whose touch is its middle, by where she is
function planSkip(h, X, Z, a, b, own, L, dig){ const nearE = (x, z, r) => Math.hypot(x - a[0], z - a[1]) < r || Math.hypot(x - b[0], z - b[1]) < r;
  return h.what === 'grunn' ? dig || nearE(h.x, h.z, own) : h.box ? nearE(h.x, h.z, own) : h.R ? nearE(h.x, h.z, own + h.R) : planTouchP(h) ? nearE(h.x, h.z, own) : nearE(X, Z, 0.9 * L); }
// Whether a bane of len m is a clear detour, held against the way the search first found with only what is solid shutting a cell
// (h0 m, planMake's preDone: land and a deck too low for her, on the field's own cells, pulled straight). No reference is asked,
// and that way is never longer than the shortest she can sail with her margins. (The way over the chart's cells of 100 m was tried
// first and is too loose: it called most trips detours, each then searched twice.)
// Over PLAN.omvei times as long and PLAN.omveiM m more (a short trip out of a harbour is not searched twice for some metres), the
// second search is tried too (planBane, opt.soft), and the shorter bane that the check lets through is taken. The bench, steg 142,
// point 4: Stamsund, 1.25 times the reference, where the field's water (the least within a cell and a half) shut a sound the
// geometry has water enough in
PLAN.omvei = 1.1; PLAN.omveiM = 80; PLAN.omveiWin = 0.97; PLAN.omveiCap = [30000, 3, 3];   // (omveiCap: the second search looks at no more cells than this and this many times what the first did, and the check shuts and searches again this many times at most: where the first way was the shortest there is, the second is not to cost many times as much)
function planOmvei(len, h0){ return h0 > 0 && len > h0 * PLAN.omvei + PLAN.omveiM; }
// The boat as the planner asks the map for her. Till the bridges have their real clearances (steg 141b, Jonas' choice 6) her height
// under them is counted as the game counts it today (11b-obstacles.js obsAir and obsBridge): 0.35 of her length (2 to 16 m), held
// against the deck's height by the old rule with no tide. The map has two things ahead of that: the model's own height with its
// aerials (VESSELS.air: the sjark's 8.6 m, where the rule gives 3.7), and the deck measured from the highest tide. Both together
// shut bridges every boat passes today (the bench, 24.11.2026: Hønebrua, Storvalen, Reine), so here she gets the rule's height less
// the highest tide where she sails (x, z, m). PLAN.realAir turns it when the bridges are real too
function planBoat(type, x, z){ const b = farbBoat(type); if (!PLAN.realAir){ let hat = 0; try { hat = x != null ? farbHat(x, z) || 0 : 0; } catch (e){} b.air = Math.max(0.5, Math.min(16, Math.max(2, b.L * 0.35)) - hat); } return b; }
// The vessels lying still, listed afresh for a plan: fixBoats (11b-obstacles.js) keeps its list for the game minute, and the list is
// those within AIS range of where she was when it was made. A plan made in the same minute from another place (another of her boats,
// and the bench, which puts the clock back for every trip) then had the vessels round the place before: Senjahopen out, steg 142,
// planned past nothing and sailed at 5 knots through two ships lying 262 m from the quay
function planFresh(){ try { FIX.boats = null; } catch (e){} PLAN.hvMemo = new Map(); }   // (and the harbour manoeuvres found for the plan before: the vessels may lie otherwise)
// The bane from a to b (km) for a boat of the type (hers when left out): {bane, pts (for a plan, each with s), nm, ms, tiles, tries,
// exp, Hmin} or {why (words), cause, at ([X, Z] m), ms}. opt: {kn (the speed she is sent at), end (false: she does not stop at b),
// side (the margin to the side, m)}. Asynchronous: the tiles are built as the search asks for them
async function planBane(a, b, type, opt){ const t0 = performance.now(), ty = type || S.boat.type, boat = planBoat(ty, a.x * 1000, a.y * 1000), bb = baneBoat(ty, opt && opt.kn), F = FARB.F, c2 = PLAN.cell, H0 = S.t / 60;
  const ax = a.x * 1000, az = a.y * 1000, bx = b.x * 1000, bz = b.y * 1000, fail = (r, extra) => Object.assign({why:planWhy(r), cause:r.cause || r.why, at:r.at || null, decks:r.decks, refined:r.refined, fineN:r.fineN, ms:Math.round(performance.now() - t0)}, extra || {});
  const w = planWorker(); if (!w) return fail({why:'feil', cause:'ukjent'});
  if (!(opt && (opt.soft || opt.dig))) planFresh();
  // the lowest water while she is on the way (the tide where she starts: it is the same within a trip of this length)
  const hrs = Math.hypot(bx - ax, bz - az) / bb.vmax / 3600 * 1.5 + 0.25; let Hmin = H0, lv = Infinity; for (let h = 0; h <= hrs + 1e-9; h += 1 / 6){ const v = farbTide(H0 + h, ax, az); if (v < lv){ lv = v; Hmin = H0 + h; } }
  let sq = 0, P = null; try { P = dynCal(ty).P; sq = dynSquat(P, bb.vmax, false); } catch (e){}
  const side = opt && opt.side != null ? opt.side : FARB.side, own = BANE.own * boat.L;
  const J = Object.assign({c2, N:F.N, q:F.q, a:[ax, az], b:[bx, bz], turnR:bb.R, slow:Math.max(1.5, Math.min(4, bb.vmax / BANE.vSlow)), needU:Math.ceil((boat.air + FARB.airOver) / 0.25),
    pref:Math.min(F.cap - 1, Math.max(25, boat.B * 3)), k:PLAN.k, w:PLAN.w8, endR:own + c2 * 2, fineR:PLAN.fineR, maxExp:PLAN.maxExp}, planNeeds(boat, sq, lv, side, F, c2));
  if (opt && (opt.dig || opt.soft)) J.dig = PLAN.digK;
  // (and the distance on the fine cells without the half cell the field's rounding is given: a mouth of 15 m is open to a hull that needs 11.2 with her margins, and shut where 13.5 is asked. The check has the last word)
  // (the water to her sides is still asked, a cell nearer than the first search asks it: the ring rb2 cells out and the cell and a half
  // each cell's water is the least within reach 3 m past her half beam and margin; one cell in, they reach what she needs. With no
  // ring at all a hull of 7 m was sent down a sound with her side over the foreshore, the check shut the place, and the search came
  // back with the same a few metres on: Stamsund with kyst21, steg 142)
  if (opt && opt.soft){ J.needD2 = Math.ceil(J.clr / F.q); J.rb2 = opt.bare ? 0 : Math.max(0, J.rb2 - 1); J.side = !opt.bare; if (opt.cap) J.cap = opt.cap; }
  // (the chart's cells for the way round: the packs over the box are waited for as a tap in the chart waits for them, the blocks warmed)
  const chart = async grow => { try { const M = planCoarseM(ax, az, bx, bz, grow), x0 = Math.min(ax, bx) - M, x1 = Math.max(ax, bx) + M, z0 = Math.min(az, bz) - M, z1 = Math.max(az, bz) + M;
      for (let z = z0; z < z1 + 6000; z += 6000) for (let x = x0; x < x1 + 6000; x += 6000) await mapNeed({x:Math.min(x, x1) / 1000, y:Math.min(z, z1) / 1000}, 4.5);
      await farbBlocks(x0, z0, x1, z1); return await farbRunA(planCoarseG(ax, az, bx, bz, grow)); } catch (e){ return null; } };
  J.co = await chart(0); let grow = 0;
  PLAN.J = J;
  const send = msg => new Promise(res => { const id = ++PLAN.id; PLAN.wait.set(id, res); w.postMessage(Object.assign({id}, msg)); });
  // Her own berth (the bench's rule, tools/autonav/benk.js: a touch within a length and a half of the ends is the quay she lies at). The land's touch is where it is; a thing's is the thing's middle, which says nothing of where along a
  // long quay she is, so a thing counts by where she herself is (within 0.9 of her length: her far end then within 1.4), and a vessel
  // lying there by her middle (planSkip)
  const seen = new Map();
  // (the water under her counts the same way, by where it is: a naust's slip is dry under her for some metres. The bench has the same
  // rule for what its observer sees of the water; what the game itself calls a grounding always counts there)
  const skip = (h, X, Z) => planSkip(h, X, Z, [ax, az], [bx, bz], own, boat.L, !!(opt && opt.dig), opt && (opt.from || opt.to) ? own : 0);   // (with a manoeuvre at her berth she is by her own quay all through it)
  // (the worker keeps the tiles it was given: thrown when the map has changed since, more of it come in or a channel dug, and when they are many)
  { const fv = farbFieldVer(); if (PLAN.ver !== fv || PLAN.sent > 300){ await send({op:'reset'}); PLAN.ver = fv; PLAN.sent = 0; } }
  let r = await send({op:'start', J}), tiles = 0, tries = 0, exp = 0, boatShut = null; const shut = [];   // (shut: what the check on the geometry found and shut, for the answer)
  const o = Object.assign({}, bb, {end:!(opt && opt.end === false)}), sw = {m:side, keel:planKeel(), squat:sq, sqV:P ? v => planSquat(u => dynSquat(P, u, false), v) : null, boats:true, skip}, memo = new Map(), rMin = Math.max(boat.B / 2, bb.R / 16);
  // (the harbour manoeuvres at the ends, where the caller gave her berths, opt.from and opt.to: planEnd's)
  const hv = {dep:!!(opt && opt.from && opt.from.hd != null && !opt.dig), arr:!!(opt && opt.to && opt.to.hd != null && !opt.dig), Dh:Math.max(PLAN.havn.dMin, PLAN.havn.d * boat.L), join:Math.max(8, PLAN.havn.join * boat.L), n:0, drop:[]};
  if (hv.dep || hv.arr) try { await farbNeed([a, b], (hv.Dh + 3 * boat.L + 60) / 1000); } catch (e){}
  for (;;){
    if (r.need){ const out = [], tr = [];
      for (const [cell, fx, fz] of r.need){ const Tf = F.N * cell; let Y = farbFieldTile(cell, fx, fz); tiles++;
        for (let k = 0; k < 5 && !Y; k++){ await farbFieldNeed(fx * Tf + 1, fz * Tf + 1, (fx + 1) * Tf - 1, (fz + 1) * Tf - 1, cell); Y = farbFieldTile(cell, fx, fz); }   // (a tile is asked for again where the map changed under it: more of it came in)
        if (Y && !Y.none){ const d = Y.d.slice(), z = Y.z.slice(), u = Y.u.slice(), m = Y.m ? Y.m.slice() : null; out.push({c:cell, fx, fz, d, z, u, m}); tr.push(d.buffer, z.buffer, u.buffer); if (m) tr.push(m.buffer); } else out.push({c:cell, fx, fz, none:true}); }
      PLAN.sent += out.length; r = await new Promise(res => { const id = ++PLAN.id; PLAN.wait.set(id, res); w.postMessage({id, op:'tiles', tiles:out}, tr); }); continue; }
    // (the way round a bridge too low for her was not within the chart's cells it was given: wider ones, twice at most)
    if (r.needCo){ const co = grow < 2 ? await chart(++grow) : null; r = await send({op:'co', co}); continue; }
    // (the field's water is the least within a cell and a half, and a wide hull asks the cells to her side too: a way with water
    // enough for her on the geometry can be shut on the field. So where the search says «too shallow», it goes once more with the
    // water costing instead of shutting (as when a channel is looked for, but for a breakwater's foot), and the check on the
    // geometry, which asks her keel's own points, says whether she floats there. The same where it says «too narrow»: the
    // distance then without the half cell of rounding. The bench, steg 142: the skiff out of Øksfjord)
    if (r.why){ if ((r.cause === 'grunt' || r.cause === 'trangt') && !(opt && (opt.dig || opt.soft))){ const R2 = await planBane(a, b, type, Object.assign({}, opt || {}, {soft:true})); if (R2.bane){ R2.soft = true; return R2; } }
      // (and where the second search with its ring to the side has none either, once more with no ring at all, as it was before 27.11.2026: a 75 m hull out of a basin whose own dredged water the ring reaches past, Sandshamn verft)
      if ((r.cause === 'grunt' || r.cause === 'trangt') && opt && opt.soft && !opt.bare && !opt.cap && !opt.dig){ const R3 = await planBane(a, b, type, Object.assign({}, opt, {bare:true})); if (R3.bane){ R3.soft = true; return R3; } }
      // (a vessel lying still was shut on the way and then there was none: she is what stands in the way, not the place the search
      // gave up at. Urangsvåg with the skiff, steg 142: «the bridge is too low» where a boat lay along a floating dock)
      if (boatShut) r = Object.assign({}, r, {cause:'båt', at:boatShut});
      PLAN.n.plans++; return fail(r, {tiles, tries, exp:exp + (r.exp || 0), shut}); }
    exp += r.exp || 0;
    // The way as a bane she can sail, her hull swept along it on the geometry at the lowest water. An arc that touches is made
    // tighter (she goes slower round it) till it is free or as tight as she can be turned; what touches then shuts the place
    let Q = null, B = null, hit = null, head = null, tail = null;
    for (let pass = 0; pass < 3; pass++){ let redo = false; hit = null;
    // (the first and the last of the way with her heading in it, planHavnG: from her berth to the place she has Dh m along the way
    // the search found, and the same at the other end, sailed backwards. Where there is none, or the sweep below finds a touch within
    // it, that end is as before: the way as it came)
    { const P = r.path, cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const tot = cum[P.length - 1];
      const along = d => { let i = 1; while (i < P.length - 1 && cum[i] < d) i++; const l = cum[i] - cum[i - 1], u = l > 0 ? Math.max(0, Math.min(1, (d - cum[i - 1]) / l)) : 0; return {x:P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, z:P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u, psi:Math.atan2(P[i][0] - P[i - 1][0], -(P[i][1] - P[i - 1][1])), i}; };
      const freeH = e0 => (x, z, psi) => { try { return !farbPose(x, z, psi, boat, Hmin, {m:side, keel:planKeel(), squat:0, boats:true, skip:(h, X, Z) => planSkip(h, X, Z, e0, e0, own, boat.L, false, own)}); } catch (e){ return false; } };
      // (a manoeuvre found is kept through the plan, PLAN.hvMemo: the second search and each new try come to the same berth and
      // mostly the same place on the way, and searching it again each time took a plan from 6 s to 57)
      const havn = async (k, bp, H, fr, oo) => { const M = PLAN.hvMemo || (PLAN.hvMemo = new Map()), key = k + ty + '|' + [bp.x, bp.z, H.x, H.z].map(v => Math.round(v / 2)).join(',') + '|' + Math.round(H.psi * 8); if (M.has(key)) return M.get(key); const R = await farbRunA(planHavnG(bp, H, boat.L, boat.B, fr, oo)); M.set(key, R); return R; };
      head = null; tail = null; let d0 = 0, d1 = tot;
      if (hv.dep && tot > hv.Dh * (hv.arr ? 2.6 : 1.4)){ const H = along(hv.Dh), R = await havn('d', {x:ax, z:az, hd:opt.from.hd}, H, freeH([ax, az]), null); if (R){ head = R.pts; d0 = hv.Dh + hv.join; hv.n += R.n; } else hv.dep = false; }
      if (hv.arr && tot > hv.Dh * (hv.dep ? 2.6 : 1.4)){ const H = along(tot - hv.Dh), R = await havn('a', {x:bx, z:bz, hd:opt.to.hd}, H, freeH([bx, bz]), {kAhead:3, kAstern:1}); if (R){ tail = planHavnRev(R.pts); d1 = tot - hv.Dh - hv.join; hv.n += R.n; } else hv.arr = false; }
      const mid = []; if (head){ const J = along(d0); mid.push([J.x, J.z, 0]); } for (let i = 0; i < P.length; i++) if ((!head || cum[i] > d0 + 1) && (!tail || cum[i] < d1 - 1)) mid.push([P[i][0], P[i][1], 0]); if (tail){ const J = along(d1); mid.push([J.x, J.z, 0]); }
      Q = (head || []).concat(mid, tail || []); }
    for (let i = 0; i + 1 < Q.length; i++){ const n = Math.max(1, Math.ceil(Math.hypot(Q[i + 1][0] - Q[i][0], Q[i + 1][1] - Q[i][1]) / 2000));
      for (let j = 0; j < n; j++) if (!await farbNeed([{x:(Q[i][0] + (Q[i + 1][0] - Q[i][0]) * j / n) / 1000, y:(Q[i][1] + (Q[i + 1][1] - Q[i][1]) * j / n) / 1000}, {x:(Q[i][0] + (Q[i + 1][0] - Q[i][0]) * (j + 1) / n) / 1000, y:(Q[i][1] + (Q[i + 1][1] - Q[i][1]) * (j + 1) / n) / 1000}], 0.4)) return fail({why:'ingen vei', cause:'ukjent', at:[Q[i][0], Q[i][1]]}, {tiles, tries, exp}); }
    for (let guard = 0; guard < 400; guard++){ B = baneBuild(Q, o); Q = B.Q; hit = await farbRunA(baneFriG(B, boat, Hmin, sw, memo)); if (!hit || hit.what === 'ukjent') break;
      if (head || tail){ const hx = hit.px != null ? hit.px : hit.x, hz = hit.pz != null ? hit.pz : hit.z, zr = hv.Dh + hv.join + boat.L, inD = head && Math.hypot(hx - ax, hz - az) < zr, inA = tail && Math.hypot(hx - bx, hz - bz) < zr;
        if (inD || inA){ if (inD) hv.dep = false; if (inA) hv.arr = false; hv.drop.push(hit.what + ':' + hit.id + '@' + Math.round(hit.x) + ',' + Math.round(hit.z)); redo = true; break; } }
      const p = B.P[hit.i];
      // (water too shallow for her squat at the speed she has there: she goes slower over it, down to BANE.vSlow, before it is shut)
      if (hit.what === 'grunn' && p.vl > BANE.vSlow + 1e-6){ const v2 = Math.max(BANE.vSlow, p.vl / 2);
        if (p.k === 'a'){ Q[p.c][4] = v2; continue; }
        const c0 = Q[p.c][3] || 0, u0 = hit.s - p.s0 - 15, u1 = hit.s - p.s0 + BANE.piece + 15, dx = (p.bx - p.ax) / p.len, dz = (p.bz - p.az) / p.len, ins = [];
        const m5 = (Q[p.c][5] || 0) & 3; if (u0 > 2) ins.push([p.ax + dx * u0, p.az + dz * u0, 0, c0, 0, m5]); if (u1 < p.len - 2) ins.push([p.ax + dx * u1, p.az + dz * u1, 0, v2, 0, m5]); else Q[p.c][3] = v2;
        if (ins.length){ if (!(u1 < p.len - 2)) ins[ins.length - 1][3] = c0; Q.splice(p.c, 0, ...ins); } continue; }
      if (p.k !== 'a' || p.r / 2 < rMin) break; Q[p.c][2] = p.r / 2; }
    if (!redo) break; }
    if (!hit){ PLAN.n.plans++; PLAN.n.tiles += tiles; const R1 = {bane:B, pts:banePts(B), nm:B.len / 1852, ms:0, tiles, tries, exp, Hmin, need:J, shut, h0:r.h0 || 0, havn:{dep:!!head, arr:!!tail, n:hv.n, drop:hv.drop}};
      // (a clear detour: the second search too, and the shorter of the two that the check let through. Only then, so a trip that goes
      // nearly straight is searched once)
      if (!(opt && (opt.dig || opt.soft || opt.alt === false)) && planOmvei(B.len, r.h0)){ let R2 = null; try { R2 = await planBane(a, b, type, Object.assign({}, opt || {}, {soft:true, cap:Math.round(PLAN.omveiCap[0] + PLAN.omveiCap[1] * exp), tries:PLAN.omveiCap[2]})); } catch (e){}
        R1.alt = R2 && R2.bane ? +(R2.bane.len / B.len).toFixed(3) : 0;
        if (R2 && R2.bane && R2.bane.len < B.len * PLAN.omveiWin){ R2.soft = true; R2.alt = R1.alt; R2.ms = Math.round(performance.now() - t0); R2.tiles += tiles; R2.exp += exp; return R2; } }
      R1.ms = Math.round(performance.now() - t0); PLAN.n.ms += R1.ms; return R1; }
    const cs = hit.what === 'ukjent' ? 'ukjent' : hit.what === 'grunn' ? 'grunt' : hit.what === 'brudekke' ? 'bru' : 'trangt';
    if (hit.what === 'ukjent' || ++tries > (opt && opt.tries || PLAN.tries)){ PLAN.n.plans++; return fail({why:'ingen vei', cause:cs, at:[hit.x, hit.z]}, {tiles, tries, exp, hit:hit.what + ':' + hit.id, shut, path:r.path}); }   // (path: the last way the search gave, for the bench's pictures)
    // shut round what she touched, a cell wider for each time, and search again
    shut.push(hit.what + ':' + hit.id + '@' + Math.round(hit.x) + ',' + Math.round(hit.z) + (B.P[hit.i].k === 'a' ? ' (bue r ' + B.P[hit.i].r.toFixed(1) + ')' : ''));
    // (round the touch where that is known, the land's and the water's; round where she stood for a thing, whose touch is its middle)
    const bl = planBlockOf(hit, boat, side, c2, tries, seen); if (hit.what === 'båt') boatShut = [hit.x, hit.z];
    r = await send({op:'block', x:bl.x, z:bl.z, r:bl.r, list:bl.list}); } }
// ---- where to dredge (Jonas' choice 5, 23.11.2026: «Tilpass havna») ----
// The channel along a way: P its points [[X, Z] ...] close together (2 m), sh which of them lie where the water is too shallow for
// her. The shallow runs, joined where less than o.gap m of the way lies between two, each reaching o.ext m past its ends (never
// past the way's own), as straight pieces [ax, az, bx, bz, o.r, o.d] to a decimetre
function planDigRuns(P, sh, o){ const n = P.length, Sx = new Float64Array(n); for (let i = 1; i < n; i++) Sx[i] = Sx[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const runs = []; for (let i = 0; i < n; i++){ if (!sh[i]) continue; let j = i; while (j + 1 < n && sh[j + 1]) j++; const a = Math.max(0, Sx[i] - o.ext), b = Math.min(Sx[n - 1], Sx[j] + o.ext), l = runs[runs.length - 1]; if (l && a - l[1] <= o.gap) l[1] = Math.max(l[1], b); else runs.push([a, b]); i = j; }
  const at = s => { let i = 1; while (i < n - 1 && Sx[i] < s) i++; const l = Sx[i] - Sx[i - 1], u = l > 0 ? Math.max(0, Math.min(1, (s - Sx[i - 1]) / l)) : 0; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u]; };
  const out = [], r1 = v => Math.round(v * 10) / 10;
  for (const [a, b] of runs){ const Q = [at(a)]; for (let i = 0; i < n; i++) if (Sx[i] > a + 1e-6 && Sx[i] < b - 1e-6) Q.push(P[i]); Q.push(at(b));
    // (straight where the points lie within 0.3 m of the line between two of them)
    const keep = new Uint8Array(Q.length), st = [[0, Q.length - 1]]; keep[0] = keep[Q.length - 1] = 1;
    while (st.length){ const [i0, i1] = st.pop(); let m = 0, mi = -1; const dx = Q[i1][0] - Q[i0][0], dz = Q[i1][1] - Q[i0][1], L2 = dx * dx + dz * dz;
      for (let i = i0 + 1; i < i1; i++){ const u = L2 ? Math.max(0, Math.min(1, ((Q[i][0] - Q[i0][0]) * dx + (Q[i][1] - Q[i0][1]) * dz) / L2)) : 0, d = Math.hypot(Q[i][0] - Q[i0][0] - dx * u, Q[i][1] - Q[i0][1] - dz * u); if (d > m){ m = d; mi = i; } }
      if (m > 0.3){ keep[mi] = 1; st.push([i0, mi], [mi, i1]); } }
    let p = null; for (let i = 0; i < Q.length; i++){ if (!keep[i]) continue; if (p && Math.hypot(Q[i][0] - p[0], Q[i][1] - p[1]) > 0.05) out.push([r1(p[0]), r1(p[1]), r1(Q[i][0]), r1(Q[i][1]), o.r, o.d]); p = Q[i]; } }
  return out; }
// The channel a boat of the type needs from a to b (km): the planner's own way with the water left out (the search goes where the
// least is to be dug, the check takes the land and the things as ever), and the pieces of it where her hull, with the planner's
// margins, has too little water: {segs, nm, dug (m of way)} or planBane's own answer where there is no way even so. The channel is
// her beam, the margin to the side and PLAN.digSide m more on each side (the field has the least water within a cell and a half),
// and her draught, half a metre and PLAN.digDeep m deep at chart datum. tools/autonav/renner.py writes them to src/data/renner.json
PLAN.digSide = 4; PLAN.digDeep = 0.3;
async function planDig(a, b, type, opt){ const R = await planBane(a, b, type, Object.assign({}, opt || {}, {dig:true})); if (!R.bane) return R;
  const ty = type || S.boat.type, boat = planBoat(ty, a.x * 1000, a.y * 1000), side = opt && opt.side != null ? opt.side : FARB.side, B = R.bane, P = [], sh = [], own = BANE.own * boat.L;
  const e0 = [a.x * 1000, a.y * 1000], e1 = [b.x * 1000, b.y * 1000], o = {m:side, keel:planKeel(), squat:0, skip:h => h.what !== 'grunn' || Math.hypot(h.x - e0[0], h.z - e0[1]) < own || Math.hypot(h.x - e1[0], h.z - e1[1]) < own};
  for (let s = 0; ; s += 2){ const q = baneAt(B, Math.min(s, B.len)); P.push([q.X, q.Z]); let h = null; try { h = farbPose(q.X, q.Z, q.psi, boat, R.Hmin, o); } catch (e){} sh.push(h && h.what === 'grunn' ? 1 : 0); if (s >= B.len) break; if (!(P.length & 63)) await farbBreath(); }
  const segs = planDigRuns(P, sh, {ext:boat.L / 2 + 5, gap:boat.L, r:+(boat.B / 2 + side + PLAN.digSide).toFixed(1), d:+(boat.T + FARB.keel + PLAN.digDeep).toFixed(2)});
  return {segs, nm:R.nm, dug:Math.round(segs.reduce((t, g) => t + Math.hypot(g[2] - g[0], g[3] - g[1]), 0)), ms:R.ms}; }
// Where a bane to or from a place ends: at her berth there (07-harbours.js berthPose: where her middle lies by the quay, {x, y} km and
// her heading hd), not at the harbour's point. The simulation keeps her at the harbour's point while she is in port and the views
// draw her at the berth, so a bane to the point ended some tens of metres from where she lies, and the last of the way was a jump
// across whatever stood between (the bench's observer: a floating dock at Stø, a vessel at Urangsvåg, steg 142). null where the
// place has no berth to find (the map not in, a point at sea): the harbour's point then. The search with her heading at the berth
// (G2: back out, turn, go) is not here yet: the bane comes to the berth from the way it came
function planEnd(pid, type, kind){ if (!pid) return null; try { const bp = berthPose(pid, type || S.boat.type, kind || 'main'); return bp ? {x:bp.x, y:bp.y, hd:bp.hd} : null; } catch (e){ return null; } }
// ---- the harbour search with her heading (G2, steg 142, 27.11.2026) ----
// By a quay the way has her heading in it: she lies along the quay, 0.4 m off it, and a way that leaves the berth «as it came»
// swings her stern into the quay (two tries at a lead along the quay, fifth session). So the first and the last of a bane is found
// here: from the berth (bp: {x, z (m), hd}) to a place on the way and the heading she has there (goal: {x, z, psi}), over where she
// is (a lattice of g m) and how she lies (16 headings from the berth's own). From each she may go ahead or astern, straight (step m)
// or a sixteenth of a turn on the radius she is turned on by a quay (PLAN.havn.r of her length, less than she turns under way), and
// within PLAN.havn.near of her length from the berth be warped sideways (as a boat is sprung off a quay: the one way a hull that
// lies along a wall comes off it without a corner through the wall). free(x, z, psi): whether her hull may be there (planBane asks
// the map with the planner's margins and her own berth's rule; the unit tests a wall). The cost is the way's length, o.kAhead times
// ahead (1) and o.kAstern astern (3), PLAN.havn.kSide sideways, and PLAN.havn.cusp of her length each time she stops and changes.
// The way in to a berth is the way out of it sailed backwards (planHavnRev), so it is searched from the berth too, with ahead and
// astern changed (kAhead 3, kAstern 1). A generator (a yield every 32 places looked at): {pts (for baneBuild: [X, Z, the corner's
// radius, the speed, 0, how she lies on the leg and 4 where the radius stands]), len, n} or null where there is none within
// o.maxN places or o.reach m of the berth
PLAN.havn = {r:0.8, rMin:5, maxN:2000, cusp:0.5, kSide:4, near:1.0, tol:3, v0:0.5, v1:1.5, d:2.5, dMin:30, join:1.0};
function* planHavnG(bp, goal, L, B, free, o){ o = o || {}; const HV = PLAN.havn, NB = 16, dphi = 2 * Math.PI / NB, r = Math.max(HV.rMin, HV.r * L), tt = r * Math.tan(dphi / 2), chord = 2 * r * Math.sin(dphi / 2), arc = r * dphi;
  const step = Math.max(2.5, Math.min(8, 0.3 * L)), g = Math.max(0.75, Math.min(2, 0.5 * Math.min(step, chord))), sl = Math.max(1.5, Math.min(4, B / 2)), near = HV.near * L, D0 = Math.hypot(goal.x - bp.x, goal.z - bp.z), reach = o.reach || D0 + 3 * L + 20, tol = Math.max(1.5 * g, HV.tol), maxN = o.maxN || HV.maxN;
  const kA = o.kAhead || 1, kS = o.kAstern || 3, kMin = Math.min(kA, kS), cuspC = HV.cusp * L, hg = ((Math.round((goal.psi - bp.hd) / dphi) % NB) + NB) % NB;
  const X = [bp.x], Z = [bp.z], Hh = [0], G = [0], GL = [0], par = [-1], MV = [null], MD = [-1], best = new Map(), key = (x, z, h) => Math.round((x - bp.x) / g) + ',' + Math.round((z - bp.z) / g) + ',' + h;
  const hf = [], hi = [], put = (f, k) => { let i = hf.length; hf.push(f); hi.push(k); while (i > 0){ const q = (i - 1) >> 1; if (hf[q] <= f) break; hf[i] = hf[q]; hi[i] = hi[q]; i = q; } hf[i] = f; hi[i] = k; };
  const take = () => { const k = hi[0], lf = hf.pop(), lk = hi.pop(), m = hf.length; if (m){ let i = 0; for (;;){ let q = 2 * i + 1; if (q >= m) break; if (q + 1 < m && hf[q + 1] < hf[q]) q++; if (hf[q] >= lf) break; hf[i] = hf[q]; hi[i] = hi[q]; i = q; } hf[i] = lf; hi[i] = lk; } return k; };
  const hh = (x, z) => Math.max(0, Math.hypot(goal.x - x, goal.z - z) - tol) * kMin;
  best.set(key(bp.x, bp.z, 0), 0); put(hh(bp.x, bp.z), 0); let n = 0, found = -1;
  const add = (k, x, z, h, cost, len, mv, md) => { if (Math.hypot(x - bp.x, z - bp.z) > reach) return; const kk = key(x, z, h), ng = G[k] + cost + (MD[k] !== -1 && MD[k] !== md ? cuspC : 0), b = best.get(kk); if (b !== undefined && b <= ng + 1e-9) return;
    best.set(kk, ng); const i = X.length; X.push(x); Z.push(z); Hh.push(h); G.push(ng); GL.push(GL[k] + len); par.push(k); MV.push(mv); MD.push(md); put(ng + hh(x, z), i); };
  while (hf.length){ const k = take(), x = X[k], z = Z[k], h = Hh[k]; if (G[k] > best.get(key(x, z, h)) + 1e-9) continue;
    if (h === hg && Math.hypot(goal.x - x, goal.z - z) <= tol){ found = k; break; }
    if (++n > maxN) break; if (!(n & 31)) yield;
    const psi = bp.hd + h * dphi, sn = Math.sin(psi), cs = Math.cos(psi);
    for (const dir of [1, -1]){ const md = dir > 0 ? 0 : 1, kc = dir > 0 ? kA : kS;
      { const nx = x + dir * step * sn, nz = z - dir * step * cs; if (free(nx, nz, psi)) add(k, nx, nz, h, step * kc, step, null, md); }
      for (const sg of [1, -1]){ const h2 = (h + sg + NB) % NB, p2 = bp.hd + h2 * dphi, cx = x + dir * tt * sn, cz = z - dir * tt * cs, ex = cx + dir * tt * Math.sin(p2), ez = cz - dir * tt * Math.cos(p2);
        if (free(((x + ex) / 2 + cx) / 2, ((z + ez) / 2 + cz) / 2, psi + sg * dphi / 2) && free(ex, ez, p2)) add(k, ex, ez, h2, arc * kc * 1.15, arc, [cx, cz], md); } }
    if (Math.hypot(x - bp.x, z - bp.z) <= near) for (const sd of [1, -1]){ const nx = x + sd * sl * cs, nz = z + sd * sl * sn; if (free(nx, nz, psi)) add(k, nx, nz, h, sl * HV.kSide, sl, null, sd > 0 ? 3 : 2); } }
  if (found < 0) return null;
  const chain = []; for (let k = found; k > 0; k = par[k]) chain.push(k); chain.reverse();
  const vAt = (x, z) => Math.hypot(x - bp.x, z - bp.z) < 1.5 * L ? HV.v0 : HV.v1, pts = [[bp.x, bp.z, 0, 0, 0, 0]]; let cur = [bp.x, bp.z], cm = -1;
  for (const k of chain){ const md = MD[k]; if (cm !== -1 && md !== cm) pts.push([cur[0], cur[1], 0, vAt(cur[0], cur[1]), 0, cm]);
    if (MV[k]) pts.push([MV[k][0], MV[k][1], r, vAt(MV[k][0], MV[k][1]), 0, md | 4]); cur = [X[k], Z[k]]; cm = md; }
  pts.push([cur[0], cur[1], 0, vAt(cur[0], cur[1]), 0, cm === -1 ? 0 : cm]);
  return {pts, len:GL[found], n, psi:bp.hd + Hh[found] * dphi}; }
function planHavn(bp, goal, L, B, free, o){ const g = planHavnG(bp, goal, L, B, free, o); let r; while (!(r = g.next()).done); return r.value; }   // (all at once: the unit tests)
// the same way sailed backwards (the way in to the berth from the way out of it): the points turned round, each leg's ahead and
// astern changed, and its sideways the other side (her heading is as it was; the way she goes is turned round)
function planHavnRev(P){ const n = P.length, sw = m => m ^ 1, out = []; for (let k = 0; k < n; k++){ const a = P[n - 1 - k], l = k > 0 ? P[n - k] : null; out.push([a[0], a[1], a[2] || 0, l ? l[3] || 0 : 0, 0, (l ? sw((l[5] || 0) & 3) : 0) | ((a[5] || 0) & 4)]); } return out; }
// A bane into a plan (the bench, and the flag): the plan's points i0 .. i1 - 1 (the way to the stop at i1 - 1, which is kept as it is:
// the harbour she docks in, the fishing there) replaced by the bane's own, and the leg written in pl.b2 (17b-bane.js baneLeg).
// A plan's legs are put in from the last to the first, so the places of those before stand
function planInto(pl, R, i0, i1){ const last = pl.wps[i1 - 1], n = R.pts.length, B = R.bane;
  const pts = R.pts.map((q, i) => i === n - 1 ? Object.assign({}, last, {x:q.x, y:q.y}) : {x:q.x, y:q.y, port:null, fish:0, leia:true, bane:true});
  pl.wps.splice(i0, i1 - i0, ...pts); const Y = pl.b2 || (pl.b2 = {legs:[], at:-1, s:0}); for (const g of Y.legs) if (g.i0 >= i1) g.i0 += n - (i1 - i0);
  Y.legs.push({i0, n, q:B.Q.map(q => [+q[0].toFixed(2), +q[1].toFixed(2), +(q[2] || 0).toFixed(2), +(q[3] || 0).toFixed(2), +(q[4] || 0).toFixed(2), q[5] || 0]), kn:+(B.o.vmax / KN_MS).toFixed(2), end:B.o.end !== false, type:B.o.type}); Y.len = pl.wps.length; return pl; }
// whether the new Autonav is the one that sails: #autonav2 in the address (and what the bench sets)
function planOn(){ if (PLAN.on == null){ PLAN.on = false; try { PLAN.on = /[#&,]autonav2\b/.test(location.hash); } catch (e){} } return PLAN.on; }
