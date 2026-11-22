// The plan locked on «Lager planen …» (feedback 220, 21.11.2026): o.building is saved with the state, so a page closed or reloaded while
// plan2Make was at work came back with it on and nothing to clear it; the Start button stood as «Lager planen …», the rows were locked and
// the engine skipped the plan, for days. plan2Building (core/06h-plan2-engine.js) counts a build only while this page runs it, and not past
// P2MAKE_MAX (a map or route fetch that never answers).
export default function (t){
  const K = t.K, {newState, plan3New, plan2Building, P2MAKE_MAX, P2MAKING} = K, plan2Make = K.get('plan2Make');   // (async: not in the harness's names)
  K.set('S', newState()); const S = K.get('S');
  // a plan saved and loaded while it was being made: building:true from the save, and no build in this page
  const o = JSON.parse(JSON.stringify(Object.assign(plan3New({x:500, y:300}, 'juksa', {tackle:'mark'}), {building:true})));
  S.ops = o;
  t.ok(plan2Building(o) === false, 'en plan lagret mens den ble laget, er ikke under laging etter lasting');
  t.ok(o.building === false, 'og flagget fra lagringen er tatt bort');
  t.ok(plan2Building(null) === false && plan2Building({}) === false, 'ingen plan eller en plan uten flagget: ikke under laging');
  // a build in this page counts while it runs, and not past the limit (as plan2Make marks it before its first await)
  const o2 = plan3New({x:500, y:300}, 'juksa', {tackle:'mark'}); S.ops = o2;
  const real = Date.now; let now = real();
  Date.now = () => now;
  try {
    o2.building = true; P2MAKING.set(o2, {t:now});
    t.ok(plan2Building(o2) === true, 'en plan denne siden lager nå, er under laging');
    now += P2MAKE_MAX + 1;
    t.ok(plan2Building(o2) === false && o2.building === false && !P2MAKING.has(o2), 'en laging som ikke har svart på ' + Math.round(P2MAKE_MAX / 1000) + ' s, slipper planen');
  } finally { Date.now = real; }
  // a build that fails before its first await (here plan2Check throws on a plan with no places made) leaves nothing behind
  const o3 = plan3New({x:500, y:300}, 'juksa', {tackle:'mark'}); S.ops = o3; let got;
  plan2Make(o3, e => { got = e; });
  t.ok(got && o3.building === false && !P2MAKING.has(o3) && plan2Building(o3) === false, 'en laging som feiler, slipper planen (' + got + ')');
}
