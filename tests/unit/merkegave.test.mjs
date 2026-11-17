// The gifts of the long badges (core/09f-merker.js ACHL, achLScale; Jonas 17.11.2026, valg A: «Skala etter trinn»): a badge's first
// step is often «once» (one trip without harm, one night, one other player met), and a new game takes ten to seventeen of them in its
// first hours. At ×3 for every step the rare envelope came to 45 000–75 000 kr and the free gear to 75 000 kr, so the gifts paid three to
// five times what the fishing did (seen in the saves of 17.11.2026). Now the scale follows the step: ×1, ×1.5, ×2.5, then ×3 as before.
export default function (t){
  const K = t.K; const S = K.newState(); K.set('S', S);
  t.eq([0, 1, 2, 3, 4, 6].map(i => K.achLScale(i)), [1, 1.5, 2.5, 3, 3, 3], 'skalaen etter trinn: ×1, ×1,5, ×2,5, så ×3');
  // a gift kept from the first trip carries its scale in the save (S.ach.owe); a long badge's step is given at the step's scale
  t.eq(K.achOweScale('safe0', 3), 1, 'en gave for første trinn som venter fra første tur, gis med ×1 (lagret med ×3 før 17.11.2026)');
  t.eq(K.achOweScale('fisk2', 3), 2.5, 'tredje trinn ×2,5');
  t.eq(K.achOweScale('took', 1), 1, 'en milepæl i et kapittel beholder skalaen sin');
  t.eq(K.achOweScale('fs5', 2.5), 2.5, 'kapittelmilepælen fs5 beholder ×2,5 (den leses ellers som trinn 5 av fartstiden «fs»)');
  // the largest gifts a first step can give, at the top of the draw: the envelope 25 000 kr at ×1 (was 75 000 at ×3), and gear of at most
  // 25 000 kr (the pool's own cap, 25 000 × the scale)
  const had = globalThis.kr; globalThis.kr = v => v + ' kr';   // (the UI's formatter, not in the core; the gifts' texts use it)
  const env = K.achPool(K.achLScale(0)).filter(x => x.tier === 2).map(x => x.f(0.9999).t[0]).map(s => /konvolutt[^\d]*(\d+) kr/.exec(s)).filter(Boolean).map(m => +m[1]);
  t.eq(env, [25000], 'konvolutten på første trinn er høyst 25 000 kr');
  const gear = K.achPool(K.achLScale(0)).filter(x => x.tier === 2).flatMap(x => [0, 0.3, 0.6, 0.9999].map(r => x.f(r).t[1]))
    .map(s => /The yard gives you the (.+)\. It is fitted/.exec(s)).filter(Boolean).map(m => Object.values(K.EQUIP).find(E => E.name.en === m[1]).price);
  t.ok(gear.length > 0 && gear.every(p => p <= 25000), 'utstyr gitt på første trinn finnes og koster høyst 25 000 kr', gear);
  // through achCheck itself: a long badge reaching its first step, and a gift kept from the first trip, are given at the step's scale
  const got = []; K.set('achGive', (key, scale) => { got.push([key, scale]); return null; });
  const A = K.achState(); for (const L0 of K.ACHL){ A.lk[L0.id] = 1; A.l[L0.id] = L0.v() >= L0.tiers[0] ? 1 : 0; }
  A.c.safe = 1; A.owe = [['natt0', 3, ['Nattfiske', 'Night fishing']]];
  K.achCheck(true);
  t.ok(got.some(g => g[0] === 'safe0' && g[1] === 1), 'achCheck gir første trinn av «Turer uten skade» med ×1', got);
  t.ok(got.some(g => g[0] === 'natt0' && g[1] === 1), 'achCheck gir en ventende gave for første trinn med ×1', got);
  globalThis.kr = had;
}
