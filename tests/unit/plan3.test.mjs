// Driftsplan 3, DP3-1 (docs/planer/driftsplan-3.md, 16.11.2026): the plan is a ring and a gear, and «find the plan» (core/06k-plan3.js)
// reckons the rest. Checked here without a map: the ring's size per gear, the units split on the places, the places picked apart in the
// ring from the spots, the home's score, the rhythm, the ring refused without water or gear, v5 run by the engine as a v4, and the old
// plans switched off (a running one fetches its gear and lands, plan3Retire). The map reads (plan3Spots, plan3Home) are driftsplan3test's.
export default function (t){
  const K = t.K, {newState, DRP3, NM, plan3RingKm, plan3Split, plan3Places, plan3HomeScore, plan3Rhythm, plan3RingWhy, plan3New, plan3Retire, plan2Ops, DRV2, DRV3, DRIFT3, PORTS, kmTrue} = K;
  K.set('S', newState()); const S = K.get('S');
  // the ring: fixed per gear (Jonas 16.11.2026: «Fast per redskap»), its radius in true km
  t.near(plan3RingKm('line'), DRP3.ring.line * NM / 2, 1e-9, 'ringen for line: ' + DRP3.ring.line + ' nm i diameter, radius ' + plan3RingKm('line').toFixed(2) + ' km');
  t.ok(plan3RingKm('juksa') < plan3RingKm('teiner') && plan3RingKm('teiner') < plan3RingKm('garn'), 'juksa minst, så teiner, så garn og line');
  // the units on the places: all the boat owns of the kind, a field per four tubs (four at most), never more than she owns
  S.pgear.lines.hyse.n = 10; S.pgear.lines.hyse.baited = 10; S.pgear.lines.bank.n = 0;
  const o = plan3New({x:500, y:300}, 'line', {lk:'hyse', bait:'sild'});
  t.ok(o.v === DRV3 && o.ring.r === plan3RingKm('line') && o.bait === 'sild' && o.lk === 'hyse', 'en ny plan er v5 med ringen, agnet og linetypen');
  t.ok(o.jig === false, 'bare ett redskap: ingen juksa i tillegg til lina (Jonas 16.11.2026)');
  { const sp = plan3Split(o); t.ok(sp.k === 'felt' && JSON.stringify(sp.n) === '[4,3,3]', 'ti stamper hyseline: tre felt med 4, 3 og 3 (' + JSON.stringify(sp.n) + ')'); }
  S.pgear.lines.hyse.n = 30; t.ok(JSON.stringify(plan3Split(o).n) === '[8,8,7,7]', 'tretti stamper: fire felt, høyst (' + JSON.stringify(plan3Split(o).n) + ')');
  S.pgear.lines.hyse.n = 0; t.ok(plan3Split(o).n.length === 0, 'ingen stamper: ingen felt');
  t.ok(/ikke noe line om bord/i.test(plan3RingWhy(o, [{x:500, y:300, s:0}])), 'ingen line om bord: ringen avvises med grunnen («' + plan3RingWhy(o, [{x:500, y:300, s:0}]) + '»)');
  { const j = plan3New({x:500, y:300}, 'juksa', {tackle:'mark'}); const sp = plan3Split(j);
    t.ok(sp.k === 'juks' && sp.places === DRP3.jigPlaces && j.jig === true, 'juksa: ' + DRP3.jigPlaces + ' juksplasser'); }
  // the places: the best spots first (the middle of the gear's depth band), apart from each other by a third of the ring
  S.pgear.lines.hyse.n = 8;
  const spots = [{x:500, y:300, s:0.1}, {x:500.1, y:300, s:0.05}, {x:501, y:300, s:0.3}, {x:499, y:300.5, s:0.2}, {x:500, y:301.2, s:0.9}];
  { const P = plan3Places(o, spots), gap = Math.max(DRP3.spaceKm, o.ring.r / 3);
    t.ok(P.length === 2 && P.every(q => q.k === 'felt' && q.lk === 'hyse' && q.soak > 0), 'åtte stamper: to felt med linetypen og ståtida (' + P.length + ')');
    t.ok(P[0].x === 500.1, 'det beste stedet først (dybden midt i båndet)');
    t.ok(kmTrue(P[0], P[1]) >= gap - 1e-9, 'feltene står minst ' + gap.toFixed(2) + ' km fra hverandre (' + kmTrue(P[0], P[1]).toFixed(2) + ')');
    t.ok(P.reduce((a, q) => a + q.n, 0) === 8, 'alle åtte stampene er på feltene'); }
  t.ok(/ingen plass/.test(plan3RingWhy(o, [])), 'ingen vann for redskapet i ringen: avvist med grunnen');
  // the home's score: a place the crew sleep well at beats a nearer one where they do not; the rorbu's price counts a little
  { const near = {d:5, rest:false, me:true, rorbu:false}, far = {d:20, rest:true, me:true, rorbu:false}, rb = {d:19, rest:true, me:true, rorbu:true};
    t.ok(plan3HomeScore(far) < plan3HomeScore(near), 'hvile for mannskapet 20 km unna slår en kai uten hvile 5 km unna');
    t.ok(plan3HomeScore(far) < plan3HomeScore(rb), 'en rorbu 1 km nærmere taper på prisen');
    t.ok(plan3HomeScore({d:5, rest:true, me:false, rorbu:false}) > plan3HomeScore({d:5, rest:true, me:true, rorbu:false}), 'uten hvile for deg om bord teller det mot'); }
  // the rhythm: the skiff (no wheelhouse, no bunks) goes day trips
  t.ok(plan3Rhythm(o) === 'day', 'skiffen går dagdrift (' + plan3Rhythm(o) + ')');
  // the engine runs a v5 as a v4; an old v4 is left as it is while DRIFT3 is off (the page comes in DP3-3)
  S.ops = o; t.ok(plan2Ops() === o, 'motoren kjører en v5-plan');
  t.ok(DRIFT3 === false, 'DRIFT3 er av til siden er bygd (DP3-3)');
  { const v4 = {v:DRV2, on:true, places:[], rig:'juksa', land:{}}; S.ops = v4; t.ok(plan2Ops() === v4, 'med DRIFT3 av står en v4-plan som før'); }
  // the old plans (Jonas 16.11.2026: «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak», «Trekk først, så lever»)
  const M = PORTS.find(p => p.mottak).id;
  { const v4 = {v:DRV2, on:true, held:null, places:[{id:'f1', k:'felt', x:500, y:300, n:4}], rig:'line', land:{}, M, home:'naust', run:{}}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    const r = plan3Retire(v4);
    t.ok(r === v4 && v4.retire && v4.fetch && v4.home === M && v4.on, 'en v4-plan som går, med lina i sjøen og deg om bord: henter redskapet og leverer på mottaket, som blir hjemmet (' + JSON.stringify([!!v4.retire, !!v4.fetch, v4.home === M]) + ')');
    t.ok(plan3Retire(v4) === v4, 'mens den henter, går den');
    v4.on = false; t.ok(plan3Retire(v4) === null && S.ops === null, 'når redskapet er hentet og fangsten levert, er planen borte'); }
  { const v4 = {v:DRV2, on:false, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    t.ok(plan3Retire(v4) === null && S.ops === null, 'en v4-plan som er av: borte med en gang, båten blir liggende og redskapet står'); }
  { const v4 = {v:DRV2, on:true, held:{t:0}, places:[], rig:'line', land:{}, M}; S.ops = v4;
    t.ok(plan3Retire(v4) === null && S.ops === null, 'en v4-plan du har tatt over: borte, båten er din'); }
  // who can sail her (the control 16.11.2026): a wait is no reason to drop the plan; the plan names a skipper and a mate when it can
  { S.me = 'annen'; const v4 = {v:DRV2, on:true, held:null, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    t.ok(plan3Retire(v4) === v4 && v4.retire, 'skiffen med plass til én, du i land: planen venter på deg som før og henter redskapet da, den blir ikke borte'); S.me = null; }
  const {applyVessel, genCrew, crewSkipper, crewMate} = K;
  S.boat.type = 'sjark'; applyVessel();
  { S.me = 'annen'; S.crew = []; const v4 = {v:DRV2, on:true, held:null, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    t.ok(plan3Retire(v4) === null && S.ops === null, 'sjarken uten noen om bord og du i land: ingen kan føre henne, planen er borte og båten blir liggende'); }
  { S.crew = [genCrew(), genCrew()]; for (const c of S.crew){ c.bi = false; c.off = false; delete c.sk; delete c.mate; }
    const v4 = {v:DRV2, on:true, held:null, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}];
    const r = plan3Retire(v4);
    t.ok(r === v4 && crewSkipper() && crewMate() && crewSkipper() !== crewMate(), 'to om bord uten skipper og styrmann: planen utnevner dem og henter redskapet (' + (crewSkipper() || {}).name + ', ' + (crewMate() || {}).name + ')'); S.me = null; }
  // a trip of the plan's under way, with nothing to fetch: it stops where she is when the plan is dropped
  { const v4 = {v:DRV2, on:true, held:null, places:[], rig:'juksa', land:{}, M}; S.ops = v4; S.sets = []; S.hold = []; S.plan = {ops:true, wps:[], idx:0}; S.boat.status = 'sailing';
    t.ok(plan3Retire(v4) === null && S.plan === null && S.boat.status === 'idle', 'planen borte midt på en tur uten redskap eller fangst: turen stopper der båten er (' + S.boat.status + ')'); }
  // the way in the game: plan2Ops with DRIFT3 on
  { K.set('DRIFT3', true); const v4 = {v:DRV2, on:true, held:null, places:[], rig:'line', land:{}, M}; S.ops = v4; S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1'}]; S.me = null;
    t.ok(plan2Ops() === v4 && v4.retire && v4.home === M, 'med DRIFT3 på: plan2Ops slår den gamle planen av gjennom plan3Retire, og den henter redskapet');
    v4.on = false; v4.stop = {no:'Fant ingen vei.', en:'Found no way.'}; const n0 = S.msgs.length;
    t.ok(plan2Ops() === null && S.ops === null && /kom ikke helt i mål: Fant ingen vei/.test((S.msgs[S.msgs.length - 1] || {}).no || ''), 'stoppet underveis: borte, og meldingen sier hvorfor og at redskapet står (' + ((S.msgs[S.msgs.length - 1] || {}).no || '').slice(0, 90) + ')');
    const o5 = plan3New({x:500, y:300}, 'juksa'); S.ops = o5; t.ok(plan2Ops() === o5, 'en v5-plan går også med DRIFT3 på'); K.set('DRIFT3', false); }

  // ---- DP3-2: the search with the echo sounder (16.11.2026). A ring of candidates 0.5 km apart with a made-up sea (den): a dense school of
  // saithe in one corner, the haddock thickest in another; the haddock line takes the haddock (SELQ line:hyse 2.6, saithe 0.15)
  { const {plan3Search, plan3SokNeed, plan3Truth, plan3Take, plan3Sig, plan3HaulWatch, plan3SokEst, HEAT, planDay, planDayText, plan2State} = K;
    S.ops = null; S.plan = null; S.sets = []; S.marks = []; S.boat.type = 'sjark'; applyVessel(); S.me = S.cur;
    S.pgear.lines.hyse.n = 8; S.pgear.lines.hyse.baited = 8; S.pgear.lines.hyse.bt = {makrell:8};
    const C = {x:500, y:300}, o = plan3New(C, 'line', {lk:'hyse', bait:'makrell'}), r = o.ring.r, cand = [];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++){ const p = {x:C.x + i * 0.45, y:C.y + j * 0.45}; if (kmTrue(p, C) <= r) cand.push([p.x, p.y]); }
    o.places = [{id:'f1', k:'felt', x:cand[0][0], y:cand[0][1], n:4, soak:8, lk:'hyse'}, {id:'f2', k:'felt', x:cand[cand.length - 1][0], y:cand[cand.length - 1][1], n:4, soak:8, lk:'hyse'}];
    const all = cand.map((c, i) => i), seenAll = {basic:all, chirp:all, sonar:all};
    o.sok = {cand, reach:{f1:all, f2:all}, track:{basic:[], chirp:[], sonar:[]}, seen:seenAll, km:{basic:9, chirp:6, sonar:3}};
    const SAI = {x:C.x + 1.2, y:C.y + 0.6}, HYS = {x:C.x - 0.9, y:C.y - 0.9}, H = S.t / 60;
    const bump = (p, c, w) => Math.exp(-((p.x - c.x) ** 2 + (p.y - c.y) ** 2) / (w * w));
    const den = (sp, p) => sp === 'sei' ? 0.05 + 3 * bump(p, SAI, 0.5) : sp === 'hyse' ? 0.02 + 0.4 * bump(p, HYS, 0.6) : 0.01;
    const take = plan3Take(o, H), tv = i => plan3Truth({x:cand[i][0], y:cand[i][1]}, H, take, den), best = Math.max(...all.map(tv));
    t.ok(take.hyse > 2 && take.sei < 0.3, 'hyselina tar hysa, nesten ikke seien (' + take.hyse.toFixed(2) + ', ' + take.sei.toFixed(2) + ')');
    // (2) CHIRP finds denser fish for the gear than the simple sounder, in the same ring with the same seed: the simple one sees all fish and
    // goes for the saithe; the CHIRP tells the species apart
    const mean = (tier, erf, n) => { let a = 0, top = 0, over = 0; for (let k = 1; k <= n; k++){ for (const q of o.places){ q.at = null; q.move = false; } o.sokN = 0; const g = plan3Search(o, ['f1'], H, {lay:false, den, tier, erf, seed:k}), v = tv(g[0].i); a += v; if (v >= best - 1e-12) top++; if (v > best + 1e-12) over++; } return {m:a / n, top:top / n, over}; };
    const B1 = mean('basic', 5, 1), C1 = mean('chirp', 5, 1);
    t.ok(C1.m > B1.m * 1.5, 'CHIRP finner tettere fisk for lina enn det enkle ekkoloddet med samme frø (' + C1.m.toFixed(3) + ' mot ' + B1.m.toFixed(3) + ')');
    const B = mean('basic', 3, 200), Cm = mean('chirp', 3, 200), Sm = mean('sonar', 3, 200);
    t.ok(Cm.m > B.m * 1.5 && Sm.m > B.m * 1.5, 'i snitt over 200 frø: CHIRP ' + Cm.m.toFixed(3) + ' og sonaren ' + Sm.m.toFixed(3) + ' mot det enkle ' + B.m.toFixed(3) + ' (erfaring 3)');
    // (3) the reader: experience 5 picks better spots than 1 on average over the seeds, and never better than the fish there
    const E1 = mean('chirp', 1, 300), E5 = mean('chirp', 5, 300), Em = mean('chirp', DRP3.sok.meErf, 300);
    t.ok(E5.m > E1.m * 1.1 && E5.top > E1.top, 'en skipper med erfaring 5 velger bedre ruter enn en med 1, i snitt over 300 frø (' + E5.m.toFixed(3) + ' mot ' + E1.m.toFixed(3) + '; den beste ruta ' + Math.round(E5.top * 100) + ' % mot ' + Math.round(E1.top * 100) + ' % av gangene)');
    t.ok(E1.over === 0 && E5.over === 0 && Math.max(E1.m, E5.m) <= best + 1e-12, 'aldri bedre enn tettheten selv: ingen valgt rute over den beste i ringen (' + best.toFixed(3) + ')');
    t.ok(Em.m <= mean('chirp', 3, 300).m && plan3Sig(DRP3.sok.meErf) > plan3Sig(3), 'du om bord leser som en fersk fisker (erfaring ' + DRP3.sok.meErf + ', spredning ' + plan3Sig(DRP3.sok.meErf).toFixed(2) + ' mot ' + plan3Sig(5).toFixed(2) + ' for erfaring 5): snitt ' + Em.m.toFixed(3));
    // the same seed reads the same: the plan's own seed and the search's number
    { const a = [], b = []; for (const L of [a, b]){ for (const q of o.places){ q.at = null; q.move = false; } o.sokN = 0; L.push(...plan3Search(o, ['f1', 'f2'], H, {lay:false, den, tier:'chirp', erf:2, seed:77}).map(g => g.i)); L.push(...plan3Search(o, ['f1'], H, {lay:false, den, tier:'chirp', erf:2, seed:77}).map(g => g.i)); }
      t.ok(JSON.stringify(a) === JSON.stringify(b), 'samme frø og samme søk gir de samme plassene (' + JSON.stringify(a) + ')'); }
    // two fields apart, inside the ring, and a field that fell moves off its spot
    { for (const q of o.places){ q.at = null; q.move = false; } o.sokN = 0; plan3Search(o, ['f1', 'f2'], H, {lay:false, den, tier:'chirp', erf:5, seed:3}); const [f1, f2] = o.places;
      t.ok(f1.at && f2.at && kmTrue(f1.at, f2.at) >= Math.max(DRP3.spaceKm, r / 3) - 1e-9 && kmTrue(f1.at, C) <= r + 1e-9 && kmTrue(f2.at, C) <= r + 1e-9, 'to felt står en tredel av ringen fra hverandre, og begge inne i ringen (' + kmTrue(f1.at, f2.at).toFixed(2) + ' km)');
      const was = f1.at; f1.move = true; plan3Search(o, ['f1'], H, {lay:false, den, tier:'chirp', erf:5, seed:3});
      t.ok(f1.at && kmTrue(f1.at, was) >= DRP3.spaceKm - 1e-9 && kmTrue(f1.at, C) <= r + 1e-9 && !f1.move && f1.q1 == null, 'et felt der fangsten falt, flytter seg minst ' + DRP3.spaceKm + ' km, og aldri ut av ringen (' + kmTrue(f1.at, was).toFixed(2) + ' km)'); }
    // nothing seen: the field keeps its fixed point (the reserve)
    { const q = o.places[0]; q.at = null; const k = o.sok.reach.f1; o.sok.reach.f1 = []; plan3Search(o, ['f1'], H, {lay:false, den, tier:'chirp', erf:5, seed:1}); t.ok(q.at === null, 'ser søket ingenting, står feltet på plassen dybden ga (reserven)'); o.sok.reach.f1 = k; }
    // the string laid with its middle on the spot (the catch is reckoned at the string's middle, setMid), along the line through the ring's
    // middle, and not across another field's string (a sea without land here: the map reads stubbed)
    { const keep = ['isLand', 'depthF', 'legClear', 'ruBlockMsg', 'plan2TideMin'].map(k => [k, K.get(k)]);
      K.set('isLand', () => false); K.set('depthF', () => 80); K.set('legClear', () => true); K.set('ruBlockMsg', () => null); K.set('plan2TideMin', () => 0);
      const {plan3Lay, plan3StrKm} = K, q = o.places[0], at = {x:C.x + 1.0, y:C.y}, L = plan3StrKm(o, q), y = plan3Lay(o, q, at, []);
      const mid = y && {x:(y.st.x + y.e.x) / 2, y:(y.st.y + y.e.y) / 2}, toC = y && Math.abs(Math.sin(y.hdg)) > 0.99;
      t.ok(y && kmTrue(mid, at) < 1e-6 && Math.abs(kmTrue(y.st, y.e) - L) < 0.05 * L && toC, 'fire stamper hyseline (' + L.toFixed(2) + ' km) ligger med midten på plassen søket fant, langs linja gjennom ringens midte (' + (y ? (y.hdg * 180 / Math.PI).toFixed(0) + '°' : '–') + ')');
      const other = {st:{x:C.x + 0.2, y:C.y - 1.0}, e:{x:C.x + 0.2, y:C.y + 1.0}}, y2 = plan3Lay(o, q, at, [other]), fc = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
      t.ok(y2 && !(fc(y2.st, y2.e, other.st) * fc(y2.st, y2.e, other.e) < 0 && fc(other.st, other.e, y2.st) * fc(other.st, other.e, y2.e) < 0), 'en annen lenke over plassen: lina dreies så de ikke krysser (' + (y2 ? (y2.hdg * 180 / Math.PI).toFixed(0) + '°' : '–') + ')');
      K.set('isLand', p => kmTrue(p, C) > 0.5); const y3 = plan3Lay(o, q, {x:C.x, y:C.y}, []); K.set('isLand', () => false);
      t.ok(y3 === null, 'en vik på 1 km der lenka på 3,6 km skulle ligge: den legges ikke (søket tar den neste plassen)');
      // the pattern kept when the plan is made (plan3SokPrep): shorter with the sounder that sees further, all of it inside the ring, seeing
      // every candidate, ending at a field's fixed point, and the headings each string can lie in at each candidate
      { const {plan3SokPrep} = K, spots = cand.map(c => ({x:c[0], y:c[1], s:kmTrue({x:c[0], y:c[1]}, C)})), P0 = o.places.map(q => ({...q})), Kp = plan3SokPrep(o, spots), T = Object.keys(HEAT.tiers);
        const inside = T.every(t => Kp.track[t].every(c => kmTrue({x:c[0], y:c[1]}, C) <= r + 1e-6)), ends = T.every(t => { const L = Kp.track[t][Kp.track[t].length - 1], q = o.places.find(x => x.id === Kp.end[t]); return q && (!L || kmTrue({x:L[0], y:L[1]}, q) < 1e-3); });
        t.ok(Kp.km.basic > Kp.km.chirp && Kp.km.chirp >= Kp.km.sonar && T.every(t => Kp.seen[t].length === Kp.cand.length), 'mønsteret: kortere (eller like kort) med ekkoloddet som ser lenger (det enkle ' + Kp.km.basic + ' km, CHIRP ' + Kp.km.chirp + ', sonaren ' + Kp.km.sonar + '), og alle ' + Kp.cand.length + ' kandidatene sett');
        t.ok(inside && ends, 'hele mønsteret inne i ringen, og det ender på en fast plass der leiene er lagret');
        t.ok(Kp.lay.f1 && Object.keys(Kp.lay.f1).length === Kp.reach.f1.length && Object.values(Kp.lay.f1).every(hs => hs.length >= 1), 'retningene lenka kan ligge i, lest fra kartet når planen lages, for hver kandidat feltet når');
        K.set('isLand', p => p.x > C.x + 0.2 && p.x < C.x + 0.3 && Math.abs(p.y - C.y) < 0.8);   // (a skerry wall across the middle of the ring)
        const Kw = plan3SokPrep(o, spots), crossW = T.some(t => { const pts = [o.places[0]].concat(Kw.track[t].map(c => ({x:c[0], y:c[1]}))); for (let j = 1; j < pts.length; j++){ const a = pts[j - 1], b = pts[j]; for (let k = 0; k <= 100; k++){ const x = a.x + (b.x - a.x) * k / 100, y = a.y + (b.y - a.y) * k / 100; if (x > C.x + 0.2 && x < C.x + 0.3 && Math.abs(y - C.y) < 0.8) return true; } } return false; });
        t.ok(!crossW && Kw.km.basic > Kp.km.basic - 1e-9, 'et skjær midt i ringen: mønsteret går aldri over det (' + Kw.km.basic + ' km mot ' + Kp.km.basic + ')');
        K.set('isLand', () => false); o.places = P0; }
      for (const [k, v] of keep) K.set(k, v); }
    // (1) the search in the day: before the sets, with its length, its time and its fuel
    const had = 'fmt' in globalThis; if (!had) globalThis.fmt = (x, d2) => (+x).toFixed(d2).replace('.', ',');   // (fmt is the UI's, ui/02-format-state.js)
    { for (const q of o.places){ q.at = null; q.move = false; q.sokT = null; } o.home = PORTS.find(p => p.mottak).id; o.M = o.home; o.legs = {}; S.ops = o;
      const st = plan2State(o); t.ok(JSON.stringify(plan3SokNeed(o, st)) === '["f1","f2"]', 'to felt som aldri er søkt, med lina egnet: begge søkes (' + JSON.stringify(plan3SokNeed(o, st)) + ')');
      const d = planDay(o, H, st), ks = d.steps.map(x => x.k), sk = d.steps.find(x => x.k === 'sok');
      t.ok(sk && ks.indexOf('sok') < ks.indexOf('sett') && sk.h > 0 && sk.km === o.sok.km.basic && sk.l > 0, 'dagen søker før lina settes, med lengden, tida og dieselen (' + ks.join(' ') + '; ' + (sk ? sk.km + ' km, ' + Math.round(sk.h * 60) + ' min, ' + sk.l + ' l' : '–') + ')');
      const line = planDayText(o, d).find(x => /Søker etter fisken/.test(x[1])); t.ok(line && /ekkoloddet: .* km, om lag \d+ min og \d+ l diesel \(du leser bildet\)/.test(line[1]), 'teksten: «' + (line ? line[1] : '–') + '»');
      o.places[0].sokT = S.t; o.places[1].sokT = S.t; t.ok(plan3SokNeed(o, st).length === 0, 'søkt én gang: ikke igjen før fangsten faller');
      o.places[0].move = true; t.ok(JSON.stringify(plan3SokNeed(o, st)) === '["f1"]', 'et felt der fangsten falt, søkes igjen');
      S.sets = [{vid:S.cur, kind:'line', n:4, fid:'f1', id:'s1', a:{x:500, y:300}, b:{x:500.5, y:300}}]; t.ok(plan3SokNeed(o, plan2State(o)).length === 0, 'men ikke mens redskapet står der');
      S.sets = []; o.places[0].move = false; }
    // (4) a haul under half of the field's first: the field is searched again before the gear goes out, and the trip is cut before the set
    { const q = o.places[0]; q.q1 = null; S.boat.gop = null; const m0 = {x:q.x, y:q.y};
      o.p3h = {sid:'s1', fid:'f1', m:m0, t:S.t}; S.marks = [{x:m0.x, y:m0.y, t:S.t, g:'line', kgu:80, q:1.2}]; plan3HaulWatch(o, H);
      t.ok(q.q1 === 1.2 && !q.move, 'den første trekkingen på plassen er målet (' + q.q1 + ')');
      o.p3h = {sid:'s2', fid:'f1', m:m0, t:S.t}; S.marks.push({x:m0.x, y:m0.y, t:S.t, g:'line', kgu:50, q:0.7}); plan3HaulWatch(o, H); t.ok(!q.move, 'over halvparten: blir stående');
      o.run = {trip:{from:1, to:3}, day:{steps:[]}, i:1}; S.plan = {ops:true, p2:{}, idx:1, wps:[{x:0, y:0}, {x:q.x, y:q.y, act:{op:'cycle', only:'set', fid:'f1'}}]}; S.boat.status = 'fishing';
      o.p3h = {sid:'s3', fid:'f1', m:m0, t:S.t}; S.marks.push({x:m0.x, y:m0.y, t:S.t, g:'line', kgu:30, q:0.5});
      const cut = plan3HaulWatch(o, H);
      t.ok(q.move && cut && S.plan === null && o.run.replan && S.boat.status === 'idle', 'under halvparten av den første: feltet søkes igjen, og turen kuttes før settingen (' + JSON.stringify([q.move, cut, S.plan, o.run.replan]) + ')');
      S.ops = null; o.run = null; }
    if (!had) delete globalThis.fmt;
  }
}
