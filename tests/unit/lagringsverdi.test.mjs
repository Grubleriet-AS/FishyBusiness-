// HS5b (27.11.2026, supabase/migrations/20261127120000_cheat_worth.sql): what a save's summary tells the server's check of the kroner,
// saveWorth in core/03-simulation.js. The twelve marks in production 27.11.2026 were all false: money moved from the savings and the tax
// account, loans paid out, and the type of the boat stood in changing in a fleet of two. The check now reads the current account, the
// two other accounts and the loans together, every vessel's type and the rights' value; these are the invariants it leans on.
export default function (t){
  const K = t.K, {newState, ensureFleet, newVesselObj, vget, bindVessel, storeVessel, saveWorth, bankS, bankMove, takeLoan, licValue, licExtra, structIn, HJ, VESSELS, PORTS, portServices, yearH} = K;
  const VKEYS = K.get('VKEYS'), mk = () => { const S = newState(); S.qseed = K.get('WORLD_SEED'); K.set('S', S); ensureFleet(); S.me = S.cur; return S; };
  let S = mk(); const H = S.t / 60, y = yearH(H), port = PORTS.find(p => portServices(p).verft).id;
  const W = () => { const w = saveWorth(S); return Math.round(S.cash) + w.bank - w.debt; };
  t.ok(typeof saveWorth === 'function', 'saveWorth finnes i kjernen');
  { const w = saveWorth(S); t.eq([w.bank, w.debt, w.licv, w.types], [0, 0, 0, [S.boat.type]], 'et nytt spill: ingen konti, ingen gjeld, ingen hjemmel, én båt av typen spilleren har'); }

  // ---- the accounts and the loans: what moves between them leaves cash + accounts − loans as it was
  S.cash = 900000; const w0 = W();
  bankS(); bankMove('spare', 400000); bankMove('skatt', 120000);
  t.eq([S.cash, saveWorth(S).bank, W()], [380000, 520000, w0], 'til sparekontoen og skattekontoen: kassa ned, kontiene opp, summen den samme');
  bankMove('spare', -400000); bankMove('skatt', -50000);
  t.eq([S.cash, saveWorth(S).bank, W()], [830000, 70000, w0], 'og tilbake igjen (hoppet som ga merkene): summen den samme');
  takeLoan(8000000, 120); takeLoan(1500000, 120, 'loanIN');
  t.eq([saveWorth(S).debt, W()], [9500000, w0], 'et lån fra Kystbanken og Kystfondet utbetalt: gjelda er begge lånene, summen den samme');

  // ---- every vessel's type, and the same whichever boat is bound (the type of the boat stood in was all the old summary had)
  newVesselObj('sjark', port, null); const b = newVesselObj('hurtigsjark', port, {id:'h10', hl:HJ.h10.hl, since:y, landY:y});
  const first = S.fleet[0].id;   // (newVesselObj puts her in the fleet)
  const ty = () => saveWorth(S).types.slice().sort().join(',');
  const want = [S.boat.type, 'sjark', 'hurtigsjark'].sort().join(','), v10 = licValue({id:'h10'}, H);
  t.eq([ty(), saveWorth(S).licv], [want, v10], 'tre båter: alle typene, og hjemmelen 10–10,9 m til verdien nå (' + Math.round(v10 / 1e5) / 10 + ' MNOK)');
  storeVessel(S.fleet.find(v => v.id === S.cur)); bindVessel(b);
  t.eq([ty(), saveWorth(S).licv, S.boat.type], [want, v10, 'hurtigsjark'], 'etter å ha gått om bord i hurtigsjarken: de samme typene og den samme verdien');
  // ---- the save as it is stored: the bound vessel's fields are in her row, not at the top
  { storeVessel(b); const o = JSON.parse(JSON.stringify(S)); for (const k of VKEYS) delete o[k]; const w = saveWorth(o), l = saveWorth(S);
    t.eq([w.types.slice().sort().join(','), w.licv, w.bank, w.debt], [want, v10, l.bank, l.debt], 'lagringen slik den ligger lagret gir det samme som spillet i gang'); }
  // ---- structure quotas count in full (as vesselValue), also on a right kept without a boat
  { const l14 = {id:'h14', hl:HJ.h14.hl, since:y, landY:y}; licExtra(l14); const one = licValue(l14, H); structIn(l14, 'h14', H);
    t.near(licValue(l14, H) / one, 1.9, 1e-3, 'en strukturkvote på en hjemmel 14–14,9 m: 0,9 ganger kvota i tillegg');
    S.licFree = [{id:'h14', st:l14.st.slice(), y, H0:H, until:H + 1e5}]; const w = saveWorth(S);
    t.eq(w.licv, v10 + licValue(l14, H), 'en fri hjemmel med strukturkvoten sin teller med begge'); S.licFree = []; }
  bindVessel(S.fleet.find(v => v.id === first));
  t.ok(VESSELS[saveWorth(S).types[0]] && saveWorth(S).types.length === 3, 'typene er nøklene i VESSELS, én per båt');
}
