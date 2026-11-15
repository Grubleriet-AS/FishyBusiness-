// Steg 125b (Jonas 14.11.2026: no standard stations, the boats keep their own layouts; docs/planer/arbeidsceller.md «Valgt»): the
// working zone. The fixed things (the hauler, the gutting table, the bleeding tub, the ice box, where the fish is let fall) are read
// where each boat has them, and for each station it is told whether what the man works with lies in a roomy zone before him as he
// stands and faces today: a thing his hands stay on (hold) within HOLD m and HOLD_A rad of straight ahead, a thing he fetches from or
// fetches from (reach) within REACH m and REACH_A rad (he may turn and lean for it), a thing he throws a fish to (throw) within 2 m.
// First run 14.11.2026: 52 of 93 things outside, the same on all eight coast boats: the bleeding tub 1.4 to 4.1 m from the gutter, the
// packer's crate 1.2 to 4 m behind him, the fish let fall behind the hauler. After Jonas' choice A the gutter's fish come from and go
// to crates the code put beside him (HOLDT.gutbox, out again in steg 125e: since then the tub by his hand and the hatch or the fish tub are measured here), the fish is let fall to
// the hauler's side (BLEED.side), and the bleeder throws to the tub. The coast's boats are held to it; the sea-going ones with a
// factory (cls 'hav') are told only.
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;
export const ZONE = {hold:[0.3, 0.75, 1.05], reach:[0.3, 1.05, 1.92], throw:[0.3, 2.0, 1.92], edge:[0, 0.75, 1.92], out:[0.3, 2.2, 3.15]};   // (edge: the nearest edge of the tub; out: the hatch or the fish tub, within 2.2 m whichever way: he turns to throw, steg 125d's rule)   // m at the least and the most, rad to either side of ahead

