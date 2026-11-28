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
    // the way in (steg 142, Jonas 28.11.2026): where the planner has no way in for a hull of her size, src/data/innseiling.json has the
    // longest ocean vessel that has one, and a longer one is not sent there. Only where she is sent: portWhy is as it was
    { const INN = K.get('INNSEILING'), maks = INN.maks, keep = Object.assign({}, maks);
      try { t.eq(K.innWhy(yard, 'pelagisk'), null, 'uten en grense for stedet sier innseilingen ingenting');
        maks[yard.id] = [45.4, 'trangt'];
        const wp = K.placeWhy(yard, 'pelagisk'); t.ok(!!wp && /Innseilingen hit er for trang for en båt på 75 m/.test(wp[0]) && /too narrow for a 75 m vessel/.test(wp[1]), 'et verft med grense 45,4 m tar ikke båten på 75 m, og sier hvorfor på begge språk', wp);
        t.eq(K.placeWhy(yard, 'autoliner'), null, 'autolineren på 45,4 m, som har vei inn, går dit'); t.eq(K.placeWhy(yard, 'ringnot38'), null, 'og ringnota på 38 m');
        t.eq(K.placeWhy(yard, 'kyst21'), null, 'kystbåtene går overalt som før, også om grensen er 0'); maks[yard.id] = [0, 'grunt']; t.eq(K.placeWhy(yard, 'kyst21'), null, 'også med grensen 0');
        const wg = K.placeWhy(yard, 'ringnot38'); t.ok(!!wg && /for grunn for en dypgang på/.test(wg[0]), 'grunt: ordene sier dypgangen', wg);
        maks[yard.id] = [0, 'bru']; t.ok(/Brua på vei inn/.test(K.placeWhy(yard, 'ringnot38')[0]), 'bru: ordene sier brua');
        const ok = PORTS.find(q => q.mottak && !K.portWhy(q, 'ringnot38')); t.ok(!!ok, 'et mottak som tar ringnota etter kairegelen');
        if (ok){ maks[ok.id] = [0, 'trangt']; t.eq(K.portWhy(ok, 'ringnot38'), null, 'et mottak med grense: kairegelen (portWhy: landing, bunkring der hun alt ligger) er som før'); t.ok(/Innseilingen/.test((K.placeWhy(ok, 'ringnot38') || [''])[0]), 'men hun sendes ikke dit (placeWhy)'); }
      } finally { for (const k of Object.keys(maks)) delete maks[k]; Object.assign(maks, keep); } }
  } finally { K.set('mapReadyAt', ready); }
}
