// The trim is the fleet's (Jonas 16.11.2026: «disse boosterne ikke er linket opp mot et spesifikt fartøy … En speedboost fungerer på alle,
// selv båter som går på driftsplan»; core/03-simulation.js S.trim, trimRec): bought on one boat, the other boat in the fleet has double
// speed too when the fleet loop binds her; another length of the same kind adds its hours; a save with the old trim on one boat keeps it.
export default function (t){
  const K = t.K;
  if (!('fmt' in globalThis)) globalThis.fmt = (x, d) => x.toFixed(d).replace('.', ',');
  K.set('S', K.newState()); const S = K.get('S'); K.set('loreNewBoat', () => null); K.ensureFleet();
  const v1 = K.curVessel(), v2 = K.newVesselObj('sjark', S.boat.port || K.PORTS[0].id);
  const vmaxOf = v => K.withVessel(v, () => { K.applyVessel(); return K.get('BOAT').vmax; });
  const a0 = vmaxOf(v1), b0 = vmaxOf(v2);
  t.eq(K.trimSet('t2'), 'new', 'Turbotrim kjøpt på den første båten');
  const a1 = vmaxOf(v1), b1 = vmaxOf(v2);
  t.eq([a1 > a0 * 1.3, b1 > b0 * 1.3, !!S.trim, !v2.boat.trim], [true, true, true, true], 'begge båtene i flåten har mer fart, også den andre (S.trim, ikke på båten): ' + [a0, a1, b0, b1].map(x => x.toFixed(1)).join(' '));
  const u0 = S.trim.until; t.eq(K.trimSet('t24'), 'ext', 'en lengre Turbotrim legges til den som er på');
  t.near(S.trim.until - u0, K.BOOSTS.t24.h * 60, 1e-6, 'tida er lagt til (24 timer i ekte tid)');
  t.ok(K.withVessel(v2, () => !!K.trimOn(K.get('S').boat)), 'trimOn er sann på den andre båten');
  // a save from before: the trim on one boat only, and no fleet trim
  delete S.trim; S.boat.trim = {k:'turbo', t0:S.t, until:S.t + 60}; K.applyVessel();
  t.ok(K.trimOn(S.boat) && K.trimOn(S.boat).x === 2 && !K.withVessel(v2, () => K.trimOn(K.get('S').boat)), 'en gammel lagring: trimmen på den ene båten virker til den går ut');
  // (kontrollen 16.11.2026) an old trim on one boat still running is not hidden by a fleet trim that has run out, and not taken by its end
  S.boat.trim = {k:'ic', t0:S.t, until:S.t + 30 * 60}; S.trim = {k:'t2', t0:S.t - 100 * 60, until:S.t - 1};
  t.eq(K.trimRec(S.boat).k, 'ic', 'trimRec tar den som går (den gamle på båten), ikke en flåtetrim som har gått ut');
  K.trimEnd(); t.eq([!!S.trim, S.boat.trim && S.boat.trim.k, !!K.trimOn(S.boat)], [false, 'ic', true], 'trimEnd tar flåtetrimmen, og lar den gamle med betalt tid igjen stå');
  delete S.boat.trim; K.applyVessel();
  // the route speed of another boat in the fleet follows the fleet trim (a route set in knots, not «full»)
  if (!S.fleet.includes(v2)) S.fleet.push(v2);
  v2.plan = {speed:6, full:false}; const p0 = v2.plan.speed;
  K.trimSet('t2'); const p1 = v2.plan.speed; K.trimEnd(); const p2 = v2.plan.speed;
  t.eq([p1 > p0 * 1.3, Math.abs(p2 - p0) < 0.2], [true, true], 'den andre båtens rutefart følger flåtetrimmen og går tilbake når den går ut: ' + [p0, p1, p2].join(' → '));
  S.fleet = S.fleet.filter(v => v !== v2);
}
