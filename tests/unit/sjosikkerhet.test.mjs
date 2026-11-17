// The safety of the coast's boats (Jonas 17.11.2026, of the setting «Søk ly automatisk ved vind over … Snu ved 11 m/s»: «Fjern også denne
// funksjonen. Vinden er ikke så farlig. Vi må bare sørge for at vi har et sikkerhetssystem som prøver å berge spillerne, men det kan ikke
// være for konservativt heller»): no wind limit, and she turns for shelter by herself on the sea, near her danger limit (BOAT.risk[1] ×
// SEA_SAFE). The ocean fleet keeps its own limits.
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), b = S.boat, BOAT = K.get('BOAT'), SAFE = K.get('SEA_SAFE');
  try {
    for (const ty of ['trebat', 'sjark', 'skiff']){
      b.type = ty; K.applyVessel();
      t.ok(K.windLim() === Infinity, ty + ': ingen vindgrense');
      t.ok(Math.abs(K.seaLim() - BOAT.risk[1] * SAFE) < 1e-9 && K.seaLim() > BOAT.risk[0], ty + ': sjøgrensen er nær det båten tåler (' + K.seaLim().toFixed(2) + ' m, risk ' + BOAT.risk.slice(0, 2).join('/') + ')');
    }
    // the old setting is not read on the coast
    b.type = 'sjark'; K.applyVessel(); S.settings.autoOn = false; S.settings.autoW = 6;
    t.ok(K.windLim() === Infinity && K.seaLim() > 2, 'den gamle innstillingen (av, 6 m/s) leses ikke lenger');
    // the ocean fleet as before
    b.type = 'autoliner'; K.applyVessel();
    t.ok(K.windLim() === BOAT.risk[2] && Math.abs(K.seaLim() - (BOAT.risk[0] + BOAT.risk[1]) / 2) < 1e-9, 'havbåten: grensene som før (' + K.windLim() + ' m/s, ' + K.seaLim() + ' m)');
  } finally { b.type = 'sjark'; K.applyVessel(); }
}
