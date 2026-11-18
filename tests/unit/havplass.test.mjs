// The ocean vessels at the yards and the shops (core/06b-coastports.js placeWhy; Jonas 18.11.2026, «Samme kairegel som mottak»): a yard
// or a shop takes an ocean vessel only where the quay face she would lie at is long and deep enough for her (and there is room to turn);
// the coast's boats go everywhere as before.
export default function (t){
  const K = t.K; K.set('S', K.newState());
  const PORTS = K.get('PORTS'), UNITS = K.get('UNITS'), ready = K.get('mapReadyAt');
  K.set('mapReadyAt', () => false);   // (no map in the core alone: the room to turn is not asked)
  try {
    const shop = PORTS.find(q => /butikk/.test(q.sted || '') && UNITS[q.id] && !UNITS[q.id].y), yard = PORTS.find(q => /verft/.test(q.sted || '') && UNITS[q.id] && UNITS[q.id].y);
    t.ok(!!shop && !!yard, 'en butikk med vanlig havneenhet og et verft med den store');
    const w = K.placeWhy(shop, 'ringnot38');
    t.ok(!!w && /for kort/.test(w[0]), 'placeWhy: butikken (24 m kaiplass) tar ikke ringnota på 38 m: ' + (w ? w[0] : 'null'));
    t.eq(K.placeWhy(shop, 'kyst21'), null, 'placeWhy: kystbåten på 21 m går dit som før');
    t.eq(K.placeWhy(yard, 'ringnot38'), null, 'placeWhy: verftet med 90 m kai tar ringnota');
    const plant = PORTS.find(q => q.mottak && K.portWhy(q, 'ringnot38'));
    t.eq(JSON.stringify(K.placeWhy(plant, 'ringnot38')), JSON.stringify(K.portWhy(plant, 'ringnot38')), 'placeWhy: et mottak som portWhy');
  } finally { K.set('mapReadyAt', ready); }
}
