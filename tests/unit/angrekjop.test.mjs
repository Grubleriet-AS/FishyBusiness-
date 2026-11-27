// An admin's correction (26.11.2026, table fixes, ui/10w-fix.js): a vessel bought by trade-in taken back, «as if the purchase never took
// place»: the old type as delivered, the refund (the new price less the 70 % the old one was taken in for), the loans paid down first.
export default function (t){
  const K = t.K;
  const setup = () => { const S = K.newState(); K.set('S', S); K.applyVessel(); return S; };
  t.eq(K.undoBuyKr('kyst21', 'plastsjark'), 9000000 - 595000, 'kyst21 mot plastsjark: 9 000 000 − 70 % av 850 000');
  t.eq(K.undoBuyKr('kyst21', 'nope'), null, 'en ukjent type gir ingen sum');
  const hav = Object.keys(K.VESSELS).find(k => K.VESSELS[k].cls === 'hav');
  t.eq(K.undoBuyKr(hav, 'plastsjark'), null, 'ikke fra havflåten');
  t.eq(K.undoBuyKr('kyst21', hav), null, 'ikke tilbake til havflåten');

  // the trade as the game does it: plastsjark in port, traded in for kyst21 with loans
  let S = setup(); S.boat.type = 'plastsjark'; K.applyVessel(); S.boat.port = S.boat.port || 'x'; S.cash = 2000000; S.sales = [{}, {}, {}]; S.fleet = S.fleet || []; S.crew = S.crew || [];
  const cash0 = S.cash, worth0 = () => S.cash - K.debt();
  const w0 = worth0();
  const x = K.deal(K.VESSELS.kyst21.price, Math.round(K.VESSELS.plastsjark.price * 0.7));
  t.ok(x.ok, 'kjøpet går gjennom (' + x.why + ')');
  K.finance(x, 120); S.boat.type = 'kyst21'; K.applyVessel();
  t.ok(K.debt() > 0, `kjøpet tok lån (${Math.round(K.debt())} kr)`);
  S.crew = [{}, {}, {}, {}, {}];
  t.eq(K.undoBuyWhy({to:'kyst21', from:'sjark'}), null, 'kan angres i havn');
  t.eq(K.undoBuyWhy({to:'snekke', from:'plastsjark'}), 'type', 'ikke når hun ikke er den typen');
  t.eq(K.undoBuyWhy({to:'kyst21', from:'kyst21'}), 'bad', 'ikke til samme type');
  const port = S.boat.port; S.boat.port = null; t.eq(K.undoBuyWhy({to:'kyst21', from:'plastsjark'}), 'port', 'ikke på sjøen'); S.boat.port = port;
  S.cargo = [{kg:5000}]; t.eq(K.undoBuyWhy({to:'kyst21', from:'plastsjark'}), 'hold', 'ikke med mer fisk enn det gamle rommet tar'); S.cargo = [];
  const r = K.undoBuyApply({to:'kyst21', from:'plastsjark'});
  t.ok(r.ok, 'angret');
  t.eq(S.boat.type, 'plastsjark', 'plastsjarken er tilbake');
  t.eq(K.BOAT.len, K.VESSELS.plastsjark.len, 'BOAT er plastsjarkens');
  t.eq(K.debt(), 0, 'lånene fra kjøpet er innfridd');
  t.eq(Math.round(S.cash), Math.round(cash0), `kassa er som før kjøpet (${Math.round(S.cash)} kr)`);
  t.eq(Math.round(worth0()), Math.round(w0), 'kasse minus gjeld er som før kjøpet');
  t.ok(S.crew.length <= K.VESSELS.plastsjark.crewMax, 'mannskapet får plass');
  t.ok(S.boat.fuel <= K.VESSELS.plastsjark.fuelCap, 'drivstoffet får plass');
  t.eq(K.undoBuyApply({to:'kyst21', from:'plastsjark'}).why, 'type', 'to ganger gjør ingenting');
  t.eq(K.undoBuyWhy({to:'kyst21', from:hav, kr:1}), 'bad', 'heller ikke med admins sum tilbake til havflåten');

  // the row is kept in the save: the same id is never done twice, also with a kyst21 bought again
  S = setup(); S.boat.type = 'kyst21'; K.applyVessel(); S.boat.port = 'x'; S.cash = 0; S.fleet = S.fleet || []; S.crew = S.crew || [];
  S.jobs = [{kind:'hold', lv:1, kr:40000, no:'Større lasterom', en:'Bigger hold', until:S.t + 600}, {kind:'paint', kr:5}];
  const r3 = K.undoBuyApply({id:41, to:'kyst21', from:'plastsjark', kr:0});
  t.ok(r3.ok && r3.jobs === 40000 && S.jobs.length === 1 && Math.round(S.cash) === 40000, 'verftsjobben på det nye skroget betales tilbake og tas av køen', r3);
  t.ok(S.fixDone && S.fixDone[41] && S.fixDone[41].ok, 'raden huskes i lagringen');
  S.boat.type = 'kyst21'; K.applyVessel();
  t.eq(K.undoBuyApply({id:41, to:'kyst21', from:'plastsjark', kr:0}).why, 'done', 'samme rad gjøres aldri to ganger, heller ikke med en ny kyst21');

  // with the admin's sum
  S = setup(); S.boat.type = 'kyst21'; K.applyVessel(); S.boat.port = 'x'; S.cash = -4268; S.fleet = S.fleet || []; S.crew = S.crew || [];
  const r2 = K.undoBuyApply({to:'kyst21', from:'plastsjark', kr:100000});
  t.eq(r2.kr, 100000, 'admins sum brukes'); t.eq(Math.round(S.cash), 95732, 'og går til kontoen uten lån');

  // the right bought with her (Julian 27.11.2026: kyst21 with h20, the boat taken back and the right and its loan left)
  S = setup(); S.boat.type = 'sjark'; K.applyVessel(); S.boat.port = 'x'; S.cash = -211065; S.fleet = S.fleet || []; S.crew = S.crew || [];
  const O = K.LIC_OFFERS.find(o => o.id === 'h20' || o.hl === 20 || o.k === 'h20') || K.LIC_OFFERS[K.LIC_OFFERS.length - 1];
  S.lic = {id:O.id, hl:O.hl, kpk:O.kpk, since:K.yearH(S.t / 60), from:'X'}; const lv = K.licValue(S.lic), reg0 = K.npcReg()[O.id];
  K.takeLoan(lv + 500000, 180);
  const d0 = K.debt(), wl0 = S.cash - d0;
  t.eq(K.undoBuyWhy({id:51, lic:'nope'}), 'lic', 'ikke en hjemmel båten ikke har');
  const r5 = K.undoBuyApply({id:51, lic:O.id});
  t.ok(r5.ok && r5.licKr === lv && !S.lic, 'hjemmelen går tilbake, og verdien betales (' + lv + ' kr)', r5);
  t.eq(K.npcReg()[O.id], Math.min(reg0 + 1, K.REGN[O.id] || reg0 + 1), 'registeret får plassen tilbake');
  t.eq(Math.round(K.debt()), Math.round(d0 - lv), 'lånene innfris med verdien');
  t.eq(Math.round(S.cash - K.debt()), Math.round(wl0 + lv), 'kasse minus gjeld går opp med hjemmelens verdi');
  t.eq(S.boat.type, 'sjark', 'båten står');
  t.eq(K.undoBuyApply({id:51, lic:O.id}).why, 'done', 'og aldri to ganger');
  // the boat and the right in one row
  S = setup(); S.boat.type = 'kyst21'; K.applyVessel(); S.boat.port = 'x'; S.cash = 0; S.fleet = S.fleet || []; S.crew = S.crew || [];
  S.lic = {id:O.id, hl:O.hl, kpk:O.kpk, since:K.yearH(S.t / 60), from:'X'};
  const r6 = K.undoBuyApply({id:52, from:'sjark', to:'kyst21', lic:O.id});
  t.ok(r6.ok && S.boat.type === 'sjark' && !S.lic && r6.kr === K.undoBuyKr('kyst21', 'sjark') + K.licValue({id:O.id, hl:O.hl, kpk:O.kpk, since:K.yearH(S.t / 60)}), 'båten og hjemmelen i samme rad', r6);
  // the right's price at the hour of the purchase (licAt), not its value now
  S = setup(); S.boat.type = 'sjark'; K.applyVessel(); S.boat.port = 'x'; S.cash = 0; S.fleet = S.fleet || []; S.crew = S.crew || [];
  S.lic = {id:O.id, hl:O.hl, kpk:O.kpk, since:K.yearH(S.t / 60), from:'X'};
  const at = '2026-11-24T21:46:26Z', Hb = (Date.parse(at) - K.WORLD_T0) * K.GAME_RATE / 60000 / 60, want = K.licValue(S.lic, Hb);
  const r7 = K.undoBuyApply({id:53, lic:O.id, licAt:at});
  t.ok(r7.ok && r7.licKr === want && want !== lv, 'hjemmelen betales med prisen da den ble kjøpt (' + want + ' kr, ikke ' + lv + ')', r7);
}
