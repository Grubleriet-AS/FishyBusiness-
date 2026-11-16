// The feet walking (FB3, steg 121, 16.11.2026; deckcrew.js footStep, footLen, FOT): a foot that stands on the deck stays where it was put
// (in the boat's frame) until it is lifted, at 1.2 and 0.78 m/s, straight and in a turn, at 60 and at 15 frames a second; the step's
// length and beat follow the speed; he steps round when he turns on the spot and takes a last step when he stops; a foot is never put
// further from the hips than the legs reach, nor onto the other foot nor where the deck has something. The same measure on the feet
// as the old gait drew them (a sine with a fixed beat, view3d/08-plants.js before the step) is over a decimetre: the check is red there.
export const scripts = ['js/figpose.js', 'js/deckcrew.js'];
export default function (t){
  const {footStep, footState, footLen, FOT, LEMMER} = t.K, Lg = (LEMMER.STD.th + LEMMER.STD.sn) * 0.98, REACH = Math.sqrt(Lg * Lg - (0.84 - FOT.DROP) ** 2);   // (the figure's legs, the hips down FOT.DROP: 0.36 m)
  // walk a path given as the body's place and heading at time u (s), n frames a second, for secs; the feet's slide while they stand
  const walk = (path, secs, fps, more) => { const s = footState(), dt = 1 / fps, P = [null, null], R = {slide:0, steps:0, far:0, near:9, lens:[], fa:0, cad:[], lift:0};
    for (let i = 0; i <= secs * fps; i++){ const q = path(i * dt), o = footStep(s, Object.assign({x:q[0], z:q[1], h:q[2], dt:i ? dt : undefined, w:[0.12, 0.12], reach:REACH}, more || {}));
      const F = [Math.sin(q[2]), -Math.cos(q[2])], Rt = [Math.cos(q[2]), Math.sin(q[2])];
      const at = [0, 1].map(k => [q[0] + F[0] * o.fa[k] + Rt[0] * o.fr[k], q[1] + F[1] * o.fa[k] + Rt[1] * o.fr[k]]);
      for (const k of [0, 1]){ if (o.plant[k]){ if (P[k]) R.slide = Math.max(R.slide, Math.hypot(at[k][0] - P[k][0], at[k][1] - P[k][1])); else { P[k] = at[k]; R.steps++; } } else P[k] = null;
        if (o.plant[k]) R.fa = Math.max(R.fa, Math.abs(o.fa[k])); R.lift = Math.max(R.lift, o.lift[k]); }
      R.near = Math.min(R.near, Math.hypot(at[0][0] - at[1][0], at[0][1] - at[1][1])); if (o.cad) R.cad.push(o.cad); R.o = o; R.s = s; }
    return R; };
  // (from standing, speeding up as the agents do, FOT.ACC: the distance gone after u s)
  const gone = (v, u) => { const t1 = v / FOT.ACC; return u < t1 ? FOT.ACC * u * u / 2 : v * t1 / 2 + v * (u - t1); };
  const line = v => u => [0, -gone(v, u), 0], arc = (v, r) => u => { const a = gone(v, u) / r; return [r - r * Math.cos(a), -r * Math.sin(a), a]; };

  // 1. the foot that stands, stands still: under 1 cm against the deck from down to up (it is held exactly: under 0.1 mm)
  for (const v of [1.2, 0.78]) for (const fps of [60, 15]) for (const [nm, p] of [['rett fram', line(v)], ['i en sving (r 2 m)', arc(v, 2)]]){
    const r = walk(p, 8, fps); t.ok(r.slide < 0.01 && r.steps > 8, 'foten som står, glir ' + (r.slide * 1000).toFixed(2) + ' mm mot dekket (under 10), ' + v + ' m/s ' + nm + ', ' + fps + ' bilder/s, ' + r.steps + ' steg');
    t.ok(r.fa <= REACH + 1e-6, 'ingen fot som står, lenger fra hofta enn beina rekker (' + (r.fa * 100).toFixed(1) + ' cm av ' + (REACH * 100).toFixed(1) + '), ' + v + ' m/s ' + nm + ', ' + fps + ' bilder/s');
    t.ok(r.near >= FOT.SEP - 0.03, 'føttene kommer ikke i hverandre (nærmest ' + (r.near * 100).toFixed(1) + ' cm), ' + v + ' m/s ' + nm + ', ' + fps + ' bilder/s'); }
  // (the old gait, measured the same way: the foot fa = sw * s * 0.28 with sw = sin(6.5 T), standing while it is not lifted (cos(ph) * s <= 0))
  { let slide = 0; for (const v of [1.2, 0.78]){ const dt = 1 / 60, P = [null, null]; for (let i = 0; i < 480; i++){ const T = i * dt, ph = T * 6.5, y = -v * T;
      for (const k of [0, 1]){ const s = k ? 1 : -1, fa = Math.sin(ph) * s * 0.28, up = Math.max(0, Math.cos(ph) * s) > 0, at = y - fa;   /* (ahead is -z) */ if (!up){ if (P[k] != null) slide = Math.max(slide, Math.abs(at - P[k])); else P[k] = at; } else P[k] = null; } } }
    t.ok(slide > 0.1, 'den gamle gangen (sinus med fast takt) målt likt: foten som står, glir ' + (slide * 100).toFixed(0) + ' cm (over 10: målet ser feilen)'); }

  // 2. the step follows the speed: the length and the beat come of it (the walk ratio), and a faster walker takes longer and quicker steps
  { const a = walk(line(1.2), 8, 60, {reach:1}), b = walk(line(0.78), 8, 60, {reach:1}), cad = r => r.cad.slice(-60).reduce((p, c) => p + c, 0) / 60;
    t.near(a.o.L, 0.657, 0.01, 'steglengden ved 1,2 m/s er ' + a.o.L.toFixed(3) + ' m med beina fri (walk ratio 0,0060: 0,66 m)'); t.near(cad(a), 1.83, 0.05, 'takten ved 1,2 m/s er ' + cad(a).toFixed(2) + ' steg/s (1,83)');
    t.near(b.o.L, 0.53, 0.01, 'steglengden ved 0,78 m/s er ' + b.o.L.toFixed(3) + ' m (0,53)'); t.near(cad(b), 1.47, 0.05, 'takten ved 0,78 m/s er ' + cad(b).toFixed(2) + ' steg/s (1,47)');
    const c = walk(line(1.2), 8, 60), d = walk(line(0.78), 8, 60); t.ok(c.o.L < a.o.L && c.o.L <= REACH * FOT.REACHK / (1 - FOT.SWF / 2) + 1e-9 && cad(c) > cad(a), 'med figurens rekkevidde (' + REACH.toFixed(3) + ' m) er steget ' + c.o.L.toFixed(3) + ' m og takten ' + cad(c).toFixed(2) + ' steg/s ved 1,2 m/s');
    t.ok(d.o.L < c.o.L && cad(d) < cad(c), '0,78 m/s: kortere og saktere steg (' + d.o.L.toFixed(3) + ' m, ' + cad(d).toFixed(2) + ' steg/s)');
    const e = walk(line(1.2), 8, 60, {carry:true}); t.ok(e.o.L < c.o.L - 0.05 && e.o.arm === 0, 'en som bærer, går med kortere steg (' + e.o.L.toFixed(3) + ' m) og uten armsving'); }

  // 3. soft start and stop (the agents' acceleration, FOT.ACC): from standing he starts with a short step and stands square after
  { const A = FOT.ACC, V = 1.2, t1 = V / A, run = 4, d1 = V * t1 / 2; const p = u => { let y; if (u < t1) y = A * u * u / 2; else if (u < t1 + run) y = d1 + V * (u - t1); else { const q = Math.min(t1, u - t1 - run); y = d1 + V * run + V * q - A * q * q / 2; } return [0, -y, 0]; };
    const r = walk(p, t1 * 2 + run + 2, 60), o = r.o; t.ok(r.slide < 0.01, 'med myk start og stopp står foten stille (' + (r.slide * 1000).toFixed(2) + ' mm)');
    t.ok(!o.on && Math.abs(o.fa[0]) < FOT.NEAR + 1e-9 && Math.abs(o.fa[1]) < FOT.NEAR + 1e-9, 'etter stoppen står han med føttene under seg (' + o.fa.map(v => (v * 100).toFixed(1)).join(' og ') + ' cm foran), og gangen gir slipp'); }

  // 4. turning on the spot: he steps round, and the feet are still while they stand
  { const r = walk(u => [0, 0, Math.min(Math.PI, u * 4.5)], 3, 60); t.ok(r.steps >= 4 && r.slide < 0.01, 'en som snur 180° på stedet (4,5 rad/s), tar ' + (r.steps - 2) + ' steg rundt, og foten som står, glir ' + (r.slide * 1000).toFixed(2) + ' mm');
    t.ok(Math.abs(r.o.dh[0]) < FOT.TURN && Math.abs(r.o.dh[1]) < FOT.TURN, 'etterpå peker begge føttene omtrent dit han ser (' + r.o.dh.map(v => (v * 180 / Math.PI).toFixed(0)).join('° og ') + '°)'); }
  // 5. the deck has something where the foot would land: it is put down nearer him, where there is room
  { const r = walk(line(1.2), 6, 60, {ok:(x, z) => !(z < -2 && z > -2.6 && x > 0)}), P = []; FOT.log = P; walk(line(1.2), 6, 60, {ok:(x, z) => !(z < -2 && z > -2.6 && x > 0)}); FOT.log = null;
    t.ok(P.every(q => !(q.z < -2 && q.z > -2.6 && q.x > 0)) && r.slide < 0.01, 'en fot settes aldri ned der dekket har noe (' + P.length + ' steg, ingen i hindringen)'); }
  // 6. a jump in time (a gap over half a second): the feet are put under him at once, nothing swings
  { const s = footState(); footStep(s, {x:0, z:0, h:0, w:[0.12, 0.12], reach:REACH}); const o = footStep(s, {x:5, z:0, h:1, dt:2, w:[0.12, 0.12], reach:REACH}); t.ok(o.plant[0] && o.plant[1] && Math.abs(o.fa[0]) < 1e-9 && !o.on, 'etter et hopp i tid står føttene under ham, ingen svinger'); }
  t.ok(footLen(0, 1) === 0 && Math.abs(footLen(1.2, 0.2) - 0.2 * FOT.REACHK / (1 - FOT.SWF / 2)) < 1e-9, 'footLen: ingen fart, intet steg; rekkevidden setter taket');
}
