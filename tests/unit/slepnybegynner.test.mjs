// A new player is never stuck after a tow (16.11.2026, the economy check before the launch; core/05-vessels.js rescue, towDone): with no
// overdraft yet (kkOpen false) the tow takes what is on the account and no more, and a tank under TOW_FUEL is filled to it in harbour.
export default function (t){
  const K = t.K;
  if (!('fmt' in globalThis)) globalThis.fmt = (x, d) => x.toFixed(d).replace('.', ',');   // (the UI's, ui/02-format-state.js)
  K.set('S', K.newState()); const S = K.get('S'), b = S.boat; S.fs = {p:0, rest:0, away:0};
  K.set('pressPut', () => null); K.set('towRoutes', () => null); K.set('freeFirst', () => false);
  b.status = 'adrift'; b.port = null; b.fuel = 0; S.cash = 1234;
  K.rescue(true);
  t.ok(!K.kkOpen() && b.tow && b.tow.fee === 1200 && S.cash === 34, 'uten kassekreditt tar slepet det som står på kontoen (rundet ned til hundre), ikke mer', {fee:b.tow && b.tow.fee, cash:S.cash});
  const t0 = b.tow; t0.port = b.tow.port; K.towDone(t0);
  t.ok(b.status === 'port' && b.fuel >= K.TOW_FUEL - 1e-9, 'i havn etter slepet: tanken har minst ' + K.TOW_FUEL + ' L', b.fuel);
  // with the overdraft (an AS), the price as before
  K.set('S', K.newState()); const S2 = K.get('S'), b2 = S2.boat; S2.form = 'AS'; b2.status = 'adrift'; b2.port = null; S2.cash = 1234;
  K.rescue(true); t.ok(b2.tow && b2.tow.fee === K.PRICE.tow, 'med kassekreditt koster slepet som før', b2.tow && b2.tow.fee);
}
