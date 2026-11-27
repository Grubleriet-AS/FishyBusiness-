// Steg 155 (27.11.2026; Jonas: «Frakt betaler etter lasten»): a freight mission paid the boat's own hourly curve whatever she carried, so a
// 21 m vessel got 787 800 kr for 400 kg of empty fish boxes. Now the curve is read at the hold the cargo fills a fifth of (TUR.fraktF),
// never under the largest hold of a boat under 11 m (so nothing changes for them) and never over the boat's own; a tow's time is paid
// at most as for the largest boat that is offered a tow of that length (turTowHold). The share of the value in the salvage is as it was.
export default function (t){
  const K = t.K, {TUR, VESSELS, turPay, turCap, turCapOf, turFraktHold, turFraktPay, turTowHold, turSalvage, newState} = K, TUR_GOODS = K.get('TUR_GOODS'), GAME_RATE = K.get('GAME_RATE');
  K.set('S', newState()); const B = K.BOAT, B0 = Object.assign({}, B), as = ty => { for (const k in B) delete B[k]; Object.assign(B, B0, VESSELS[ty]); };
  const h100 = v => Math.max(500, Math.round(v / 100) * 100), curve = hold => TUR.rate0 * Math.pow(Math.max(100, hold) / 350, 0.6), small = Math.max(...Object.values(VESSELS).filter(v => v.len < 11).map(v => v.holdCap));
  t.ok(typeof turFraktPay === 'function' && typeof turTowHold === 'function' && typeof turCapOf === 'function', 'turFraktPay, turTowHold og turCapOf finnes');
  t.eq([TUR.fraktF, small], [0.2, 10000], 'lasten fyller en femdel av lasterommet satsen leses for, og gulvet er det største lasterommet under 11 m (10 tonn)');

  // ---- the case from production: 400 kg on a 21 m vessel, a long mission (18 game hours)
  as('kyst21'); const f = TUR.cls.lang.f, own = turPay(18, f), now = turFraktPay(18, f, 400);
  t.eq(now, h100(curve(small) * 18 / GAME_RATE * f), '400 kg på en 21-meter betaler som for en båt med 10 tonn lasterom: ' + now + ' kr (før ' + own + ' kr)');
  t.ok(now < own * 0.4, 'det er under 40 % av det båtens egen kurve ga');
  t.eq(turFraktPay(18, f, 6000), h100(curve(30000) * 18 / GAME_RATE * f), '6 tonn betaler som for 30 tonn lasterom');
  t.eq([turFraktPay(18, f, 11000), turFraktPay(18, f, 20000)], [own, own], 'fra 11 tonn (en femdel av hennes 55 tonn) betaler hun sin egen sats, og aldri mer');
  t.eq(turPay(18, f), h100(turCap() * 18 / GAME_RATE * f), 'turPay uten last er båtens egen kurve som før (foto, ekkolinje, bestilling)');

  // ---- nothing changes under 11 m, whatever the cargo
  for (const ty of Object.keys(VESSELS).filter(k => VESSELS[k].len < 11)){ as(ty);
    const same = [20, 60, 400, 3000].every(kg => ['kort', 'mid', 'lang'].every(c => turFraktPay(TUR.cls[c].h[0] + 1, TUR.cls[c].f, kg) === turPay(TUR.cls[c].h[0] + 1, TUR.cls[c].f)));
    t.ok(same, ty + ': frakta betaler som før for 20 kg til 3 tonn'); }
  as('kyst15'); t.eq([turFraktPay(6, 1.1, 400) < turPay(6, 1.1), turFraktPay(6, 1.1, 5600)], [true, turPay(6, 1.1)], '15-meteren: 400 kg betaler mindre enn før, 5,6 tonn (en femdel av 28) fullt');
  t.eq(turFraktHold(400), small, 'turFraktHold(400 kg) er gulvet'); t.eq(turFraktHold(8000), 40000, 'turFraktHold(8 tonn) er 40 tonn');

  // ---- the goods: the big boats are offered cargo that pays their own rate, and no boat under 11 m can be offered it
  const big = TUR_GOODS.filter(g => g.kg[0] > 7500), room = ty => (VESSELS[ty].deckCargo + VESSELS[ty].holdCap) * 0.6;
  t.ok(big.length >= 2 && Math.max(...TUR_GOODS.map(g => g.kg[1])) >= 0.2 * VESSELS.kyst21.holdCap * 1.5, 'det finnes last på 8 tonn og mer, opp til minst 16,5 tonn (' + big.map(g => g.no).join('; ') + ')');
  t.eq(Object.keys(VESSELS).filter(k => VESSELS[k].len < 11 && big.some(g => g.kg[0] <= room(k))), [], 'ingen båt under 11 m har plass til den store lasten (dekk og rom, 60 %)');
  t.ok(big.every(g => g.kg[0] <= room('kyst15')) && big.every(g => g.kg[0] >= 0.2 * VESSELS.kyst15.holdCap), '15-meteren har plass til den, og den gir henne full sats');

  // ---- the tow: the time at most as for the largest boat offered a tow of that length; the share of the value as it was
  t.eq([turTowHold(12), turTowHold(8)], [VESSELS.kyst15.holdCap, Math.max(...Object.values(VESSELS).filter(v => v.len <= 8 / 0.75 + 0.01).map(v => v.holdCap))], 'en 12-meter slepes av en båt opp til 16 m (15-meterens rom), en 8-meter av en opp til 10,7 m');
  as('kyst21'); const tow = {h:6, cls:'mid', value:1500000, L:12}, m4 = Object.assign({}, tow, {hold:turTowHold(12)}), part = 1500000 * (0.03 + 0.12 * 0.5);
  t.eq(turSalvage(m4, 0.5), Math.round((turPay(6, 1.1, VESSELS.kyst15.holdCap) + part) / 100) * 100, '21-meteren som sleper en 12-meter: tida etter 15-meterens sats, andelen av verdien som før');
  t.eq(turSalvage(tow, 0.5), Math.round((turPay(6, 1.1) + part) / 100) * 100, 'et slep tatt før endringen (uten m.hold) betaler det som ble lovet');
  as('sjark'); { const L = 10, m = {h:3, cls:'kort', value:900000, L, hold:turTowHold(L)}; t.eq(turSalvage(m, 0.5), turSalvage(Object.assign({}, m, {hold:undefined}), 0.5), 'sjarken som sleper en 10-meter får det samme som før'); }
  // ---- the board when the game is updated: what waits is paid by the new rule where that is less, what is taken as promised
  as('kyst21'); { const S = K.get('S'), old = turPay(18, f), mk = () => ({k:'frakt', cls:'lang', h:18, kg:400, base:old, pay:old, what:['tomme fiskekasser', 'empty fish boxes']});
    const slep = {k:'slep', cls:'mid', h:6, L:12, value:1500000, p:{x:1000, y:100}}; slep.base = turSalvage(slep, K.turDanger(slep.p)); slep.pay = slep.base; const slep0 = slep.pay;
    const heavy = Object.assign(mk(), {kg:12000});
    S.turer = {board:[mk(), slep, heavy], act:[mk()], done:[], seq:0, at:null, tip:{t:0, n:0, k:0, said:0}, mech:0, v:3, slots:4};
    const T = K.turState();
    t.eq([T.v, T.board[0].pay, T.board[0].base, T.act[0].pay], [4, turFraktPay(18, f, 400), turFraktPay(18, f, 400), old], 'på tavla betaler 400 kg nå ' + T.board[0].pay + ' kr; det samme oppdraget som alt er tatt, betaler de lovede ' + old + ' kr');
    t.ok(T.board[1].hold === 28000 && T.board[1].pay < slep0 && T.board[1].pay === turSalvage(T.board[1], K.turDanger(slep.p)), 'slepet på tavla har fått 15-meterens sats for tida: ' + T.board[1].pay + ' kr (før ' + slep0 + ' kr)');
    t.eq(T.board[2].pay, old, 'tolv tonn på tavla betaler det samme som før'); K.turState(); t.eq(K.get('S').turer.board[0].pay, turFraktPay(18, f, 400), 'og en gang til endrer ingenting'); }
  for (const k in B) delete B[k]; Object.assign(B, B0);
}
