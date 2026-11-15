// Steg 125f (Jonas 15.11.2026: «tomme linebøtter stables i hverandre etter hvert som lina settes»; «Jeg vil heller ikke at mannskapet
// bærer på kasser og sånt som ikke eksisterer og som dukker opp ut av løse lufta»): the account of the line tubs on deck, deckcrew.js
// STAMPER. A set and a haul are played frame by frame at 30 a second with the game's own pace (core/10-gear.js gearOpMinute: g.prog
// a step every game minute, 10 s of real time, g.done one up as a tub is through) and a carrier who walks to the tub, lifts it and
// walks with it. Every frame each place on deck (a slot of the stack, a work spot, a level of the nest, a hand) is looked at: what a
// tub holds may change only where the line runs (full to empty as it is set, empty to coiled as it is hauled, at the work spot), and
// a tub leaves a place only into a hand and comes to one only out of a hand. The tubs are counted against S.pgear.lines and b.gop all
// the way (rest, under way, empty), and the line runs from or into one tub at a time, at a work spot.
// Seen red 15.11.2026 against the rule drawLineOp had until steg 125f (view3d/09-landing-deck.js: the tubs drawn as a list in order,
// the first at the stern, so each tub through moved every tub a place on): see `today` below, red in the set and the haul.
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;

