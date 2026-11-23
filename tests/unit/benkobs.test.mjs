// The bench's observer (tools/autonav/benkobs.js; Autonav 2.0 F0, steg 140, docs/planer/autonav-2-0.md): the whole hull outline, swept
// from one pose to the next, against the things in the water. The hunt's observer (tools/autonav/jakt.py JK.watch) tests 13 points on
// the outline at each pose only; `v1` below is that rule, and the checks marked «dagens observatør» show what it steps over.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BKO = new Function(readFileSync(join(HERE, '..', '..', 'tools', 'autonav', 'benkobs.js'), 'utf8') + '\nreturn globalThis.BKO;')();

// the hunt's 13 points (jakt.py HULL_PTS) against a circle, at one pose
const V1_PTS = [[0.5, 0]].concat([-0.5, -0.3, -0.1, 0.1, 0.3, 0.45].flatMap(f => [[f, 0.5], [f, -0.5]]));
const v1 = (pose, boat, o) => BKO.at(pose.X, pose.Z, pose.psi, boat.L, boat.B, V1_PTS).some(([x, z]) => Math.hypot(x - o.x, z - o.z) < o.r);
// a world of things only (no land, no keel), with free() worked out from the same things
const worldOf = (things, extra) => Object.assign({things:() => things, free:(x, z, R) => Math.max(0, Math.min(...things.map(o => BKO.boxDist(o, x, z)), 1e9) - R)}, extra || {});
const sail = (poses, boat, world) => { const st = {}, hits = []; for (const p of poses) for (const h of BKO.step(st, p, boat, world)) hits.push(h); return {hits, st}; };

