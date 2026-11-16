// Driftsplan 3, DP3-1 (docs/planer/driftsplan-3.md, 16.11.2026): the plan is a ring and a gear, and «find the plan» (core/06k-plan3.js)
// reckons the rest. Checked here without a map: the ring's size per gear, the units split on the places, the places picked apart in the
// ring from the spots, the home's score, the rhythm, the ring refused without water or gear, v5 run by the engine as a v4, and the old
// plans switched off (a running one fetches its gear and lands, plan3Retire). The map reads (plan3Spots, plan3Home) are driftsplan3test's.
export default function (t){
  const K = t.K, {newState, DRP3, NM, plan3RingKm, plan3Split, plan3Places, plan3HomeScore, plan3Rhythm, plan3RingWhy, plan3New, plan3Retire, plan2Ops, DRV2, DRV3, DRIFT3, PORTS, kmTrue} = K;
  K.set('S', newState()); const S = K.get('S');
  // the ring: fixed per gear (Jonas 16.11.2026: «Fast per redskap»), its radius in true km
  t.near(plan3RingKm('line'), DRP3.ring.line * NM / 2, 1e-9, 'ringen for line: ' + DRP3.ring.line + ' nm i diameter, radius ' + plan3RingKm('line').toFixed(2) + ' km');
  t.ok(plan3RingKm('juksa') < plan3RingKm('teiner') && plan3RingKm('teiner') < plan3RingKm('garn'), 'juksa minst, så teiner, så garn og line');
  // the units on the places: all the boat owns of the kind, a field per four tubs (four at most), never more than she owns
  S.pgear.lines.hyse.n = 10; S.pgear.lines.hyse.baited = 10; S.pgear.lines.bank.n = 0;
  const o = plan3New({x:500, y:300}, 'line', {lk:'hyse', bait:'sild'});
  t.ok(o.v === DRV3 && o.ring.r === plan3RingKm('line') && o.bait === 'sild' && o.lk === 'hyse', 'en ny plan er v5 med ringen, agnet og linetypen');
  t.ok(o.jig === false, 'bare ett redskap: ingen juksa i tillegg til lina (Jonas 16.11.2026)');
  { const sp = plan3Split(o); t.ok(sp.k === 'felt' && JSON.stringify(sp.n) === '[4,3,3]', 'ti stamper hyseline: tre felt med 4, 3 og 3 (' + JSON.stringify(sp.n) + ')'); }
  S.pgear.lines.hyse.n = 30; t.ok(JSON.stringify(plan3Split(o).n) === '[8,8,7,7]', 'tretti stamper: fire felt, høyst (' + JSON.stringify(plan3Split(o).n) + ')');
  S.pgear.lines.hyse.n = 0; t.ok(plan3Split(o).n.length === 0, 'ingen stamper: ingen felt');
  t.ok(/ikke noe line om bord/i.test(plan3RingWhy(o, [{x:500, y:300, s:0}])), 'ingen line om bord: ringen avvises med grunnen («' + plan3RingWhy(o, [{x:500, y:300, s:0}]) + '»)');
  { const j = plan3New({x:500, y:300}, 'juksa', {tackle:'mark'}); const sp = plan3Split(j);
    t.ok(sp.k === 'juks' && sp.places === DRP3.jigPlaces && j.jig === true, 'juksa: ' + DRP3.jigPlaces + ' juksplasser'); }
  // the places: the best spots first (the middle of the gear's depth band), apart from each other by a third of the ring
  S.pgear.lines.hyse.n = 8;
  const spots = [{x:500, y:300, s:0.1}, {x:500.1, y:300, s:0.05}, {x:501, y:300, s:0.3}, {x:499, y:300.5, s:0.2}, {x:500, y:301.2, s:0.9}];
  { const P = plan3Places(o, spots), gap = Math.max(DRP3.spaceKm, o.ring.r / 3);
    t.ok(P.length === 2 && P.every(q => q.k === 'felt' && q.lk === 'hyse' && q.soak > 0), 'åtte stamper: to felt med linetypen og ståtida (' + P.length + ')');
    t.ok(P[0].x === 500.1, 'det beste stedet først (dybden midt i båndet)');
    t.ok(kmTrue(P[0], P[1]) >= gap - 1e-9, 'feltene står minst ' + gap.toFixed(2) + ' km fra hverandre (' + kmTrue(P[0], P[1]).toFixed(2) + ')');
    t.ok(P.reduce((a, q) => a + q.n, 0) === 8, 'alle åtte stampene er på feltene'); }
  t.ok(/ingen plass/.test(plan3RingWhy(o, [])), 'ingen vann for redskapet i ringen: avvist med grunnen');
  // the home's score: a place the crew sleep well at beats a nearer one where they do not; the rorbu's price counts a little
  { const near = {d:5, rest:false, me:true, rorbu:false}, far = {d:20, rest:true, me:true, rorbu:false}, rb = {d:19, rest:true, me:true, rorbu:true};
    t.ok(plan3HomeScore(far) < plan3HomeScore(near), 'hvile for mannskapet 20 km unna slår en kai uten hvile 5 km unna');
    t.ok(plan3HomeScore(far) < plan3HomeScore(rb), 'en rorbu 1 km nærmere taper på prisen');
    t.ok(plan3HomeScore({d:5, rest:true, me:false, rorbu:false}) > plan3HomeScore({d:5, rest:true, me:true, rorbu:false}), 'uten hvile for deg om bord teller det mot'); }
  // the rhythm: the skiff (no wheelhouse, no bunks) goes day trips
  t.ok(plan3Rhythm(o) === 'day', 'skiffen går dagdrift (' + plan3Rhythm(o) + ')');
  // the engine runs a v5 as a v4; an old v4 is left as it is while DRIFT3 is off (the page comes in DP3-3)
  S.ops = o; t.ok(plan2Ops() === o, 'motoren kjører en v5-plan');
  t.ok(DRIFT3 === false, 'DRIFT3 er av til siden er bygd (DP3-3)');
  { const v4 = {v:DRV2, on:true, places:[], rig:'juksa', land:{}}; S.ops = v4; t.ok(plan2Ops() === v4, 'med DRIFT3 av står en v4-plan som før'); }
  // the old plans (Jonas 16.11.2026: «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak», «Trekk først, så lever»)
  const M = PORTS.find(p => p.mottak).id;
  { const v4 = {v:DRV2, on:true, held:null, places:[{id:'f1', k:'felt', x:500, y:300, n:4}], rig:'line', land:{}, M, home:'naust', run:{}}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    const r = plan3Retire(v4);
    t.ok(r === v4 && v4.retire && v4.fetch && v4.home === M && v4.on, 'en v4-plan som går, med lina i sjøen og deg om bord: henter redskapet og leverer på mottaket, som blir hjemmet (' + JSON.stringify([!!v4.retire, !!v4.fetch, v4.home === M]) + ')');
    t.ok(plan3Retire(v4) === v4, 'mens den henter, går den');
    v4.on = false; t.ok(plan3Retire(v4) === null && S.ops === null, 'når redskapet er hentet og fangsten levert, er planen borte'); }
  { const v4 = {v:DRV2, on:false, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    t.ok(plan3Retire(v4) === null && S.ops === null, 'en v4-plan som er av: borte med en gang, båten blir liggende og redskapet står'); }
  { const v4 = {v:DRV2, on:true, held:{t:0}, places:[], rig:'line', land:{}, M}; S.ops = v4;
    t.ok(plan3Retire(v4) === null && S.ops === null, 'en v4-plan du har tatt over: borte, båten er din'); }
  { S.me = 'annen'; const v4 = {v:DRV2, on:true, held:null, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    t.ok(plan3Retire(v4) === null && S.ops === null, 'ingen om bord som kan føre båten: planen er borte og båten blir liggende'); S.me = null; }
}
