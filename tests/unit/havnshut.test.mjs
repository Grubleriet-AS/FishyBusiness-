// The coast's harbours shut to the players (Jonas 15.11.2026: «de 3300 kaiene skal ikke være tilgjengelige for ekte brukere», 07e-havn.js
// HAVN.shut): with a harbour by the point and a free berth in it, no berth is found (the helm's «Fortøy»), tapped in the chart or offered
// as a home, and the chart has a reason to give; opened again (HAVN.shut false), the same harbour gives its berth as before.
export default function (t){
  const K = t.K, {newState} = K;
  K.set('S', newState());
  const H = {id:'h1', x:100, y:100, h:{x:100, y:100}}, berth = {kind:'quay', x:100.01, y:100, hd:0, len:12, face:{}};
  const keep = {};
  for (const [n, f] of [['havnsNear', () => [H]], ['havnBerths', () => [berth]], ['havnAsk', () => {}], ['havnPlaceOf', () => ({id:'hs:h1:0', name:'Testhavn', p:{x:100.01, y:100}, hid:'h1'})]]){ keep[n] = K.get(n); K.set(n, f); }
  const HAVN = K.get('HAVN'), was = HAVN.shut, p = {x:100, y:100};
  try {
    t.ok(was === true, 'HAVN.shut: havnene er stengt for spillerne', was);
    t.ok(K.havnFind(p, 1, 'sjark') === null, 'havnFind: ingen plass når havnene er stengt');
    t.ok(K.havnTapNear(p, 1) === null, 'havnTapNear: et trykk ved havna gir ingen plass');
    t.ok(K.havnOptions(p, 1, 'sjark').length === 0, 'havnOptions: ingen havneplass som hjem');
    t.ok(K.havnShutAt(p, 0.2) === true, 'havnShutAt: kartet vet at trykket var ved en stengt havn');
    const W = K.get('HAVN_WHY'); t.ok(W && /kystens egne båter/.test(W[0]) && /coast's own boats/.test(W[1]), 'HAVN_WHY: sier hvorfor, på norsk og engelsk', W);
    // a route from before that still ends at a berth (the way home along the trail, a plan from before): passed, never moored at
    { const S = K.get('S'), w = {x:100.01, y:100, port:'hs:h1:0', fish:0}; let docked = null; const dk = K.get('dock'); K.set('dock', id => { docked = id; });
      S.plan = {wps:[w], idx:0, speed:6}; S.boat.status = 'sailing'; S.trail = [];
      try { K.arrive(w); } finally { K.set('dock', dk); }
      t.ok(docked === null && w.port === null && S.trail.length === 1 && S.trail[0].port === null, 'arrive: en rute som ender ved en havneplass, legger ikke til der', {docked, port:w.port}); }
    HAVN.shut = false;
    t.ok(!!K.havnFind(p, 1, 'sjark') && !!K.havnTapNear(p, 1) && K.havnOptions(p, 1, 'sjark').length === 1 && K.havnShutAt(p, 0.2) === false, 'åpnet igjen (HAVN.shut false): samme havn gir plassen som før');
  } finally { HAVN.shut = was; for (const n in keep) K.set(n, keep[n]); }
}
