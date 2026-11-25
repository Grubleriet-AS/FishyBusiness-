// A route left on a boat that lies moored, with no departure set (tilbakemeldingene 262, 307, 341, 375, 386 and 406, 20.–24.11.2026: «får
// ikke slettet waypoints», «hele ruta har låst seg»; five players pressed «Sitter båten fast?» in that state, the telemetry's unstuck
// with st port and plan true): nothing sails such a route, the chart plotter can neither change nor delete it (canEditDraft), and the
// dock offers no «Avbryt» without a departure time. The minute's step takes it away (planPortFree, core/05-vessels.js), and leaves
// every route that is on its way: one waiting for its departure, one of a boat under way, and the standing plan's own.
export default function (t){
  const K = t.K, {newState, planPortStuck, planPortFree} = K;
  K.set('S', newState()); const S = K.get('S'), b = S.boat;
  const route = o => Object.assign({wps:[{x:b.pos.x + 1, y:b.pos.y, port:null, fish:0}, {x:b.pos.x + 2, y:b.pos.y, port:null, fish:0}], idx:1, speed:6, full:false, returning:false}, o || {});
  t.ok(b.status === 'port' && !!b.port, 'et nytt spill ligger i havn');
  S.plan = null; t.ok(!planPortStuck(), 'ingen rute: ingenting står fast');
  S.plan = route(); t.ok(planPortStuck(), 'fortøyd med en rute uten avgangstid: ruta står fast');
  S.plan = route({depAt:S.t + 30}); t.ok(!planPortStuck(), 'en rute som venter på avgangen sin, står ikke fast');
  S.plan = route(); b.fueling = {until:S.t + 5}; t.ok(!planPortStuck(), 'mens hun bunkrer, venter ruta på kaia');
  b.fueling = null;
  S.plan = route(); b.status = 'sailing'; t.ok(!planPortStuck(), 'under vei står ingenting fast'); b.status = 'port';
  S.plan = route(); b.status = 'unmooring'; t.ok(!planPortStuck(), 'mens fortøyningene tas inn, står ingenting fast'); b.status = 'port';
  // freed: the route is gone, nothing else is touched, and what it was is told
  S.plan = route(); S.draft = [];
  const was = planPortFree();
  t.ok(S.plan === null && b.status === 'port' && S.draft.length === 0, 'ruta er tatt bort, båten ligger som før, og ingen utkast er laget');
  t.ok(was && was.idx === 1 && was.n === 2 && was.ops === false, 'det som sto fast, er meldt (' + JSON.stringify(was) + ')');
  // the standing plan's route is the plan's own to end: it is told, once, and left
  S.plan = route({ops:true});
  const w2 = planPortFree();
  t.ok(S.plan && S.plan.ops && w2 && w2.ops === true, 'driftsplanens rute røres ikke, bare meldes');
  t.ok(planPortFree() === null, 'og meldes bare én gang');
  S.plan = null;
}
