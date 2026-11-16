// Who is drawn in the skipper's place on the boat you look at (core/09i-look.js leadAboard, lookLead, lookCrew; tilbakemelding #10 fra
// testutgaven, 15.11.2026): you when you are aboard; on a boat you only follow, her acting skipper, and the hands are the others aboard.
export default function (t){
  const K = t.K; K.set('S', K.newState());
  const S = K.get('S');
  const a = K.genCrew(), b = K.genCrew(); a.name = 'A'; b.name = 'B';
  for (const c of [a, b]) Object.assign(c, {bi:false, biDays:null, off:false, sleepW:false});   // genCrew makes a part-timer one time in nine (bi), away on some weekdays
  S.crew = [a, b]; S.look = null;
  const sig = l => l ? K.lookKey(l) : null;
  // aboard: you at the wheel, the first of the crew the first hand
  S.me = S.cur;
  t.ok(K.meAboard(), 'om bord på egen båt');
  t.eq(K.leadAboard(), null, 'om bord: ingen av mannskapet står på skipperens plass');
  t.eq(sig(K.lookLead()), sig(K.lookMe()), 'om bord: skipperens plass har ditt utseende');
  t.eq(sig(K.lookCrew(0)), sig(K.lookOf(a)), 'om bord: første hånd er den første i mannskapet');
  // following a boat you are not aboard, with B named her skipper: B in the skipper's place, A the first hand, and you nowhere
  S.me = 'annen'; K.setSkipper(b.id);
  t.ok(!K.meAboard(), 'du følger en båt du ikke er om bord på');
  t.eq((K.leadAboard() || {}).name, 'B', 'den fungerende skipperen står på skipperens plass');
  t.eq(sig(K.lookLead()), sig(K.lookOf(b)), 'skipperens plass har skipperens utseende');
  t.ok(sig(K.lookLead()) !== sig(K.lookMe()), 'og ikke ditt');
  t.eq(sig(K.lookCrew(0)), sig(K.lookOf(a)), 'første hånd er den andre om bord');
  t.eq(K.lookCrew(1), null, 'skipperen er ikke også en av hendene');
  // no skipper named: the first aboard takes the place
  delete b.sk;
  t.eq((K.leadAboard() || {}).name, 'A', 'uten utnevnt skipper: den første om bord');
  t.eq(sig(K.lookCrew(0)), sig(K.lookOf(b)), 'og den andre er første hånd');
  // the skipper ashore (off): the first of those aboard
  K.setSkipper(b.id); b.off = true;
  t.eq((K.leadAboard() || {}).name, 'A', 'skipperen er i land: den første om bord tar plassen');
  t.eq(K.lookCrew(0), null, 'og ingen hånd står igjen');
}
