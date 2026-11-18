// Bow and stern thrusters on the big types (core/16b-dyn.js dynInt, dynCal; Jonas 18.11.2026, docs/planer/thrustere.md): sized as VETUS
// sizes one (the wind's push on her side at Beaufort 5 times half her length over the tunnel's arm), gone at four knots; opposite ways
// she turns on the spot, the same way she goes sideways.
export default function (t){
  const K = t.K; K.set('S', K.newState());
  const VESSELS = K.get('VESSELS'), KN = K.get('KN_MS');
  for (const k of ['kyst15', 'kyst21', 'ringnot38']) t.eq(VESSELS[k].thrusters, 2, k + ': baug- og hekkpropell');
  t.eq(VESSELS.sjark.thrusters || 0, 0, 'sjark: ingen propeller på tvers');
  const P = K.dynCal('ringnot38').P, P21 = K.dynCal('kyst21').P;
  t.ok(P.thr > 0 && P21.thr > 0 && P.thr > P21.thr, 'kraften: ringnota ' + Math.round(P.thr) + ' N, kyst21 ' + Math.round(P21.thr) + ' N');
  t.eq(K.dynCal('sjark').P.thr, 0, 'sjarken har ingen');
  const run = (tb, ts, u0, secs) => { const s = K.dynZero(); s.u = u0; for (let i = 0; i < secs * 10; i++){ K.dynInt(P, s, 0, 0, 0.1, 1, undefined, tb, ts); K.dynMove(s, 0.1); } return s; };
  const turn = run(1, -1, 0, 30);
  t.ok(Math.abs(turn.psi) > 0.5 && Math.hypot(turn.X, turn.Y) < 5, 'motsatt vei: ringnota dreier på stedet (' + (turn.psi * 57.3).toFixed(0) + '° på 30 s, ' + Math.hypot(turn.X, turn.Y).toFixed(1) + ' m)');
  const side = run(1, 1, 0, 30);
  t.ok(Math.abs(side.psi) < 0.2 && side.X > 5, 'samme vei: ringnota går sidelengs, og dreier lite uten autopiloten (' + side.X.toFixed(1) + ' m mot styrbord, ' + (side.psi * 57.3).toFixed(1) + '°)');
  const fast = run(1, -1, 6 * KN, 1), none = run(0, 0, 6 * KN, 1);
  t.near(fast.r, none.r, 1e-9, 'i 6 knop virker de ikke');
}
