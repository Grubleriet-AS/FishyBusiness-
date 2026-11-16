// Before Autonav gives up at shallows with no way round (steg 126, allesteder-15 seed 3, 16.11.2026: at Tussøy utstyrsbutikk she lay 27 m
// short of a point of the route by the rocks, no way to that point was found, and she stopped, «Legg en ny rute»): a new way from where she
// lies to the route's end, the rest of the route dropped. Once a route; not for a route that fishes on the way, nor when that search fails too.
export default function (t){
  const K = t.K, {newState} = K;
  const now = v => ({then(f){ f(v); return {catch(){}}; }});   // (a promise that answers at once: the core's searches stubbed)
  const keep = {}, calls = [];
  const put = (n, f) => { if (!(n in keep)) keep[n] = K.get(n); K.set(n, f); };
  const run = (answers, fishing) => {
    K.set('S', newState()); const S = K.get('S'), b = S.boat; b.pos = {x:100, y:100}; b.status = 'sailing'; b.v = 6; calls.length = 0;
    const E = {x:101, y:99, port:'pEnd', fish:0}, w1 = {x:100.03, y:100, port:null, fish:fishing ? 2 : 0, leia:true};
    S.plan = {wps:[w1, E], idx:0, speed:6, unsafe:[false, false]};
    put('leiaRoute', (a, c) => { calls.push([+c.x.toFixed(2), +c.y.toFixed(2)]); return now(answers[calls.length - 1]); });
    put('dynHandsOn', () => false); put('groundCheck', () => null); put('vesselById', () => null);
    K.sailReplan(S.plan, b, {x:100.02, y:100});
    return {S, E, calls:calls.slice()};
  };
  try {
    let r = run([{why:['ingen']}, {wps:[{x:100.5, y:99.5}, {x:101, y:99}]}]);
    t.ok(r.calls.length === 2 && r.calls[1][0] === 101 && r.S.plan && r.S.plan.wps.length === 2 && r.S.plan.wps[1] === r.E && r.S.plan.wps[0].x === 100.5 && r.S.boat.status === 'sailing',
      'ingen vei til punktet: en ny vei til rutas ende, og hun går videre', {calls:r.calls, wps:r.S.plan && r.S.plan.wps.map(q => [q.x, q.y])});
    r = run([{why:['ingen']}, {why:['ingen']}]);
    t.ok(r.calls.length === 2 && !r.S.plan && r.S.boat.status === 'idle' && r.S.draft.length >= 1, 'heller ingen vei til enden: hun stopper og sier det, som før', {calls:r.calls, st:r.S.boat.status});
    r = run([{why:['ingen']}], true);
    t.ok(r.calls.length === 1 && !r.S.plan, 'en rute som fisker på veien: ingen ny vei til enden (fisket skal ikke hoppes over)', r.calls);
  } finally { for (const n in keep) K.set(n, keep[n]); }
}
