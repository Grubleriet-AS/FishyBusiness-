// Driftsplan 3 and the weather (Jonas 17.11.2026, the plan at sea with «Dagen går ut: vinden blir 15 m/s, og grensen er 13 m/s» and the
// boat lying still out there): «Jeg tenker at vinden ikke skal være en hindring, bare bølger», and «når driftsplanen stopper må jo båten
// på til land eller noe, ikke bare ligge midt på havet? Også må den starte igjen automatisk så snart den har anledning». So the coast's
// plans have no wind limit (plan3Wx, and plan2Ops for a plan made before), and when the weather holds her and she is out, she goes home
// and waits there (plan2WxHome); in port the engine lays the day again and goes out when the forecast lets her, as before.
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), b = S.boat;
  const keep = {}; for (const n of ['drLeg', 'drFetch', 'depart']) keep[n] = K.get(n);
  try {
    S.lang = 'no'; S.me = S.cur; b.type = 'sjark'; K.applyVessel(); S.plan = null;
    const home = K.portById('husoy'), P3 = K.get('P3_NOWIND');
    // 1. the wind is no limit on the coast, the sea is
    const W = K.plan3Wx(); t.ok(W.wind >= P3 && W.hs > 0 && W.hs <= 2.5, 'kystbåten: ingen vindgrense i en ny plan, bare sjøen (' + JSON.stringify(W) + ')');
    // a plan made before, with 13 m/s: the wind limit goes, the sea limit stays
    S.ops = K.plan2New({v:K.get('DRV3'), home:'husoy', rig:'juksa', jig:true, places:[{id:'a', k:'juks', x:home.p.x + 3, y:home.p.y}], dep:5, wx:{wind:13, hs:2.4}, land:{mode:'near', port:null, when:'trip'}});
    const o = K.plan2Ops(); t.ok(o && o.wx.wind >= P3 && o.wx.hs === 2.4, 'en plan laget før: vindgrensen tas bort, sjøgrensen står', o && o.wx);
    // 2. the weather holds her out at sea: she goes home on the way found, and waits there
    let fetched = null, departed = 0; K.set('drFetch', (oo, pairs) => { fetched = pairs; }); K.set('depart', () => { departed++; b.status = 'sailing'; return true; });
    b.status = 'idle'; b.port = null; b.pos = {x:home.p.x + 3, y:home.p.y}; o.run = {day:{steps:[{k:'fiske'}, {k:'hjem'}]}, i:0, trip:null, wait:null};
    const wx = {w:15, h:2.9, lim:2.4, wind:P3, ok:false};
    K.set('drLeg', () => null);
    t.ok(K.plan2WxHome(o, S.t / 60, wx) && o.run.wait.k === 'route' && fetched && fetched[0].bp === 'husoy' && !S.plan, 'uten veien hjem: den hentes først, og båten venter på den', {wait:o.run.wait && o.run.wait.k, fetched});
    K.set('drLeg', () => ({w:[[home.p.x + 2, home.p.y], [home.p.x + 1, home.p.y]], d:3}));
    t.ok(K.plan2WxHome(o, S.t / 60, wx) && S.plan && S.plan.wps.length === 3 && S.plan.wps[2].port === 'husoy' && S.plan.returning && S.plan.ops && departed === 1, 'med veien: båten går hjem til Husøy på planen', S.plan && S.plan.wps.map(w => w.port || 'p'));
    t.ok(o.run.wait.k === 'wxhome' && /sjøen blir 2,9 m/.test(o.run.wait.no) && /går ut igjen når været tillater det/.test(o.run.wait.no) && o.hold === 0, 'den sier hvorfor, at den venter hjemme og går ut igjen av seg selv', o.run.wait.no);
    t.ok(o.run.day === null && o.run.trip === null, 'dagen legges på nytt når hun ligger i havn (plan2Landed)');
    // 2b. the weather is read where the trip works and ends, not where she lies when she is out (Jonas 17.11.2026: «uten å bli stoppet av
    // dumme feil»): out north in a sea over the limit, a jig trip to a ring in shelter reads the ring and home, not her own spot
    { const leg0 = K.get('drLeg'); K.set('drLeg', () => ({w:[], d:1})); S.plan = null; b.status = 'idle'; b.port = null; b.pos = {x:home.p.x + 3, y:home.p.y - 3};
      const D = {steps:[{k:'juks', pid:'a', h:2}], auto:false}; o.run = {day:D, i:0, trip:null, wait:null};
      const T = K.plan2Trip(o, D, 0), has = (L, p) => !!(L || []).some(q => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9);
      t.ok(T && T.pts && T.pts.length && !has(T.pts, b.pos), 'ute: været leses der turen jukser og ender, ikke der båten ligger', T && T.pts);
      b.status = 'port'; b.port = 'husoy'; b.pos = {x:home.p.x, y:home.p.y};
      const T2 = K.plan2Trip(o, D, 0); t.ok(T2 && has(T2.pts, home.p), 'i havn: havna er med som før', T2 && T2.pts);
      K.set('drLeg', leg0); }
    // 3. in port, an ocean vessel, or at the home anchorage: not sent anywhere
    S.plan = null; b.status = 'port'; b.port = 'husoy'; t.eq(K.plan2WxHome(o, S.t / 60, wx), false, 'i havn: hun venter der, som før');
    b.status = 'idle'; b.port = null; b.type = 'autoliner'; K.applyVessel(); t.eq(K.plan2WxHome(o, S.t / 60, wx), false, 'en havbåt ligger på været der hun er, som før');
  } finally { for (const n in keep) K.set(n, keep[n]); b.type = 'sjark'; K.applyVessel(); S.ops = null; S.plan = null; }
}
