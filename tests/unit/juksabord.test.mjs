// Jigging with reels and hands to spare (a player in the Discord 27.11.2026: «når det fiskes kan det ikke sløyes … fisket må altså
// stoppes for å sløye», a 35 ft havsjark with four reels that one hand tends, and a table for two). Measured in the game the same day,
// ten hours with four aboard: 2.3 stood at the rail and 0.8 at the table on average, the tub filled eight times and the fishing stopped
// for 154 minutes, while the catch (380 kg an hour) was well under what two at the table gut (600). The rail drew every hand alike,
// whether he tended the reels or jigged by hand beside them (2 in effort against the reels' 16), and one who fished stayed at it.
// Now those the reels need stay with them as before, and the others go where they are most use: the table while fish lies in the tub.
// (Forcing a hand to the reels whatever lay in the tub was tried and measured the same day: more stops with two and three aboard, so not kept.)
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), W = K.get('window'), {applyVessel, workAssign, fishEffort} = K, b = S.boat;
  K.set('hsWork', () => 0.3); K.set('hsAt', () => 0.3);
  // (the same hands every run: genCrew draws the skills, the name and the id, and the day's whim for a station follows the id)
  let hn = 0; const hand = () => { const c = Object.assign(K.genCrew(), {bi:false, off:false, sleepW:false, fatigue:10, morale:62, traits:[], st:'fiske', hab:{}}); c.id = 'kx' + (++hn); for (const k in c.attr) c.attr[k] = 3; for (const k in c.gear) c.gear[k] = 3; return c; };
  const sea = (type, n, reels, lv, kg, gear) => { S.lang = 'no'; S.tut = 0; S.me = S.cur; b.type = type; applyVessel(); S.crew = []; hn = 0; for (let i = 0; i < n; i++) S.crew.push(hand());
    b.status = 'fishing'; b.port = null; b.gop = null; b.deckStop = false; b.gear = gear !== false; b.anch = false; b.ice = 500; b.lieHelm = null; S.plan = null; S.jobs = []; S.sleep = null; S.rest = null; S.energy = 90; S.mySt = 'fiske';
    S.equip = Object.assign({}, S.equip, {jukse:reels, jukseLv:lv}); applyVessel(); W.jigActive = false; S.settings.gut = true; S.settings.ice = true; S.meal = null;
    S.hold = kg ? [{sp:'torsk', cls:1, kg, n:Math.round(kg / 3), bled:true, iced:false, hr:0, fresh:100, gut:false, hook:true}] : []; };
  // the stations over some minutes, each standing where the minute before put him (as the game's own minute does)
  const mins = m => { const out = []; for (let i = 0; i < m; i++){ S.t++; const A = workAssign(); for (const p of A){ if (p.c) p.c.st = p.st; else S.mySt = p.st; } out.push(A.map(p => p.st)); } return out; };
  const cnt = (A, k) => A.filter(s => s === k).length, all = (M, f) => M.every(f);

  // the havsjark, four reels with auto-stop (one hand tends four), a table for two, you and three hands, 150 kg in the tub
  sea('sjark', 3, 4, 2, 150);
  { const M = mins(30);
    t.ok(all(M, A => cnt(A, 'fiske') >= 1), 'havsjark, fire maskiner, fire om bord: maskinene har alltid en mann', M[0]);
    t.ok(all(M.slice(1), A => cnt(A, 'sloy') === 2), 'og begge plassene ved sløyebordet er i bruk mens det ligger 150 kg i karet', M[1]);
    t.ok(all(M.slice(1), A => cnt(A, 'fiske') === 1), 'ingen står med håndjuksa ved siden av maskinene mens bordet og isen trenger folk', M[1]);
    t.ok(fishEffort() >= 15, 'og fisket går som før: innsatsen er maskinenes (' + fishEffort().toFixed(1) + ')'); }
  // the tub empty: the hands with no reel to tend jig by hand, as before
  sea('sjark', 3, 4, 2, 0);
  { const M = mins(5); t.ok(all(M, A => cnt(A, 'fiske') >= 3 && cnt(A, 'sloy') === 0), 'tomt kar: de som ikke passer maskiner, jukser for hånd', M[4]); }
  // three reels as bought (one hand tends three) and five reels: two tend them
  sea('sjark', 3, 5, 1, 150);
  { const M = mins(20); t.ok(all(M.slice(0, 4), A => cnt(A, 'fiske') === 2) && all(M, A => cnt(A, 'fiske') >= 1 && cnt(A, 'sloy') + cnt(A, 'is') >= 2), 'fem maskiner uten autostopp trenger to mann: to står ved dem, og de to andre er på dekk (en av passerne går til bordet i pausen sin når karet er fullt nok)', M[1]); }
  // (with hand jigs only, every hand at the rail is worth the same, and nothing is changed: tests/worktest.py)
  // alone with reels: at the reels until the tub is full and the fishing stops (05-vessels.js fish), as the Handbook says
  sea('plastsjark', 0, 4, 1, 100);
  { const M = mins(5); t.ok(all(M, A => A.length === 1 && A[0] === 'fiske'), 'alene med maskiner: ved maskinene til karet er fullt', M[0]);
    b.deckStop = true; const N = mins(3); t.ok(all(N, A => A[0] === 'sloy' || A[0] === 'is'), 'og på dekk når fisket har stoppet for å sløye', N[0]); }
  // «Jukse selv»: you at the rail by hand, and a hand still tends the reels
  sea('sjark', 3, 4, 2, 150); W.jigActive = true;
  { const M = mins(10); t.ok(all(M, A => A[0] === 'fiske' && cnt(A, 'sloy') + cnt(A, 'is') >= 2) && all(M.slice(0, 3), A => cnt(A, 'fiske') === 2), '«Jukse selv»: du står ved rekka, en hånd passer maskinene ved siden av deg, og de to andre er på dekk', M[1]); W.jigActive = false; }
}
