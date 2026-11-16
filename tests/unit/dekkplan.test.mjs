// Steg 125c (Jonas 15.11.2026: «en gjennomgang på alle båtene og plasserer fiskeredskap, kar, sløyebenker og alt sånt på plasser som
// harmonerer med arbeidsprosessene»): the deck of each of the coast's boats as a plan, read from her model: the cells one can stand in,
// what stands on deck with its footprint, where each man works, and the way of the fish from the hauler to the hold. Written to
// tests/out/dekkplan.json for tools/deck/dekkplan.py, which draws it. Held to: no two things on deck stand in each other.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;
// do two boxes [x, z, half width, half length, ry] overlap by more than tol m (separating axes)
function hit(A, B, tol){ const ax = b => [[Math.cos(b[4]), -Math.sin(b[4])], [Math.sin(b[4]), Math.cos(b[4])]], d = [B[0] - A[0], B[1] - A[1]];
  for (const u of ax(A).concat(ax(B))){ const r = b => { const a2 = ax(b); return Math.abs(a2[0][0] * u[0] + a2[0][1] * u[1]) * b[2] + Math.abs(a2[1][0] * u[0] + a2[1][1] * u[1]) * b[3]; };
    if (Math.abs(d[0] * u[0] + d[1] * u[1]) > r(A) + r(B) - tol) return false; } return true; }

