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
  const solve = (W, J, blocks) => { const PL = K.planMake(), job = Object.assign({c2, N, q, clr:3.5, needD2:Math.ceil((3.5 + 1) / q), needD4:Math.ceil((3.5 + 2) / q), rb2:0, rb4:0, needZ:25, needZf:25, slow:3, needU:20, pref:25, k:0.35, w:1, endR:14, fineR:40, maxExp:1e6}, J); let asked = 0, fineT = 0;
    PL.start(job); for (const b of blocks || []) PL.block(b[0], b[1], b[2]);
    for (let g = 0; g < 900; g++){ const r = PL.run(); if (r.needCo){ PL.co(job.coBig || null); job.coBig = null; continue; } if (!r.need) return Object.assign(r, {asked, fineT, PL}); for (const [c, fx, fz] of r.need){ asked++; if (c === c2) fineT++; PL.put(c, fx, fz, W.tile(c, fx, fz)); } }
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

  // water she can float over but not at full speed (3 m; she needs 2.5 slowly, 4 with her squat): over it where it lies across the
  // whole way, and through the deep gap where there is one near (the cost is the time, and she is slow over the shallow)
  const band = hull => (x, z) => Math.abs(x - 250) < 40 && !(hull && Math.abs(z - 220) < 30) ? 30 : 200;
  W = world(box(), band(false)); r = solve(W, {a:[100, 100], b:[400, 100], needZf:40});
  t.ok(r.path && r.path.length === 2, 'vann hun flyter over, men ikke i full fart: rett over der det ligger på tvers av hele veien', r.path ? r.path.length : [r.why, r.cause]);
  W = world(box(), band(true)); r = solve(W, {a:[100, 100], b:[400, 100], needZf:40});
  t.ok(r.path && r.path.some(p => Math.abs(p[0] - 250) < 60 && Math.abs(p[1] - 220) < 30), 'og gjennom det dype løpet der det finnes et like ved (kostnaden er tiden)', r.path && r.path.map(p => p.map(Math.round)));

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
  t.ok(r.path && (r.refined >= 1 || r.fineN > 0) && distTo(r.path, 400, 100) < 6, 'et løp på 13 m midt på veien: stengt på de grove rutene, funnet på de fine, som søket tar i bruk der', r.path ? [r.refined, distTo(r.path, 400, 100)] : [r.why, r.cause]);
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

  // the same sound with a wide opening 300 m to the side (the independent control's case, 24.11.2026): the way goes through the sound, not
  // round by the opening, because the first search (only what is solid shuts a cell) shows where the fine cells are needed
  const gap2 = (x, z) => Math.abs(x - 400) < 4 && Math.abs(z - 100) > 6.5 && !(z > 380 && z < 440);
  W = world(box(gap2)); r = solve(W, {a:[100, 100], b:[700, 100]}); const rundt = solve(W, {a:[100, 100], b:[700, 100], pre:false});
  t.ok(r.path && len(r.path) < 620 && r.fineN > 0, 'et løp på 13 m med en bred åpning 300 m unna: gjennom løpet, ikke rundt', r.path ? [len(r.path), r.fineN] : [r.why, r.cause]);
  t.ok(rundt.path && len(rundt.path) > 800, '(uten det første søket går veien rundt: 43 % lenger)', rundt.path && len(rundt.path));
  // From the open sea into a channel of 40 m, the goal 290 m up it (the control's case): a block of fine cells begins in the middle of a
  // big tile, so the tiles are asked for where the search comes to them, not only at a tile's own edge (the fine block's edge was a
  // wall, and the search filled the sea: 615 000 cells and no way)
  { const kan = (x, z) => x < -600 || x > 1200 || z > 1500 || z < 100 || (z < 520 && Math.abs(x - 290) > 20), W0 = world(kan);
    const W1 = {tile:(c, fx, fz) => { const T = N * c, x0 = fx * T, z0 = fz * T; return z0 > 600 && z0 + T < 1420 && x0 > -520 && x0 + T < 1120 ? {d:new Uint8Array(N * N).fill(240), z:new Uint8Array(N * N).fill(200), u:new Uint8Array(N * N).fill(255)} : W0.tile(c, fx, fz); }};
    r = solve(W1, {a:[290, 900], b:[290, 230], w:1.15});
    t.ok(r.path && r.exp < 20000 && Math.abs(len(r.path) - 670) < 5, 'fra åpent hav inn i en kanal, målet 290 m inne: funnet rett fram (flisene bes om der søket kommer til dem)', r.path ? [r.exp, r.asked, len(r.path)] : [r.why, r.cause, r.exp, r.asked]); }

  // A sound through the island with a bridge too low for her, and the way round the island's far end. The chart's cells have the sound
  // open, so the search goes for it and fills the water on this side; when that has found nothing, the deck is land to the chart's
  // cells and the search goes round (the bench, 24.11.2026: Hønebrua, Steinvågbrua and Reine gave «søket ble for stort»)
  { const legs = P => { let worst = Infinity; const ang = i => { if (i <= 0 || i >= P.length - 1) return 0; const a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), b = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
      for (let i = 2; i < P.length - 1; i++){ const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), need = 110 * (Math.tan(ang(i - 1) / 2) + Math.tan(ang(i) / 2)); if (need > 1 && l / need < worst) worst = l / need; } return worst; };
    const jog = () => [[100, 100], [380, 100], [388, 108], [700, 108]];   // (8 m to the side over 8 m: two corners of 45 degrees)
    W = world(box()); const big = {a:[100, 100], b:[700, 108], clr:9.75, needD2:Math.ceil((9.75 + 1) / q), needD4:Math.ceil((9.75 + 2) / q), pref:46, k:1, w:1.15, fineR:400};
    const r0 = solve(W, big), r1 = solve(W, Object.assign({turnR:110}, big)), g0 = r0.PL.gentle(jog()), g1 = r1.PL.gentle(jog());
    console.log('plan: et knekk på 8 m for et skip med 110 m svingradius, før og etter: korteste strekk ' + legs(jog()).toFixed(2) + ' og ' + legs(g1).toFixed(2) + ' av det svingene trenger; veien ' + JSON.stringify(g1.map(p => p.map(Math.round))));
    t.ok(legs(jog()) < 0.2 && JSON.stringify(g0) === JSON.stringify(jog()), 'uten svingradien står et knekk hun ikke kan seile, som det er (strekket er under en femdel av det svingene trenger)', legs(jog()));
    t.ok(legs(g1) >= 0.95, 'med svingradien (J.turnR) trekkes de to hjørnene fra hverandre til strekket mellom dem er langt nok for svingene', [legs(g1), g1]);
    t.ok(len(g1) <= len(jog()) + 0.01 && g1[0][0] === 100 && g1[g1.length - 1][0] === 700, 'uten omvei, og endene står', [len(g1), len(jog())]);
    // (and where the land stands in the way of a longer slant, the corners are slid as far as the open water lets them)
    W = world(box((x, z) => (x < 330 && z > 112) || (x > 440 && z < 96))); const r2 = solve(W, Object.assign({turnR:110}, big)), g2 = r2.PL.gentle(jog());
    t.ok(g2.every(p => p[1] >= 99.9 && p[1] <= 108.1) && distTo(g2, 329, 113) >= 9.75 && distTo(g2, 441, 95) >= 9.75, 'der land står i veien for en lengre skrå linje, går veien fortsatt klar av det', g2.map(p => p.map(Math.round))); }
  // What is shut after a touch: round the touch the first time; where the same touch comes again (her bow or stern reaches it from
  // a way that does not pass it: shutting round it changed nothing, seven times over), round where she stood
  { const seen = new Map(), h = {what:'grunn', id:'10,20', x:100, z:100, px:130, pz:104}, bt = {L:75, B:15.5, T:7.5}, b1 = K.planBlockOf(h, bt, 2, 2, 1, seen), b2 = K.planBlockOf(h, bt, 2, 2, 2, seen);
    t.ok(b1.x === 100 && b1.z === 100 && b1.r > 9.75, 'første gang stenges det rundt berøringen', b1);
    t.ok(b2.x === 130 && b2.z === 104 && b2.r >= 4, 'kommer samme berøring igjen, stenges det der hun sto', b2);
    const b3 = K.planBlockOf({what:'kai', id:'kai#5', x:50, z:50, px:60, pz:50}, bt, 2, 2, 1, seen); t.ok(b3.x === 60 && b3.z === 50, 'en ting stenges der hun sto (berøringen er tingens midte)', b3); }
  // her own berth (planSkip, the bench's rule): a vessel lying still counts by her middle, as the observer counts her (Sandshamn with
  // the autoliner, steg 142: a ship of 75 m whose middle lay 97 m from the quay, outside a length and a half of 45 m, was let pass
  // by her nearest point and touched); a mooring buoy's circle by its edge; the water by where it is
  { const a = [0, 0], b = [1000, 0], own = 1.5 * 45.4, ship = {what:'båt', id:'båt#1080,57', x:1080, z:57, R:Math.hypot(37.5, 7), box:[1, 0, 37.5, 7]};
    t.ok(!K.planSkip(ship, 1050, 20, a, b, own, 45.4, false), 'et fartøy som ligger stille med midten utenfor halvannen båtlengde fra kaia, er ikke egen kaiplass');
    t.ok(K.planSkip(Object.assign({}, ship, {x:1040, z:30}), 1030, 10, a, b, own, 45.4, false), 'med midten innenfor er hun det');
    t.ok(K.planSkip({what:'båt', id:'båt#1080,0', x:1080, z:0, R:20}, 1050, 0, a, b, own, 45.4, false), 'en bøye regnes etter kanten av sirkelen hun svinger på');
    t.ok(!K.planSkip({what:'grunn', id:'1,2', x:500, z:0}, 500, 0, a, b, own, 45.4, false) && K.planSkip({what:'grunn', id:'1,2', x:500, z:0}, 500, 0, a, b, own, 45.4, true), 'grunt vann midt på veien teller, unntatt når det graves'); }
  // a vessel lying still along a floating dock (Urangsvåg with the skiff, steg 142): shut as her own box widened by the margins, not as
  // a circle round her middle as wide as she is long, which shut the only way past her
  { const seen = new Map(), sk = {L:5.9, B:2.45, T:0.6}, h = {what:'båt', id:'båt#100,100', x:100, z:100, R:Math.hypot(8, 2.5), box:[1, 0, 8, 2.5]}, bl = K.planBlockOf(h, sk, 2, 2, 1, seen), half = sk.B / 2 + 2;
    const L = bl.list || [[bl.x, bl.z, bl.r]], inBl = (x, z) => L.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]);
    let side = 0; for (let d = 0; d < 40; d += 0.25) if (inBl(100, 100 + d)) side = d;
    t.ok(side <= 2.5 + half + 2 * 2 + 0.01, 'et fartøy som ligger stille, stenges til siden bare med hennes egen halve bredde og marginene (' + side + ' m)', bl);
    let cover = true; for (let a = -8; a <= 8; a += 0.5) for (const b of [-2.5 - half, 0, 2.5 + half]) if (!inBl(100 + a, 100 + b * 0.99)) cover = false;
    t.ok(cover, 'og hele skroget hennes med marginene er stengt, fra baug til hekk'); }

  // The words for it: a shoal across the whole way with a hull wide enough to ask the water a cell to the side (rb2, rb4: every boat
  // but the narrowest) is «for grunt», not «brua er for lav». Where the water under her side shut a cell, the search for the cause
  // took it for a deck (it was the one thing it did not ask), and Træna, Lindesnes and Øksfjord were told of a bridge that is not there
  // (a slot of deep water 10 m wide through the shoal: deep enough along its middle, too shallow under her side)
  { W = world(box(), (x, z) => Math.abs(x - 250) < 20 && Math.abs(z - 100) >= 5 ? 15 : 200); r = solve(W, {a:[100, 100], b:[400, 100], rb2:1, rb4:1, fineR:400});
    t.eq(r.cause, 'grunt', 'ei renne som er dyp nok i midten, men for grunn under siden hennes: grunnen er at det er for grunt, ikke en bru', [r.why, r.cause]); }
  // ---- the dredged channels (Jonas' choice 5, «Tilpass havna»): where to dig ----
  // The search with J.dig: water too shallow for her does not shut a cell, it costs J.dig times as much, so the way goes where the
  // least is to be dug: through a deep gap where there is one near, and straight over the shoal where there is none
  { const band = hull => (x, z) => Math.abs(x - 250) < 20 && !(hull && Math.abs(z - 220) < 30) ? 15 : 200;
    W = world(box(), band(false)); r = solve(W, {a:[100, 100], b:[400, 100]}); t.eq(r.cause, 'grunt', 'ei grunne på tvers av hele veien: ingen vei');
    r = solve(W, {a:[100, 100], b:[400, 100], dig:8}); t.ok(r.path && len(r.path) < 305, 'med J.dig går veien rett over grunna (der skal det graves)', r.path ? len(r.path) : [r.why, r.cause]);
    W = world(box(), band(true)); r = solve(W, {a:[100, 100], b:[400, 100], dig:8});
    t.ok(r.path && r.path.some(p => Math.abs(p[0] - 250) < 60 && Math.abs(p[1] - 220) < 30), 'og gjennom det dype løpet der det finnes et like ved: det graves ikke mer enn det må', r.path && r.path.map(p => p.map(Math.round)));
    W = world(box((x, z) => Math.abs(x - 250) < 4), () => 200); r = solve(W, {a:[100, 100], b:[400, 100], dig:8}); t.eq(r.cause, 'land', 'land graves det ikke gjennom'); }
  // A breakwater's foot is not dug through: the tiles' layer m (the water over the slope) shuts a cell when digging as the water does otherwise
  { const foot = (x, z) => Math.abs(x - 250) < 20 && Math.abs(z - 100) < 150; const W0 = world(box(), (x, z) => Math.abs(x - 250) < 20 ? 15 : 200);
    const Wm = {tile:(c, fx, fz) => { const Y = W0.tile(c, fx, fz); if (!Y.m){ Y.m = new Uint8Array(N * N).fill(255); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (foot((fx * N + i + 0.5) * c, (fz * N + j + 0.5) * c)) Y.m[j * N + i] = 10; } return Y; }};
    r = solve(Wm, {a:[100, 100], b:[400, 100], dig:8}); console.log('plan: graving rundt moloens fot: ' + JSON.stringify(r.path ? r.path.map(p => p.map(Math.round)) : [r.why, r.cause]));
    t.ok(r.path && r.path.some(p => Math.abs(p[0] - 250) < 40 && Math.abs(p[1] - 100) >= 148) && !r.path.some(p => Math.abs(p[0] - 250) < 18 && Math.abs(p[1] - 100) < 140), 'gravingen går rundt moloens fot, og over grunna der foten slutter', r.path ? JSON.stringify(r.path.map(p => p.map(Math.round))) : [r.why, r.cause]); }
  // The channel from a way and where along it the water is too shallow (planDigRuns): the shallow runs, joined where they lie
  // close, reaching a little past each end, as straight pieces with the channel's half width and depth
  { const line = []; for (let x = 0; x <= 200; x += 2) line.push([x, 50]); const sh = line.map(p => (p[0] >= 80 && p[0] <= 120 ? 1 : 0));
    let G = K.planDigRuns(line, sh, {ext:10, gap:12, r:8, d:4.1});
    t.ok(G.length === 1 && Math.abs(G[0][0] - 70) < 0.01 && Math.abs(G[0][2] - 130) < 0.01 && G[0][1] === 50 && G[0][4] === 8 && G[0][5] === 4.1, 'ei grunne fra 80 til 120 m langs en rett vei: én renne fra 70 til 130 m, med bredden og dybden', G);
    const sh2 = line.map(p => ((p[0] >= 40 && p[0] <= 60) || (p[0] >= 70 && p[0] <= 90) || p[0] >= 190 ? 1 : 0)); G = K.planDigRuns(line, sh2, {ext:10, gap:12, r:8, d:4.1});
    t.ok(G.length === 2 && Math.abs(G[0][0] - 30) < 0.01 && Math.abs(G[0][2] - 100) < 0.01 && Math.abs(G[1][0] - 180) < 0.01 && Math.abs(G[1][2] - 200) < 0.01, 'to grunner 10 m fra hverandre blir én renne, og en ved veiens ende stopper der', G);
    const bend = []; for (let x = 0; x <= 100; x += 2) bend.push([x, 0]); for (let z = 2; z <= 100; z += 2) bend.push([100, z]);
    G = K.planDigRuns(bend, bend.map(() => 1), {ext:10, gap:12, r:8, d:4.1}); t.ok(G.length === 2 && G[0][2] === 100 && G[0][3] === 0 && G[1][0] === 100 && G[1][3] === 100, 'rundt et hjørne: to rette stykker som møtes i hjørnet', G);
    t.eq(K.planDigRuns(line, line.map(() => 0), {ext:10, gap:12, r:8, d:4.1}).length, 0, 'ingen grunne: ingen renne'); }

  // the words
  const S0 = K.get('S'); K.set('S', K.newState());
  try { const w = K.planWhy({why:'ingen vei', cause:'bru', at:[500000, 900000]});
    t.ok(/brua er for lav/.test(w[0]) && /bridge is too low/.test(w[1]) && /° N/.test(w[0]), 'svaret sier hvorfor og hvor, på norsk og engelsk', w);
    // (a vessel lying still that was shut, and then no way: it is the vessel, not «the search grew too large» or a bridge; Urangsvåg)
    const wb = K.planWhy({why:'for langt', cause:'båt', at:[500000, 900000]});
    t.ok(/fartøy som ligger stille/.test(wb[0]) && /vessel lying still/.test(wb[1]) && /° N/.test(wb[0]), 'et fartøy som ligger stille og stenger, sies som det', wb);
    // The vessels lying still are listed afresh when a plan is made (planFresh): fixBoats keeps its list for the game minute, and the
    // list is those within AIS range of where she was when it was made. The bench puts the clock back for every trip, so a plan at
    // Senjahopen had the vessels round the stretch before it and none of those lying 262 m from the quay (steg 142: touches at 5 knots)
    const np0 = K.get('npcStates'), ship = (id, x) => ({id, p:{x, y:900}, v:0, cls:'moor', L:20, B:5, hd:0}), nB = () => K.fixBoats(500000, 900000).filter(o => o.t === 1).length;
    try { K.get('FIX').boats = null; K.set('npcStates', () => [ship('a', 500)]); const n1 = nB();
      K.set('npcStates', () => [ship('b', 500.02), ship('c', 500.05)]); const n2 = nB(); K.planFresh(); const n3 = nB();
      t.ok(n1 === 1 && n2 === 1 && n3 === 2, 'fartøyene som ligger stille, listes på nytt når en plan lages (lista holdes ellers for spillminuttet)', [n1, n2, n3]); } finally { K.set('npcStates', np0); K.get('FIX').boats = null; }
    // A boat on a mooring buoy counts as she lies (her hull, in the list as any vessel at a quay), not by the whole circle she
    // swings on: the circle of a buoy in the mouth of Værøy verft's basin shut the yard to every boat (steg 142), where the observer,
    // which sees her hull as the 3D view draws it, counted no touch. FARB.swing turns it
    // Where a bane to a place ends: at her berth there (berthPose: where her middle lies by the quay), not at the harbour's point,
    // from which arrive() set her at the berth across whatever lay between (Stø with the purse seiner, Urangsvåg: steg 142, G2)
    const bp0 = K.get('berthPose'); try { K.set('berthPose', (pid, ty, kind) => pid === 'husoy' ? {x:500.01, y:900.02, hd:1.2, kind} : pid === 'b' ? null : (() => { throw new Error('no map'); })());
      const e1 = K.planEnd('husoy', 'sjark'), hp = K.portById('husoy').p, e2 = K.planEnd('b', 'sjark'), e3 = K.planEnd('c', 'sjark'), e4 = K.planEnd(null, 'sjark');
      t.ok(e1 && e1.x === 500.01 && e1.y === 900.02 && e1.hd === 1.2 && e1.px === hp.x && e1.py === hp.y && e2 === null && e3 === null && e4 === null, 'banen ender ved kaiplassen der stedet har en, ellers i havnas punkt (planEnd gir da ingenting)', [e1, e2, e3, e4]); } finally { K.set('berthPose', bp0); }
    // ---- the harbour search with her heading (G2): from the berth to a place and a heading on the way, over where she is and how she lies ----
    { const L = 10, Bm = 4, hull = (x, z, psi) => { const s = Math.sin(psi), c = Math.cos(psi); return [[L / 2, Bm / 2], [L / 2, -Bm / 2], [-L / 2, Bm / 2], [-L / 2, -Bm / 2]].map(([f, g]) => [x + f * s + g * c, z - f * c + g * s]); };
      const run = (bp, goal, free, o) => K.planHavn(bp, goal, L, Bm, free, o);
      const o5 = {R:20, vmax:5, stop:v => v * v * 2, end:false, start:true}, modes = P => [...new Set(P.slice(1).map(q => q[5] & 3))].sort().join('');
      // the least her hull keeps to what free() shuts, sampled every half metre along the bane built from the points
      const sweep = (P, ok) => { const M = K.baneBuild(P.map(q => q.slice()), o5); let bad = 0; for (let u = 0; u <= M.len; u += 0.5){ const q = K.baneAt(M, u); if (!ok(q.X, q.Z, q.psi)) bad++; } return {bad, M}; };
      // open water: straight ahead, no astern, no sideways
      let h = run({x:0, z:0, hd:Math.PI / 2}, {x:60, z:0, psi:Math.PI / 2}, () => true);
      t.ok(h && h.pts.length === 2 && modes(h.pts) === '0' && Math.abs(h.len - 60) < 4, 'havnesøket i åpent vann: rett fram, bare forover', h && [h.pts.length, modes(h.pts), h.len]);
      // a quay along her port side (north of her, 0.4 m off): she may not touch it with any corner, and the goal lies astern and out
      const quay = (x, z, psi) => hull(x, z, psi).every(c => c[1] > -(Bm / 2 + 0.4) + 0.05);
      h = run({x:0, z:0, hd:Math.PI / 2}, {x:-40, z:40, psi:Math.PI * 1.25}, quay);
      t.ok(h && h.pts.length >= 3, 'fra en kai langs siden til et sted akterut og ute: en vei finnes', h && h.pts.length);
      if (h){ const w = sweep(h.pts, quay); t.eq(w.bad, 0, 'og skroget tar aldri borti kaia langs hele banen (hver halve meter)'); t.ok(/[23]/.test(modes(h.pts)) || /1/.test(modes(h.pts)), 'hun går sidelengs ut eller rygger: ikke bare forover', modes(h.pts));
        const e = K.baneAt(w.M, w.M.len); t.ok(Math.hypot(e.X + 40, e.Z - 40) < 4 && Math.abs(Math.atan2(Math.sin(e.psi - Math.PI * 1.25), Math.cos(e.psi - Math.PI * 1.25))) < 0.45, 'banen ender ved stedet med kursen den ble bedt om', [e.X, e.Z, e.psi]); }
      // her bow to a wall (nothing east of x 7), a quay to the north: out astern, round and away to the west
      const slot = (x, z, psi) => hull(x, z, psi).every(c => c[0] < 7 && c[1] > -(Bm / 2 + 0.4) + 0.05);
      h = run({x:0, z:0, hd:Math.PI / 2}, {x:-50, z:30, psi:Math.PI * 1.5}, slot);
      t.ok(h, 'med baugen mot en vegg: en vei finnes'); if (h){ const w = sweep(h.pts, slot); t.eq(w.bad, 0, 'uten å ta borti veggen eller kaia'); t.ok(w.M.cusp.length >= 1, 'og hun stopper og skifter minst én gang', w.M.cusp.length); }
      // the bane the minute step builds again from the plan (planInto's leg, baneOf) is the very one that was built from the points
      // to the centimetre, as planBane makes them: built from other numbers than the plan keeps, it had other pieces, baneOf gave
      // none, and the trip was sailed from point to point (Averøy with the skiff over land, the bench 27.11.2026)
      if (h){ const r2 = v => Math.round(v * 100) / 100, far0 = 500000, Qc = h.pts.map(q => [r2(q[0] + far0), r2(q[1] + far0 + 400000), r2(q[2]), r2(q[3]), 0, q[5]]).concat([[far0 - 50 - 300, far0 + 400000 + 30, 0, 0, 0, 0]]);
        const ob = Object.assign(K.baneBoat('sjark', 8), {end:true}), Bc = K.baneBuild(Qc.map(q => q.slice()), ob), pl = {wps:[{x:0, y:0, port:null, fish:0}], idx:0};
        K.planInto(pl, {pts:K.banePts(Bc), bane:Bc}, 0, 1); const Y = K.baneOf(K.baneLeg(pl));
        t.ok(Y && Math.abs(Y.B.len - Bc.len) < 1e-9 && Y.B.P.length === Bc.P.length && Y.B.cusp.length === Bc.cusp.length, 'banen minuttsteget bygger fra planen, er den som ble kontrollert (med manøveren i)', Y ? [Y.B.len, Bc.len, Y.B.P.length, Bc.P.length] : null); }
      // shut in on every side: none, and it says so within its limit
      h = run({x:0, z:0, hd:Math.PI / 2}, {x:-50, z:30, psi:Math.PI * 1.5}, (x, z) => Math.hypot(x, z) < 6, {maxN:500});
      t.ok(h === null, 'stengt inne på alle kanter: ingen vei', h);
      // the way in is the way out sailed backwards: the points turned round, ahead and astern changed
      h = run({x:0, z:0, hd:Math.PI / 2}, {x:-40, z:40, psi:Math.PI * 0.25}, quay, {kAhead:3, kAstern:1});
      if (h){ const inn = K.planHavnRev(h.pts), w = sweep(inn, quay), e = K.baneAt(w.M, w.M.len), s0 = K.baneAt(w.M, 0);
        t.eq(w.bad, 0, 'veien inn (veien ut baklengs) tar heller ikke borti kaia'); t.ok(Math.hypot(e.X, e.Z) < 1e-6 && Math.abs(Math.atan2(Math.sin(e.psi - Math.PI / 2), Math.cos(e.psi - Math.PI / 2))) < 1e-6, 'og ender ved kaiplassen med kursen hun skal ligge med', [e.X, e.Z, e.psi]);
        t.ok(Math.abs(Math.atan2(Math.sin(s0.psi - Math.PI * 0.25), Math.cos(s0.psi - Math.PI * 0.25))) < 0.45, 'hun kommer inn med kursen veien hadde', s0.psi); } else t.ok(false, 'veien inn finnes'); }
    const fb0 = K.get('fixBoats'), FB = K.get('FARB'); try { K.set('fixBoats', () => [{t:1, x:0, z:0, l:4, w:1.5, ux:1, uz:0}, {t:0, x:10, z:0, r:11}]);
      const n2 = K.farbBoats(0, 0).length; FB.swing = false; const n1 = K.farbBoats(0, 0).length, t1 = K.farbBoats(0, 0)[0].t; FB.swing = true;
      // (27.11.2026, fifth session: the circles count again, now that a buoy has a free lane round it, 05-vessels.js moorBuoyRoom)
      t.ok(n2 === 2 && n1 === 1 && t1 === 1, 'en bøyebåts svingsirkel teller (FARB.swing); slått av regnes hun som skroget der hun ligger', [n1, n2]); } finally { K.set('fixBoats', fb0); FB.swing = true; } } finally { K.set('S', S0); }
  // A clear detour, measured without the reference (steg 142, point 4): the search says how far it took the goal to be from the start
  // with only what is solid shutting a cell (h0), and planOmvei holds the bane's length against it. A
  // belt of water the field calls too shallow (a shore's foot) across the short way: the first search goes round it, the second
  // (J.dig: the water costs instead of shutting, the check on the geometry has the last word) goes over it
  { const belt = (x, z) => Math.abs(x - 250) < 2 && z > -200 && z < 440 ? 10 : 200;   // (4 m of shoal: on the field it is 16 m, at 24 times the cost (J.dig and J.slow) still far less than the way round)
    const W2 = world(box(), belt), r1 = solve(W2, {a:[100, 100], b:[400, 100]}), r2 = solve(W2, {a:[100, 100], b:[400, 100], dig:8});
    t.ok(r1.path && r1.h0 > 290 && r1.h0 <= 300.01, 'søket sier hvor lang veien er når bare det faste stenger (h0)', r1.h0);
    // (and round a breakwater that way is the way round, not the straight line: a way that must go round is no detour)
    const rm = solve(world(molo), {a:[100, 100], b:[400, 100], k:1}); t.ok(rm.path && rm.h0 > 500 && rm.h0 <= len(rm.path) && K.planOmvei(len(rm.path), rm.h0) === false, 'rundt en molo er det minste veien rundt, og banen ingen omvei', [rm.h0, rm.path && len(rm.path)]);
    t.ok(r1.path && len(r1.path) > 600, 'det første søket går rundt beltet feltet kaller for grunt', r1.path && len(r1.path));
    t.ok(K.planOmvei(len(r1.path), r1.h0) === true, 'og det er en tydelig omvei: det andre søket skal prøves', [len(r1.path), r1.h0]);
    t.ok(r2.path && len(r2.path) < 310, 'det andre søket går over beltet', r2.path && len(r2.path));
    t.ok(K.planOmvei(len(r2.path), r2.h0) === false && K.planOmvei(1000, 960) === false && K.planOmvei(200, 150) === false && K.planOmvei(2000, 1600) === true, 'en bane nær det minste er ingen omvei, og en kort tur prøves ikke på nytt for noen meter');
    // (the second search has a cap of its own: past it, it gives up and says so, and the first way stands)
    const r3 = solve(W2, {a:[100, 100], b:[400, 100], dig:8, cap:40}); t.ok(!r3.path && r3.why === 'for langt', 'det andre søket gir opp ved taket sitt', [r3.why, r3.path && len(r3.path)]);
    // (the second search on a sound whose big cells have the foreshore's water in them (the least within 6 m) and whose fine cells
    // have water enough down the middle: the big cells on the first way are made fine there too, though they are not shut when the
    // water only costs. They were left big, the sound cost 24 times its length, and the way round won: Stamsund with kyst21)
    { const gapW = (x, z) => Math.abs(x - 250) < 4 && z > -200 && z < 400 && Math.abs(z - 100) > 10, fore = (x, z) => Math.abs(x - 250) < 10 && Math.abs(z - 100) > 6 ? 10 : 200;
      const r4 = solve(world(box(gapW), fore), {a:[100, 100], b:[400, 100], dig:8});
      t.ok(r4.path && len(r4.path) < 320 && r4.fineN > 0, 'det andre søket gjør rutene fine langs et sund der de grove bare har fjæras vann, og går gjennom', [r4.path && len(r4.path), r4.fineN]); }
    t.ok(K.planOmvei(500, 0) === false && K.planOmvei(500, undefined) === false, 'uten et mål for avstanden prøves ingenting'); }

}
