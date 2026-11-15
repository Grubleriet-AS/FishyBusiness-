// Steg 125e (Jonas 15.11.2026: «Fisk teleporterer fra kar til sløyebenk»): the account of the fish seen on deck, deckcrew.js FISKVEI.
// A haul is played frame by frame at 30 a second: a fish comes aboard every few seconds, is bled and lands in the bleeding tub, and one
// or two gutters at the table take theirs out of it. Every frame the fish are counted where they are (the tub, a hand, the table, the
// air, the hatch): none may come or go between two of those, nobody holds more than one, the hatch only fills, and a gutter takes no
// fish out of an empty tub (he waits). Seen red 15.11.2026 against the rule drawDeckCrew had until steg 125e (a new fish in the
// gutter's hand every 5.6 s from his clock, view3d/20-trawl-seine.js, put in FISKVEI.gut for the run): 7 of 8 checks red: the gutter had a
// fish with the tub empty, the account did not add up in 1 800 to 3 600 of the frames, and nothing ever reached the hatch.
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;

export default function (t){
  const {FISKVEI: F} = t.K, dt = 1 / 30;
  // one haul: fish k is gaffed in at come(k) s, its bleeding begins 1.75 + 0.3 s later (the gaff lets it fall, 09-landing-deck.js
  // dkTick) and it lands in the tub F.TOSS s into that; gutters take part from g0 s, and the second leaves the table for a while
  function play(name, o){
    const L = F.fresh(); F.seed(L, o.seed || 0); F.seed(L, 999);   // (begun once: the second seed does nothing)
    const lands = []; if (!o.none) for (let k = 0, c = 0.5; c < o.T; k++, c += o.every(k)) lands.push(c + 1.75 + 0.3 + F.TOSS);
    const ids = o.gutters, stage = {}, bad = {sum:0, two:0, back:0, empty:0, outDown:0, early:0}; let li = 0, outPrev = 0, maxTub = 0, worked = 0;
    for (let now = 0; now < o.T; now += dt){
      while (li < lands.length && lands[li] <= now){ F.bled(L); li++; }
      for (const id of ids){ const away = o.away && o.away[id] && now >= o.away[id][0] && now < o.away[id][1];
        if (away){ F.leave(L, id, now); continue; }
        const tub0 = L.tub, had = L.gut[id], g = F.gut(L, id, now);
        if (g && !had && tub0 === 0) bad.empty++;   // (a fish out of an empty tub)
        if (g){ worked++; const s = g.s < F.HAND ? 0 : g.s < F.TABLE ? 1 : g.s < F.THROW ? 2 : 3, q = stage[id];
          // (one fish's way only goes on: the tub, the hand, the table, the air; a new fish starts again at the tub)
          if (q && q.n === g.n && s < q.s) bad.back++; stage[id] = {n:g.n, s}; } }
      const w = F.where(L, now), all = w.tub + w.hand + w.table + w.air + w.out, inn = L.n.seed + L.n.bled;
      if (all !== inn) bad.sum++;
      if (w.hand + w.table + w.air > ids.length) bad.two++;
      if (w.out < outPrev) bad.outDown++; outPrev = w.out; maxTub = Math.max(maxTub, w.tub);
      if (L.n.taken - L.n.back > inn) bad.early++; }
    const w = F.where(L, o.T);
    t.ok(!bad.sum && !bad.two && !bad.back && !bad.empty && !bad.outDown && !bad.early && L.n.out > 0,
      name + ': ingen fisk kommer eller går mellom karet, hånda, bordet og luka (' + (L.n.seed + L.n.bled) + ' inn, ' + w.out + ' i luka, ' + w.tub + ' i karet, '
      + (w.hand + w.table + w.air) + ' hos sløyerne; høyst ' + maxTub + ' i karet; brudd ' + JSON.stringify(bad) + ')');
    return {L, worked};
  }
  // one gutter, a fish every 4 s (faster than he guts: the tub fills); the tub empty at the start, so he waits for the first
  const a = play('én sløyer', {T:90, every:() => 4, gutters:['g1']});
  // two gutters, the fish slower than they gut (they wait in turn), the second called away for 12 s in the middle of a fish
  play('to sløyere, den ene kalt bort', {T:120, every:k => 5 + (k % 3), gutters:['g1', 'g2'], away:{g2:[40.2, 52.2]}});
  // come aboard in the middle of a haul: the tub begun from the game's 40 kg waiting (7 fish), no new fish
  const c = play('karet fra fangsten, ingen ny fisk', {T:60, none:true, gutters:['g1'], seed:40});
  t.eq(c.L.n.seed, 7, 'karet begynner med fangsten som venter (40 kg, én fisk per 6 kg)');
  t.ok(c.L.n.out === 7 && c.L.tub === 0, 'han sløyer karet tomt og venter så (' + c.L.n.out + ' sløyd, ' + c.L.tub + ' igjen)');
  // the gutter waits with the tub empty: no round while none has landed
  { const L = F.fresh(); let got = 0; for (let now = 0; now < 10; now += dt) if (F.gut(L, 'g', now)) got++; t.eq(got, 0, 'med tomt kar har sløyeren ingen fisk'); }
  // nothing waits and nobody guts: the tub is emptied with the game (counted out), not while a gutter has a fish
  { const L = F.fresh(); F.bled(L); F.bled(L); F.gut(L, 'g', 0); F.clear(L); const w1 = F.where(L, 1); F.leave(L, 'g', 1); F.clear(L); const w2 = F.where(L, 2);
    t.ok(w1.tub + w1.hand === 2 && w2.tub === 0 && w2.out === 2 + 0 && L.n.back === 1, 'karet tømmes med spillet bare når ingen sløyer (' + JSON.stringify([w1, w2]) + ')'); }
  t.ok(a.worked > 0, 'sløyeren arbeider når det er fisk i karet');
}
