// Where a boat of this length may not fish, in words for the buyer (28.11.2026, core/03e-rules.js lenArea): the same lengths as rulesAt,
// høstingsforskriften § 31 (15 m, 21 m) and J-187-2026 § 32 (21–27.99 m inside the baseline, 28 m and over within 4 nm)
export default function (t){
  const K = t.K;
  t.eq(K.lenArea(14.99).length, 0, 'under 15 m: ingen grenser etter lengden');
  const a15 = K.lenArea(15);
  t.ok(a15.length === 1 && /torsk innenfor fjordlinjene/.test(a15[0].no) && a15[0].ref === 'Høstingsforskriften § 31', '15 m: ikke torsk innenfor fjordlinjene', a15);
  const a21 = K.lenArea(21);
  t.ok(a21.length === 2 && /nord for Tysfjorden/.test(a21[0].no) && /innenfor grunnlinjen/.test(a21[1].no) && a21[1].ref === 'J-187-2026 § 32', '21 m: fjordlinjene nord for Tysfjorden og grunnlinjen', a21);
  t.ok(/4 nautiske mil/.test(K.lenArea(28)[1].no), '28 m: 4 nm av grunnlinjen');
  // the boats in the game: the kyst21 (Julian 24.11.2026) gets both lines, the kyst15 the cod line, the sjarks none
  t.eq(K.lenArea(K.VESSELS.kyst21.len).length, 2, 'kyst21 får begge linjene');
  t.eq(K.lenArea(K.VESSELS.kyst15.len).length, 0, 'kyst15 (14,99 m) er under 15 m');
  t.eq(K.lenArea(K.VESSELS.breisjark.len).length, 0, 'breisjarken har ingen');
  // the same limits as the check itself: rulesAt has the same lengths (f31 from 15 m, j32b from 21 m, j32c from 28 m)
  const src = K.rulesAt.toString();
  t.ok(/len >= 15/.test(src) && /len < 21/.test(src) && /len >= 21/.test(src) && /len < 28/.test(src), 'rulesAt har de samme lengdene (15, 21, 28)');
}
