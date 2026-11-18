// Driftsplan started out at sea (tilbakemelding #166, 18.11.2026: «Driftsplan sier "leter etter rute" i evigheter når man prøver å
// starte den mens man ligger ute på havet. Fungerer helt fint mens man ligger til kai»): the first leg begins where she lies, and the
// legs are kept by their ends to the metre, so a boat that drifted while the leg was fetched asked for a new one for ever. The point it
// was asked from is kept (o.seaFrom) and used while she is within 300 m of it (core/06h-plan2-engine.js plan2Trip, plan2WxHome).
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), b = S.boat;
  try {
    S.lang = 'no'; S.me = S.cur; b.type = 'sjark'; K.applyVessel(); S.plan = null;
    const home = K.portById('husoy');
    S.ops = K.plan2New({v:K.get('DRV3'), home:'husoy', rig:'juksa', jig:true, places:[{id:'a', k:'juks', x:home.p.x + 3, y:home.p.y}], dep:5, wx:{wind:99, hs:2.4}, land:{mode:'near', port:null, when:'trip'}});
    const o = K.plan2Ops(); b.status = 'idle'; b.port = null; b.pos = {x:home.p.x + 1, y:home.p.y - 2};
    const D = {steps:[{k:'juks', pid:'a', h:2}], auto:false}; o.run = {day:D, i:0, trip:null, wait:null};
    const T1 = K.plan2Trip(o, D, 0), n1 = T1 && T1.need ? T1.need.length : 0;
    t.ok(n1 === 1, 'ute på sjøen: den første etappen hentes fra der båten ligger', T1 && T1.need);
    // the leg comes in (as drFetch puts it), and meanwhile she has drifted 50 m
    const q = T1.need[0]; K.drLegPut(o, K.drLK(q.a, q.ap, q.b, q.bp), {wps:[{x:q.a.x + 1, y:q.a.y + 0.5}, {x:q.b.x, y:q.b.y}]}, q.a, q.b);
    b.pos = {x:b.pos.x + 0.04, y:b.pos.y + 0.03};
    const T2 = K.plan2Trip(o, D, 0);
    const fromBoat = (T2 && T2.need || []).filter(z => !z.ap && Math.hypot(z.a.x - b.pos.x, z.a.y - b.pos.y) < 0.3);
    t.ok(T2 && !fromBoat.length, 'hun har drevet 50 m: etappen som ble hentet, brukes, ingen ny leting fra der hun ligger', {need:T2 && T2.need, wps:T2 && T2.wps && T2.wps.length});
    // far off (2 km): a new point, a new leg
    b.pos = {x:b.pos.x + 2, y:b.pos.y};
    const T3 = K.plan2Trip(o, D, 0);
    t.ok(T3 && T3.need && T3.need.length === 1 && Math.abs(T3.need[0].a.x - b.pos.x) < 1e-9, 'langt unna (2 km): ny etappe fra der hun er nå', T3 && T3.need);
  } finally { S.ops = null; S.plan = null; b.status = 'port'; b.port = 'husoy'; }
}
