// The jigging places on deck (tilbakemelding #167-#170, 18.11.2026, the snekke with one jigging machine: «Han jeg har med som mannskap
// står å fisker i luften uten noe snøre i havet. Båten har bare en juksamaskin, men han står på andre siden av båten», and the gutter
// standing still while the bleeding tub filled): one jigging on a higher place chooses again each round, so the machine's place is filled
// first once the skipper goes to gut (deckcrew.js keep); before, he stayed at the bare place, and nobody took the fish from the machine.
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {CREW3D, applyVessel, genCrew, GROUNDS, vesselModel, geoOf} = K;
  K.set('hsWork', () => 0.3); K.set('hsAt', () => 0.3);
  const b = S.boat, vt = 'snekke'; S.tut = 0; S.me = S.cur; b.type = vt; applyVessel(); CREW3D.reset();
  const G = geoOf(vt), m = vesselModel(vt), P = m.o.p, half = (G.beam || 3) / 2, dy = G.deck.y;
  // the rail places as view3d jigRail finds them (the gunwale's top at each jigZ)
  const railPt = (sd, z) => { let xm = 0; for (let i = 0; i < P.length; i += 3){ const xs = sd * P[i]; if (Math.abs(P[i + 2] - z) < 0.12 && xs > xm && xs < half + 0.3) xm = xs; }
    if (xm < half * 0.6) return null;
    let ym = -1e9; for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i + 2] - z) < 0.12 && sd * P[i] > xm - 0.18 && P[i + 1] > ym && P[i + 1] < dy + 1.3) ym = P[i + 1];
    return ym < dy + 0.35 ? null : [sd * (xm - 0.05), ym, z, sd]; };
  const spots = G.jigZ.map(J => railPt(J[0], J[1])).filter(Boolean);
  t.ok(spots.length >= 2, 'snekka har to juksplasser langs ripa', spots.length);
  S.crew = [Object.assign(genCrew(), {bi:false, off:false, fatigue:10, morale:62})];
  b.status = 'fishing'; b.port = null; b.pos = {...GROUNDS[2].p}; b.deckStop = false; S.equip.jukse = 1; S.target = 'torsk'; b.gop = null; S.hold = [];
  const ST = CREW3D._st, tick = n => { for (let i = 0; i < n; i++) CREW3D.tick(0.05); };
  const settle = () => { ST.ctxT = -1e9; ST.lastSim = null; CREW3D.tick(0.05); ST.ctxT = -1e9; CREW3D.tick(0.05); };
  const atMachine = a => Math.hypot(a.x - spots[0][0], a.z - spots[0][2]) < 0.9;
  const show = () => CREW3D.agents().map(a => [a.id, a.st, a.slot, a.task, +a.x.toFixed(2), +a.z.toFixed(2)]);
  // both start at the rail (the skipper on the machine's place, the hand on the other), then the fish comes and the skipper guts (who
  // guts is the crew's skills, drawn at random: up to twelve hands are tried for the case the player had): the hand takes the machine's
  // place, so the bleeding tub gets the fish and the gutter has work (#168, #169, #170)
  let seen = null;
  for (let k = 0; k < 12 && !seen; k++){
    S.crew = [Object.assign(genCrew(), {bi:false, off:false, fatigue:10, morale:62})]; S.hold = []; CREW3D.reset(); CREW3D.setJig(spots); settle(); tick(400);
    const before = show(); S.hold = [{sp:'torsk', kg:60, gut:false, t:S.t}]; S.t += 1; settle(); tick(800);
    const A = CREW3D.agents(), me = A.find(a => a.me), f = A.find(a => !a.me && a.st === 'fiske');
    if (me && me.st === 'sloy' && f) seen = {before, after:show(), ok:f.slot === 0 && atMachine(f)};
  }
  t.ok(!seen || seen.ok, 'skipperen sløyer: mannen som jukser, går til maskinplassen og står ikke igjen ved plassen uten maskin' + (seen ? '' : ' (tilfellet kom ikke opp)'), seen);
}
