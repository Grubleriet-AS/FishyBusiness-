// Steg 125c (Jonas 15.11.2026: «en gjennomgang på alle båtene og plasserer fiskeredskap, kar, sløyebenker og alt sånt på plasser som
// harmonerer med arbeidsprosessene»): the deck of each of the coast's boats as a plan, read from her model: the cells one can stand in,
// what stands on deck with its footprint, where each man works, and the way of the fish from the hauler to the hold. Written to
// tests/out/dekkplan.json for tools/deck/dekkplan.py, which draws it. Held to: no two things on deck stand in each other.
import { writeFileSync, mkdirSync } from 'node:fs';
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;
// do two boxes [x, z, half width, half length, ry] overlap by more than tol m (separating axes)
function hit(A, B, tol){ const ax = b => [[Math.cos(b[4]), -Math.sin(b[4])], [Math.sin(b[4]), Math.cos(b[4])]], d = [B[0] - A[0], B[1] - A[1]];
  for (const u of ax(A).concat(ax(B))){ const r = b => { const a2 = ax(b); return Math.abs(a2[0][0] * u[0] + a2[0][1] * u[1]) * b[2] + Math.abs(a2[1][0] * u[0] + a2[1][1] * u[1]) * b[3]; };
    if (Math.abs(d[0] * u[0] + d[1] * u[1]) > r(A) + r(B) - tol) return false; } return true; }

export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {VESSELS, CREW3D, applyVessel, LEMMER} = K, b = S.boat, was = LEMMER.on; LEMMER.on = true;
  const out = [], clash = [], r2 = v => +v.toFixed(3);
  for (const vt of Object.keys(VESSELS)){ if (VESSELS[vt].cls === 'hav') continue; S.tut = 0; S.me = S.cur; b.type = vt; applyVessel(); CREW3D.reset(); if (!CREW3D.on()) continue;
    const ST = CREW3D._st, G = ST.G, M = ST.M0, PL = CREW3D.places(), V = VESSELS[vt], d = G.deck || {y:G.gw, z:0}, Bm = G.beam || 3, W = G.work, Kt = G.kit || {}, things = [];
    const add = (name, x, z, w, l, ry, fixed) => things.push({name, x:r2(x), z:r2(z), hw:r2(w / 2), hl:r2(l / 2), ry:r2(ry || 0), fixed:fixed !== false});
    const tu = W ? W.tub : [Bm / 2 - 0.62, d.y, d.z + 0.35], s = (W && W.s) || 1; add('bløggekar', tu[0], tu[2], 0.72 * s, 1.08 * s, W && W.ry);
    if (!(W && W.own)){ const tb = W ? W.table : [-(Bm / 2 - 0.42), d.y, d.z]; add('sløyebord', tb[0], tb[2], 0.62, V.len >= 10 ? 1.6 : 1.15, 0); } else add('sløyeplass (båtens egen)', W.table[0], W.table[2], 0.3, 0.3, 0);   // (a place of the model's own, no table set out: its size is not known here, drawn as a mark)
    if (G.hauler) add('haler', G.haulerFoot ? G.haulerFoot[0] : Math.sign(G.hauler[0]) * (Bm / 2 - 0.2), G.hauler[2], 0.35, 0.4, 0);
    (Kt.tubs || []).forEach((q, i) => { const big = (q[4] || 460) > 300; add('fiskekar ' + (i + 1), q[0], q[2], big ? 1.0 : 0.72, big ? 1.2 : 1.08, q[3]); });
    if (Kt.iskasse){ const k = Kt.iskasse[4] || 1; add('iskasse', Kt.iskasse[0], Kt.iskasse[2], 0.72 * k, 1.08 * k, Kt.iskasse[3]); }
    if (Kt.stamps){ const n = Kt.stamps.n || 4, rows = Math.ceil(n / 2), ry = Kt.stamps.ry || 0, c = Math.cos(ry), sn = Math.sin(ry), lz = (rows - 1) * 0.25; add('linestamper', Kt.stamps.at[0] + 0.26 * c + lz * sn, Kt.stamps.at[2] - 0.26 * sn + lz * c, 1.02, rows * 0.5 + 0.02, ry, false); }
    if (Kt.garn) add('garnkar', Kt.garn.at[0], Kt.garn.at[2], 1.0, 1.2, Kt.garn.ry, false);
    if (Kt.crane && Kt.crane.at) add('kran', Kt.crane.at[0], Kt.crane.at[2], 0.9, 0.9, 0);
    if (G.hatch) add('luke', G.hatch[0], G.hatch[2], 1.0, 1.0, 0);
    const cells = []; for (let k = 0; k < M.nx * M.nz; k++) if (M.ok(k)){ const p = M.at(k); cells.push([r2(p[0]), r2(p[2]), r2(p[1])]); }
    const pt = n => { const c = ST.PT[n]; return c && c.k != null && M.ok(c.k) ? {name:n, x:r2(M.at(c.k)[0]), z:r2(M.at(c.k)[2]), h:r2(c.h || 0)} : null; };
    const st = [{name:'haler', x:r2(PL.haul[0][0]), z:r2(PL.haul[0][1]), h:r2(PL.haul[0][2])}, {name:'bløgger', x:r2(PL.bleed[0]), z:r2(PL.bleed[1]), h:r2(PL.bleed[2])}];
    for (const [n, nm] of [['sloy', 'sløyer'], ['is', 'pakker'], ['ror', 'ror'], ['door', 'dør']]){ const q = pt(n); if (q){ q.name = nm; st.push(q); } }
    for (let i = 0; i < 4; i++){ const q = pt('spot' + i); if (q){ q.name = 'juksa ' + (i + 1); st.push(q); } }
    out.push({type:vt, name:V.name || vt, len:V.len, beam:Bm, c:M.c, hold:V.hold, open:!!G.open, crew:V.crew || null, cells, things, stations:st, drop:PL.drop.map(r2), deckY:r2(d.y)});
    // (things that stand in each other: the hatch lies in the deck and the hauler is on the rail, so only what stands on the deck)
    const B = things.filter(q => q.name !== 'luke' && q.name !== 'kran' && !q.name.startsWith('sløyeplass')).map(q => [q.x, q.z, q.hw, q.hl, q.ry, q.name]);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (!(/linestamper|garnkar/.test(B[i][5]) && /linestamper|garnkar/.test(B[j][5])) /* (the line's tubs and the nets' tub are never aboard together) */ && hit(B[i], B[j], 0.03)) clash.push(vt + ': ' + B[i][5] + ' og ' + B[j][5]); }
  LEMMER.on = was;
  try { mkdirSync(new URL('../out/', import.meta.url), {recursive:true}); writeFileSync(new URL('../out/dekkplan.json', import.meta.url), JSON.stringify(out)); } catch (e){ console.log('dekkplan.json ikke skrevet: ' + e.message); }
  console.log('dekkplan: ' + out.length + ' båttyper; ting som står i hverandre: ' + (clash.join('; ') || 'ingen'));
  t.ok(out.length >= 8, 'dekkplanen er lest for kystbåtene (' + out.map(q => q.type).join(', ') + ')');
}