export default function (t){
  const {STAMPER: S} = t.K, dt = 1 / 30;
  // the places and what is in each: {key: kind}, and how many are in hands
  const placesOf = L => { const P = {}; let hand = 0; for (const q of L.T){ if (q.at === 'hand'){ hand++; continue; } P[q.at + q.i] = q.k; } return {P, hand}; };
  // today's rule (drawLineOp until steg 125f): the list [the tubs to set, the rest, the empty ones] (setting) or [the hauled ones, the
  // rest, the empty ones] (hauling), the first at the stern (setTub), the others in the stack's slots by their order
  const today = (o, tg) => { const F = []; if (o.kind === 'set'){ for (let i = o.done; i < o.n; i++) F.push('full'); for (let i = 0; i < tg.coil; i++) F.push('coil'); for (let i = 0; i < tg.full; i++) F.push('full'); for (let i = 0; i < o.done + tg.empty; i++) F.push('empty'); }
    else { for (let i = 0; i < o.done; i++) F.push('coil'); for (let i = 0; i < tg.coil; i++) F.push('coil'); for (let i = 0; i < tg.full; i++) F.push('full'); for (let i = o.done; i < o.n + tg.empty; i++) F.push('empty'); }
    const P = {}; F.forEach((k, i) => { if (o.kind === 'set' && i === 0) P.work0 = k; else P['slot' + (o.kind === 'set' ? i - 1 : i)] = k; }); return {P, hand:0}; };
  // one set or haul: tg the deck besides it, n its tubs, step g.prog a game minute, W the work spots, walk s to the tub and with it
  function play(name, o){
    const L = S.fresh(), tg = {full:o.full, coil:o.coil, empty:o.empty, op:null}, g = {key:name, kind:o.kind, n:o.n, done:0, prog:0}, bad = {kind:0, jump:0, two:0, count:0, run:0, snap:0};
    S.sync(L, tg, o.W);   // (the deck at rest first: the stack and the nest)
    tg.op = g; if (o.kind === 'set') tg.full -= o.n; else tg.empty -= o.n;   // (the game takes the string's tubs off the count aboard as it begins, startSet)
    let C = null, prev = null, runOff = 0, fromStack = 0, halted = 0, runKey = null, nextMin = 10, end = -1, T = 0, maxHand = 0;
    for (let now = 0; now < o.T; now += dt){
      // the game's minute
      if (now >= nextMin && tg.op){ nextMin += 10; g.prog += o.step; while (g.prog >= 1 && g.done < g.n){ g.prog -= 1; g.done++; }
        if (g.done >= g.n){ tg.op = null; if (o.kind === 'set') tg.empty += o.n; else tg.coil += o.n; end = now; } }
      if (o.today){ const cur = tg.op ? today(g, tg) : today({kind:o.kind, n:o.n, done:o.n}, {full:tg.full, coil:o.kind === 'haul' ? tg.coil - o.n : tg.coil, empty:o.kind === 'set' ? tg.empty - o.n : tg.empty});
        if (prev){ for (const k of new Set([...Object.keys(prev.P), ...Object.keys(cur.P)])){ const b = prev.P[k], a = cur.P[k]; if (b && a && b !== a && !(k === 'work0' && b === 'full' && a === 'empty')) bad.kind++; else if (!!b !== !!a) bad.jump++; } }
        prev = cur; continue; }
      S.sync(L, tg, o.W, now);
      // the carrier: to the tub, lifts it (0.8 s), with it, sets it down (0.8 s)
      if (!C){ const j = S.want(L, tg.op); if (j){ S.begin(L, j, 'c1', now); C = {t:now, a:o.walk[0], b:o.walk[1]}; } }
      if (C){ const s = now - C.t; if (s >= C.a + 0.8 && !L.job.took) S.take(L); if (s >= C.a + 0.8 + C.b + 0.8){ S.put(L, now); C = null; } }
      const cur = placesOf(L); maxHand = Math.max(maxHand, cur.hand);
      if (prev){ let gone = 0, came = 0;
        for (const k of new Set([...Object.keys(prev.P), ...Object.keys(cur.P)])){ const b = prev.P[k], a = cur.P[k];
          if (b && a && b !== a){ const ok = o.kind === 'set' ? b === 'full' && a === 'empty' : b === 'empty' && a === 'coil'; if (!(k === runKey && ok)) bad.kind++; }
          else if (b && !a) gone++; else if (!b && a) came++; }
        // (a tub leaves a place only into a hand, and comes to one only out of one; the nest's levels close up when its top is taken)
        if (gone - came !== cur.hand - prev.hand) bad.jump++; }
      if (cur.hand > 1) bad.two++;
      // (the count: as the game has it, all the way)
      const want = {full:tg.full + (tg.op && o.kind === 'set' ? g.n - g.done : 0), coil:tg.coil + (tg.op && o.kind === 'haul' ? g.done : 0), empty:tg.empty + (tg.op ? (o.kind === 'set' ? g.done : g.n - g.done) : 0)};
      if (S.count(L, 'full') !== want.full || S.count(L, 'coil') !== want.coil || S.count(L, 'empty') !== want.empty) bad.count++;
      // (the line from one tub at a time, at a work spot: the seconds it is not, once the first is there)
      // (setting it runs from a tub at a work spot or in the stack, never from one in the hands; hauling it is coiled into one at a work
      // spot (in the stack with none), once the first has been carried there)
      const halt = S.halt(L, tg.op); if (halt) halted += dt;
      const r = S.running(L, tg.op), off = r && (o.kind === 'set' ? r.q.at === 'hand' || r.q.at === 'nest' : o.W ? r.q.at !== 'work' : r.q.at !== 'slot');
      if (tg.op && !halt && (!r || off)){ if (o.kind === 'set' || L.n.carried > 0) runOff += dt; else T += dt; }
      if (r && r.q.at === 'slot' && o.kind === 'set') fromStack += dt;
      runKey = r ? r.q.at + r.q.i : null; prev = cur; }
    bad.snap = L.n.snap; bad.run = Math.round(runOff * 10) / 10;
    const w = o.today ? null : S.where(L), done = o.today ? false : o.kind === 'set' ? w.nest === o.n + o.empty && w.work === 0 && w.hand === 0 : w.slot === o.full + o.coil + o.n && w.nest === o.empty - o.n && w.work === 0;
    const ok = !bad.kind && !bad.jump && !bad.two && !bad.count && !bad.snap && bad.run === 0 && (o.today || done);
    t.ok(o.red ? !ok : ok, name + ': ingen stamp kommer eller går, og lina går fra eller i én stamp om gangen (' + (o.today ? 'dagens regel' : w.slot + ' i stabelen, ' + w.nest + ' tomme i hverandre, ' + w.work + ' ved arbeidsplassen, ' + w.hand + ' i hendene, '
      + L.n.carried + ' båret' + (o.kind === 'set' ? ', lina fra stabelen ' + Math.round(fromStack) + ' s' : ', haleren sto ' + Math.round(halted) + ' s mens stampen ble byttet')) + '; brudd ' + JSON.stringify(bad) + ')' + (o.red ? ' — skal være rød' : ''));
    return {L, end};
  }
  // a sjark's set: six tubs (one baited left aboard and two coiled), a tub through in four game minutes (40 s), two work spots by the stern,
  // the carrier 3 s to the stack and 4 s back with the tub
  play('setting, to plasser ved hekken', {kind:'set', n:6, full:7, coil:2, empty:0, W:2, step:0.25, walk:[3, 4], T:320});
  // with the line setter's speed (a tub in 1.7 game minutes, 17 s) and a longer walk
  play('setting med linesetter', {kind:'set', n:5, full:5, coil:0, empty:1, W:2, step:0.6, walk:[4, 5], T:130});
  // the line run from the tubs in their own slots (the stack stands at the stern): the empty ones lifted off into the nest
  play('setting fra stabelen', {kind:'set', n:4, full:4, coil:1, empty:0, W:0, step:0.3, walk:[1, 1.5], T:180});
  // a haul: the empty tubs from the nest to the hauler, filled there in 21 game minutes each, and the full ones to the stack
  play('haling, to plasser ved haleren', {kind:'haul', n:4, full:1, coil:1, empty:4, W:2, step:1 / 21, walk:[3, 4], T:4 * 210 + 60});
  play('haling, én plass', {kind:'haul', n:3, full:0, coil:0, empty:3, W:1, step:0.2, walk:[2, 3], T:200});
  // today's rule (until steg 125f): red in the set and the haul
  play('dagens regel, setting', {kind:'set', n:6, full:7, coil:2, empty:0, W:2, step:0.25, T:320, today:true, red:true});
  play('dagens regel, haling', {kind:'haul', n:4, full:1, coil:1, empty:4, W:2, step:1 / 21, T:900, today:true, red:true});
  // a jump (the clock run on, another boat): laid out anew, counted as a snap, and the count right again
  { const L = S.fresh(); S.sync(L, {full:3, coil:0, empty:0, op:null}, 2); S.sync(L, {full:1, coil:0, empty:4, op:null}, 2);
    t.ok(L.n.snap === 1 && S.count(L, 'empty') === 4 && S.count(L, 'full') === 1, 'et hopp legger dekket ut på nytt og teller det (snap ' + L.n.snap + ')'); }
  // the deck's order of the slots (L.pri, deckcrew.js: the open side of a layer first): the set takes the open side's tubs first, and the
  // haul fills the far side first, a layer at a time
  { const L = S.fresh(); L.per = 2; L.pri = i => Math.floor(i / 2) * 10 + (i % 2 ? 1 : 0); S.sync(L, {full:4, coil:0, empty:0, op:null}, 0);
    S.sync(L, {full:2, coil:0, empty:0, op:{key:'p', kind:'set', n:2, done:0, prog:0}}, 0); const took = L.op.ids.map(id => S.by(L, id).i);
    const H = S.fresh(); H.per = 2; H.pri = L.pri; S.sync(H, {full:0, coil:0, empty:3, op:null}, 1); const order = []; for (let k = 0; k < 3; k++){ const s2 = S.freeSlot(H); order.push(s2); H.T.push({id:100 + k, k:'coil', at:'slot', i:s2}); }
    t.ok(JSON.stringify(took) === '[3,2]' && JSON.stringify(order) === '[0,1,2]', 'stabelens rekkefølge: settingen tar fra den åpne siden først, halingen fyller den andre først (' + JSON.stringify([took, order]) + ')'); }
  // the deck ready for a set (L.stage): a full tub carried to the stern and left there, and the set runs from it from its first metre
  { const L = S.fresh(); S.sync(L, {full:3, coil:0, empty:0, op:null}, 2); L.stage = true; const j = S.want(L, null); S.begin(L, j, 'c', 0); S.take(L); S.put(L, 5);
    const again = S.want(L, null); S.sync(L, {full:1, coil:0, empty:0, op:{key:'s', kind:'set', n:2, done:0, prog:0}}, 2);
    t.ok(j && j.to.at === 'work' && !again && S.running(L, {key:'s', kind:'set', n:2, done:0, prog:0}).q.at === 'work', 'klar til setting: én full stamp står ved hekken, og settingen går fra den fra første meter'); }
  // a tub coiled into where it stood in the nest (the haul came on before it was carried): taken to the stack, not left among the empty ones
  { const L = S.fresh(); S.sync(L, {full:0, coil:0, empty:2, op:null}, 1); S.sync(L, {full:0, coil:0, empty:0, op:{key:'h', kind:'haul', n:2, done:1, prog:0.2}}, 1);
    const q0 = L.T.find(q => q.k === 'coil'); q0.at = 'nest'; S.pack(L); const j = S.want(L, {key:'h', kind:'haul', n:2, done:1, prog:0.2});
    t.ok(!!j && j.id === q0.id && j.to.at === 'slot', 'en kveilet stamp i reiret blir båret til stabelen (' + JSON.stringify(j) + ')'); }
  // the baiting on deck (pg.shore egnself) makes coiled tubs full where they stand: none moves
  { const L = S.fresh(); S.sync(L, {full:0, coil:3, empty:0, op:null}, 2); const before = JSON.stringify(L.T.map(q => [q.at, q.i])); S.sync(L, {full:2, coil:1, empty:0, op:null}, 2);
    t.ok(JSON.stringify(L.T.map(q => [q.at, q.i])) === before && S.count(L, 'full') === 2 && !L.n.snap, 'egningen gjør stampene fulle der de står'); }
}
