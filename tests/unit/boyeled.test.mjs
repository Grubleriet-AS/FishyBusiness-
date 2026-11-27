// A mooring buoy leaves a way past it (Jonas 27.11.2026, «Fri led forbi»). The buoy lay her length and 8 m from the nearest land,
// and so in the middle of passages 20-30 m of water wide (Gamvik's way out, the mouth of Værøy verft's basin), where nothing
// bigger than a skiff had a way past her. Now the buoy lies no nearer the coast than the circle she swings on (her length and the
// pennant), the foreshore (MOOR.FORE, as the map has it) and MOOR.LED m of free water between the two.
export default function (t){
  const K = t.K, M = K.get('MOOR');
  t.ok(M.LED >= 16, 'leden forbi en bøye er minst 16 m', M.LED);
  t.eq(M.FORE, K.get('FARB').shore.reach, 'fjæra er så bred som kartet har den');
  t.eq(K.moorBuoyRoom(8), 8 + M.PEN + M.FORE + M.LED, 'bøya ligger minst båtlengden, fortøyningen, fjæra og leden fra land');
  t.ok(K.moorBuoyRoom(8.1) > 28 && K.moorBuoyRoom(7.8) > 36, 'bøyene ved Gamvik (28 og 36 m fra land) får ikke ligge der', [K.moorBuoyRoom(8.1), K.moorBuoyRoom(7.8)]);
}
