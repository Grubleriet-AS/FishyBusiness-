// Steg 155 (27.11.2026; Jonas: «Frakt betaler etter lasten»): a freight mission paid the boat's own hourly curve whatever she carried, so a
// 21 m vessel got 787 800 kr for 400 kg of empty fish boxes. Now the curve is read at the hold the cargo fills a fifth of (TUR.fraktF),
// never under the largest hold of a boat under 11 m (so nothing changes for them) and never over the boat's own; a tow's time is paid
// at most as for the largest boat that is offered a tow of that length (turTowHold). The share of the value in the salvage is as it was.
export default function (t){
  const K = t.K, {TUR, VESSELS, turPay, turCap, turCapOf, turFraktHold, turFraktPay, turTowHold, turSalvage, turSmallHold, newState, ensureFleet, applyVessel} = K, TUR_GOODS = K.get('TUR_GOODS'), HOLDUP = K.get('HOLDUP'), GAME_RATE = K.get('GAME_RATE');
  K.set('S', newState()); ensureFleet(); const S = K.get('S'), B = K.BOAT, ty0 = S.boat.type;
  // the boat as the game binds her, with the yard's bigger hold (holdLv 0–3): the independent check of the step found the first version
  // of the rule read the hold she was delivered with, so a breisjark with a rebuilt hold was paid less than before
  const as = (ty, lv = 0) => { S.boat.type = ty; S.boat.holdLv = lv; applyVessel(); return B.holdCap; };
  const h100 = v => Math.max(500, Math.round(v / 100) * 100), curve = hold => TUR.rate0 * Math.pow(Math.max(100, hold) / 350, 0.6), LV = [0, 1, 2, 3];
  const under = Object.keys(VESSELS).filter(k => VESSELS[k].len < 11), coast = Object.keys(VESSELS).filter(k => VESSELS[k].len >= 11 && VESSELS[k].len < 28);
  const small = Math.max(...under.map(k => as(k, HOLDUP.length)));
  t.ok(typeof turFraktPay === 'function' && typeof turTowHold === 'function' && typeof turCapOf === 'function' && typeof turSmallHold === 'function', 'turFraktPay, turTowHold, turCapOf og turSmallHold finnes');
  t.eq([TUR.fraktF, turSmallHold && turSmallHold(), coast], [0.2, small, ['kyst15', 'kyst21']], 'lasten fyller en femdel av rommet satsen leses for; gulvet er det største rommet en båt under 11 m kan ha, med verftets ombygging (' + small + ' kg)');

  // ---- the case from production: 400 kg on a 21 m vessel, a long mission (18 game hours)
  as('kyst21'); const f = TUR.cls.lang.f, own = turPay(18, f), now = turFraktPay(18, f, 400);
  t.eq(now, h100(curve(small) * 18 / GAME_RATE * f), '400 kg på en 21-meter betaler som for den største sjarken: ' + now + ' kr (før ' + own + ' kr)');
  t.ok(now < own * 0.55, 'det er under 55 % av det båtens egen kurve ga');
  t.eq(turFraktPay(18, f, 6000), h100(curve(30000) * 18 / GAME_RATE * f), '6 tonn betaler som for 30 tonn lasterom');
  t.eq([turFraktPay(18, f, 11000), turFraktPay(18, f, 20000)], [own, own], 'fra 11 tonn (en femdel av hennes 55 tonn) betaler hun sin egen sats, og aldri mer');
  t.eq(turPay(18, f), h100(turCap() * 18 / GAME_RATE * f), 'turPay uten last er båtens egen kurve som før (foto, ekkolinje, bestilling)');

  // ---- nothing changes under 11 m, whatever the cargo and whatever hold the yard has built her
  for (const ty of under){ const bad = [];
    for (const lv of LV){ as(ty, lv); for (const kg of [20, 60, 400, 3000, 8000, 20000]) for (const c of ['kort', 'mid', 'lang']){ const h = TUR.cls[c].h[0] + 1; if (turFraktPay(h, TUR.cls[c].f, kg) !== turPay(h, TUR.cls[c].f)) bad.push(lv + ':' + kg); } }
    t.eq(bad, [], ty + ': frakta betaler som før for 20 kg til 20 tonn, med hvert lasterom verftet bygger'); }
  for (const lv of LV){ const hold = as('kyst15', lv); t.eq([turFraktPay(6, 1.1, 400) < turPay(6, 1.1), turFraktPay(6, 1.1, Math.ceil(hold * 0.2))], [true, turPay(6, 1.1)], '15-meteren med rom ' + hold + ' kg: 400 kg betaler mindre enn før, en femdel av rommet fullt'); }
  as('kyst21'); t.eq(turFraktHold(400), small, 'turFraktHold(400 kg) er gulvet'); t.eq(turFraktHold(20000), 100000, 'turFraktHold(20 tonn) er 100 tonn');

  // ---- the goods: the coastal vessels over 11 m are offered cargo that pays their own rate with every hold, and only they are offered it
  const big = TUR_GOODS.filter(g => g.big), room = () => (B.deckCargo + B.holdCap) * 0.6;
  t.eq([big.length, TUR_GOODS.filter(g => !g.big).length, TUR_GOODS.filter(g => !g.big).every(g => g.kg[1] <= 3000)], [2, 8, true], 'to store varer, og de åtte fra før står som de sto (kappløpets vare trekkes blant dem)');
  { const bad = []; for (const ty of coast) for (const lv of LV){ const hold = as(ty, lv); for (const g of big) for (const u of [0, 0.5, 0.999]){
      const kg = Math.round(Math.min(g.kg[1], room() * 0.6 / 0.6, Math.max(g.kg[0], hold * (0.2 + u * 0.3))) / 10) * 10; if (g.kg[0] > room() || turFraktPay(6, 1.1, kg) !== turPay(6, 1.1)) bad.push(ty + lv + ':' + g.kg[0] + ':' + kg); } }
    t.eq(bad, [], '15- og 21-meteren har plass til begge med hvert lasterom, og hvert trekk tavla gjør av dem, gir full sats'); }

  // ---- the tow: under 11 m as before; over it, the time at most as for the largest boat offered a tow of that length, never under the floor
  for (const ty of under){ const bad = []; for (const lv of LV){ as(ty, lv); for (const L of [5.5, 5.9, 7, 8.4, 10, 12]){ const m = {h:3, cls:'kort', value:600000, L, hold:turTowHold(L)}; if (turSalvage(m, 0.5) !== turSalvage(Object.assign({}, m, {hold:undefined}), 0.5)) bad.push(lv + ':' + L); } }
    t.eq(bad, [], ty + ': slepet betaler som før for en havarist på 5,5 til 12 m'); }
  { const bad = []; for (const lv of LV){ as('kyst15', lv); for (const L of [11.2, 11.6, 12]){ const m = {h:6, cls:'mid', value:900000, L, hold:turTowHold(L)}; if (turSalvage(m, 0.5) !== turSalvage(Object.assign({}, m, {hold:undefined}), 0.5)) bad.push(lv + ':' + L); } }
    t.eq(bad, [], '15-meteren som sleper det tavla gir henne (11,2 til 12 m), får det samme som før med hvert lasterom'); }
  const k15 = as('kyst15', HOLDUP.length); as('kyst21');
  t.eq([turTowHold(12), turTowHold(7)], [k15, small], 'en 12-meter slepes av en båt opp til 16 m (15-meterens største rom, ' + k15 + ' kg); en 7-meter (PAN-PAN) aldri under gulvet');
  const tow = {h:6, cls:'mid', value:900000, L:12}, m4 = Object.assign({}, tow, {hold:turTowHold(12)}), part = 900000 * (0.03 + 0.12 * 0.5);
  t.eq(turSalvage(m4, 0.5), Math.min(900000, Math.round((turPay(6, 1.1, k15) + part) / 100) * 100), '21-meteren som sleper en 12-meter: tida etter 15-meterens sats, andelen av verdien som før (' + turSalvage(m4, 0.5) + ' kr)');
  t.eq(turSalvage(tow, 0.5), Math.min(900000, Math.round((turPay(6, 1.1) + part) / 100) * 100), 'et slep tatt før endringen (uten m.hold) betaler det som ble lovet (' + turSalvage(tow, 0.5) + ' kr)');
  t.ok(turSalvage(m4, 0.5) < turSalvage(tow, 0.5), 'og det er mindre enn før');

  // ---- the board when the game is updated: what waits is paid by the new rule where that is less, what is taken as promised
  { const old = turPay(18, f), mk = () => ({k:'frakt', cls:'lang', h:18, kg:400, base:old, pay:old, what:['tomme fiskekasser', 'empty fish boxes']});
    const slep = {k:'slep', cls:'mid', h:6, L:12, value:900000, p:{x:1000, y:100}}; slep.base = turSalvage(slep, K.turDanger(slep.p)); slep.pay = slep.base; const slep0 = slep.pay;
    const heavy = Object.assign(mk(), {kg:12000}), state = () => ({board:[mk(), Object.assign({}, slep), heavy], act:[mk()], done:[], seq:0, at:null, tip:{t:0, n:0, k:0, said:0}, mech:0, v:3, slots:1});
    S.turer = state(); const T = K.turState();
    t.eq([T.v, T.board[0].pay, T.board[0].base, T.act[0].pay], [4, turFraktPay(18, f, 400), turFraktPay(18, f, 400), old], 'på tavla betaler 400 kg nå ' + T.board[0].pay + ' kr; det samme oppdraget som alt er tatt, betaler de lovede ' + old + ' kr');
    t.ok(T.board[1].hold === k15 && T.board[1].pay < slep0 && T.board[1].pay === turSalvage(T.board[1], K.turDanger(slep.p)), 'slepet på tavla har fått 15-meterens sats for tida: ' + T.board[1].pay + ' kr (før ' + slep0 + ' kr)');
    t.eq(T.board[2].pay, old, 'tolv tonn på tavla betaler det samme som før'); K.turState(); t.eq(S.turer.board[0].pay, turFraktPay(18, f, 400), 'og en gang til endrer ingenting');
    // a company with more than one boat: the board does not say which boat an offer was made for, so it is made anew
    S.turer = state(); S.fleet.push(Object.assign({}, S.fleet[0], {id:'v9'})); const T2 = K.turState(); S.fleet.pop();
    t.eq([T2.v, T2.board.length, T2.slots, T2.act[0].pay], [4, 0, TUR.boardMax, old], 'med flere båter i rederiet lages tavla på nytt (den sier ikke hvilken båt et tilbud ble laget for); det som er tatt, står'); }
  S.boat.type = ty0; S.boat.holdLv = 0; applyVessel();
}
