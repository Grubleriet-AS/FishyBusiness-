// Planleggeren (core/17c-plan.js; Autonav 2.0 F2, steg 142): the search on the field's tiles (planMake, which runs in a worker in the
// game and as it is here), against geometry that is known: round a breakwater, under a bridge that is high enough and round one
// that is too low, off a shoal, out from a quay, with the tiles given as it asks for them, and the words for a way that is not there.
export default function (t){
  const K = t.K, N = 32, c2 = 2, q = 0.25;
  // a world of tiles, in the two sizes of cell, made from what is land, how deep it is (dm) and how high a deck is (steps of 0.25 m; 255 none)
  const world = (land, depth, deck) => { const T = new Map();
    const tile = (cell, fx, fz) => { const key = cell + ',' + fx + ',' + fz; if (T.has(key)) return T.get(key); const d = new Uint8Array(N * N), z = new Uint8Array(N * N), u = new Uint8Array(N * N), R = 20, h = cell * 1.5;
      // (the land is looked for every 2 m whatever the cell, so the two sizes see the same world)
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const x = (fx * N + i + 0.5) * cell, zz = (fz * N + j + 0.5) * cell; let m = land(x, zz) ? 0 : 60, zm = 254;
        for (let b = -R; b <= R && m > 0; b++) for (let a = -R; a <= R; a++) if (land(x + a * 2, zz + b * 2)){ const dd = Math.max(0, Math.hypot(a, b) * 2 - 1); if (dd < m) m = dd; }
        for (let b = -h; b <= h; b += 1) for (let a = -h; a <= h; a += 1){ const v = land(x + a, zz + b) ? 0 : depth ? depth(x + a, zz + b) : 200; if (v < zm) zm = v; }   // (the least water within a cell and a half, as the field has it)
        d[j * N + i] = Math.min(240, Math.floor(m / q)); z[j * N + i] = zm; u[j * N + i] = deck ? deck(x, zz) : 255; }
      const Y = {d, z, u}; T.set(key, Y); return Y; };
    return {tile}; };
  // the search run to its end, the tiles given as it asks (asked: how many; fineT: how many of them of the fine cells)
  const solve = (W, J, blocks) => { const PL = K.planMake(), job = Object.assign({c2, N, q, clr:3.5, needD2:Math.ceil((3.5 + 1) / q), needD4:Math.ceil((3.5 + 2) / q), rb2:0, rb4:0, needZ:25, needZ0:25, slowR:0, needU:20, pref:25, k:0.35, w:1, endR:14, fineR:40, maxExp:1e6}, J); let asked = 0, fineT = 0;
    PL.start(job); for (const b of blocks || []) PL.block(b[0], b[1], b[2]);
    for (let g = 0; g < 900; g++){ const r = PL.run(); if (!r.need) return Object.assign(r, {asked, fineT, PL}); for (const [c, fx, fz] of r.need){ asked++; if (c === c2) fineT++; PL.put(c, fx, fz, W.tile(c, fx, fz)); } }
    return {why:'løkke'}; };
  const len = P => P.reduce((s, p, i) => i ? s + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0, 0);
  const distTo = (P, x, z) => { let m = Infinity; for (let i = 1; i < P.length; i++){ const ax = P[i - 1][0], az = P[i - 1][1], bx = P[i][0], bz = P[i][1], l2 = (bx - ax) ** 2 + (bz - az) ** 2, u = l2 ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2)) : 0; m = Math.min(m, Math.hypot(ax + (bx - ax) * u - x, az + (bz - az) * u - z)); } return m; };

  // (the sea ends: land outside the box, so a search that finds no way has an end)
  const box = f => (x, z) => x < -60 || x > 860 || z < -260 || z > 460 || (f ? f(x, z) : false);
  // open sea: the straight way, two points, and only the tiles along it asked for
  let W = world(() => false), r = solve(W, {a:[50, 50], b:[450, 250]});
  t.ok(r.path && r.path.length === 2, 'åpent hav: den rette veien, to punkter', r.path && r.path.length); t.near(len(r.path), Math.hypot(400, 200), 1e-6, 'så lang som avstanden');
  t.ok(r.asked >= 4 && r.asked <= 40 && r.fineT >= 2 && r.fineT < r.asked, 'flisene hentes etter hvert som søket kommer til dem: fine ruter ved endene, grove imellom', [r.asked, r.fineT]);
  t.ok(r.PL.peek(50, 50)[2] === 1 && r.PL.peek(250, 150)[2] === 2, 'rutene er 2 m ved enden og 4 m midt på veien');

  // and the same way back (from the fine cells into the big ones towards the west and the north too)
  r = solve(W, {a:[450, 250], b:[50, 50]}); t.ok(r.path && Math.abs(len(r.path) - Math.hypot(400, 200)) < 1e-6, 'og samme vei tilbake: fra fine ruter til grove også mot vest og nord', r.path ? len(r.path) : [r.why, r.cause]);

  // out of a bay that opens to the west only: from the fine cells into the big ones on that side (a big cell is come to at its even place)
  W = world((x, z) => x > 300 && (x > 670 || Math.abs(z - 250) > 30)); r = solve(W, {a:[650, 250], b:[100, 250]});
  t.ok(r.path && !r.refined && Math.abs(len(r.path) - 550) < 1, 'ut av en bukt som bare er åpen mot vest: fra fine ruter til grove også den veien', r.path ? len(r.path) : [r.why, r.cause]);

  // a breakwater across the way (x 250, z from -200 to 300): round its end at z 300, never nearer it than her half beam and margin
  const molo = (x, z) => Math.abs(x - 250) < 4 && z > -200 && z < 300;
  W = world(molo); r = solve(W, {a:[100, 100], b:[400, 100], k:1});
  t.ok(r.path && r.path.length >= 3, 'en molo på tvers: veien går rundt', r.path && r.path.length);
  let mn = Infinity; if (r.path) for (let zz = -200; zz <= 300; zz += 2) for (const xx of [246, 254]) mn = Math.min(mn, distTo(r.path, xx, zz));   // (its two edges)
  console.log('plan: nærmest moloens kant ' + mn.toFixed(1) + ' m, veien ' + JSON.stringify(r.path && r.path.map(p => p.map(Math.round))));
  t.ok(mn >= 1.5 + 2 - 0.01, 'og aldri nærmere moloen enn halve bredden og marginen (3,5 m fra kanten)', mn);
  t.ok(r.path && r.path.some(p => p[1] > 300), 'rundt enden i sør (den i nord er lenger unna)');
  t.ok(r.path && len(r.path) < (Math.hypot(150, 215) + Math.hypot(150, 215)) * 1.06, 'uten omvei: under 6 % lenger enn den strammeste veien med klaring', r.path && len(r.path));
  // along a shore with open water outside: she keeps off it where there is room (both ends 8 m off the land; the middle of the way farther out)
  W = world((x, z) => z < 100); r = solve(W, {a:[100, 108], b:[500, 108], k:1});
  const mid = r.path ? Math.max(...r.path.map(p => p[1])) - 100 : 0;
  t.ok(mid > 15 && len(r.path) < 400 * 1.08, 'langs en strand med åpent vann utenfor holder hun seg lenger ute enn det minste, uten å gå langt', [mid, r.path && len(r.path)]);
  // a strait with two openings in a wall (z 200): the nearer under a deck too low for her, the farther high enough
  const wall = (x, z) => Math.abs(z - 200) < 4 && !(x > 180 && x < 220) && !(x > 480 && x < 520);
  const deck = h1 => (x, z) => Math.abs(z - 200) < 12 ? (x > 170 && x < 230 ? h1 : x > 470 && x < 530 ? 80 : 255) : 255;
  W = world(box(wall), null, deck(12)); r = solve(W, {a:[200, 100], b:[200, 300]});   // (needs 5 m: 20 steps; the near deck 3 m, the far 20 m)
  t.ok(r.path && r.path.some(p => p[0] > 470), 'en bru som er for lav: veien går under den som er høy nok, lenger borte', r.path && r.path.map(p => Math.round(p[0])));
  W = world(wall, null, deck(40)); r = solve(W, {a:[200, 100], b:[200, 300]});
  t.ok(r.path && r.path.every(p => p[0] < 300), 'er den nære brua høy nok, går hun under den');
  W = world(box((x, z) => Math.abs(z - 200) < 4 && !(x > 180 && x < 220)), null, deck(12)); r = solve(W, {a:[200, 100], b:[200, 300]});
  t.ok(r.why && r.cause === 'bru', 'og er den eneste åpningen under en for lav bru, sier svaret at brua er grunnen', [r.why, r.cause]);
  t.ok(r.at && Math.hypot(r.at[0] - 200, r.at[1] - 200) < 60, 'og hvor: stedet søket kom nærmest målet fra', r.at);

  // a shoal on the straight way (1.5 m of water; she needs 2.5): round it; for a wider hull cells more to the side
  const shoal = (x, z) => Math.hypot(x - 250, z - 100) < 40 ? 15 : 200;
  W = world(() => false, shoal); r = solve(W, {a:[100, 100], b:[400, 100]});
  t.ok(r.path && distTo(r.path, 250, 100) > 40, 'en grunne midt i veien: rundt den', r.path && distTo(r.path, 250, 100));
  const r2 = solve(W, {a:[100, 100], b:[400, 100], rb2:6, rb4:3});
  t.ok(r2.path && distTo(r2.path, 250, 100) > distTo(r.path, 250, 100) + 6, 'et bredt skrog holder seg tilsvarende lenger fra grunna', r2.path && [distTo(r.path, 250, 100), distTo(r2.path, 250, 100)]);
  W = world(box((x, z) => Math.abs(x - 250) < 4), () => 200); r = solve(W, {a:[100, 100], b:[400, 100]});
  t.ok(r.why === 'ingen vei' || r.why === 'for langt', 'land hele veien på tvers: ingen vei', r.why); t.eq(r.cause, 'land', 'og grunnen er land');
  W = world(box(), (x, z) => Math.abs(x - 250) < 20 ? 15 : 200); r = solve(W, {a:[100, 100], b:[400, 100]});
  t.eq(r.cause, 'grunt', 'en grunne hele veien på tvers: grunnen er at det er for grunt');

  // out from a quay: her place lies on the quay's edge (land), the way starts there and goes to the nearest water she can float in
  const kai = (x, z) => z < 100;
  W = world(kai); r = solve(W, {a:[200, 99], b:[200, 400]});
  t.ok(r.path && r.path[0][0] === 200 && r.path[0][1] === 99, 'fra en kai: veien begynner der hun ligger, også når punktet er på kaikanten', r.path && r.path[0]);
  t.ok(r.path && len(r.path) < 310, 'og går rett ut', r.path && len(r.path));
  r = solve(W, {a:[200, 20], b:[200, 400]});
  t.ok(r.why === 'start' && r.cause === 'land', 'et sted langt inne på land har ingen start', [r.why, r.cause]);

  // a gap of 13 m in a wall, far from both ends: shut on the big cells (the water is the least within a cell and a half, so 6 m is lost
  // on each side), open on the fine ones, which the search turns to there when it finds the water goes on behind something narrow
  const gap = (x, z) => Math.abs(x - 400) < 4 && Math.abs(z - 100) > 6.5;
  W = world(box(gap), (x, z) => 200); r = solve(W, {a:[100, 100], b:[700, 100]});
  t.ok(r.path && r.refined >= 1 && distTo(r.path, 400, 100) < 6, 'et løp på 13 m midt på veien: stengt på de grove rutene, funnet på de fine, som søket tar i bruk der', r.path ? [r.refined, distTo(r.path, 400, 100)] : [r.why, r.cause]);
  t.ok(r.PL.peek(400, 100)[2] === 1 && r.PL.peek(250, 250)[2] === 2, 'og bare der: resten av veien er fortsatt grov');
  const gap8 = (x, z) => Math.abs(x - 400) < 4 && Math.abs(z - 100) > 4;
  W = world(box(gap8)); r = solve(W, {a:[100, 100], b:[700, 100]});
  t.ok(r.why && r.cause === 'trangt', 'et løp på 8 m er for trangt for henne også på de fine rutene, og svaret sier det', [r.why, r.cause]);

  // The chart's own cells for how far it is (J.co): a long island with the way round its far end. The straight line to the goal says
  // nothing of that, and the search looks through all the water on this side; with the chart's cells it goes for the end at once
  const lang = box((x, z) => Math.abs(x - 400) < 100 && z > -200);   // (an island 200 m across: the chart's cells of 50 m have it)
  const chart = (land, c) => { const x0 = -200, z0 = -400, Wc = Math.ceil(1200 / c), Hc = Math.ceil(1000 / c), v = new Uint8Array(Wc * Hc);
    for (let j = 0; j < Hc; j++) for (let i = 0; i < Wc; i++){ let o = 0; for (let b = 0; b < 4 && !o; b++) for (let a = 0; a < 4; a++) if (!land(x0 + (i + (a + 0.5) / 4) * c, z0 + (j + (b + 0.5) / 4) * c)){ o = 1; break; } v[j * Wc + i] = o; } return {x0, z0, c, W:Wc, H:Hc, v}; };
  W = world(lang); const uten = solve(W, {a:[100, 300], b:[700, 300], w:1.03}), med = solve(W, {a:[100, 300], b:[700, 300], w:1.03, co:chart(lang, 50)});
  t.ok(uten.path && med.path && Math.abs(len(med.path) - len(uten.path)) < len(uten.path) * 0.01, 'med sjøkartets ruter som avstand til målet: samme vei rundt en lang øy (innen 1 %)', [uten.path && len(uten.path), med.path && len(med.path)]);
  t.ok(med.exp < uten.exp * 0.8, 'og færre ruter sett på (i en så liten verden er det meste fine ruter ved endene)', [uten.exp, med.exp]);
  t.ok(med.PL.left(100, 300) > 1100 && med.PL.left(100, 300) < 1327 * 1.08 && uten.PL.left(100, 300) < 650, 'fra starten vet søket at det er over 1 100 m igjen (veien er 1 327), ikke 600 som den rette linja sier', [med.PL.left(100, 300), uten.PL.left(100, 300)]);
  console.log('plan: rundt en lang øy (' + (uten.path ? len(uten.path).toFixed(0) : '-') + ' og ' + (med.path ? len(med.path).toFixed(0) : '-') + ' m), ruter sett på uten og med sjøkartets avstand: ' + uten.exp + ' og ' + med.exp + ', fliser ' + uten.asked + ' og ' + med.asked);

  // a place shut after the check on the geometry found something there: the way goes another
  W = world(() => false); r = solve(W, {a:[100, 100], b:[400, 100]}, [[250, 100, 30]]);
  t.ok(r.path && distTo(r.path, 250, 100) >= 26, 'et sted kontrollen har stengt, går veien utenom', r.path && distTo(r.path, 250, 100));

  // the words
  const S0 = K.get('S'); K.set('S', K.newState());
  try { const w = K.planWhy({why:'ingen vei', cause:'bru', at:[500000, 900000]});
    t.ok(/brua er for lav/.test(w[0]) && /bridge is too low/.test(w[1]) && /° N/.test(w[0]), 'svaret sier hvorfor og hvor, på norsk og engelsk', w); } finally { K.set('S', S0); }
}
