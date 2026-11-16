// RANK1-a (docs/planer/rank1.md, Jonas 16.11.2026, V1–V3 A): the level is the years of sea time, and your own skills grow with the
// station you stand on, towards a ceiling the level sets. Checked here: the ceiling, the start (1.5, not nothing), the growth (a quarter
// of the way an hour, never over the ceiling, a quarter as fast with the game closed), what you do not use stays, an old game gets its
// skills from its sea time, the pace on deck never below what it was before the step, and the echo sounder read with your experience.
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'); S.lang = 'no';
  const {FS, FSK, fsCap, fsNeed, fsOf, fsSkills, fsSkF, fsLearn, fsErf, fsSkillMinute, fsYearSkills} = K;
  // the ceiling of the level
  t.near(fsCap(0), 1.5, 1e-9, 'taket uten fartstid er 1,5');
  t.near(fsCap(5), 2.51, 0.01, 'taket ved 5 år er 2,5 (' + fsCap(5).toFixed(2) + ')');
  t.near(fsCap(10), 3.02, 0.01, 'taket ved 10 år er 3,0 (' + fsCap(10).toFixed(2) + ')');
  t.near(fsCap(40), 5, 1e-9, 'taket ved 40 år er 5');
  t.near(fsCap(55), 5, 1e-9, 'stjernene etter 40 løfter ikke taket over 5');
  t.ok([1, 2, 5, 10, 20, 30, 39].every(y => fsCap(y) > fsCap(y - 1)), 'hvert nytt år løfter taket');
  t.ok(fsYearSkills(10) === Math.round(fsCap(10) * 10) / 10, 'året sier hvor høyt ferdighetene kan nå (' + fsYearSkills(10) + ')');
  // a new game: 1.5 in all, never nothing
  S.fs = {p:0, rest:0, away:0};
  const sk = fsSkills();
  t.ok(FSK.keys.every(k => sk[k] === 1.5), 'et nytt spill starter på 1,5 i alle ferdighetene (' + JSON.stringify(sk) + ')');
  t.near(fsErf(), 1.5, 1e-9, 'erfaringen uten fartstid er 1,5, som søket brukte før steget');
  t.ok(FSK.keys.every(k => fsSkF(k) === 1) && fsSkF('kokk') === 1 && fsSkF(undefined) === 1, 'fersk arbeider du like fort som før steget');
  // growth: at the ceiling of year 0 nothing grows; with ten years a quarter of the gap an hour, up to the ceiling, and only that skill
  t.ok(fsLearn('sloy', 60) === 0 && sk.sloy === 1.5, 'uten fartstid står ferdigheten på taket, 1,5');
  S.fs.p = fsNeed(10); const cap = fsCap(10);
  const g1 = fsLearn('sloy', 60);
  t.near(sk.sloy, 1.5 + (cap - 1.5) * FSK.rate, 1e-9, 'en time på sløyebordet med 10 år: en firedel av veien til taket (' + sk.sloy.toFixed(3) + ')');
  t.ok(sk.line === 1.5 && sk.garn === 1.5, 'det du ikke bruker, står (line og garn 1,5)');
  for (let i = 0; i < 200; i++) fsLearn('sloy', 60);
  t.ok(sk.sloy <= cap + 1e-12 && sk.sloy > cap - 0.01, 'aldri over taket for nivået (' + sk.sloy.toFixed(3) + ' mot ' + cap.toFixed(3) + ')');
  t.ok(fsSkF('sloy') > 1.1 && fsSkF('sloy') <= 1 + FSK.eff * (cap - 1.5) + 1e-12, 'farten på sløyebordet går opp med ferdigheten (' + fsSkF('sloy').toFixed(3) + ')');
  // a quarter while the game is closed
  sk.is = 1.5; K.set('FS_AWAY', true); fsLearn('is', 60); const away = sk.is - 1.5; K.set('FS_AWAY', false);
  sk.is = 1.5; fsLearn('is', 60); const here = sk.is - 1.5;
  t.ok(away > 0 && away < here * 0.3, 'med spillet lukket vokser den en firedel så fort (' + away.toFixed(4) + ' mot ' + here.toFixed(4) + ')');
  // a whole step is said in the deck log
  S.fs.p = fsNeed(40); sk.garn = 1.99; S.log = []; fsLearn('garn', 60);
  t.ok(sk.garn > 2 && S.log.some(l => /flinkere til å fiske med garn/.test(JSON.stringify(l))), 'over et helt tall: én linje i dekksdagboka');
  t.near(fsCap(40), 5, 1e-9, 'erfaringen er taket for nivået'); t.near(fsErf(), 5, 1e-9, 'med 40 år leser du ekkoloddet med erfaring 5');
  // the station you stand on: at sea and aboard, the skill it trains; in port nothing
  S.fs.p = fsNeed(20); K.set('meAboard', () => true); sk.juksa = 1.5; S.boat.status = 'fishing';
  fsSkillMinute('fiske'); t.ok(sk.juksa > 1.5, 'et minutt ved rekka til sjøs trener juksa');
  const j = sk.juksa; fsSkillMinute('ror'); t.ok(sk.juksa === j, 'roret trener ingen av ferdighetene dine');
  S.boat.status = 'port'; fsSkillMinute('fiske'); t.ok(sk.juksa === j, 'i havn vokser ingenting');
  // an old game: its skills from its sea time, the gear it has at the ceiling, the rest halfway
  K.set('S', K.newState()); const S2 = K.get('S'); S2.fs = {p:fsNeed(12) + 1, rest:0, away:0};
  const s2 = fsSkills(), c12 = fsCap(fsOf(S2.fs.p).y);
  t.ok(s2.juksa === Math.round(c12 * 1000) / 1000 && s2.sloy === s2.juksa && s2.is === s2.juksa, 'en gammel lagring med 12 år: juksa, sløying og ising på taket (' + s2.juksa + ')');
  t.ok(s2.garn >= 1.5 && s2.garn <= s2.juksa, 'redskap den ikke har, halvveis eller mer (' + s2.garn + ')');
  t.ok(FSK.keys.every(k => fsSkF(k) >= 1), 'ingen gammel spiller arbeider saktere enn før steget');
  t.ok(fsSkills() === s2, 'ferdighetene lages én gang og lagres i S.fs.sk');
  t.ok(FS.MAX === 40, 'nivået er årene, 0–40, som før');
}
