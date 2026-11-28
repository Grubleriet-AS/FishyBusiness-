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
    { const INN = K.get('INNSEILING'), ST = INN.steder, keep = JSON.parse(JSON.stringify(ST)); for (const k of Object.keys(ST)) delete ST[k];
      try { t.eq(K.innWhy(yard, 'pelagisk'), null, 'uten en grense for stedet sier innseilingen ingenting');
        ST[yard.id] = {pelagisk:'trangt', snokrabbe:'grunt'};
        const wp = K.placeWhy(yard, 'pelagisk'); t.ok(!!wp && /Innseilingen hit er for trang for en båt på 75 m/.test(wp[0]) && /too narrow for a 75 m vessel/.test(wp[1]), 'et verft der 75 m-båten ikke har vei inn, tar henne ikke, og sier hvorfor på begge språk', wp);
        const wg = K.placeWhy(yard, 'snokrabbe'); t.ok(!!wg && /for grunn for en dypgang på 6/.test(wg[0]), 'snøkrabbebåten (50 m, 6 m dypgang) nektes for dypgangen', wg);
        t.eq(K.placeWhy(yard, 'bunntral'), null, 'bunntråleren (60 m, grunnere) som har vei inn, går dit: grensen er per båttype, ikke per lengde'); t.eq(K.placeWhy(yard, 'ringnot38'), null, 'og ringnota');
        ST[yard.id] = {kyst21:'grunt', ringnot38:'bru'}; t.eq(K.placeWhy(yard, 'kyst21'), null, 'kystbåtene går overalt som før, hva fila enn sier'); t.ok(/Brua på vei inn/.test(K.placeWhy(yard, 'ringnot38')[0]), 'bru: ordene sier brua');
        const ok = PORTS.find(q => q.mottak && !K.portWhy(q, 'ringnot38')); t.ok(!!ok, 'et mottak som tar ringnota etter kairegelen');
        if (ok){ ST[ok.id] = {ringnot38:'trangt'}; t.eq(K.portWhy(ok, 'ringnot38'), null, 'et mottak med grense: kairegelen (portWhy: landing, bunkring der hun alt ligger) er som før'); t.ok(/Innseilingen/.test((K.placeWhy(ok, 'ringnot38') || [''])[0]), 'men hun sendes ikke dit (placeWhy)'); }
      } finally { for (const k of Object.keys(ST)) delete ST[k]; Object.assign(ST, keep); } }
    // the file as it is: every place in it is a place of the game, every type an ocean vessel, every reason one innWhy has words for
    { const ST = K.get('INNSEILING').steder, V = K.get('VESSELS'), bad = []; for (const [id, o] of Object.entries(ST)){ if (!PORTS.some(q => q.id === id)) bad.push(id); for (const [ty, w] of Object.entries(o)) if (!V[ty] || V[ty].cls !== 'hav' || !['grunt', 'trangt', 'bru'].includes(w)) bad.push(id + ':' + ty + ':' + w); }
      t.eq(bad.length, 0, 'innseiling.json: hvert sted finnes, hver type er en havbåt, hver årsak har ord (' + Object.keys(ST).length + ' steder)', bad.slice(0, 5)); }
    // three of the places the measurement gave a limit (28.11.2026), south, middle and north: the words come from the file as it is
    { const pid = id => PORTS.find(q => q.id === id), w = (id, ty) => { const p = pid(id), r = p && K.placeWhy(p, ty); return r ? r[0] : null; };
      t.ok(/Innseilingen hit er for trang/.test(w('sv538400_1491817', 'pelagisk') || ''), 'sør: Halden verft tar ikke 75 m-båten (trang innseiling)', w('sv538400_1491817', 'pelagisk'));
      t.ok(/Innseilingen hit er for grunn/.test(w('sv520573_1007674', 'snokrabbe') || '') && w('sv520573_1007674', 'ringnot38') === null, 'midt: Trondheim verft tar ikke snøkrabbebåten (grunt), men ringnota', [w('sv520573_1007674', 'snokrabbe'), w('sv520573_1007674', 'ringnot38')]);
      t.ok(/Innseilingen hit er for trang/.test(w('sv1081559_147434', 'bunntral') || '') && w('sv1081559_147434', 'autoliner') === null, 'nord: Tufjord verft tar ikke bunntråleren (trangt), men autolineren', [w('sv1081559_147434', 'bunntral'), w('sv1081559_147434', 'autoliner')]); }
  } finally { K.set('mapReadyAt', ready); }
}
