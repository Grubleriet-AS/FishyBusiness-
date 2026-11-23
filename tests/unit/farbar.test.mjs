// Farbarhetskartet (core/17-farbar.js; Autonav 2.0 F1, steg 141, docs/planer/autonav-2-0.md): one answer about what a boat can sail
// over and under. Each kind of thing against known geometry, a bridge by the boat's height, her hull as the outline the bench sees,
// the sweep between two poses, the foreshore as depth, a dredged channel, and «not known» where the map is not in. The world (coast,
// depth, tide) is a stub here (FARB.w); the things are put in as FARB.test, and Senja's own (bridges, marks) are read as the game has them.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// (the bench's observer has the hull's outline as a polygon: the map's is to be the same one)
const BKO = new Function(readFileSync(join(HERE, '..', '..', 'tools', 'autonav', 'benkobs.js'), 'utf8') + '\nreturn globalThis.BKO;')();

export default function (t){
  const K = t.K, FARB = K.get('FARB'); K.set('S', K.newState());
  // open sea everywhere, 50 m deep, no tide: what a check then finds is the things'
  const sea = o => Object.assign({land:() => 0, coast:() => [1e9, 0], depth:() => 50, tide:() => 0, zc:() => 0, pocket:() => false, known:() => true}, o || {});
  const far = {x:9e6, z:9e6};   // (far from Senja's embedded things)
  const at = (dx, dz) => [far.x + dx, far.z + dz];
  const boat = {L:10, B:3, T:1.5, air:4};
  try {
    FARB.w = sea(); FARB.test = [];
    // ---- 1. the distance to each kind of thing ----
    const D = (o, dx, dz) => K.farbD(o, ...at(dx, dz));
    t.near(D({k:'c', x:far.x, z:far.z, r:2}, 10, 0), 8, 1e-9, 'sirkel: avstanden er til randen'); t.eq(D({k:'c', x:far.x, z:far.z, r:2}, 1, 1), 0, 'sirkel: 0 inni');
    const box = {k:'b', x:far.x, z:far.z, l:10, w:2, ux:1, uz:0};
    t.near(D(box, 0, 7), 5, 1e-9, 'boks: 5 m fra langsida'); t.near(D(box, 13, 6), 5, 1e-9, 'boks: 5 m fra hjørnet (3, 4)'); t.eq(D(box, 9, 1), 0, 'boks: 0 inni');
    const turned = {k:'b', x:far.x, z:far.z, l:10, w:2, ux:0, uz:1};
    t.near(D(turned, 7, 0), 5, 1e-9, 'boks dreid 90°: 5 m fra langsida');
    const deck = {k:'s', ax:far.x - 20, az:far.z, bx:far.x + 20, bz:far.z, r:4, under:5.9};
    t.near(D(deck, 0, 10), 6, 1e-9, 'brudekke: avstanden til kanten av dekket'); t.eq(D(deck, 5, 3), 0, 'brudekke: 0 under det');
    const tri = {k:'p', P:[at(0, 0), at(10, 0), at(0, 10)]};
    t.eq(D(tri, 2, 2), 0, 'omriss: 0 inni'); t.near(D(tri, -3, 5), 3, 1e-9, 'omriss: 3 m fra kanten'); t.near(D(tri, 13, -4), 5, 1e-9, 'omriss: 5 m fra hjørnet');
    const mole = {k:'l', P:[at(-30, 0), at(30, 0)], r:4.5};
    t.near(D(mole, 0, 10), 5.5, 1e-9, 'linje med bredde (molo): avstanden til siden'); t.eq(D(mole, 10, 4), 0, 'molo: 0 på den');
    const rock = {k:'e', x:far.x, z:far.z, a:6, b:3, th:0};
    t.eq(D(rock, 5, 0), 0, 'skjær: 0 på foten'); t.near(D(rock, 0, 8), 5, 1e-9, 'skjær: 5 m fra foten på den korte aksen');
    t.ok(D(rock, 16, 0) > 0 && D(rock, 16, 0) <= 10 + 1e-9, 'skjær: aldri lenger unna enn det er (10 m på den lange aksen)', D(rock, 16, 0));
    const U = K.get('UNITA')[0], uw = K.get('unitW'), inU = uw(U, 0, -5), outU = uw(U, 0, 10);
    t.eq(K.farbD({k:'u', U}, inU[0], inU[1]), 0, 'havneenhet: 0 på blokka'); t.near(K.farbD({k:'u', U}, outU[0], outU[1]), 10, 1e-6, 'havneenhet: 10 m ut fra kaifronten');

    // ---- 2. the nearest thing, and a bridge by the boat's height ----
    FARB.test = [{k:'c', what:'merke', id:'m1', x:far.x + 30, z:far.z, r:1}, {k:'c', what:'merke', id:'m2', x:far.x - 12, z:far.z, r:2}];
    let n = K.farbNearest(far.x, far.z, 60, boat);
    t.ok(n && n.id === 'm2' && Math.abs(n.d - 10) < 1e-9, 'nærmeste ting er den nærmeste, med avstanden', n && [n.id, n.d]);
    t.near(K.farbClear(far.x, far.z, boat, 60), 10, 1e-9, 'farbClear gir avstanden'); t.eq(K.farbClear(far.x, far.z, boat, 5), 5, 'og taket når ingenting er nærmere');
    FARB.test = [Object.assign({what:'brudekke', id:'d'}, deck)];
    t.eq(K.farbClear(far.x, far.z, {L:10, B:3, T:1.5, air:4}, 60), 60, 'ei bru med 5,9 m underkant slipper en båt på 4 m under (4 + 1 m klaring)');
    t.eq(K.farbClear(far.x, far.z, {L:10, B:3, T:1.5, air:5.5}, 60), 0, 'og stenger for en båt på 5,5 m');
    t.near(K.farbClear(far.x, far.z + 14, {L:10, B:3, T:1.5, air:5.5}, 60), 10, 1e-9, 'båten som er for høy, har 10 m til dekket 14 m unna');
    t.eq(K.farbClear(far.x, far.z, {L:10, B:3, T:1.5, air:4.9}, 60), 60, 'akkurat klar: 4,9 + 1 m er ikke over 5,9 m');

    // ---- 3. her hull: the outline the bench's observer has, and as precise for the smallest boat as for the largest ----
    for (const [name, L, B] of [['skiff', 5.9, 2.45], ['sjark', 10.57, 4.1], ['kyst21', 21, 7.2], ['pelagisk', 75, 15.5]]){
      const b = {L, B, T:1, air:3}; let worst = 0, same = true;
      for (const psi of [0, 0.65, 2.4, -1.9]){ const P = K.farbHull(far.x + 3, far.z - 7, psi, b), Q = BKO.hull(far.x + 3, far.z - 7, psi, L, B); if (P.length !== Q.length) same = false; else for (let i = 0; i < P.length; i++) worst = Math.max(worst, Math.hypot(P[i][0] - Q[i][0], P[i][1] - Q[i][1])); }
      t.ok(same && worst < 1e-6, name + ': skrogomrisset er det observatøren har, i fire kurser', worst);
      // a stake 5 cm clear of her and 5 cm into her: abeam, astern of the transom's corner, and off the bow's shoulder, at a course of 37°
      const psi = 37 * Math.PI / 180, s = Math.sin(psi), c = Math.cos(psi), stake = (f, g) => [{k:'c', what:'merke', id:'s', x:far.x + f * s + g * c, z:far.z - f * c + g * s, r:0.3}];
      const hit = () => K.farbPose(far.x, far.z, psi, b, 0);
      // (the shoulder's edge runs from (0.33 L, 0.45 B) to (0.44 L, 0.27 B): its middle, and the normal out from it)
      const ex = 0.11 * L, eg = -0.18 * B, el = Math.hypot(ex, eg), nf = -eg / el, ng = ex / el, mf = 0.385 * L, mg = 0.36 * B;
      const res = [];
      for (const d of [0.05, -0.05]){ FARB.test = stake(0, B / 2 + 0.3 + d); res.push(!!hit()); FARB.test = stake(-L / 2 - 0.3 - d, B / 2 - 0.2); res.push(!!hit()); FARB.test = stake(mf + nf * (0.3 + d), mg + ng * (0.3 + d)); res.push(!!hit()); }
      t.eq(res.join(), 'false,false,false,true,true,true', name + ': en stake 5 cm klar går fri og 5 cm inn er en berøring (tvers, akter og ved baugen)');
    }
    FARB.test = [];

    // ---- 4. a pose ----
    const pose = (dx, dz, psi) => [far.x + dx, far.z + dz, psi];
    FARB.test = [{k:'c', what:'merke', id:'mid', x:far.x, z:far.z + 2, r:0.5}];
    let p = K.farbPose(...pose(0, 0, 0), boat, 0);
    t.ok(p && p.what === 'merke', 'en stake under skroget er en berøring', p);
    FARB.test = [{k:'c', what:'merke', id:'side', x:far.x + 1.5 + 0.5 + 0.4, z:far.z, r:0.5}];
    t.eq(K.farbPose(...pose(0, 0, 0), boat, 0), null, 'en stake 0,4 m klar av skutesida er ikke en berøring');
    FARB.test = [{k:'c', what:'merke', id:'side', x:far.x + 1.5 + 0.5 - 0.1, z:far.z, r:0.5}];
    t.ok(K.farbPose(...pose(0, 0, 0), boat, 0), 'en stake 0,1 m inn i skutesida er en berøring');
    FARB.test = [{k:'c', what:'merke', id:'bow', x:far.x, z:far.z - 5 - 0.5 - 0.3, r:0.5}];
    t.eq(K.farbPose(...pose(0, 0, 0), boat, 0), null, 'en stake 0,3 m forut for baugen er ikke en berøring (hun peker nord)');
    t.ok(K.farbPose(...pose(0, 0, Math.PI), boat, 0) === null && K.farbPose(...pose(0, -1, 0), boat, 0), 'snudd er den akterut og fortsatt klar; en meter fram er den under baugen');
    t.eq(K.farbPose(...pose(0, 0, 0), boat, 0, {m:1}).what, 'merke', 'med 1 m margin til siden er staken 0,3 m forut for nær');

    // ---- 5. the sweep ----
    FARB.test = [{k:'c', what:'merke', id:'stake', x:far.x + 0.8, z:far.z - 7.5, r:0.5}];
    const A = {X:far.x, Z:far.z, psi:0}, B2 = {X:far.x, Z:far.z - 15, psi:0};
    t.ok(K.farbPose(A.X, A.Z, 0, boat, 0) === null && K.farbPose(B2.X, B2.Z, 0, boat, 0) === null, 'staken mellom to stillinger berører ingen av dem');
    p = K.farbSweep(A, B2, boat, 0); t.ok(p && p.id === 'stake', 'sveipet mellom dem finner den', p && p.id);
    FARB.test = [{k:'c', what:'merke', id:'stake', x:far.x + 6, z:far.z - 7.5, r:0.5}];
    t.eq(K.farbSweep(A, B2, boat, 0), null, 'en stake 6 m til siden er ikke i sveipet');
    FARB.test = [{k:'c', what:'merke', id:'far', x:far.x, z:far.z - 560, r:0.5}]; FARB.n.pose = 0;
    p = K.farbSweep(A, {X:far.x, Z:far.z - 600, psi:0}, boat, 0);
    t.ok(p && p.id === 'far' && FARB.n.pose < 300, 'en stake 560 m ute på et sveip på 600 m blir funnet, og det åpne vannet hoppes over', [p && p.id, FARB.n.pose]);
    FARB.test = [{k:'c', what:'merke', id:'turn', x:far.x + 3.4, z:far.z - 3.4, r:0.4}];
    t.ok(K.farbPose(far.x, far.z, 0, boat, 0) === null && K.farbPose(far.x, far.z, Math.PI / 2, boat, 0) === null && K.farbSweep(A, {X:far.x, Z:far.z, psi:Math.PI / 2}, boat, 0), 'en stake baugen sveiper over i en sving på stedet, blir funnet');

    // ---- 6. the water under her: the chart's depth, the foreshore as the 3D view draws it, a dredged channel ----
    FARB.test = [];
    FARB.w = sea({depth:() => 2.0}); t.near(K.farbKeel(far.x, far.z, boat, 0), 0.5, 1e-9, 'kjølen: 2 m på kartet og 1,5 m dypgang gir 0,5 m');
    FARB.w = sea({depth:() => 2.0, tide:() => 1.2}); t.near(K.farbKeel(far.x, far.z, boat, 0), 1.7, 1e-9, 'og tidevannet over sjøkartnull kommer i tillegg');
    t.near(K.farbKeel(far.x, far.z, boat, 0, 0.4), 1.3, 1e-9, 'og squat trekkes fra');
    FARB.w = sea({depth:() => 1.0}); t.ok(K.farbPose(far.x, far.z, 0, boat, 0).what === 'grunn', 'vann grunnere enn dypgangen er en berøring med bunnen');
    // a shoal 6 m wide under the side of a 75 m hull amidships: her outline's corners alone (the first cut of the map, which the check
    // against the bench's observer caught: 52 m of each side was not asked) do not see it; the lattice over her waterline does
    const big = {L:75, B:15.5, T:7.5, air:22}, shoal = (x, z) => (Math.abs(z - far.z - 10) < 3 && x > far.x + 6 ? 1 : 50);
    FARB.w = sea({depth:shoal});
    const corners = BKO.hull(far.x, far.z, 0, big.L, big.B).concat([[far.x, far.z], [far.x, far.z - 0.42 * big.L], [far.x, far.z + 0.45 * big.L]]);
    t.ok(corners.every(([x, z]) => shoal(x, z) === 50), 'grunna under siden på et 75 m skrog ligger mellom hjørnene av omrisset');
    p = K.farbPose(far.x, far.z, 0, big, 0); t.ok(p && p.what === 'grunn', 'og kartet finner den likevel: vannet spørres i et rutenett på 4 m under hele skroget', p && p.what);
    t.eq(K.farbPose(far.x - 2, far.z, 0, big, 0), null, '2 m til side for grunna går hun klar');
    p = K.farbSweep({X:far.x, Z:far.z - 200, psi:0}, {X:far.x, Z:far.z - 30, psi:0}, big, 0); t.ok(p && p.what === 'grunn', 'og et sveip over åpent vann finner grunna på veien', p && p.what);
    // the foreshore: the ground stands 2 m over mean sea level on the coast line and falls 1 in 3 seaward (1 in 1.5 by a breakwater),
    // so with the sea at mean level (chart datum zc under it, the tide at zc) the water is d / 3 - 2 deep d metres out
    const shore = (zc, tide, moleK) => sea({rawDepth:() => 30, zc:() => zc, tide:() => tide, coast:(x, z) => [Math.abs(x - far.x), moleK || 0], depth:null});
    FARB.w = shore(0, 0);
    t.near(K.farbDepth(far.x + 9, far.z), 1, 1e-9, 'fjæra: 9 m ut fra kystlinja er det 1 m vann ved middelvann (9 / 3 − 2)');
    t.near(K.farbDepth(far.x + 3, far.z), -1, 1e-9, 'og 3 m ut står bakken 1 m over vannet');
    t.near(K.farbDepth(far.x + 30, far.z), 30, 1e-9, 'utenfor fjæra (13,5 m) gjelder kartets dybde');
    FARB.w = shore(1.5, 0); t.near(K.farbDepth(far.x + 9, far.z), -0.5, 1e-9, 'sjøkartnull 1,5 m under middelvann: samme sted er 0,5 m over vannet ved laveste lavvann');
    FARB.w = shore(0, 0, 1); t.near(K.farbDepth(far.x + 3, far.z), 0, 1e-9, 'ved en molo faller bakken 1 på 1,5: 3 m ut er den i vannskorpa');
    FARB.w = shore(0, 0);
    p = K.farbPose(far.x + 8.5, far.z, 0, {L:6, B:2, T:0.6, air:3}, 0);
    t.ok(p && p.what === 'grunn', 'en båt som stikker 0,6 m, berører fjæra når skutesida er 7,5 m fra kystlinja (0,5 m vann; 0,6 m er det først 7,8 m ut)', p && p.what);
    t.eq(K.farbPose(far.x + 12, far.z, 0, {L:6, B:2, T:0.6, air:3}, 0), null, 'og går klar 12 m ut (skutesida 11 m ut: 1,67 m vann)');
    K.farbDig('test', [{ax:far.x + 2, az:far.z - 50, bx:far.x + 2, bz:far.z + 50, r:6, d:4}]);
    t.near(K.farbDepth(far.x + 3, far.z), 4, 1e-9, 'en mudret renne (valg 5) gir sin dybde der fjæra ellers står');
    t.near(K.farbDepth(far.x + 9, far.z), 1, 1e-9, 'og ingenting utenfor renna (7 m fra midten)');
    K.farbDig('test', null); t.near(K.farbDepth(far.x + 3, far.z), -1, 1e-9, 'renna tatt bort: fjæra igjen');

    // ---- 7. not known is never free ----
    FARB.w = sea({coast:() => null});
    t.ok(Number.isNaN(K.farbClear(far.x, far.z, boat, 60)), 'der kysten ikke er lastet, er klaringen ukjent (NaN)');
    p = K.farbPose(far.x, far.z, 0, boat, 0); t.ok(p && p.what === 'ukjent', 'og en stilling der er ikke fri: «ukjent»', p);
    FARB.w = sea({known:() => false}); t.ok(Number.isNaN(K.farbClear(far.x, far.z, boat, 60)), 'det samme der kystens anlegg ikke er pakket ut');
    FARB.w = sea({land:(x, z) => (x > far.x + 4 ? 1 : 0), coast:(x, z) => [Math.abs(x - far.x - 4), 0]});
    t.eq(K.farbClear(far.x + 5, far.z, boat, 60), 0, 'på land er klaringen 0'); t.near(K.farbClear(far.x, far.z, boat, 60), 4, 1e-9, 'og i sjøen avstanden til kystlinja');
    p = K.farbPose(far.x + 2.6, far.z, 0, boat, 0); t.ok(p && p.what === 'land', 'skutesida 0,1 m inn i land er en berøring med land', p);

    // ---- 7b. a harbour's pocket: the coast's line inside it is not land, the line outside it is ----
    const pock = (dx, dz, l, w) => ({x:far.x + dx, z:far.z + dz, ux:1, uz:0, nx:0, nz:1, l, w});
    const seg = (PK, x, z, ax, az, bx, bz) => Math.sqrt(K.farbSegOutD2(PK, far.x + x, far.z + z, far.x + ax, far.z + az, far.x + bx, far.z + bz));
    t.near(seg([], 0, 5, -20, 0, 20, 0), 5, 1e-9, 'uten lomme: avstanden til kystkanten');
    t.near(seg([pock(0, 0, 10, 10)], 0, 5, -20, 0, 20, 0), Math.hypot(10, 5), 1e-2, 'kanten går gjennom ei lomme på 20 m: nærmeste land er der kanten kommer ut av lomma (10 m til siden)');
    t.near(seg([pock(0, 0, 10, 10)], 14, 5, -20, 0, 20, 0), 5, 1e-9, 'utenfor lomma er kanten som før');
    t.eq(seg([pock(0, 0, 30, 10)], 0, 5, -20, 0, 20, 0), Infinity, 'en kant som ligger helt i lomma, er ikke land');
    t.near(seg([pock(-6, 0, 10, 10), pock(12, 0, 10, 10)], 0, 5, -40, 0, 40, 0), Math.hypot(16, 5), 1e-2, 'to lommer som overlapper: ut av den ene er ikke ut av den andre (−16 m er nærmest)');
    t.near(seg([pock(0, 0, 10, 10)], 5, 0, 0, -30, 0, 30), Math.hypot(5, 10), 1e-2, 'en kant på tvers av lomma, sett fra siden: enden av stykket som er tatt bort');

    // ---- 8. Senja's own things, as the game has them: a bridge's piers and deck, a sea mark ----
    FARB.w = sea(); FARB.test = null;
    const br = K.get('BRIDGES').find(q => q[2] === 'Gisundbrua'), ob = K.obsBridge(br), pier = ob.piers[Math.floor(ob.piers.length / 2)];
    n = K.farbNearest(pier.x, pier.z, 30, boat);
    t.ok(n && n.what === 'brupilar' && n.d === 0, 'Gisundbrua: en pilar er en ting i kartet, der brua har den', n && [n.what, n.d]);
    const top = ob.deck.reduce((a, d) => (d.under > a.under ? d : a)), mx = (top.ax + top.bx) / 2, mz = (top.az + top.bz) / 2;
    t.ok(top.under > 30, 'Gisundbrua: høyeste underkant er over 30 m i spillets modell', top.under);
    n = K.farbNearest(mx, mz, 5, {L:75, B:15.5, T:7.5, air:25}); t.ok(!n || n.what !== 'brudekke', 'en båt på 25 m går under midten av Gisundbrua', n && n.what);
    n = K.farbNearest(mx, mz, 5, {L:75, B:15.5, T:7.5, air:45}); t.ok(n && n.what === 'brudekke' && n.d === 0, 'en på 45 m gjør det ikke', n && [n.what, n.d]);
    // (a mark well away from every bridge: one hung on a bridge is not a thing in the sea)
    const decks = K.get('BRIDGES').flatMap(q => K.obsBridge(q).deck);
    const mk = K.get('SEAMARKS').marks.find(q => K.get('obsMarkR')[q[2]] && decks.every(d => K.farbSegD(q[0] * 1000, q[1] * 1000, d.ax, d.az, d.bx, d.bz) > 200));
    n = K.farbNearest(mk[0] * 1000 + 6, mk[1] * 1000, 30, boat);
    t.ok(n && n.what === 'merke' && Math.abs(n.d - (6 - K.get('obsMarkR')[mk[2]])) < 1e-6, 'et sjømerke på Senja er en sirkel med merkets radius', n && [n.what, n.d]);
    t.eq(K.farbBoat('skiff').B, K.get('VESSELS').skiff.beam, 'farbBoat leser båttypen'); t.ok(K.farbBoat('pelagisk').air > 0, 'og båtens høyde');
    for (const k of Object.keys(K.get('VESSELS'))) t.ok(K.get('VESSELS')[k].air > 0, 'VESSELS.' + k + ' har høyden over vannlinja (air)', K.get('VESSELS')[k].air);
  } finally { FARB.w = null; FARB.test = null; K.farbDig('test', null); }
}
