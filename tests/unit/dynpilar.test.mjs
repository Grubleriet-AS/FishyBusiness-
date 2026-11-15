// A pier or a mark close across her way ahead (core/16b-dyn.js dynAvoid; steg 126 AS1, 14.11.2026): dynAvoid says how far ahead the
// nearest such thing is (a, m), and dynAuto takes it at manoeuvring speed. The coastal vessel on 14.99 m struck the pier of the bridge
// by Bergen verft at seven knots from Veo and Ytre Bruvik. A mark put into the obstacles' index as a chart pack's mark (km), as in
// dyntight.test.mjs; she heads north (psi 0, y grows southward).
export default function (t){
  const K = t.K, MARKS = K.get('MARKS'), ready = K.get('mapReadyAt');
  K.set('S', K.newState()); K.set('mapReadyAt', () => false);
  const X = 300000, Z = 1300000, d = {X, Y:Z, psi:0, u:3.6}, P = {L:15, B:5};
  const put = (dx, dz) => { MARKS.tiles.set('t', {k:'t', tx:0, ty:0, lights:[], rocks:[], marks:[[(X + dx) / 1000, (Z + dz) / 1000, 'L', 'port']]}); MARKS.ver++; };
  try {
    put(3, -40); const av = K.dynAvoid(d, P);
    t.ok(av && av.n === 1 && Math.abs(av.a - 40) < 1, 'dynAvoid: et merke 40 m forut og 3 m til styrbord gir avstanden fram til det', av);
    t.ok(av && av.dh < 0, 'dynAvoid: og hun skyves til babord', av && av.dh);
    put(30, -40); t.eq(K.dynAvoid(d, P), null, 'dynAvoid: et merke 30 m til siden ligger ikke over veien');
    put(3, 40); t.eq(K.dynAvoid(d, P), null, 'dynAvoid: et merke akterut teller ikke');
  } finally { MARKS.tiles.delete('t'); MARKS.ver++; K.set('mapReadyAt', ready); }
}
