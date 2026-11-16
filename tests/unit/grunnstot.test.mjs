// Aground in the first weeks (Jonas 16.11.2026, before the launch): runAground (core/01-world.js) keeps the hull as it was (b.agSnap, on
// the boat itself) and the moment for us (a report in the queue S.agQ: where, from where, the speed, how she was steered, the chart's depth, the route), whatever the player
// answers; agFree (core/05-vessels.js) puts her on safe water with the hull as before, every time, with no wait. AG.free false takes it
// away. (The map is not loaded here: the safe water is laid by hand as unstuckSpot finds it in the game.)
export default function (t){
  const K = t.K;
  if (!('fmt' in globalThis)) globalThis.fmt = (x, d) => x.toFixed(d).replace('.', ',');   // (the UI's, ui/02-format-state.js)
  K.set('S', K.newState()); const S = K.get('S'), b = S.boat; b.type = 'sjark'; K.applyVessel();
  K.set('nearestPlace', () => ({no:'Hamn', en:'Hamn'})); K.set('pressPut', () => null);   // (the place's name and Kystposten, not tried here)
  const at = K.P(69.30, 17.55), from = {x:at.x - 0.01, y:at.y};
  b.pos = {x:from.x, y:from.y}; b.heading = Math.PI / 2; b.status = 'sailing'; b.v = 7; b.port = null;
  b.dmg = {s:0.1, h:0, A:0, w:0}; const dmg0 = JSON.stringify(b.dmg);
  K.runAground({x:at.x, y:at.y});
  t.ok(b.status === 'aground' && b.dmg && b.dmg.h > 0, 'på grunn i 7 knop: skroget er skadet', b.dmg);
  t.ok(b.agSnap && JSON.stringify(b.agSnap.dmg) === dmg0, 'skroget slik det var før, er tatt vare på på båten (b.agSnap)', b.agSnap);
  const R = (S.agQ || [])[0];
  t.ok(R && R.at && R.from && R.v === 7 && R.how === 'drift' && R.hd === 90 && R.type === 'sjark' && R.ans === null && Math.abs(R.at[0] - 69.30) < 1e-3 && R.from[1] < R.at[1],
    'øyeblikket er lagret i køen: hvor, hvor hun kom fra, farten, kursen, styringen og båttypen (S.agQ)', R);
  t.ok(R.me === true && R.vid === S.cur && R.id, 'rapporten har båtens id, og spilleren var om bord');
  // the safe water as unstuckSpot finds it in the game (it reads the map, not loaded here)
  const sea = {x:at.x - 0.4, y:at.y}; K.set('unstuckSpot', () => sea);
  t.ok(K.agCan(), 'tilbudet om å flytte båten ut står (agCan)');
  const at0 = S.unstuckAt = Date.now() - 60e3;   // (used a minute ago «Sitter båten fast?»: the ten minutes' wait does not hold for this)
  t.eq(K.agFree(), null, 'agFree flytter båten ut');
  t.ok(b.status === 'idle' && b.v === 0 && Math.abs(b.pos.x - sea.x) < 1e-9 && JSON.stringify(b.dmg) === dmg0 && !b.agSnap && !K.agCan(),
    'båten ligger stille på trygt vann, med skroget som før grunnstøtingen, og tilbudet er brukt', {st:b.status, dmg:b.dmg, pos:b.pos});
  t.ok((S.incidents || []).filter(i => i.k === 'aground').pop().freed === true, 'grunnstøtingen er merket som flyttet ut');
  t.ok(S.agQ.length === 1 && S.agQ[0] === R, 'rapporten venter fortsatt på å bli sendt (det gjør UI-et)');
  t.ok(S.unstuckAt === at0, '«Sitter båten fast?» er sperret som før flyttingen, ikke ti nye minutter', S.unstuckAt - at0);
  // the switch: off, no offer
  b.pos = {x:from.x, y:from.y}; b.status = 'sailing'; b.v = 5; K.runAground({x:at.x, y:at.y});
  t.ok(S.agQ.length === 2 && S.agQ[0] === R && S.agQ[1].v === 5, 'en ny grunnstøting før den første er sendt: begge rapportene står i køen', S.agQ.map(r => r.v));
  K.AG.free = false;
  t.ok(!K.agCan() && Array.isArray(K.agFree()) && b.status === 'aground', 'AG.free av: ikke noe tilbud, båten står');
  K.AG.free = true;
}
