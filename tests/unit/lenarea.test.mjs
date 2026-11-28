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
  // the same limits as the check itself: one table, RU_LEN, read by rulesAt and lenArea (the kontroll 28.11.2026: a regex on the source
  // would not see a changed limit); a changed limit changes the card, and rulesAt has no length of its own left
  const src = K.rulesAt.toString(), f0 = K.RU_LEN.f31; K.RU_LEN.f31 = 16; const moved = K.lenArea(15).length; K.RU_LEN.f31 = f0;
  t.ok(moved === 0 && K.lenArea(15).length === 1, 'lenArea leser grensene fra RU_LEN');
  t.ok(/RU_LEN\.f31\b/.test(src) && /RU_LEN\.j32c/.test(src) && !/len >= 15|len < 21|len >= 21|len < 28/.test(src), 'rulesAt leser de samme grensene og har ingen egne igjen');
}
