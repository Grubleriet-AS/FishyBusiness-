// Steg 125d (Jonas 15.11.2026: «haleren bløgger selv» on the four smallest decks, work.solo): the hand the game has bleeding while the
// skipper hauls is not sent inside; he guts at the table, so the fish does not lie on deck with nobody at the knife. Seen red 15.11.2026
// against the first version of 125d, which sent him in (the snekke's HUD: one hand aboard, nobody at the table).
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {VESSELS, CREW3D, applyVessel, genCrew, GROUNDS} = K, b = S.boat, g0 = GROUNDS[2].p;
  K.set('hsWork', () => 0.3); K.set('hsAt', () => 0.3);
  const settle = () => { const ST = CREW3D._st; ST.ctxT = -1e9; ST.lastSim = null; CREW3D.tick(0.05); ST.ctxT = -1e9; CREW3D.tick(0.05); };
  const bad = [], seen = [];
  for (const vt of Object.keys(VESSELS)){ S.tut = 0; S.me = S.cur; b.type = vt; applyVessel(); CREW3D.reset(); if (!CREW3D.on() || !(CREW3D._st.G.work || {}).solo) continue;
    S.crew = [Object.assign(genCrew(), {bi:false, off:false, fatigue:5, morale:70})];
    b.status = 'fishing'; b.port = null; b.pos = {...g0}; b.rig = 'line'; b.gop = {op:'haul', kind:'line', n:6, done:2, prog:0.3, sub:0, sl:6, hooksPer:600, a:{...g0}, b:{x:g0.x + 0.6, y:g0.y}, lead:0, kg:0, rel:0, dead:0};
    S.hold = [{sp:'torsk', kg:220, gut:false, iced:false}]; S.settings.gut = true; S.settings.ice = true; S.t += 5; settle();
    const a = CREW3D.agents().find(q => q.st === 'blogg'); seen.push(vt + ':' + (a ? (a.goal && a.goal.inside ? 'inne' : a.goal && a.goal.task) : 'ingen'));
    if (!a || !a.goal || a.goal.inside || a.goal.task !== 'gut') bad.push(vt); }
  t.ok(seen.length === 4 && !bad.length, 'der haleren bløgger selv, sløyer den andre ved bordet (' + seen.join(', ') + ')');
}