export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {VESSELS, CREW3D, applyVessel, LEMMER} = K, b = S.boat, was = LEMMER.on; LEMMER.on = true;
  const out = [], hav = [], rows = []; let nSt = 0, nBoats = 0;
  for (const vt of Object.keys(VESSELS)){ S.tut = 0; S.me = S.cur; b.type = vt; applyVessel(); CREW3D.reset(); if (!CREW3D.on()) continue; nBoats++;
    const ST = CREW3D._st, G = ST.G, PL = CREW3D.places(), d = G.deck || {y:G.gw, z:0}, Bm = G.beam || 3, W = G.work, HP = G.hauler || [Bm / 2 * 0.92, d.y + 1, d.z - 1.3];
    const pt = n => { const c = ST.PT[n]; return c && c.k != null && ST.M0.ok(c.k) ? [ST.M0.at(c.k)[0], ST.M0.at(c.k)[2], c.h || 0] : null; };
    const table = W ? [W.table[0], W.table[2]] : [-(Bm / 2 - 0.42), d.z], tub = PL.tub, ice = G.kit && G.kit.iskasse ? [G.kit.iskasse[0], G.kit.iskasse[2]] : null;
    const Sl = pt('sloy'), Is = W && W.nopack ? null : pt('is'), Ha = PL.haul[0], Bl = PL.solo ? null : PL.bleed,   // (steg 125d: no packer on deck where the hold is iced, no bleeder where the hauler bleeds)
         tl = W && W.tl ? W.tl / 2 : 0, tAt = (P0) => !P0 || !tl ? table : [table[0], Math.max(table[1] - tl, Math.min(table[1] + tl, P0[1]))], crate = Is ? [Is[0] + Math.sin(Is[2]) * 0.58, Is[1] - Math.cos(Is[2]) * 0.58] : null;
    const Hh = G.hatch && (Array.isArray(G.hatch) ? G.hatch : G.hatch.at), hatch = Hh && G.hatchSize && W && W.nopack ? [Hh[0], Hh[2]] : null,
         KP = !hatch && VESSELS[vt].kar && G.kit && G.kit.tubs ? G.kit.tubs : [], kar = KP.length && Sl ? KP.map(q => [q[0], q[2]]).sort((p, q) => Math.hypot(p[0] - Sl[0], p[1] - Sl[1]) - Math.hypot(q[0] - Sl[0], q[1] - Sl[1]))[0] : null,
         // (the bleeding tub's nearest edge to him: 0.72 x 1.08 m at its scale and turn, as tests/unit/dekkplan.test.mjs has it)
         // (the hatch where the fish goes in: its nearest edge and 0.3 m in over the opening, G.hatchSize, as tests/unit/dekkplan.test.mjs has it)
         hatchIn = P0 => { const HS = G.hatchSize, ex = Math.max(-HS[0] / 2, Math.min(HS[0] / 2, P0[0] - hatch[0])), ez = Math.max(-HS[1] / 2, Math.min(HS[1] / 2, P0[1] - hatch[1])), q = [hatch[0] + ex, hatch[1] + ez], l = Math.hypot(hatch[0] - q[0], hatch[1] - q[1]), u = l > 1e-6 ? Math.min(1, 0.3 / l) : 0; return [q[0] + (hatch[0] - q[0]) * u, q[1] + (hatch[1] - q[1]) * u]; },
         tubEdge = P0 => { const ts = (W && W.s) || 1, ry = (W && W.ry) || 0, c = Math.cos(ry), sn = Math.sin(ry), dx = P0[0] - tub[0], dz = P0[1] - tub[1], a = c * dx - sn * dz, bb = sn * dx + c * dz, ca = Math.max(-0.36 * ts, Math.min(0.36 * ts, a)), cb = Math.max(-0.54 * ts, Math.min(0.54 * ts, bb)); return [tub[0] + c * ca + sn * cb, tub[1] - sn * ca + c * cb]; };
    const ST8 = [['haler', Ha, [['haleren', [HP[0], HP[2]], 'hold'], ['slippet', PL.drop, 'reach']]],
      ['bløgger', Bl, [['fisken', PL.drop, 'reach'], ['karet', tub, 'throw']]],
      // (steg 125e: and the bled fish come from the tub by his hand and go to the hatch or the fish tub, not to crates beside him)
      ['sløyer', Sl, [['bordet', tAt(Sl), 'hold'], ['bløggekaret', Sl && tubEdge(Sl), 'edge'], [hatch ? 'luka' : 'fiskekaret', hatch && Sl ? hatchIn(Sl) : kar, 'out']]],   // (a long table of her own, work.tl: the part of it before him)
      ['pakker', Is, [['iskassa', ice && Is && Math.hypot(ice[0] - Is[0], ice[1] - Is[1]) < 1.35 ? ice : null, 'reach']]]];   // (further off than 1.35 m he takes the ice from the bin at his side, drawDeckCrew)
    for (const [nm, P, things] of ST8){ if (!P) continue; nSt++;
      for (const [tn, q, kind] of things){ if (!q) continue; const dx = q[0] - P[0], dz = q[1] - P[1], dist = Math.hypot(dx, dz); let a = Math.atan2(dx, -dz) - P[2]; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
        const Z = ZONE[kind], ok = dist >= Z[0] - 0.005 && dist <= Z[1] + 0.005 && Math.abs(a) <= Z[2] + 0.01; rows.push([vt, nm, tn, dist, a, ok]);
        if (!ok) (VESSELS[vt].cls === 'hav' ? hav : out).push(vt + ' ' + nm + ': ' + tn + ' ' + dist.toFixed(2) + ' m, ' + Math.round(a * 180 / Math.PI) + '°'); } } }
  LEMMER.on = was;
  // (known: the open snekke has no spot to the hauler's side on her deck, and the fish falls behind him as before)
  const KNOWN = ['snekke haler: slippet', 'snekke sløyer: bløggekaret']   /* (steg 125d, Jonas 15.11.2026: on the snekke the tub stands aslant behind him, accepted) */, left = out.filter(s => !KNOWN.some(k => s.startsWith(k)));
  t.ok(rows.length > 20 && !left.length, 'på kystbåtene ligger det mannen arbeider med, i sonen foran ham (' + rows.length + ' ting på ' + nBoats + ' båttyper; kjent utenfor: ' + (out.filter(s => !left.includes(s)).join('; ') || 'ingen') + ')' + (left.length ? ' | utenfor: ' + left.join('; ') : ''));
  console.log('havbåtene, bare opplysning: ' + hav.length + ' ting utenfor (fabrikk om bord)');
}
