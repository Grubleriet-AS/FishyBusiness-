// ===== The operations plan's page (the Drift app; phone/06-render.js, 14-act.js). Driftsplan 3 since DP3-3 (16.11.2026,
// docs/planer/driftsplan-3.md): two choices, Sted (a ring on the chart, ui/03g-planmap.js) and Redskap (what is aboard), then Start, «Nå»,
// what the plan chose, the day as it laid it, the statistics and Slett. The engine and the day are Driftsplan 2's (core/06g, 06h); the
// rows of Driftsplan 2 (home, places, landing, weather, rhythm, crew) were taken out with this step, as the plan now chooses them itself.
const PLAN2UI = (() => {
  const L = (no, en) => S.lang === 'no' ? no : en;
  const nm = id => (portById(id) || {name:'?'}).name;
  let open = null, busy0 = 0;
  // (the page's own «making» from Start until plan3Make answers; a make that never answers lets go after P2MAKE_MAX, as plan2Building does,
  // and an answer from a make given up is not heard: each make has its own mark, mk)
  const busy = () => busy0 > 0 && Date.now() - busy0 < P2MAKE_MAX;
  // (and the drawer at once: «Lager planen …» stood up to 0.7 s after the plan was on, until the drawer's own tick, GUI review P5)
  const rerender = () => { if (typeof refreshAll === 'function') refreshAll(); else if (typeof PHONE !== 'undefined') PHONE.render(); if (typeof DOCK !== 'undefined' && DOCK.redraw) DOCK.redraw(); };
  const B = (a, label, extra, cls) => '<button class="ph-btn' + (cls ? ' ' + cls : '') + '" data-pa="' + a + '"' + (extra ? ' ' + extra : '') + '>' + label + '</button>';
  const T = (a, label, on, extra) => '<button data-pa="' + a + '" class="' + (on ? 'on' : '') + '"' + (extra ? ' ' + extra : '') + '>' + label + '</button>';
  const BIG = (a, label, sub, on, extra, off) => '<button class="dr-big' + (on ? ' on' : '') + '" data-pa="' + a + '"' + (extra ? ' ' + extra : '') + (off ? ' disabled' : '') + '><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  const ck = t => t == null ? '–' : driftClock(driftHod(t));
  function row(k, label, value, body, bad){
    const on = open === k && !!body;
    // (a row with something missing colours only its value, which says what is missing: GUI review U3; the global .bad made all of it red and small)
    return '<div class="dr-row' + (on ? ' on' : '') + (bad ? ' dr-bad' : '') + '"><button class="dr-rh" data-pa="p2-row" data-k="' + k + '"><span class="dr-rl">' + label + '</span><span class="dr-rv">' + value + '</span><span class="dr-rc">' + (body ? (on ? '▾' : '›') : '') + '</span></button>' + (on ? '<div class="dr-rb">' + body() + '</div>' : '') + '</div>';
  }
  // why a paused boat drifts instead of lying at anchor (Pause anchors where it can, plan2Pause): «: for dypt til å ankre», lower case
  const driftWhy = o => { const w = o.paused && o.paused.drift && anchorWhy[o.paused.drift]; return w ? [': ' + w[0].charAt(0).toLowerCase() + w[0].slice(1).replace(/\.$/, ''), ': ' + w[1].charAt(0).toLowerCase() + w[1].slice(1).replace(/\.$/, '')] : ['', '']; };
  // ---- Nå: the step she is on and when it ends, what she waits for and until when, or why she stopped
  function nowOf(o){
    if (!o.on && o.paused && !o.stop){ const b = S.boat, at = ck(o.paused.t / 60);   // (U4: the boat lies still where Pause found her)
      return [b.status === 'port' ? L('På pause siden kl. ' + at + '. Båten ligger i ' + nm(b.port) + '.', 'Paused since ' + at + '. The boat lies at ' + nm(b.port) + '.') : b.anch ? L('På pause siden kl. ' + at + '. Båten ligger til ankers der den var, og mannskapet venter på deg.', 'Paused since ' + at + '. The boat lies at anchor where she was, and the crew wait for you.') : L('På pause siden kl. ' + at + '. Båten driver med vinden der den var' + driftWhy(o)[0] + ', og mannskapet venter på deg.', 'Paused since ' + at + '. The boat drifts with the wind where she was' + driftWhy(o)[1] + ', and the crew wait for you.'), 'wait']; }
    if (!o.on) return o.stop ? [L('Stoppet: ', 'Stopped: ') + L(o.stop.no, o.stop.en), 'bad'] : [L('Av', 'Off'), ''];
    if (o.held) return [L('Venter: du har tatt over båten', 'Waiting: you have taken the boat over'), 'wait'];
    const b = S.boat, pl = S.plan, r = o.run, M = nm(o.M), stepTxt = s => { const t = planDayText(o, {steps:[s], skipped:[], why:['', ''], sno:!!(r && r.day && r.day.sno)})[0]; return L(t[1], t[2]); };
    if (b.land) return [L('Leverer i ', 'Landing at ') + nm(b.land.pid), ''];
    if (b.hove) return [L('Ligger bi i uværet siden kl. ', 'Lying to in the storm since ') + ck(b.hove.since / 60) + L('. Planen går videre når det løyer.', '. The plan goes on when it eases.'), 'wait'];   // (an ocean vessel, H2c)
    if (b.status === 'port' && (b.shift || b.fueling || portBusy(b))) return [L('Gjør båten klar: is, drivstoff og agn', 'Getting the boat ready: ice, fuel and bait'), ''];
    if (b.status === 'unmooring') return [L('Kaster loss', 'Casting off'), ''];
    if (pl && pl.ops){
      if (pl.opsK === 'ly') return [L('Går i ly til ', 'Going to shelter at ') + nm(pl.wps[pl.wps.length - 1].port), 'wait'];
      if (pl.opsK === 'home') return [L('På vei hjem til ', 'On the way home to ') + nm(o.home), ''];
      if (pl.opsK === 'land') return [L('På vei til ', 'On the way to ') + M + L(' for å levere', ' to land'), ''];
      if (pl.opsK === 'rest') return [L('På vei for å hvile om bord', 'On the way to rest aboard'), ''];
      if (b.gop) return [(b.gop.op === 'set' ? L('Setter ', 'Setting ') : L('Trekker ', 'Hauling ')) + (b.gop.auto ? b.gop.n + ' ' + unitName('line', b.gop.n, 'auto') + L(' autoline', ' of autoline') : b.gop.sno ? L('en lenke med ' + b.gop.n + ' snøkrabbeteiner', 'a string of ' + b.gop.n + ' snow crab pots') : GEAR[b.gop.kind][S.lang === 'no' ? 'no' : 'en'].toLowerCase()), ''];
      if (b.status === 'fishing'){ const w = pl.wps[pl.idx - 1], i = w && w.jc ? w.jc : null, until = b.fishUntil != null ? ck(b.fishUntil / 60) : null; return [(pl.noJig ? L('Venter ved redskapet', 'Waiting by the gear') : L('Jukser', 'Jigging') + (i ? L(' på plass ', ' at place ') + i : '')) + (until ? L(' til kl. ', ' until ') + until : ''), '']; }
      // (Driftsplan 3, DP3-2: the search with the echo sounder, a trip of its own)
      if (pl.sok != null){ const T = P3TIER[plan3Tier()], ws = pl.wps.slice(Math.max(pl.idx, pl.sok)); let km = 0, p0 = pl.idx >= pl.sok ? b.pos : pl.wps[pl.sok - 1]; for (const w of ws){ km += kmTrue(p0, w); p0 = w; }
        const v = Math.max(1, BOAT.vcruise || 7), h = km / (v * NM), l = (() => { try { return fuelLph(v, 0) * h; } catch (e){ return 0; } })(), left = L(' (' + fmt(km, 1) + ' km, om lag ' + Math.max(1, Math.round(h * 60)) + ' min og ' + fmt(l, 0) + ' l igjen)', ' (' + km.toFixed(1) + ' km, about ' + Math.max(1, Math.round(h * 60)) + ' min and ' + Math.round(l) + ' l left)');
        return pl.idx >= pl.sok ? [L('Søker etter fisken i ringen med ', 'Searching the ring for the fish with ') + L(T[0], T[1]) + left, ''] : [L('På vei ut til ringen for å søke med ', 'On the way out to the ring to search with ') + L(T[0], T[1]) + left, '']; }
      const left = pl.wps.slice(pl.idx).some(w => w.act || w.fish > 0); return left ? [L('På vei ut', 'On the way out'), ''] : [L('På vei til ', 'On the way to ') + (pl.wps[pl.wps.length - 1].port ? nm(pl.wps[pl.wps.length - 1].port) : L('ankerplassen', 'the anchorage')), ''];
    }
    if (r && r.wait) return [L(r.wait.no, r.wait.en), ['dep', 'rest', 'idle'].includes(r.wait.k) ? '' : 'wait'];
    if (r && r.day && r.day.steps[r.i]) return [stepTxt(r.day.steps[r.i]), ''];
    return [L('Klar', 'Ready'), ''];
  }
  // ---- the day: today's as the engine follows it (with «← nå»), or the next as planDay reckons it from the answers
  function preview(o){
    const r = o.run, H = S.t / 60;
    // (on a trip the arrow follows the clock: the step pointer moves at the harbour calls)
    // (off, paused or stopped: the next day, never «I dag ←» as if she went, U4)
    if (o.on && r && r.day && r.i < r.day.steps.length && !r.replan){ let now = r.i; if (r.trip && S.plan && S.plan.ops){ for (let i = r.i; i < r.day.steps.length; i++){ const s = r.day.steps[i]; if (s.t != null && s.t <= H) now = i; } }
      // the step she is on says the engine's own end (GUI review U5: «Nå» had b.fishUntil, the day the plan's estimate, minutes to hours apart)
      const b = S.boat, cs = r.day.steps[now]; let day = r.day;
      if (cs && cs.k === 'juks' && b.status === 'fishing' && b.fishUntil != null && S.plan && S.plan.ops){ const u = b.fishUntil / 60; day = Object.assign({}, r.day, {steps:r.day.steps.map((s, i) => i === now ? Object.assign({}, s, {until:u, h:Math.max(0, u - s.t)}) : s)}); }
      return {day, now, label:L('I dag', 'Today')}; }
    // a plan not made yet has no plant: the nearest one to the places stands in, so the day can be read before Start
    let oo = o; if (!o.M){ const P = o.places, mid = P.length ? {x:P.reduce((a, q) => a + q.x, 0) / P.length, y:P.reduce((a, q) => a + q.y, 0) / P.length} : (portById(o.home) || {p:S.boat.pos}).p, M = o.land.mode === 'port' && o.land.port ? portById(o.land.port) : p2Plants().sort((x, y) => dist(x.p, mid) - dist(y.p, mid))[0]; if (M) oo = Object.assign({}, o, {M:M.id}); }
    // the next day is reckoned from the state at its departure, not now: the crew's fatigue and your energy fall and rise with the rest until then
    // (the engine lays the day anew at the departure; this is the page's estimate, as the note under the day says)
    const atSea = !o.on && S.boat.status !== 'port' && (!S.boat.anch || !!(o.paused && o.paused.sea));   // (started at sea, or paused at anchor there, the day is laid from where she lies, now: plan2Start)
    try { const from = o.on && r && r.day ? r.day.end : H, dep = atSea ? H : plan2NextDep(oo, H, from), st = plan2State(oo), hrs = Math.max(0, dep - H);
      if (hrs > 0){ const b = S.boat, atRest = b.status === 'port' && (b.port === oo.home ? st.homeRest : plan2RestOk(b.port)), rate = atRest ? p2RestRate('bunks') : b.status === 'port' ? p2RestRate('quay') : 0;
        for (const c of st.crew) c.fat = Math.max(0, c.fat - rate * hrs); if (st.me.aboard && (b.status === 'port' || b.anch)) st.me.energy = Math.min(100, st.me.energy + Math.max(restRate(b) * 60, resting() ? 0 : b.anch ? p2MeRate(null, true) : p2MeRate(b.port)) * hrs); }   // (you go in to rest by yourself, plan2MeRest)
      const day = planDay(oo, dep, st); return {day, now:-1, label:o.paused && !o.on ? L('Når du starter igjen', 'When you start again') : dep - H > 20 ? L('I morgen', 'Tomorrow') : L('Neste dag', 'Next day'), dep}; } catch (e){ return null; }
  }
  function dayCard(o){
    const P = preview(o); if (!P) return '';
    const lines = planDayText(Object.assign({}, o, {M:o.M || (P.day.steps.find(s => s.port) || {}).port}), P.day);
    const h = ['<div class="ph-card"><h4>' + P.label + (P.dep ? ' · ' + L('ut kl. ', 'out at ') + ck(P.dep) : '') + '</h4><div class="dr-pv">'];
    lines.forEach((x, i) => { const s = P.day.steps[i], isNow = i === P.now, k = s ? (s.k === 'hjem' || s.k === 'hvile' ? ' rest' : s.k === 'lever' ? ' land' : s.k === 'sett' || s.k === 'trekk' ? ' st' : '') : ' skip';
      h.push('<div class="dr-ev' + (isNow ? ' now' : '') + k + '"><span>' + (x[0] || '') + '</span><span>' + L(x[1], x[2]) + (isNow ? ' ←' : '') + '</span></div>'); });
    h.push('</div><p class="ph-note">' + L('Tidene er anslag fra planen selv. Blir lasten full, leverer mannskapet tidligere. Været avgjør resten.', 'The times are the plan\'s own estimates. If the hold fills, the crew land sooner. The weather decides the rest.') + '</p></div>');
    return h.join('');
  }
  // ---- Driftsplan 3 (DP3-3, 16.11.2026, docs/planer/driftsplan-3.md): two choices, Sted and Redskap (Jonas 16.11.2026: «Spilleren [får]
  // 2 enkle valg: sted og redskap»); the plan finds the rest when it is started (plan3Make, core/06k-plan3.js). The rows of Driftsplan 2
  // (home, places, landing, weather, rhythm, crew) are gone from the page: the plan chooses them and the page says what it chose.
  // a ring's place: the nearest harbour's name and how far the boat is from it
  // (where the ring lies: «ved Husøy», or out at sea, the ocean vessels' ring often hundreds of nm out, «230 nm NØ av Gamvik» in true bearing)
  const ringName = c => { const p = nearestPort(c); if (!p) return '?'; const d = kmTrue(p.p, c) / NM; if (d < 20) return L('ved ', 'near ') + p.name;
    const k = Math.round(trueDeg(Math.atan2(c.x - p.p.x, p.p.y - c.y), p.p) / 45) % 8; return fmt(d, 0) + ' nm ' + DIRS[S.lang === 'no' ? 'no' : 'en'][k] + L(' av ', ' of ') + p.name; };
  const ringVal = o => o.ring ? (w => w[0].toUpperCase() + w.slice(1))(ringName(o.ring)) + ' · ' + fmt(DRP3.ring[plan3GearKey(o.rig)], 1) + L(' nm ring · ', ' nm ring · ') + fmt(kmTrue(S.boat.pos, o.ring) / NM, 1) + L(' nm unna', ' nm away') : L('ikke valgt', 'not chosen');
  const locked = o => o.on || plan2Building(o) || busy();
  function stedBody(o){
    const d = fmt(DRP3.ring[plan3GearKey(o.rig)], 1);
    if (locked(o)) return '<p class="ph-note">' + L('Sett planen på pause for å flytte ringen.', 'Pause the plan to move the ring.') + '</p>';
    return '<p class="ph-note">' + L('Trykk i kartplotteren der båten skal fiske. Ringen er ' + d + ' nm over for ' + plan3GearWord(o.rig)[0] + ', og båten søker etter fisken inne i den med ekkoloddet. Et nytt trykk flytter ringen.', 'Tap the chart plotter where the boat is to fish. The ring is ' + d + ' nm across for ' + plan3GearWord(o.rig)[1] + ', and the boat searches it for the fish with the echo sounder. Another tap moves the ring.') + '</p>' +
      (B('p2-map', o.ring ? L('Flytt ringen i kartet', 'Move the ring on the chart') : L('Velg sted i kartet', 'Choose the place on the chart'), '', 'p'));
  }
  // the gear: what is aboard and can be rigged (plan3Gear), and under it the bait, the line's kind or the jig's tackle
  const gName = g => g.gk === 'auto' ? L('Autoline', 'Autoline') : g.gk === 'sno' ? L('Snøkrabbeteiner', 'Snow crab pots') : g.rig === 'juksa' ? L('Juksa', 'Jigging') : rigName(g.rig);
  const gSub = g => { const k = RIGS[g.rig].kind; if (!k) return L('Juksa om bord', 'Jigs aboard'); if (g.gk === 'sno'){ const u = p2Units('teine'); return u + L(' lenker à 200 (' + fmt(ownedUnits('teine'), 0) + ' teiner) om bord', ' strings of 200 (' + fmt(ownedUnits('teine'), 0) + ' pots) aboard'); } if (g.gk === 'auto'){ const u = p2Units('line', 'auto'); return u + ' ' + unitName('line', u, 'auto') + L(' på magasinene', ' on the magazines'); } const n = ownedUnits(k); return n + ' ' + unitName(k, n) + L(' om bord', ' aboard'); };
  const gearOf = o => plan3Gear().find(g => g.rig === o.rig) || null;
  function gearVal(o){
    const g = gearOf(o); if (!g) return L('ikke om bord', 'not aboard');
    const x = [gName(g)]; if (o.lk && g.lk.length > 1) x.push(L(LINE_KINDS[o.lk].no, LINE_KINDS[o.lk].en).toLowerCase()); if (g.bait.length && o.bait && BAITS[o.bait]) x.push(L('agn: ', 'bait: ') + L(BAITS[o.bait].no, BAITS[o.bait].en).toLowerCase()); if (g.tackle.length > 1) x.push(o.tackle === 'kveite' ? L('kveitepilk', 'halibut pilk') : L('markkroker', 'mark hooks'));
    return x.join(' · ');
  }
  function gearBody(o){
    const G = plan3Gear(); if (!G.length) return '<p class="bad">' + L('Båten har ikke noe redskap om bord. Kjøp redskap i utstyrsbutikken.', 'The boat has no gear aboard. Buy gear at the tackle shop.') + '</p>' + placeWay('butikk');
    if (locked(o)) return '<p class="ph-note">' + L('Sett planen på pause for å bytte redskap.', 'Pause the plan to change the gear.') + '</p>';
    const h = ['<p class="ph-note">' + L('Ett redskap. Bare det som er om bord vises.', 'One gear. Only what is aboard is shown.') + '</p>'];
    for (const g of G){ h.push(BIG('p2-g3', gName(g), gSub(g), o.rig === g.rig, 'data-g="' + g.rig + '"'));
      if (o.rig !== g.rig) continue;
      if (g.lk.length > 1) h.push('<div class="ph-kv dr-kv"><span>' + L('Line', 'Longline') + '</span><span>' + g.lk.map(k => T('p2-lk3', L(LINE_KINDS[k].no, LINE_KINDS[k].en), (o.lk || g.lk[0]) === k, 'data-v="' + k + '"')).join('') + '</span></div>');
      if (g.bait.length) h.push('<div class="ph-kv dr-kv"><span>' + L('Agn', 'Bait') + '</span><span>' + g.bait.map(k => T('p2-bait3', L(BAITS[k].no, BAITS[k].en), o.bait === k, 'data-v="' + k + '"')).join('') + '</span></div><p class="ph-note">' + L('Agnet kjøpes på mottaket når det trengs.', 'The bait is bought at the plant when it is needed.') + '</p>');
      if (g.tackle.length > 1) h.push('<div class="ph-kv dr-kv"><span>' + L('Utstyr', 'Tackle') + '</span><span>' + g.tackle.map(k => T('p2-tk3', k === 'kveite' ? L('Kveitepilk', 'Halibut pilk') : L('Markkroker', 'Mark hooks'), (o.tackle || 'mark') === k, 'data-v="' + k + '"')).join('') + '</span></div>');
      if (g.gk === 'auto' || g.gk === 'sno') h.push('<p class="ph-note">' + L('Agnet er flåtens eget (blekksprut og saury, eller akkar), kjøpt på mottaket for turen.', 'The bait is the fleet\'s own (squid and saury, or squid for the crab), bought at the plant for the trip.') + '</p>'); }
    return h.join('');
  }
  // the catch gutted aboard or landed round (R1 V1 A, docs/planer/etter-tonys-test.md: on the plan's page as on Om bord, 07-guide.js gutChoice)
  const gutRow = () => typeof gutChoice === 'function' && gutChoice() ? '<div class="ph-kv dr-kv"><span>' + L('Fangsten', 'The catch') + '</span><span>' + T('p2-gut', L('Sløyd om bord', 'Gutted aboard'), S.boat.gutAboard !== false, 'data-v="1"') + T('p2-gut', L('Rund', 'Round'), S.boat.gutAboard === false, 'data-v="0"') + '</span></div>' : '';
  // the snow crab frozen or live for the trip (H3b, 10d-snokrabbe.js snoSetMode; on the plan's page as before, under Levering)
  const snoRow = () => typeof snoVessel === 'function' && snoVessel() && snoTanks() ? '<div class="ph-kv dr-kv"><span>' + L('Krabben', 'The crab') + '</span><span>' + T('p2-sno', L('Fryste klør', 'Frozen clusters'), !snoLive(), 'data-v="frys"') + T('p2-sno', L('Levende krabbe', 'Live crab'), snoLive(), 'data-v="lev"') + '</span></div>' : '';
  // what the plan chose (once it is made): the home, the landing, the rhythm, the weather, who sails her and reads the sounder
  function chosen(o){
    if (!o.places.length || !o.home) return '<div class="ph-card"><h4>' + L('Resten finner planen selv', 'The plan finds the rest itself') + '</h4><p class="ph-note">' + L('Når du trykker Start, velger planen hjem, mottak, vær og rytme etter båten og mannskapet, og søker etter fisken i ringen med ekkoloddet før redskapet settes. Den kan startes fra hvor som helst.', 'When you tap Start, the plan chooses the home, the plant, the weather and the rhythm by the boat and the crew, and searches the ring for the fish with the echo sounder before the gear goes out. It can be started from anywhere.') + '</p>' + gutRow() + snoRow() + '</div>';
    const R = plan3Reader(), T3 = P3TIER[plan3Tier()], sk = meAboard() ? L('du', 'you') : (crewSkipper() || {}).name || (p2Lag() ? L('skipperen', 'the skipper') : '–');
    const kv = (k, v) => '<div class="ph-kv"><span>' + k + '</span><span>' + v + '</span></div>';
    const rh = o.rhythm === 'watch' ? L('Døgndrift', 'Round the clock') : o.rhythm === 'multi' ? L('Flerdøgnstur', 'Trips of days') : L('Dagdrift: ut om morgenen, fersk fisk levert samme dag', 'Day trips: out in the morning, the fish landed fresh the same day');
    const lv = (o.land || {}).when === 'trip' ? L('hver tur', 'every trip') : (o.land || {}).when === 'days' ? L('turens siste døgn', 'on the trip\'s last day') : L('når lasten er full', 'when the hold is full');
    return '<div class="ph-card"><h4>' + L('Planen valgte', 'The plan chose') + '</h4>' + kv(L('Hjem', 'Home'), nm(o.home)) + kv(L('Levering', 'Landing'), (o.M ? nm(o.M) : L('nærmeste mottak', 'the nearest plant')) + ', ' + lv) + kv(L('Rytme', 'Rhythm'), rh) +
      kv(L('Vær', 'Weather'), o.wx.wind >= P3_NOWIND ? L('sjø inntil ', 'sea up to ') + fmt(o.wx.hs, 1) + ' m' : L('inntil ', 'up to ') + o.wx.wind + ' m/s ' + L('og ', 'and ') + fmt(o.wx.hs, 1) + ' m') + kv(L('Fører båten', 'Sails her'), sk) + kv(L('Søket', 'The search'), L(T3[0].charAt(0).toUpperCase() + T3[0].slice(1), T3[1].charAt(0).toUpperCase() + T3[1].slice(1)) + ', ' + (R.who ? L(R.who + ' leser bildet', R.who + ' reads the picture') : L('du leser bildet', 'you read the picture'))) + gutRow() + snoRow() + '</div>';
  }
  // the check before Start: a ring and a gear; once made, Driftsplan 2's own check (the crew, the quota, the rules)
  function check3(o){
    const e = [], go = []; if (!o.ring){ e.push(L('Velg et sted: trykk i kartplotteren der båten skal fiske.', 'Choose a place: tap the chart plotter where the boat is to fish.')); go.push('sted'); }
    if (!gearOf(o)){ e.push(L('Velg et redskap som er om bord.', 'Choose a gear that is aboard.')); go.push('gear'); }
    if (e.length) return {ok:false, errors:e, go, warnings:[]};
    // (Driftsplan 2's check: what it says about the places is the ring's business now, the plan put them there; the way to mend it is to move the ring)
    if (o.places.length && o.home){ const C = plan2Check(o), go = C.go || [], mv = L(' Flytt ringen, så finner planen nye plasser.', ' Move the ring, and the plan finds new places.');
      return {ok:C.ok, errors:C.errors.map((e, i) => go[i] === 'places' ? e + mv : e), go:go.map(g => g === 'places' ? 'sted' : g), warnings:C.warnings || []}; }
    return {ok:true, errors:[], go:[], warnings:[]};
  }
  // a change of the place or the gear: what the plan found goes, and it is found again at Start
  function redo(o){ o.places = []; o.made = null; o.sok = null; o.err = null; o.run = null; o.derived = null; if (o.ring) o.ring.r = plan3RingKm(o.rig); }
  // the way to the nearest tackle shop or yard (U9 A, U13: the buoy sets are bought at the shop and the hauler fitted at the yard, there and
  // only there, docs/handelssteder.md): Autonav, as the trade pages have it, or the page itself when the boat lies there
  const PLACEPG = {butikk:['fiske', 'utstyrsbutikken', 'the tackle shop'], verft:['utstyr', 'verftet', 'the yard']};
  function placeWay(k){ const n = placesNear(S.boat.pos, k, 1)[0], P = PLACEPG[k]; if (!n) return ''; const here = S.boat.status === 'port' && S.boat.port === n.pt.id;
    // (the place's name says what it is: «Skaland utstyrsbutikk»)
    return here ? B('open', L('Til ' + P[1] + ' her', 'To ' + P[2] + ' here'), 'data-a="' + P[0] + '"', 'p')
      : B('goplace', L('Autonav til ', 'Autonav to ') + n.pt.name + ' · ' + fmt(n.d / NM, 1) + ' nm', 'data-id="' + n.pt.id + '"', 'p'); }
  // a reason the plan is not ready, as the way to what mends it (GUI review U13): the row, the Crew page or the quota; the shop and the yard by their way
  const why = (e, go) => PLACEPG[go] ? '<p class="bad">' + e + '</p>' + placeWay(go) : go ? '<button class="dr-why" data-pa="p2-go" data-go="' + go + '"><span>' + e + '</span><b>›</b></button>' : '<p class="bad">' + e + '</p>';
  // ---- the top: Start or Pause, Nå, and the button that fixes a stop
  function top(o, C, untitled){
    const h = ['<div class="ph-card">' + (untitled ? '' : '<h4>' + L('Driftsplan · «', 'Operations plan · «') + S.boatName + '»</h4>')];
    const now = nowOf(o), stopped = !o.on && o.stop;
    if (busy() || plan2Building(o)) h.push('<button class="dr-onoff" disabled>' + L('Lager planen …', 'Making the plan …') + '</button>');
    else if (o.on) h.push('<button class="dr-onoff on" data-pa="p2-pause">' + L('På · trykk for pause', 'On · tap to pause') + '</button>');
    else h.push('<button class="dr-onoff" data-pa="p2-start"' + (C.ok ? '' : ' disabled') + '>' + (C.ok ? L('Start planen', 'Start the plan') : L('Ikke klar ennå', 'Not ready yet')) + '</button>');
    if (o.on || stopped || o.paused) h.push('<div class="dr-now' + (now[1] === 'bad' || stopped ? ' bad' : now[1] === 'wait' ? ' wait' : '') + '"><b>' + L('Nå: ', 'Now: ') + '</b>' + now[0] + '</div>');
    if (o.on && o.run && o.run.fail && S.t - o.run.fail.t < 1440) h.push('<p class="warn">' + L('Kunne ikke sette eller trekke: ', 'Could not set or haul: ') + L(o.run.fail.no, o.run.fail.en) + '</p>');
    if (o.on && o.held) h.push(B('p2-resume', L('Gi båten tilbake til planen', 'Give the boat back to the plan'), '', 'p'));
    if (stopped && o.stop.fix) h.push(B('p2-fix', {places:L('Endre stedet', 'Change the place'), mannskap:L('Til mannskapet', 'To the crew'), quota:L('Se kvoten', 'See the quota'), rig:L('Endre redskapet', 'Change the gear')}[o.stop.fix] || L('Se planen', 'See the plan'), '', 'p'));
    // the gear in the sea while the plan is off (choice 2 A): said, with the trip that fetches it
    if (!o.on && (o.ring || o.v !== DRV3)){ const sets = mySets(); if (sets.length){ const H = S.t / 60; h.push('<p class="warn">' + L(sets.map(s => s.n + ' ' + unitName(s.kind, s.n) + ' har stått ' + fmt(H - s.tSet / 60, 0) + ' t').join(', ') + ' i sjøen.', sets.map(s => s.n + ' ' + unitName(s.kind, s.n) + ' has stood ' + fmt(H - s.tSet / 60, 0) + ' h').join(', ') + ' in the sea.') + '</p>' + B('p2-fetch', L('Hent redskapet', 'Fetch the gear'))); } }
    if (!o.on && !C.ok) h.push(C.errors.map((e, i) => why(e, C.go[i])).join(''));
    if (o.err && !o.on) h.push('<p class="bad">' + o.err + '</p>');
    h.push(C.warnings.map(e => '<p class="warn">' + e + '</p>').join(''));
    h.push('</div>'); return h.join('');
  }
  // ---- the statistics (R9): today, the last seven days, and all
  function stats(o){
    const St = o.stats || {days:[], sum:{}}, today = gDate(S.t / 60).toISOString().slice(0, 10), days7 = []; for (let k = 6; k >= 0; k--) days7.push(gDate(S.t / 60 - k * 24).toISOString().slice(0, 10));
    const sum = list => { const r = {trips:0, kg:0, kr:0, lott:0, cost:0, conf:0, caught:0, out:0, sp:{}, port:{}}; for (const d of list){ r.trips += d.trips; r.caught += d.caught || 0; r.out += d.out || 0; r.kg += d.kg; r.kr += d.kr; r.lott += d.lott || 0; r.cost += d.cost || 0; r.conf += d.conf || 0; for (const k in d.sp) r.sp[k] = (r.sp[k] || 0) + d.sp[k]; for (const k in d.port) r.port[k] = (r.port[k] || 0) + d.port[k]; } return r; };
    const D = sum(St.days.filter(d => d.d === today)), W = sum(St.days.filter(d => days7.includes(d.d))), A = St.sum && St.sum.kg != null ? Object.assign({}, St.sum, Number.isFinite(St.sum.cost) ? {} : {cost:sum(St.days).cost}) : sum(St.days); const hold = Math.round(holdTotal()), cap = Math.round(capHold());
    const top = r => { const tot = Object.values(r.sp).reduce((a, v) => a + v, 0); return tot ? Object.entries(r.sp).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, v]) => (SPECIES[k] ? SPECIES[k][S.lang === 'no' ? 'no' : 'en'] : k) + ' ' + Math.round(100 * v / tot) + ' %').join(', ') : '–'; };
    const ports = r => Object.entries(r.port).map(([k, v]) => nm(k) + ' ' + fmt(v, 0) + ' kg').join(', ') || '–';
    const tr = (lbl, f) => '<tr><td>' + lbl + '</td><td>' + f(D) + '</td><td>' + f(W) + '</td><td>' + f(A) + '</td></tr>';
    const dkg = x => x ? Math.max(x.kg, x.caught || 0) : 0, mx = Math.max(1, ...days7.map(d => dkg(St.days.find(x => x.d === d))));
    return '<div class="ph-card"><h4>' + L('Statistikk', 'Statistics') + '</h4><table class="p2-stat"><tr><th></th><th>' + L('i dag', 'today') + '</th><th>' + L('7 døgn', '7 days') + '</th><th>' + L('alt', 'all') + '</th></tr>' +
      tr(L('Fisket', 'Caught'), r => fmt(r.caught || 0, 0) + ' kg') + tr(L('Levert', 'Landed'), r => fmt(r.kg, 0) + ' kg') + tr(L('Inntekt etter lott', 'Income after shares'), r => kr(Math.round(r.kr))) + tr(L('Lott', 'Shares'), r => kr(Math.round(r.lott))) + tr(L('Utgifter', 'Costs'), r => kr(Math.round(r.cost))) + (A.conf ? tr(L('Inndratt', 'Confiscated'), r => fmt(r.conf, 0) + ' kg') : '') + tr(L('Turer', 'Trips'), r => r.out || 0) + tr(L('Leveringer', 'Landings'), r => r.trips) + '</table>' +
      (hold >= 1 ? '<div class="ph-kv"><span>' + L('Om bord nå', 'Aboard now') + '</span><span>' + fmt(hold, 0) + ' kg ' + L('av', 'of') + ' ' + fmt(cap, 0) + ' kg</span></div>' : '') +
      '<div class="ph-kv"><span>' + L('Arter, 7 døgn', 'Species, 7 days') + '</span><span>' + top(W) + '</span></div><div class="ph-kv"><span>' + L('Mottak, 7 døgn', 'Plants, 7 days') + '</span><span>' + ports(W) + '</span></div>' +
      '<div class="dr-w7">' + days7.map(d => { const k = dkg(St.days.find(y => y.d === d)); return '<i style="height:' + Math.max(2, Math.round(k / mx * 100)) + '%" title="' + fmt(k, 0) + ' kg"></i>'; }).join('') + '</div><div class="dr-w7l">' + days7.map(d => '<span>' + d.slice(8) + '.</span>').join('') + '</div>' +
      (A.trips ? '' : '<p class="ph-note">' + L('Ingen leveringer på planen ennå.', 'No landings on the plan yet.') + '</p>') +
      (hold >= 1 && p2Lag() ? '<p class="ph-note">' + L('Fangsten sløyes og fryses om bord og leveres når turen er over.', 'The catch is gutted and frozen aboard and landed when the trip is over.') + '</p>' : '') + (hold >= 1 && !p2Lag() && (o.land || {}).when !== 'trip' ? '<p class="ph-note">' + L('Fangsten holdes i is om bord til planen leverer den: ' + ((o.land || {}).when === 'days' ? 'turens siste døgn, ' : '') + 'når lasten er ' + Math.round(DRP2.full * 100) + ' % full, eller når fisken må leveres for ferskhetens skyld.', 'The catch is kept in ice aboard until the plan lands it: ' + ((o.land || {}).when === 'days' ? 'on the trip\'s last day, ' : '') + 'when the hold is ' + Math.round(DRP2.full * 100) + ' % full, or when the fish must go for the sake of freshness.') + '</p>' : '') + '</div>';
  }
  // ---- the page
  // a new plan: the gear she is rigged for (or the first aboard), and its bait or tackle; the place is chosen on the chart
  function fresh(){
    const G = plan3Gear(), g = G.find(x => x.rig === rigOf()) || G[0] || {rig:'juksa', lk:[], bait:[], tackle:['mark']};
    const o = plan3New({x:S.boat.pos.x, y:S.boat.pos.y}, g.rig, {lk:g.lk[0] || null, bait:g.bait.length ? (BAITS[S.pgear && S.pgear.baitPref] ? S.pgear.baitPref : g.bait[0]) : null, tackle:g.tackle.length ? (S.target === 'kveite' && g.tackle.includes('kveite') ? 'kveite' : 'mark') : null});
    o.ring = null; o.on = false; return o;
  }
  function page(){
    const o = plan2Ops();
    // (an old plan winding up, plan3Retire: it fetches its gear and lands; «Nå» and Pause as before, and a new plan after it)
    if (o && o.v === DRV2 && o.retire) return '<div class="ph-c dr-page">' + top(o, {ok:true, errors:[], go:[], warnings:[]}) + '<div class="ph-card"><p class="ph-note">' + L('Den gamle driftsplanen er slått av. Båten trekker redskapet, leverer fangsten og blir liggende ved mottaket. Så kan du lage en ny plan her.', 'The old operations plan is switched off. The boat hauls the gear, lands the catch and lies at the plant. Then you can make a new plan here.') + '</p></div></div>';
    if (!o || o.v !== DRV3) return '<div class="ph-c dr-page"><div class="ph-card"><h4>' + L('Driftsplan for «', 'Operations plan for «') + S.boatName + '»</h4><p class="ph-note">' + L('Med en driftsplan fisker, leverer og hviler båten på egen hånd, hver dag, også når spillet er lukket. Du velger to ting: stedet, en ring i kartet, og redskapet. Planen finner resten selv: hjem, mottak, vær og rytme, og hvor i ringen fisken står.', 'With an operations plan the boat fishes, lands and rests on her own, every day, also while the game is closed. You choose two things: the place, a ring on the chart, and the gear. The plan finds the rest itself: the home, the plant, the weather and the rhythm, and where in the ring the fish stand.') + '</p>' + B('p2-new', L('Lag driftsplan', 'Make a plan'), '', 'p') + '</div></div>';
    const C = check3(o), h = ['<div class="ph-c dr-page">'];
    h.push('<div class="ph-card dr-rows"><h4>' + L('Driftsplan · «', 'Operations plan · «') + S.boatName + '»</h4>' + row('sted', L('Sted', 'Place'), ringVal(o), () => stedBody(o), !o.ring) + row('gear', L('Redskap', 'Gear'), gearVal(o), () => gearBody(o), !gearOf(o)) + '</div>');
    h.push(top(o, C, true));
    h.push(chosen(o));
    if (o.places.length && o.home) h.push(dayCard(o));
    h.push(stats(o));
    h.push('<div class="ph-card">' + B('p2-reset', L('Slett driftsplanen', 'Delete the plan'), '', 'dr-del') + '</div></div>');
    return h.join('');
  }
  function start(o){
    const C = check3(o); if (!C.ok){ toast(C.errors[0]); return; }
    const go = () => { plan2Start(o); toast(L('Driftsplanen er på.', 'The plan is on.')); };
    // (an ocean vessel's plan made before DP3-4, on the test edition only: its fields of four lenker and no lay for the snow crab's pattern;
    // made again at the next Start when none of its gear is in the sea, else it goes on with the fields it has)
    const stale = o.v === DRV3 && (p2Auto(o) || p2Sno(o)) && (o.p3v || 0) < 4 && !plan2State(o).sets.length;
    if (plan2Made(o) && o.places.length && !stale){ go(); return; }
    if (stale) redo(o);
    const mk = busy0 = Date.now(); plan3Make(o, err => { if (busy0 !== mk) return; busy0 = 0; if (err) toast(err); else go(); rerender(); });
  }
  // the gear in the sea is fetched on one trip while the plan is off (choice 2 A): a day of hauls without setting again, then home
  function fetch(o){
    if (o.v === DRV3 && !o.ring){ toast(L('Velg et sted først.', 'Choose a place first.')); return; }
    if (!plan2Made(o)){ const mk = busy0 = Date.now(); plan3Make(o, err => { if (busy0 !== mk) return; busy0 = 0; if (err) toast(err); else fetch(o); rerender(); }); return; }
    plan2Abort(o); o.fetch = true; o.on = true; o.stop = null; o.held = null; o.hold = 0; o.run = null; o.paused = null; toast(L('Båten går ut og henter redskapet.', 'The boat goes out to fetch the gear.'));
  }
  function act(a, d){
    // (D4: another boat's plan from the row under Om bord › Mannskap og drift: her own page, with the boat chosen)
    if (a === 'p2-other'){ if (!vesselById(d.id)) return false; PHONE.dact('drift', 'vsel', {id:d.id}); DOCK.open('drift'); return false; }
    if (a === 'p2-new'){ const o0 = plan2Ops(); if (o0 && (o0.on || o0.retire)) return false; if (o0 && S.plan && S.plan.ops) plan2Abort(o0); S.ops = fresh(); open = 'sted'; return true; }
    const o = plan2Ops(); if (!o) return false;
    if (a === 'p2-row'){ open = open === d.k ? null : d.k; return true; }
    if (a === 'p2-start'){ start(o); return true; }
    if (a === 'p2-pause'){ plan2Pause(o); toast(!o.paused.sea ? L('Driftsplanen står på pause. Redskapet i sjøen står der det står.', 'The plan is paused. The gear in the sea stays where it is.') : S.boat.anch ? L('Driftsplanen står på pause. Båten ankrer der den er, og redskapet i sjøen står der det står.', 'The plan is paused. The boat anchors where she is, and the gear in the sea stays where it is.') : L('Driftsplanen står på pause. Båten driver der den er' + driftWhy(o)[0] + '. Redskapet i sjøen står der det står.', 'The plan is paused. The boat drifts where she is' + driftWhy(o)[1] + '. The gear in the sea stays where it is.')); return true; }
    if (a === 'p2-resume'){ plan2Resume(o); return true; }
    if (a === 'p2-fetch'){ fetch(o); return true; }
    if (a === 'p2-fix'){ const f = o.stop && o.stop.fix; if (f === 'mannskap'){ PHONE.open('arbeid'); return false; } if (f === 'quota'){ PHONE.open('kvote'); return false; } open = f === 'rig' ? 'gear' : 'sted'; return true; }
    if (a === 'p2-sno'){ snoSetMode(d.v); return true; }   // (frozen or live for the trip, H3b; the plan follows it, H3c)
    if (a === 'p2-gut'){ if (d.v === '1') delete S.boat.gutAboard; else S.boat.gutAboard = false; return true; }   // (R1; the boat's own setting, also while the plan runs)
    if (a === 'p2-go'){ const g = d.go; if (g === 'mannskap'){ PHONE.open('arbeid'); return false; } if (g === 'quota'){ PHONE.open('kvote'); return false; }
      open = g === 'gear' || g === 'rig' ? 'gear' : 'sted'; return true; }
    if (a === 'p2-map'){ if (locked(o)) return false; if (typeof PLANMAP !== 'undefined') PLANMAP.open(S.cur); return true; }
    if (locked(o)) return false;   // (the place and the gear change only while the plan is off)
    if (a === 'p2-g3'){ const g = plan3Gear().find(x => x.rig === d.g); if (!g) return false; if (g.rig !== o.rig){ o.rig = g.rig; o.jig = g.rig === 'juksa'; o.lk = g.lk[0] || null; o.bait = g.bait.length ? (g.bait.includes(o.bait) ? o.bait : g.bait[0]) : null; o.tackle = g.tackle.length ? 'mark' : null; redo(o); } return true; }
    if (a === 'p2-lk3'){ if (!LINE_KINDS[d.v]) return false; o.lk = d.v; redo(o); return true; }
    if (a === 'p2-bait3'){ if (!BAITS[d.v]) return false; o.bait = d.v; redo(o); return true; }
    if (a === 'p2-tk3'){ o.tackle = d.v === 'kveite' ? 'kveite' : 'mark'; redo(o); return true; }
    if (a === 'p2-reset'){ askReset(o); return false; }
    return false;
  }
  // the ring set on the chart (PLANMAP, ui/03g-planmap.js): checked for water for the gear (plan3RingWhy), the map round it loaded first.
  // cb(why) with null when it is set
  async function ringPut(o, p, cb){
    if (locked(o)){ cb(L('Sett planen på pause for å flytte ringen.', 'Pause the plan to move the ring.')); return; }
    const ring = {x:p.x, y:p.y, r:plan3RingKm(o.rig)}; try { await mapNeed(ring, ring.r + 0.5); } catch (e){}
    const t = Object.assign({}, o, {ring}), why = plan3RingWhy(t, plan3Spots(t));
    if (why){ cb(why); return; }
    o.ring = ring; redo(o); if (typeof save === 'function') save(); cb(null);
  }
  // Slett (GUI review P7 A): the game's own dialog, with the plan by its boat's name and what becomes of the gear in the sea
  function askReset(o){
    const sets = mySets(), gear = sets.length ? '<p>' + L(sets.map(s => s.n + ' ' + unitName(s.kind, s.n)).join(', ') + ' står i sjøen. ' + (sets.length > 1 ? 'De' : 'Det') + ' blir stående der når planen er slettet, og må hentes med båten. Vil du ha redskapet om bord først, trykk «Hent redskapet» i stedet.', sets.map(s => s.n + ' ' + unitName(s.kind, s.n)).join(', ') + ' stand' + (sets.length > 1 || sets[0].n > 1 ? '' : 's') + ' in the sea. It stays there when the plan is deleted, and must be fetched with the boat. To have the gear aboard first, tap «Fetch the gear» instead.') + '</p>' : '<p>' + L('Ingen redskap fra planen står i sjøen.', 'No gear of the plan stands in the sea.') + '</p>';
    modal('<h3>' + L('Slette driftsplanen for «' + S.boatName + '»?', 'Delete the plan for «' + S.boatName + '»?') + '</h3><p>' + L('Stedet, redskapet og statistikken for planen blir borte.', 'The place, the gear and the plan\'s statistics are gone.') + '</p>' + gear +
      '<div class="btns"><button class="btn primary" data-close>' + L('Behold planen', 'Keep the plan') + '</button><button class="btn dr-danger" id="p2Del">' + L('Slett planen', 'Delete the plan') + '</button></div>');
    $('p2Del').onclick = () => { $('modal').hidden = true; if (plan2Ops() !== o) return; const hm = o.home; S.ops = null; open = null; if (S.plan && S.plan.ops) S.plan.ops = false; if (isBerth(hm)) havnFree(hm); if (typeof save === 'function') save(); rerender(); if (typeof DOCK !== 'undefined') DOCK.redraw(); };
  }
  // one line for the Crew page: what the plan does now, and the way to it
  function line(){ const o = plan2Ops(), n = o ? nowOf(o)[0] : L('Ingen driftsplan', 'No operations plan'); return '<div class="ph-card dr-line"><span><b>' + L('Driftsplan', 'Operations plan') + '</b><small>' + n + '</small></span><button class="ph-btn" data-pa="open" data-a="drift">' + L('Åpne', 'Open') + '</button></div>'; }
  return {page, act, line, nowOf, preview, fresh, ringPut, ringName, rerender};
})();