// the sizes the anchors do not carry [across, along], from the models' scripts in tools/boats/: the boats' own gutting places (GUT, TABLE)
// and the hatches (HOLD; kyst21: the open part of her hatch, OPEN)
const OWN = {snekke:[0.4, 0.57], plastsjark:[0.6, 0.75], breisjark:[0.58, 0.9], kyst15:[0.56, 1.0], kyst21:[0.58, 2.0]};
const HATCH = {plastsjark:[1.1, 0.95], sjark:[1.32, 1.6], hurtigsjark:[1.1, 1.2], sjarkny:[1.24, 1.3], breisjark:[1.24, 1.48], kyst15:[0.6, 0.8], kyst21:[1.0, 1.0]};
// The rules a proposal (docs/planer/dekk/forslag.json) is held to, metres and radians: Jonas 15.11.2026, docs/planer/start/125c.md
const R = {slipp:[0.4, 0.8], side:70 * Math.PI / 180, fisk:[0.4, 0.8], kast:[0.7, 1.6], foran:110 * Math.PI / 180, rekk:0.75, bord:[0.15, 0.5], ser:35 * Math.PI / 180, ende:2.2, inn:0.3, folk:0.75, kropp:0.2, dor:0.4, rekke:0.45, tol:0.03};
const KJENT = {'snekke: bløggekaret er bak den som kaster':'snekka har ikke gulv ved halerens side: karet står skrått bak ham', 'snekke: bløggekaret er bak sløyeren':'sløyebrettet ligger på ripa og alt gulv er bak ham: han snur seg etter fisken'};   // (known and told to Jonas, not a pass)
const loc = (B, px, pz) => { const c = Math.cos(B.ry), s = Math.sin(B.ry), dx = px - B.x, dz = pz - B.z; return [dx * c - dz * s, dx * s + dz * c]; };
const near = (B, px, pz) => { const [a, b] = loc(B, px, pz), ca = Math.max(-B.hw, Math.min(B.hw, a)), cb = Math.max(-B.hl, Math.min(B.hl, b)), c = Math.cos(B.ry), s = Math.sin(B.ry); return {d:Math.hypot(a - ca, b - cb), x:B.x + c * ca + s * cb, z:B.z - s * ca + c * cb}; };
const turn = (h, x, z, tx, tz) => { let d = Math.atan2(tx - x, -(tz - z)) - h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
// one boat's proposal laid over what she has today, and what in it breaks a rule
function propose(B, N, V){ const bad = [], T = {}, S = {}, ut = new Set(N.ut || []), hold = !!(B.hold && B.hold.kind === 'rom'), moved = new Set();
  if (hold){ ut.add('pakker'); ut.add('iskasse'); }   // (the icing is done in the hold: no packer and no ice box on a deck with a hold under it)
  for (const q of B.things) if (!ut.has(q.name)) T[q.name] = {...q};
  for (const s of B.stations) if (!ut.has(s.name)) S[s.name] = {...s};
  for (const [n, v] of Object.entries(N)){ if (n === 'ut' || n === 'slipp') continue;
    if (['bløgger', 'sløyer', 'pakker', 'haler'].includes(n) && v.length === 3 && !T[n + ' ting']){ if (n === 'haler'){ bad.push('haleren flyttes ikke'); continue; } S[n] = {name:n, x:v[0], z:v[1], h:v[2]}; moved.add(n); continue; }
    const was = T[n] || (n === 'sløyebord' ? T['sløyeplass (båtens egen)'] : null), hw = v[3] != null ? v[3] / 2 : n === 'sløyebord' && !T[n] ? 0.31 : was ? was.hw : null, hl = v[4] != null ? v[4] / 2 : n === 'sløyebord' && !T[n] ? (B.len >= 10 ? 0.8 : 0.575) : was ? was.hl : null;
    if (hw == null){ bad.push(n + ': ukjent ting uten mål'); continue; }
    if (n === 'sløyebord') delete T['sløyeplass (båtens egen)'];   // (her own gutting place is moved in the model: it is the table now)
    T[n] = {name:n, x:v[0], z:v[1], hw, hl, ry:v[2] || 0, fixed:was ? was.fixed : true}; moved.add(n); }
  const c = B.c, cell = new Map(B.cells.filter(q => Math.abs(q[2] - B.deckY) < 0.35).map(q => [Math.floor(q[0] / c + 1e-9) + ',' + Math.floor(q[1] / c + 1e-9), 1])), any = new Set(B.cells.map(q => Math.floor(q[0] / c + 1e-9) + ',' + Math.floor(q[1] / c + 1e-9)));
  const ok = (x, z) => cell.has(Math.floor(x / c) + ',' + Math.floor(z / c)), rows = new Map(); let zmax = -1e9;
  for (const k of cell.keys()){ const [i, j] = k.split(',').map(Number), r = rows.get(j) || [1e9, -1e9]; r[0] = Math.min(r[0], i * c); r[1] = Math.max(r[1], i * c + c); rows.set(j, r); zmax = Math.max(zmax, j * c + c); }
  // on the deck: every point of it over a cell one can stand in, or up to R.rekke outboard of the row's last cell (the cells stop short of the bulwark), never in a hole inboard (a casing, a coaming)
  const onDeck = q => { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++){ const cs = Math.cos(q.ry), sn = Math.sin(q.ry), a = (q.hw - 0.05) * i / 2, b = (q.hl - 0.05) * j / 2, x = q.x + cs * a + sn * b, z = q.z - sn * a + cs * b; if (ok(x, z)) continue;
      const r = rows.get(Math.floor(z / c)); if (!r){ if (z >= zmax && z - zmax <= 0.3) continue; return false; } if ((x < r[0] && r[0] - x <= R.rekke) || (x > r[1] && x - r[1] <= R.rekke)) continue; return false; } return true; };
  const boxes = Object.values(T), solid = boxes.filter(q => q.name !== 'luke' && q.name !== 'kran'), arr = q => [q.x, q.z, q.hw, q.hl, q.ry], lineNet = n => /linestamper|garnkar/.test(n), under = (a, b) => /sløyeplass/.test(a + b) && /iskasse/.test(a + b);   // (the snekke's ice box stands under her gutting board)
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (!(lineNet(solid[i].name) && lineNet(solid[j].name)) && !under(solid[i].name, solid[j].name) && hit(arr(solid[i]), arr(solid[j]), R.tol)) bad.push(solid[i].name + ' og ' + solid[j].name + ' står i hverandre');
  const luke = T.luke; if (luke) for (const q of solid) if (q.name !== 'haler' && hit(arr(q), arr(luke), R.tol)) bad.push(q.name + ' står på luka');
  for (const n of moved) if (T[n]){ if (n === 'luke'){ if (![[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => any.has(Math.floor((T[n].x + a * (T[n].hw - 0.05)) / c) + ',' + Math.floor((T[n].z + b * (T[n].hl - 0.05)) / c)))) bad.push('luka er ikke i dekket'); }
    else if (!(n === 'sløyebord' && B.things.some(q => q.name.startsWith('sløyeplass')) && N.own !== false && B.ownMoved) && !onDeck(T[n])) bad.push(n + ' står ikke på dekk'); }   // (a model's own table, once moved in it, is a part of her deck map itself)
  const work = ['haler', 'bløgger', 'sløyer', 'pakker'].filter(n => S[n]);
  for (const n of work){ const s = S[n]; if (!ok(s.x, s.z)) bad.push(n + ' står ikke på dekk');
    for (const q of solid) if (near(q, s.x, s.z).d < R.kropp && !(n === 'haler' && q.name === 'haler')) bad.push(n + ' står inne i ' + q.name);
    if (luke && near(luke, s.x, s.z).d < R.kropp) bad.push(n + ' står i luka'); }
  for (let i = 0; i < work.length; i++) for (let j = i + 1; j < work.length; j++){ const a = S[work[i]], b = S[work[j]], d = Math.hypot(a.x - b.x, a.z - b.z); if (d < R.folk) bad.push(work[i] + ' og ' + work[j] + ' står ' + d.toFixed(2) + ' m fra hverandre'); }
  for (const n of ['dør', 'ror']) if (S[n]) for (const q of solid) if (moved.has(q.name) && near(q, S[n].x, S[n].z).d < R.dor) bad.push(q.name + ' står i veien for ' + (n === 'dør' ? 'døra' : 'roret'));
  // against the rail or a wall on the hauler's side: no cell to stand in within R.rekke of one of its sides
  const H = S.haler, sg = H && H.x < 0 ? -1 : 1;
  for (const n of ['bløggekar', 'sløyebord']) if (moved.has(n) && T[n]){ const q = T[n], cs = Math.cos(q.ry), sn = Math.sin(q.ry), free = [[1, 0, q.hw], [-1, 0, q.hw], [0, 1, q.hl], [0, -1, q.hl]].every(([a, b, e]) => [-0.6, 0, 0.6].filter(f => [0.15, 0.3, R.rekke].every(m => { const la = a * (e + m) + (a ? f * 0 : f * q.hw), lb = b * (e + m) + (b ? 0 : f * q.hl); return !ok(q.x + cs * la + sn * lb, q.z - sn * la + cs * lb); })).length < 2);   // (a side is against something when two of three places along it have no cell to stand in within R.rekke)
    if (free) bad.push(n + ' står fritt på dekket (ikke inntil rekka eller en vegg)'); if (q.x * sg <= 0) bad.push(n + ' står ikke på halerens side'); }
  // the way of the fish
  const way = [], tub = T['bløggekar'], tab = T['sløyebord'] || T['sløyeplass (båtens egen)'], G = S['sløyer'], Bl = S['bløgger'], drop = N.slipp || B.drop;
  const end = hold ? luke : Object.values(T).filter(q => q.name.startsWith('fiskekar')).sort((a, b) => G ? Math.hypot(a.x - G.x, a.z - G.z) - Math.hypot(b.x - G.x, b.z - G.z) : 0)[0];
  if (!H || !tub || !tab || !G || !end){ bad.push('mangler haler, bløggekar, sløyebord, sløyer eller ' + (hold ? 'luke' : 'fiskekar')); return {things:boxes, stations:Object.values(S), moved:[...moved], ut:[...ut], drop, way, bad}; }
  const thrower = Bl || H, leg = (a, ax, az, b, bx, bz) => way.push({a, b, d:+Math.hypot(bx - ax, bz - az).toFixed(2), p:[ax, az, bx, bz]});
  if (Bl){ const d = Math.hypot(drop[0] - H.x, drop[1] - H.z), inb = turn(sg > 0 ? -Math.PI / 2 : Math.PI / 2, H.x, H.z, drop[0], drop[1]);
    if (d < R.slipp[0] - 0.01 || d > R.slipp[1] + 0.01) bad.push('fisken slippes ' + d.toFixed(2) + ' m fra haleren'); if (inb < R.side) bad.push('fisken slippes bak haleren, ikke ved siden av ham');
    if (!ok(drop[0], drop[1]) || solid.some(q => q.name !== 'haler' && near(q, drop[0], drop[1]).d < 0.05)) bad.push('fisken slippes ikke på fritt dekk');
    const f = Math.hypot(drop[0] - Bl.x, drop[1] - Bl.z); if (f < R.fisk[0] - 0.01 || f > R.fisk[1] + 0.01) bad.push('bløggeren står ' + f.toFixed(2) + ' m fra fisken');
    leg('haleren', H.x, H.z, 'slippet', drop[0], drop[1]); leg('slippet', drop[0], drop[1], 'bløggeren', Bl.x, Bl.z); }
  const k = Math.hypot(tub.x - thrower.x, tub.z - thrower.z); if (k < R.kast[0] - 0.01 || k > R.kast[1] + 0.01) bad.push('kastet til bløggekaret er ' + k.toFixed(2) + ' m');
  if (turn(thrower.h, thrower.x, thrower.z, tub.x, tub.z) > R.foran) bad.push('bløggekaret er bak den som kaster');
  leg(Bl ? 'bløggeren' : 'haleren (bløgger selv)', thrower.x, thrower.z, 'bløggekaret', tub.x, tub.z);
  const [la, lb] = loc(tab, G.x, G.z), longZ = tab.hl >= tab.hw, along = longZ ? lb : la, across = Math.abs(longZ ? la : lb) - (longZ ? tab.hw : tab.hl), half = longZ ? tab.hl : tab.hw;
  if (Math.abs(along) > half || across < R.bord[0] || across > R.bord[1]) bad.push('sløyeren står ikke ved langsida av bordet (' + across.toFixed(2) + ' m fra kanten)');
  const tp = near(tab, G.x, G.z); if (turn(G.h, G.x, G.z, tp.x, tp.z) > R.ser) bad.push('sløyeren ser ikke mot bordet');
  const np = near(tub, G.x, G.z); if (np.d > R.rekk + 0.01) bad.push('bløggekaret er ' + np.d.toFixed(2) + ' m fra sløyeren'); else if (turn(G.h, G.x, G.z, np.x, np.z) > R.foran) bad.push('bløggekaret er bak sløyeren');
  leg('bløggekaret', np.x, np.z, 'sløyeren', G.x, G.z);
  const ep = near(end, G.x, G.z), ed = hold ? ep.d + R.inn : Math.hypot(end.x - G.x, end.z - G.z), ex = hold ? ep.x + (end.x - ep.x) * Math.min(1, R.inn / (Math.hypot(end.x - ep.x, end.z - ep.z) || 1)) : end.x, ez = hold ? ep.z + (end.z - ep.z) * Math.min(1, R.inn / (Math.hypot(end.x - ep.x, end.z - ep.z) || 1)) : end.z;
  if (ed > R.ende + 0.01) bad.push((hold ? 'luka' : 'fiskekaret') + ' er ' + ed.toFixed(2) + ' m fra sløyeren'); leg('sløyeren', G.x, G.z, hold ? 'luka' : end.name, ex, ez);
  return {things:boxes, stations:Object.values(S), moved:[...moved], ut:[...ut].filter(n => B.things.some(q => q.name === n) || B.stations.some(q => q.name === n)), drop, way, bad}; }

export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {VESSELS, CREW3D, applyVessel, LEMMER} = K, b = S.boat, was = LEMMER.on; LEMMER.on = true;
  const out = [], clash = [], r2 = v => +v.toFixed(3);
  for (const vt of Object.keys(VESSELS)){ if (VESSELS[vt].cls === 'hav') continue; S.tut = 0; S.me = S.cur; b.type = vt; applyVessel(); CREW3D.reset(); if (!CREW3D.on()) continue;
    const ST = CREW3D._st, G = ST.G, M = ST.M0, PL = CREW3D.places(), V = VESSELS[vt], d = G.deck || {y:G.gw, z:0}, Bm = G.beam || 3, W = G.work, Kt = G.kit || {}, things = [];
    const add = (name, x, z, w, l, ry, fixed) => things.push({name, x:r2(x), z:r2(z), hw:r2(w / 2), hl:r2(l / 2), ry:r2(ry || 0), fixed:fixed !== false});
    const tu = W ? W.tub : [Bm / 2 - 0.62, d.y, d.z + 0.35], s = (W && W.s) || 1; add('bløggekar', tu[0], tu[2], 0.72 * s, 1.08 * s, W && W.ry);
    if (!(W && W.own)){ const tb = W ? W.table : [-(Bm / 2 - 0.42), d.y, d.z]; add('sløyebord', tb[0], tb[2], 0.62, V.len >= 10 && !(W && W.bord) ? 1.6 : 1.15, 0);   /* (work.bord: the plastic table on a bigger boat, steg 125d) */ } else { const o = OWN[vt] || [0.3, 0.3]; add('sløyeplass (båtens egen)', W.table[0], W.table[2], o[0], o[1], 0); }
    if (G.hauler) add('haler', G.haulerFoot ? G.haulerFoot[0] : Math.sign(G.hauler[0]) * (Bm / 2 - 0.2), G.hauler[2], 0.35, 0.4, 0);
    (Kt.tubs || []).forEach((q, i) => { const big = (q[4] || 460) > 300; add('fiskekar ' + (i + 1), q[0], q[2], big ? 1.0 : 0.72, big ? 1.2 : 1.08, q[3]); });
    if (Kt.iskasse){ const k = Kt.iskasse[4] || 1; add('iskasse', Kt.iskasse[0], Kt.iskasse[2], 0.72 * k, 1.08 * k, Kt.iskasse[3]); }
    if (Kt.stamps){ const n = Kt.stamps.n || (V.len < 8 ? 4 : 8),   /* (per layer, as the game stands them: deckcrew.js stampPer; the rest are stacked on them) */ rows = Math.ceil(n / 2), ry = Kt.stamps.ry || 0, c = Math.cos(ry), sn = Math.sin(ry), lz = (rows - 1) * 0.25; add('linestamper', Kt.stamps.at[0] + 0.26 * c + lz * sn, Kt.stamps.at[2] - 0.26 * sn + lz * c, 1.02, rows * 0.5 + 0.02, ry, false); }
    if (Kt.garn) add('garnkar', Kt.garn.at[0], Kt.garn.at[2], 1.0, 1.2, Kt.garn.ry, false);
    if (Kt.crane && Kt.crane.at) add('kran', Kt.crane.at[0], Kt.crane.at[2], 0.9, 0.9, 0);
    if (G.hatch){ const h = G.hatchSize || HATCH[vt] || [1.0, 1.0]; add('luke', G.hatch[0], G.hatch[2], h[0], h[1], 0); }   // (anchors.hatchSize since steg 125d)
    const cells = []; for (let k = 0; k < M.nx * M.nz; k++) if (M.ok(k)){ const p = M.at(k); cells.push([r2(p[0]), r2(p[2]), r2(p[1])]); }
    const pt = n => { const c = ST.PT[n]; return c && c.k != null && M.ok(c.k) ? {name:n, x:r2(M.at(c.k)[0]), z:r2(M.at(c.k)[2]), h:r2(c.h || 0)} : null; };
    const st = [{name:'haler', x:r2(PL.haul[0][0]), z:r2(PL.haul[0][1]), h:r2(PL.haul[0][2])}]; if (PL.bleed && !PL.solo) st.push({name:'bløgger', x:r2(PL.bleed[0]), z:r2(PL.bleed[1]), h:r2(PL.bleed[2])});
    for (const [n, nm] of [['sloy', 'sløyer'], ['is', 'pakker'], ['ror', 'ror'], ['door', 'dør']]){ if (n === 'is' && PL.noPack) continue; const q = pt(n); if (q){ q.name = nm; st.push(q); } }
    for (let i = 0; i < 4; i++){ const q = pt('spot' + i); if (q){ q.name = 'juksa ' + (i + 1); st.push(q); } }
    out.push({type:vt, name:V.name || vt, len:V.len, beam:Bm, c:M.c, hold:V.hold, open:!!G.open, crew:V.crew || null, cells, things, stations:st, drop:PL.drop.map(r2), deckY:r2(d.y)});
    // (things that stand in each other: the hatch lies in the deck and the hauler is on the rail, so only what stands on the deck)
    const B = things.filter(q => q.name !== 'luke' && q.name !== 'kran' && !q.name.startsWith('sløyeplass')).map(q => [q.x, q.z, q.hw, q.hl, q.ry, q.name]);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (!(/linestamper|garnkar/.test(B[i][5]) && /linestamper|garnkar/.test(B[j][5])) /* (the line's tubs and the nets' tub are never aboard together) */ && hit(B[i], B[j], 0.03)) clash.push(vt + ': ' + B[i][5] + ' og ' + B[j][5]); }
  LEMMER.on = was;
  // the proposals (docs/planer/dekk/forslag.json): laid over each deck and held to the rules; written with the plan for the drawing
  let NEW = {}; try { NEW = JSON.parse(readFileSync(process.env.KYST_FORSLAG || new URL('../../docs/planer/dekk/forslag.json', import.meta.url), 'utf8')); } catch (e){ console.log('forslag.json ikke lest: ' + e.message); }
  const brudd = [], kjent = [];
  for (const B of out){ if (!NEW[B.type]) continue; { const o = B.things.find(q => q.name.startsWith('sløyeplass')), v = NEW[B.type]['sløyebord']; B.ownMoved = !!(o && v && Math.hypot(o.x - v[0], o.z - v[1]) < 0.05); }
    B.forslag = propose(B, NEW[B.type], VESSELS[B.type]);
    for (const m of B.forslag.bad){ const id = B.type + ': ' + m; if (KJENT[id]){ kjent.push(id + ' (' + KJENT[id] + ')'); B.forslag.kjent = (B.forslag.kjent || []).concat(m); } else brudd.push(id); }
    B.forslag.bad = B.forslag.bad.filter(m => !KJENT[B.type + ': ' + m]);
    console.log('forslag ' + B.type + ': ' + B.forslag.way.map(w => w.a + ' → ' + w.b + ' ' + w.d).join(', ') + '; i alt ' + B.forslag.way.reduce((a, w) => a + w.d, 0).toFixed(1) + ' m; ut: ' + (B.forslag.ut.join(', ') || 'ingen')); }
  if (kjent.length) console.log('kjent: ' + kjent.join('; '));
  if (brudd.length) console.log('BRUDD: ' + brudd.join('\n       '));
  try { mkdirSync(new URL('../out/', import.meta.url), {recursive:true}); writeFileSync(new URL('../out/dekkplan.json', import.meta.url), JSON.stringify(out)); } catch (e){ console.log('dekkplan.json ikke skrevet: ' + e.message); }
  console.log('dekkplan: ' + out.length + ' båttyper; ting som står i hverandre: ' + (clash.join('; ') || 'ingen'));
  // (steg 125d: the decks as the models have them now are the proposals Jonas said yes to on 15.11.2026: each thing and station named in
  // forslag.json within 5 cm and 0.1 rad of it there, where the fish is let fall too, and what it takes off the deck is gone)
  const avvik = [];
  for (const B of out){ const N = NEW[B.type]; if (!N) continue; const T = Object.fromEntries(B.things.map(q => [q.name, q])), S2 = Object.fromEntries(B.stations.map(q => [q.name, q]));
    for (const [n, v] of Object.entries(N)){ if (n === 'ut') continue;
      if (n === 'slipp'){ if (Math.hypot(B.drop[0] - v[0], B.drop[1] - v[1]) > 0.05) avvik.push(B.type + ': slippet ' + B.drop.join(',') + ' (forslaget ' + v.join(',') + ')'); continue; }
      const q = T[n] || S2[n] || (n === 'sløyebord' ? T['sløyeplass (båtens egen)'] : null); if (!q){ avvik.push(B.type + ': ' + n + ' finnes ikke'); continue; }
      const a = q.ry != null ? q.ry : q.h, da = Math.abs(Math.atan2(Math.sin(a - (v[2] || 0)), Math.cos(a - (v[2] || 0))));
      if (Math.hypot(q.x - v[0], q.z - v[1]) > 0.05 || (da > 0.1 && (q.h != null || Math.abs(da - Math.PI) > 0.1)))   /* (a box may be turned half round; a man may not) */ avvik.push(B.type + ': ' + n + ' står på ' + q.x + ',' + q.z + ' (forslaget ' + v[0] + ',' + v[1] + ')'); }
    for (const n of new Set([...(N.ut || []), ...(B.hold && B.hold.kind === 'rom' ? ['pakker', 'iskasse'] : [])])) if (T[n] || S2[n]) avvik.push(B.type + ': ' + n + ' er fortsatt på dekk'); }
  if (avvik.length) console.log('AVVIK fra forslaget: ' + avvik.join('\n       '));
  t.ok(!avvik.length, 'dekkene i modellene er lik forslagene (' + (avvik.length ? avvik.length + ' avvik' : 'alle åtte') + ')');
  const med = out.filter(B => B.forslag).length;
  t.ok(med === 0 || brudd.length === 0, 'forslagene holder reglene (' + med + ' båter med forslag; brudd: ' + (brudd.join('; ') || 'ingen') + ')');
  if (!process.env.KYST_FORSLAG) t.ok(med === out.length, 'hver kystbåt har et forslag (' + med + ' av ' + out.length + ')');
  t.ok(out.length >= 8, 'dekkplanen er lest for kystbåtene (' + out.map(q => q.type).join(', ') + ')');
}