export default function (t){
  const boat = {L:10, B:3}, N = psi => ({X:0, Z:0, psi});
  // she heads north (psi 0: forward is -z), 15 m a step: 20 knots and a step of the boat model of 1.5 game seconds
  const p0 = {X:0, Z:0, psi:0}, p1 = {X:0, Z:-15, psi:0};

  // 1. a stake (r 0.5 m) on her line between the two poses: ahead of the bow at the first, astern at the second
  const stake = {k:'c', what:'merke', id:'stake', x:0.8, z:-7.5, r:0.5};
  t.ok(!v1(p0, boat, stake) && !v1(p1, boat, stake), 'dagens observatør: en stake mellom to steg (15 m) ses ikke i noen av de to stillingene');
  let r = sail([p0, p1], boat, worldOf([stake]));
  t.ok(r.hits.some(h => h.id === 'stake'), 'benken: staken mellom de to stegene blir funnet når skroget sveipes', r.hits.length);

  // 2. a stake inside the hull at a pose, between the outline's points (on her centre line amidships)
  const mid = {k:'c', what:'merke', id:'mid', x:0, z:0, r:0.5};
  t.ok(!v1(p0, boat, mid), 'dagens observatør: en stake midt under skroget ligger mellom de 13 punktene');
  r = sail([p0], boat, worldOf([mid]));
  t.ok(r.hits.some(h => h.id === 'mid'), 'benken: hele skrogomrisset ser staken midt under skroget');

  // 3. beside her: half the beam is 1.5 m; a stake of 0.5 m at 2.2 m is clear (0.2 m of water), at 1.9 m she touches it
  r = sail([p0, p1], boat, worldOf([{k:'c', what:'merke', id:'s', x:2.2, z:-7.5, r:0.5}]));
  t.eq(r.hits.length, 0, 'benken: en stake 0,2 m klar av skutesida er ikke et treff');
  r = sail([p0, p1], boat, worldOf([{k:'c', what:'merke', id:'s', x:1.9, z:-7.5, r:0.5}]));
  t.ok(r.hits.length > 0, 'benken: en stake 0,1 m inn i skutesida er et treff');
  r = sail([p0, p1], boat, worldOf([{k:'c', what:'merke', id:'s', x:5, z:-7.5, r:0.5}]));
  t.eq(r.hits.length, 0, 'benken: en stake 3 m til siden er ikke et treff');

  // 4. a rock: the foot at her keel's depth as an ellipse (3 x 1.5 m, turned 30 degrees), passed between two steps
  const rock = {k:'e', what:'skjær', id:'rock', x:0.5, z:-7, a:3, b:1.5, th:Math.PI / 6};
  r = sail([p0, p1], boat, worldOf([rock]));
  t.ok(r.hits.some(h => h.what === 'skjær'), 'benken: et skjær under kjølen mellom to steg blir funnet (dagens observatør prøver ikke skjær mot skroget)');
  r = sail([p0, p1], boat, worldOf([Object.assign({}, rock, {x:6})]));
  t.eq(r.hits.length, 0, 'benken: skjæret 6 m til siden er ikke et treff');

  // 5. she turns on the spot a quarter round: the bow sweeps over a stake that neither the first nor the last pose touches
  const corner = {k:'c', what:'merke', id:'corner', x:3.4, z:-3.4, r:0.4};
  t.ok(!v1(N(0), boat, corner) && !v1(N(Math.PI / 2), boat, corner), 'dagens observatør: en stake baugen sveiper over i en sving, ses ikke før eller etter svingen');
  r = sail([N(0), N(Math.PI / 2)], boat, worldOf([corner]));
  t.ok(r.hits.some(h => h.id === 'corner'), 'benken: staken baugen sveiper over i svingen, blir funnet');

  // 6. a box (a pier, 20 x 2 m across her way) and an open line with a width (a breakwater 9 m wide), both between the steps
  r = sail([p0, p1], boat, worldOf([{k:'b', what:'brygge', id:'pier', x:0, z:-7.5, l:10, w:1, ux:1, uz:0}]));
  t.ok(r.hits.some(h => h.id === 'pier'), 'benken: en brygge på tvers mellom to steg blir funnet');
  r = sail([p0, p1], boat, worldOf([{k:'l', what:'molo', id:'molo', P:[[-30, -7.5], [30, -7.5]], r:4.5}]));
  t.ok(r.hits.some(h => h.id === 'molo'), 'benken: en molo kartlagt som linje blir funnet');
  r = sail([p0, p1], boat, worldOf([{k:'s', what:'brudekke', id:'deck', ax:-20, az:-40, bx:20, bz:-40, r:4}]));
  t.eq(r.hits.length, 0, 'benken: et brudekke 20 m forut for siste stilling er ikke et treff');

  // 7. land: a strip a metre wide across her way, thinner than the gaps between the outline's corners at any one pose
  const strip = {land:(x, z) => (z < -7 && z > -8 ? 1 : 0), landSeg:(ax, az, bx, bz) => (az + 7.5) * (bz + 7.5) < 0};
  r = sail([p0, p1], boat, strip);
  t.ok(r.hits.some(h => h.what === 'land'), 'benken: en landstripe på 1 m mellom to steg blir funnet');
  r = sail([p0, p1], boat, {land:(x, z) => (x > 2 ? 1 : 0)});
  t.eq(r.hits.length, 0, 'benken: land 0,5 m utenfor skutesida er ikke et treff');
  r = sail([p0, p1], boat, {land:(x, z) => (x > 1.4 ? 2 : 0)});
  t.ok(r.hits.some(h => h.what === 'kai'), 'benken: en havneenhets kai 0,1 m inn i skutesida er et treff, og heter kai');

  // 8. the keel: a shoal of 20 m she passes over on a long step is found; the foreshore is asked only where there is no land
  r = sail([p0, {X:0, Z:-100, psi:0}], boat, {keel:(x, z) => (z < -40 && z > -60 ? -0.3 : 2)});
  t.ok(r.hits.some(h => h.what === 'grunn' && h.keel < 0), 'benken: en grunne på 20 m under et steg på 100 m blir funnet');
  r = sail([p0, p1], boat, {land:() => 0, beach:(x, z) => x > 1.2});
  t.ok(r.hits.some(h => h.what === 'fjære'), 'benken: skroget over den tegnede fjæra blir funnet');

  // 9. open water is passed without a test, and a thing beyond it is still found
  const far = {k:'c', what:'merke', id:'far', x:0, z:-560, r:0.5}, W = worldOf([far]);
  r = sail([p0, {X:0, Z:-600, psi:0}], boat, W);
  t.ok(r.hits.some(h => h.id === 'far'), 'benken: en stake 560 m ute på et steg på 600 m (et minuttsteg) blir funnet');
  t.ok(r.st.skip > 400 && r.st.n < 250, 'benken: det åpne vannet fram til staken hoppes over uten prøve', [Math.round(r.st.skip), r.st.n]);
  r = sail([p0, {X:0, Z:-600, psi:0}], boat, worldOf([Object.assign({}, far, {x:8})]));
  t.eq(r.hits.length, 0, 'benken: staken 8 m til siden på minuttsteget er ikke et treff');

  // 10. a new trip, and a corner taken afresh (st.last = null): the turn itself is not swept for a boat that has no heading there
  const st = {}; BKO.step(st, p0, boat, worldOf([corner])); st.last = null;
  t.eq(BKO.step(st, N(Math.PI / 2), boat, worldOf([corner])).length, 0, 'benken: en ny stilling uten forrige (et hjørne i minuttsteget) sveiper ikke svingen');

  // the outline itself: convex, as long and as wide as she is
  const H = BKO.hull(0, 0, 0, 10, 3), xs = H.map(p => p[0]), zs = H.map(p => p[1]);
  t.near(Math.max(...xs) - Math.min(...xs), 3, 1e-9, 'skrogomrisset er så bredt som båten');
  t.near(Math.max(...zs) - Math.min(...zs), 10, 1e-9, 'og så langt');
  t.ok(H.every(([x, z]) => BKO.inConvex(H, x * 0.99, z * 0.99)), 'og konvekst');
}
