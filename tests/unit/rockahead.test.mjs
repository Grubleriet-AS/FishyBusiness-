// A rock ahead or not (steg 126, 15.11.2026, Tussøy utstyrsbutikk: the boat stopped 9 m from a rock, and every way from there, round it
// too, was called ahead of the rock, so she lay still). A rock behind a leg's start, or abeam of it, is one the leg goes away from: the
// sailing's groundCheck and Autonav's rockOnLeg pass it; one ahead within 12 m is still caught. And the way round a mark keeps 13 m from
// rocks (obsSafe), more than the 12 m groundCheck stops her for.
export default function (t){
  const K = t.K, {newState} = K;
  K.set('S', newState());
  // (no map: open deep sea, and the rocks the test puts there, in km)
  let R = [];
  const keep = {}; for (const [n, f] of [['isLand', () => false], ['depthF', () => 300], ['inHarbour', () => false], ['coastSegHit', () => false], ['rocksIn', () => R], ['rocksAlong', () => R]]){ keep[n] = K.get(n); K.set(n, f); }
  const M = K.get('Math'), rnd = M.random; M.random = () => 0;   // (groundCheck's chance on a rock: always caught here)
  try {
    const a = {x:100, y:100}, b = {x:101, y:100};
    R = [[99.995, 100.005]]; t.ok(!K.rockOnLeg(a, b, 0.012) && !K.groundCheck(a, b), 'en stein bak starten, 7 m unna: ikke forut (rockOnLeg, groundCheck)');
    R = [[100, 100.009]]; t.ok(!K.rockOnLeg(a, b, 0.012) && !K.groundCheck(a, b), 'en stein tvers av starten, 9 m unna: ikke forut');
    R = [[100.03, 100.009]]; t.ok(!!K.rockOnLeg(a, b, 0.012) && !!K.groundCheck(a, b), 'en stein 30 m forut, 9 m fra linja: forut, båten stopper');
    R = [[100.5, 100.011]]; t.ok(!!K.rockOnLeg(a, b, 0.012), 'midt på etappen, 11 m fra linja: fanget');
    R = [[100.5, 100.012]]; t.ok(!K.rockOnLeg(a, b, 0.012), 'midt på etappen, 12 m fra linja: fri (12 m er grensa)');
    R = [[101.005, 100.005]]; t.ok(!!K.rockOnLeg(a, b, 0.012), 'en stein like forbi enden, 7 m unna: fanget (etappen etter går fra den)');
    // (a leg of no length is a point: the fine lane's wet cells ask rockOnLeg(q, q, r), 11-route.js leiaLane, and the naust's way out;
    // 16.11.2026, the skip of a rock abeam made it find none, and the lane went 3 m from a rock at Helligvær, tests/allpairs.py)
    R = [[100.0029, 100.001]]; t.ok(!!K.rockOnLeg(a, a, 0.0135), 'en celle i lanen (et punkt), stein 3 m unna: ikke våt (rockOnLeg(q, q))');
    R = [[100.02, 100]]; t.ok(!K.rockOnLeg(a, a, 0.0135), 'et punkt, stein 20 m unna: fri');
    // (a rock in a harbour is not counted by the way round a mark, as the search does not count it: obsRock, 11b-obstacles.js)
    { const ih = K.get('inHarbour'); K.set('inHarbour', p => Math.abs(p.x - 100.5) < 1e-6); R = [[100.5, 100.001], [100.7, 100.02]];
      const m = K.obsRock(a, b); K.set('inHarbour', ih); t.ok(Math.abs(m - 0.02) < 1e-6, 'en stein i havna 1 m fra etappen telles ikke, den neste utenfor 20 m unna gjør (obsRock ' + (m * 1000).toFixed(0) + ' m)'); }
    R = [[100.5, 100.010]]; t.ok(!K.obsSafe(a, b, null), 'veien rundt et merke: ikke 10 m fra en stein (obsSafe)');
  } finally { M.random = rnd; for (const n in keep) K.set(n, keep[n]); }
}
