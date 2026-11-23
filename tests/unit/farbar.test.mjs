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

    // a bridge's sailing height is from the highest tide, not from mean sea level (the deck is drawn from mean sea level, and the water
    // comes up under it): where the tide's parts sum to 1.2 m, a deck 5.9 m over mean sea level leaves 4.7 m
    FARB.w = sea({hat:() => 1.2}); FARB.test = [Object.assign({what:'brudekke', id:'d2'}, deck, {uh:undefined})];
    t.eq(K.farbClear(far.x, far.z, {L:10, B:3, T:1.5, air:4}, 60), 0, 'med 1,2 m flo over middelvann stenger brua på 5,9 m for en båt på 4 m (4 + 1 m er over 4,7 m)');
    t.eq(K.farbClear(far.x, far.z, {L:10, B:3, T:1.5, air:3.6}, 60), 60, 'og slipper en på 3,6 m under');
    FARB.w = sea(); FARB.test = [];
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
    // a bar 4 m wide across the way of a boat shorter than a jump over open water (the independent control, 23.11.2026: the sweep went
    // 12.5 m at a time and asked the water only under her where she stood, so a 7.9 m boat stepped over it), ahead and sideways
    const sn = {L:7.9, B:2.7, T:1.2, air:3.9}; FARB.w = sea({depth:(x, z) => (Math.abs(z - far.z + 106) < 2 ? 0.5 : 50)});
    p = K.farbSweep({X:far.x, Z:far.z, psi:0}, {X:far.x, Z:far.z - 200, psi:0}, sn, 0); t.ok(p && p.what === 'grunn', 'et sveip over åpent vann med en båt på 7,9 m finner ei grunne på 4 m tvers over veien', p && p.what);
    p = K.farbSweep({X:far.x, Z:far.z, psi:Math.PI / 2}, {X:far.x, Z:far.z - 200, psi:Math.PI / 2}, sn, 0); t.ok(p && p.what === 'grunn', 'også når hun går sidelengs (2,7 m bred) over den', p && p.what);
    p = K.farbSweep({X:far.x + 300, Z:far.z, psi:0}, {X:far.x + 300, Z:far.z - 90, psi:0}, sn, 0); t.eq(p, null, 'og et sveip som stopper 10 m før grunna (6 m foran baugen), går fritt');
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

    // ---- 9. the field of a tile, as the worker works it out from plain numbers: an island, a mark, a breakwater, a deck ----
    // (a tile of 60 x 60 cells of 2 m; the coast is one cell of the coast's index with a square island from 20 to 40 m each way)
    const sq = [[20, 20], [40, 20], [40, 40], [20, 40]], ed = [], eo = [];
    for (let i = 0; i < 4; i++){ const a = sq[i], b = sq[(i + 1) % 4]; ed.push(a[0], a[1], b[0], b[1]); eo.push(a[0], a[1], b[0], b[1], 0); }
    const lat = new Float32Array(7 * 7).fill(30); lat[1 * 7 + 1] = -1;   // (the lattice point at 20, 20 is on the island)
    const job = o => Object.assign({N:60, cell:2, cap:60, q:0.25, deck:8, shore:FARB.shore, zc:0, co:{CC:1000, n:1, m:1, cx0:-10, cz0:-10, wl:new Int8Array(1), wb:new Int8Array(1), cs:Int32Array.from([0, 4]), ce:Int32Array.from([0, 1, 2, 3]), ed:Float32Array.from(ed), K:new Uint8Array(4)},
      eo:Float32Array.from(eo), ec:null, pk:new Float32Array(0), th:new Float32Array(0), dep:{n:7, step:20, v:lat}, dug:new Float32Array(0)}, o || {});
    const at2 = (r, x, z) => { const k = Math.floor(z / 2) * 60 + Math.floor(x / 2); return [r.d[k] * 0.25, r.z[k], r.u[k]]; };
    let fr = K.farbFieldBuild(job());
    t.eq(at2(fr, 31, 31).slice(0, 2).join(), '0,0', 'feltet: på øya er avstanden 0 og det er tørt');
    t.eq(at2(fr, 51, 31)[0], 11, 'feltet: 11 m ut fra øya er avstanden 11 m (fra midten av ruta)');
    t.eq(at2(fr, 51, 31)[1], 10, 'feltet: vannet der er fjæras, det grunneste blant naborutene (9 m ut: 9 / 3 − 2 = 1,0 m)');
    t.eq(at2(fr, 81, 31)[1], 254, 'feltet: utenfor fjæra er det kartets dybde (30 m: 25,4 m eller mer)');
    t.eq(at2(fr, 81, 31)[2], 255, 'feltet: ingen bru');
    t.eq(at2(fr, 45, 45)[0], Math.floor(Math.hypot(5, 5) / 0.25) * 0.25, 'feltet: ved hjørnet er avstanden til hjørnet, rundet ned til 0,25 m');
    fr = K.farbFieldBuild(job({th:Float32Array.from([1, 91, 91, 2,   3, 4.5, 2, 60, 111, 110, 111,   6, 0, 71, 120, 71, 4, 5.9,   2, 21, 91, 6, 2, 1, 0,   4, 3, 80, 10, 100, 10, 80, 30,   5, 101, 51, 6, 3, 0])}));
    t.eq(at2(fr, 101, 91)[0], 8, 'feltet: et merke med 2 m radius 10 m unna gir 8 m');
    t.eq(at2(fr, 81, 105)[0], 1.5, 'feltet: en molo som linje med 9 m bredde: 6 m fra midten er 1,5 m fra siden');
    t.eq(at2(fr, 81, 111)[0], 0, 'feltet: og 0 på den');
    t.eq(at2(fr, 51, 73)[2], Math.floor(5.9 / 0.25), 'feltet: under et brudekke står underkanten (5,9 m, i trinn på 0,25 m)');
    t.eq(at2(fr, 51, 85)[2], 255, 'feltet: 14 m fra midten av et dekke på 8 m (10 m fra kanten) er det ingen bru');
    t.eq(at2(fr, 51, 73)[0] > 0, true, 'feltet: et brudekke er ikke en ting i avstanden (det stenger etter båtens høyde)');
    t.eq(at2(fr, 21, 91)[0] + '|' + at2(fr, 31, 91)[0], '0|4', 'feltet: en boks (ei brygge) er 0 på og 4 m fra enden');
    t.eq(at2(fr, 87, 15)[0] + '|' + at2(fr, 71, 15)[0], '0|9', 'feltet: et omriss (ei bryggeflate) er 0 inni og 9 m fra kanten');
    t.eq(at2(fr, 101, 51)[0], 0, 'feltet: et skjær er 0 på foten');
    // against the geometry's own answer, at every cell's middle: the field is never farther off, and at most a step nearer
    FARB.w = sea(); FARB.test = [{k:'c', x:far.x + 91, z:far.z + 91, r:2}, {k:'l', P:[at(60, 111), at(110, 111)], r:4.5}, {k:'b', x:far.x + 21, z:far.z + 91, l:6, w:2, ux:1, uz:0}, {k:'p', P:[at(80, 10), at(100, 10), at(80, 30)]}, {k:'e', x:far.x + 101, z:far.z + 51, a:6, b:3, th:0}].map((o, i) => Object.assign(o, {what:'ting', id:'t' + i}));
    fr = K.farbFieldBuild(job({co:null, eo:new Float32Array(0), th:Float32Array.from([1, 91, 91, 2,   3, 4.5, 2, 60, 111, 110, 111,   2, 21, 91, 6, 2, 1, 0,   4, 3, 80, 10, 100, 10, 80, 30,   5, 101, 51, 6, 3, 0])}));
    let over = 0, under = 0; for (let j = 0; j < 60; j++) for (let i = 0; i < 60; i++){ const g = K.farbClear(far.x + i * 2 + 1, far.z + j * 2 + 1, null, 60), f = fr.d[j * 60 + i] * 0.25; if (f > g + 1e-6) over++; if (g - f > 0.25 + 1e-6) under++; }
    t.eq(over + '|' + under, '0|0', 'feltet mot geometrien i 3 600 ruter: aldri lenger unna, og høyst ett trinn (0,25 m) nærmere');
    // a harbour's pocket: the island's part in it is water, and the line there is no land
    const pkA = Float32Array.from([30, 30, 1, 0, 0, 1, 12, 4]), ec = []; for (let k = 0; k < eo.length; k += 5) for (const [a, c] of K.farbSegOutParts([{x:30, z:30, ux:1, uz:0, nx:0, nz:1, l:12, w:4}], eo[k], eo[k + 1], eo[k + 2], eo[k + 3])) if (c - a > 1e-9) ec.push(eo[k] + (eo[k + 2] - eo[k]) * a, eo[k + 1] + (eo[k + 3] - eo[k + 1]) * a, eo[k] + (eo[k + 2] - eo[k]) * c, eo[k + 1] + (eo[k + 3] - eo[k + 1]) * c, 0);
    fr = K.farbFieldBuild(job({pk:pkA, ec:Float32Array.from(ec)}));
    t.eq(at2(fr, 31, 31)[0] > 0 && at2(fr, 31, 31)[1] > 0, true, 'feltet: i ei lomme over øya er det vann, og avstanden er til landet utenfor lomma', at2(fr, 31, 31));
    t.eq(at2(fr, 31, 23)[0], 0, 'feltet: øya utenfor lomma er fortsatt land');
    t.eq(at2(fr, 45, 31)[0], Math.floor(Math.hypot(5, 3) / 0.25) * 0.25, 'feltet: der kystkanten går gjennom lomma, er nærmeste land der den kommer ut (3 m til siden)');
    // a dredged channel, and a lattice that is not known
    fr = K.farbFieldBuild(job({dug:Float32Array.from([44, 0, 44, 120, 5, 4])}));
    t.eq(at2(fr, 43, 31)[1], 40, 'feltet: en mudret renne gir sin dybde i fjæra (4 m, der alle naborutene ligger i renna)');
    const unk = lat.slice(); unk[3 * 7 + 4] = NaN; fr = K.farbFieldBuild(job({dep:{n:7, step:20, v:unk}}));
    t.eq(at2(fr, 71, 51)[1] + '|' + at2(fr, 111, 111)[1], '255|254', 'feltet: der kartets dybde ikke er kjent, er vannet ukjent (255), ikke dypt');

    // ---- 10. the field's depth worked out from the chart's own cells, as the game does it (depthWater, unitDredge, siteDredge, depthNav) ----
    // (cells of 50 m, six by six round a tile of 120 m: the cell i, j has its middle at -75 + 50 i, -75 + 50 j)
    const cells = f => { const v = new Float32Array(36); for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) v[j * 6 + i] = f(i, j); return v; };
    const drj = (v, o) => job({co:null, eo:new Float32Array(0), dep:null, dr:Object.assign({W:6, Hh:6, c:50, lx0:-100, lz0:-100, k:1, v, un:new Float32Array(0), st:new Float32Array(0), hb:new Float32Array(0), site:{a:12, w:14, slope:0.5, max:16, want:2.1}, harb:4.35}, o || {})});
    const zAt = (r, x, z) => r.z[Math.floor(z / 2) * 60 + Math.floor(x / 2)] / 10;
    fr = K.farbFieldBuild(drj(cells((i, j) => 4 + i)));   // (4 m at x = -75, a metre more every 50 m east)
    t.near(zAt(fr, 51, 51), 4 + (49 + 75) / 50, 0.11, 'feltets dybde fra kartets celler: lineært mellom cellene (det grunneste blant naborutene, i dm)');
    fr = K.farbFieldBuild(drj(cells((i, j) => (i === 2 && j === 2 ? 0 : 6))));
    t.eq(zAt(fr, 25, 25), 6, 'en celle som er land i kartets raster, tar ikke vannet ned: vannet er cellene rundt som er vann');
    fr = K.farbFieldBuild(drj(cells(() => 0)));
    t.eq(zAt(fr, 61, 61), 2, 'ingen vanncelle rundt (et sund masken har stengt): 2 m, som spillet');
    fr = K.farbFieldBuild(drj(cells(() => 0.3))); t.eq(zAt(fr, 61, 61), 0.8, 'vann er minst 0,8 m');
    // a harbour unit at 60, 60, its face along x and the sea toward +z: the block is dry, the basin 6.6 m, rising 0.5 a metre outside
    const un = Float32Array.from([60, 60, 1, 0, 0, 1, 20, 10, 25, 20, 6.6, 100, 0]);
    fr = K.farbFieldBuild(drj(cells(() => 2), {un}));
    t.eq(zAt(fr, 61, 55) + '|' + zAt(fr, 61, 71), '0|6.6', 'havneenheten: blokka er tørr, bassenget er mudret til 6,6 m');
    t.near(zAt(fr, 61, 87), 6.6 - 0.5 * 9, 0.11, 'og utenfor bassenget stiger bunnen 0,5 per meter (8 m ut, naboruta 9 m ut)');
    // a naust's berth at 30, 100, the face along x, the sea toward +z; and a harbour's circle
    fr = K.farbFieldBuild(drj(cells(() => 1), {st:Float32Array.from([30, 100, 1, 0, 0])}));
    t.eq(zAt(fr, 31, 107) + '|' + zAt(fr, 31, 93), '2.1|1', 'kaiplassen foran et naust er mudret til dypgangen pluss 0,5 m, og ikke bak fronten');
    fr = K.farbFieldBuild(drj(cells(() => 2), {hb:Float32Array.from([0, 0, 40])}));
    t.eq(zAt(fr, 11, 11) + '|' + zAt(fr, 81, 81), '4.3|2', 'i en havn er vannet havnas egen dybde (4,35 m, rundet ned), utenfor er det kartets');

    // ---- 11. a breakwater as the 3D view builds it: 8 m out from its line at mean sea level, falling 1 in 1.4 to 6 m under it ----
    const mol = () => ({k:'l', P:[at(-50, 0), at(50, 0)], r:5.9, what:'molo', id:'mo', molo:1, base:8, reach:8 - 5.9 + 8.4}), sk = {L:5.9, B:2.45, T:0.6, air:2}, k21 = {L:21, B:7.2, T:3.4, air:10}, pel = {L:75, B:15.5, T:7.5, air:22}, E = Math.PI / 2;
    const side = (b, d, w) => { FARB.w = sea(w); FARB.test = [mol()]; const q = K.farbPose(far.x, far.z + d + b.B / 2, E, b, 0); return q ? q.what : null; };   // (she lies along it, her side d m from its line)
    t.eq(side(sk, 9.2) + '|' + side(sk, 8.6), 'null|molo', 'molo: en båt som stikker 0,6 m, går klar med siden 9,2 m fra linja og berører 8,6 m fra (steinen står 8,9 m ut i hennes kjøldybde)');
    t.eq(side(k21, 13.1) + '|' + side(k21, 12.5), 'null|molo', 'molo: en som stikker 3,4 m, må 12,8 m ut');
    t.eq(side(pel, 16.7) + '|' + side(pel, 16.1), 'null|molo', 'molo: foten ligger 6 m dypt, så ingen må lenger ut enn 16,4 m');
    t.eq(side(sk, 7.6, {tide:() => 1.2}) + '|' + side(sk, 7.0, {tide:() => 1.2}), 'null|molo', 'molo: med 1,2 m flo over middelvann flyter småbåten 7,6 m fra linja (steinen 7,2 m ut der)');
    FARB.w = sea({zc:() => 1.5}); FARB.test = [mol()];
    t.near(K.farbClear(far.x, far.z + 20, sk, 60), 20 - (8 + 1.4 * (0.6 + 0.03 + 1.5)), 1e-9, 'molo: avstanden for en båt er til steinen i hennes kjøldybde ved laveste vann (sjøkartnull 1,5 m under middelvann)');
    t.near(K.farbClear(far.x, far.z + 20, null, 60), 20 - 5.9, 1e-9, 'molo: uten båt er det til det som står tørt ved høyeste flo');
    const ring = () => ({k:'p', P:[at(-10, -10), at(10, -10), at(10, 10), at(-10, 10)], what:'molo', id:'mr', molo:1, base:0, reach:8.4});
    FARB.w = sea(); FARB.test = [ring()]; t.eq((K.farbPose(far.x, far.z + 10 + 1.2 + sk.B / 2, E, sk, 0) || {}).what + '|' + (K.farbPose(far.x, far.z + 10 + 0.6 + sk.B / 2, E, sk, 0) || {}).what, 'undefined|molo', 'molo som flate: skråningen står 0,9 m utenfor omrisset i småbåtens kjøldybde');
    // and in the field: what nobody passes is the part dry at the highest tide; the slope is depth
    fr = K.farbFieldBuild(job({co:null, eo:new Float32Array(0), molo:FARB.molo, th:Float32Array.from([7, 8, 5.9, 2, -20, 61, 140, 61])}));
    t.eq(at2(fr, 51, 71)[0] + '|' + at2(fr, 51, 65)[0], '4|0', 'feltet: en molo er stengt for alle 5,9 m ut fra linja (10 m ut er avstanden 4,1 m, rundet ned)');
    t.eq(at2(fr, 51, 77)[1] + '|' + at2(fr, 51, 71)[1] + '|' + at2(fr, 51, 91)[1], Math.floor((14 - 8) / 1.4 * 10) + '|0|254', 'feltet: skråningen er dybde (16 m ut: naboruta 14 m ut har 4,2 m; 10 m ut er naboruta på 8 m i vannskorpa; 30 m ut er det kartets)');

    // ---- 12. a marina's small boats: every berth there can be a boat in ----
    const sqm = [-30, -20, 30, -20, 30, 20, -30, 20];   // (60 by 40 m round 0, 0)
    let mar = K.farbMarina(far.x, far.z, sqm, [{w:2.4, p:[at(-20, 0), at(0, 0), at(2, 0)]}], () => true);
    t.eq(mar.length + '|' + mar[0].k + '|' + mar[0].r, '1|l|' + (1.2 + 9.6), 'marina: et stykke flytebrygge på 20 m har båter på begge sider: 10,8 m fra linja (stykket på 2 m har ingen plass)');
    mar = K.farbMarina(far.x, far.z, sqm, [], (x, z) => x < far.x + 10);
    t.ok(mar.length === 12 && mar.every(o => o.k === 'c' && o.r === 7 && o.x < far.x + 10), 'marina uten flytebrygger: bøyer i rekker (10 m mellom, 14 m mellom rekkene) der en båt kan ligge', mar.length);
    t.eq(K.farbMarina(far.x, far.z, sqm, [{w:2, p:[at(0, 0), at(3, 0)]}], () => false).length, 0, 'marina: ingen bøyer der det ikke er vann eller veien til en kai går');
    FARB.w = sea(); FARB.test = K.farbMarina(far.x, far.z, sqm, [{w:2.4, p:[at(-20, 0), at(0, 0)]}], () => true);
    t.ok(K.farbPose(far.x - 10, far.z + 10.8 + 0.3 + sk.B / 2, E, sk, 0) === null && K.farbPose(far.x - 10, far.z + 10.8 - 0.3 + sk.B / 2, E, sk, 0), 'marina: en båt går klar utenfor sonen og berører inne i den');
  } finally { FARB.w = null; FARB.test = null; K.farbDig('test', null); }
}
