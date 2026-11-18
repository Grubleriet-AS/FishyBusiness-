// What is fixed in the sea (core/11b-obstacles.js fixDist, obsCounts; core/07-harbours.js depthNav; the autonav routine 18.11.2026,
// docs/planer/autonav-null-treff.md): the distance from a point to a box, an outline and a circle with the way out of it, the route's
// ends that leave out only her own berth (not all within 40 m), and the harbours dredged for the boats that lie there.
export default function (t){
  const K = t.K;
  K.set('S', K.newState());
  // a box 20 m long (east-west) and 4 m wide round (100, 200): half lengths l 10, w 2, along (1, 0)
  const box = {t:1, x:100, z:200, l:10, w:2, ux:1, uz:0};
  let f = K.fixDist(box, 100, 205);
  t.near(f.d, 3, 1e-9, 'fixDist: 3 m sør for bryggas side'); t.near(f.oz, 1, 1e-9, 'fixDist: veien ut er sørover');
  f = K.fixDist(box, 100, 201.5);
  t.near(f.d, -0.5, 1e-9, 'fixDist: et punkt inne i brygga er en halv meter inne'); t.near(f.oz, 1, 1e-9, 'fixDist: ut mot den nærmeste siden (sør)');
  f = K.fixDist(box, 113, 206);
  t.near(f.d, 5, 1e-9, 'fixDist: forbi hjørnet: avstanden til hjørnet (3, 4)');
  // an outline: a square 10 m across with its corner at (0, 0)
  const sq = {t:3, P:[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], x0:0, z0:0, x1:10, z1:10};
  f = K.fixDist(sq, 5, 2); t.near(f.d, -2, 1e-9, 'fixDist: inne i et omriss, 2 m fra kanten'); t.near(f.oz, -1, 1e-9, 'fixDist: ut mot nord');
  f = K.fixDist(sq, 13, 5); t.near(f.d, 3, 1e-9, 'fixDist: 3 m øst for omrisset');
  // a circle (a boat on her mooring buoy, the circle she swings on)
  f = K.fixDist({t:0, x:0, z:0, r:10}, 0, 15); t.near(f.d, 5, 1e-9, 'fixDist: 5 m utenfor svingesirkelen');
  // the route's ends: only her own berth is left out
  const BOAT = K.get('BOAT'), keep = BOAT.beam, HIND = K.get('HIND'), ctx = HIND.ctx;
  try {
    BOAT.beam = 4;   // (obsOwn: half her beam and 2 m, 4 m)
    HIND.ctx = {free:[[0, 0]], freeR:40};
    t.eq(K.obsCounts({t:1, x:0, z:5, l:10, w:2, ux:1, uz:0}, 10), false, 'obsCounts: brygga hun ligger ved (3 m unna enden) teller ikke');
    t.eq(K.obsCounts({t:1, x:0, z:20, l:10, w:2, ux:1, uz:0}, 10), true, 'obsCounts: en brygge 18 m fra rutas ende teller (før: alt med midten innen 40 m var fritt)');
    t.eq(K.obsNearEnd({t:1, x:0, z:20, l:10, w:2, ux:1, uz:0}), true, 'obsNearEnd: den er nær enden, og passeres med mindre margin');
    t.eq(K.obsNearEnd({t:0, x:0, z:200, r:1}), false, 'obsNearEnd: et merke 200 m unna er ikke nær enden');
  } finally { BOAT.beam = keep; HIND.ctx = ctx; }
  // the zones of the trade places, where floating docks and open piers are taken away (vecGone): 20 m either side of a segment
  const PORTZ = K.get('PORTZ'), keepZ = {list:PORTZ.list, cells:PORTZ.cells};
  try {
    const g = [1000, 1000, 1100, 1000], cells = new Map([[1 * 65536 + 1, [g]]]); PORTZ.list = [g]; PORTZ.cells = cells;
    t.eq(K.inPortZone(1050, 1015), true, 'inPortZone: 15 m fra kaifronten er i sonen');
    t.eq(K.inPortZone(1050, 1025), false, 'inPortZone: 25 m fra kaifronten er utenfor');
    t.eq(K.inPortZone(1115, 1000), true, 'inPortZone: 15 m forbi enden av fronten er i sonen');
  } finally { PORTZ.list = keepZ.list; PORTZ.cells = keepZ.cells; }
  const G = {fd:new Set(['5:5'])};
  t.eq(K.vecGoneSlab(G, [[4, 4], [6, 4], [6, 6], [4, 6]]), true, 'vecGoneSlab: et omriss med midten i en flytebrygge som er tatt bort');
  t.eq(K.vecGoneSlab(G, [[40, 40], [60, 40], [60, 60], [40, 60]]), false, 'vecGoneSlab: et annet omriss står');
  // the harbours dredged: the deepest draught of the boats up to 40 m and half a metre
  const VESSELS = K.get('VESSELS'), want = Math.max(...Object.values(VESSELS).filter(V => (V.len || 0) <= 40).map(V => V.draft || 0)) + 0.5;
  t.near(K.get('HARB_DRAFT'), want, 1e-9, 'HARB_DRAFT: dypeste dypgang for båtene opp til 40 m og en halv meter (' + want + ' m)');
  const dF = K.get('depthF'), inH = K.get('inHarbour');
  try {
    K.set('depthF', () => 1.2);
    K.set('inHarbour', () => true); t.near(K.depthNav({x:0, y:0}), want, 1e-9, 'depthNav: grunt vann i havna er mudret');
    K.set('inHarbour', () => false); t.near(K.depthNav({x:0, y:0}), 1.2, 1e-9, 'depthNav: utenfor havna er dybden kartets');
    K.set('depthF', () => 0); K.set('inHarbour', () => true); t.near(K.depthNav({x:0, y:0}), 0, 1e-9, 'depthNav: land blir ikke vann');
  } finally { K.set('depthF', dF); K.set('inHarbour', inH); }
}
