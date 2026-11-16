// ===== Driftsplan 3: the plan is a ring and a gear (16.11.2026, docs/planer/driftsplan-3.md). Part 1 (DP3-1): the model and «find the plan».
// Jonas 16.11.2026: «Spilleren [får] 2 enkle valg: sted og redskap … Deretter skal driftsplanen automatisk lage den planen som passer best
// for båten og mannskap. Driftsplanen skal kunne lages og startes fra hvor som helst». The player sets a ring (its size fixed per gear) and
// one gear with its bait or tackle; plan3Derive reckons the rest (home, the places in the ring, the units, the soak, the plant, the weather,
// the rhythm, the skipper and the mate) into the answers Driftsplan 2's engine runs (06g-plan2.js planDay, 06h-plan2-engine.js), so the
// engine, its legs, its waits and the world clock are the same. A v5 plan is a v4 plan with the ring on it, and DRV3 in o.v.
// Old plans (v4 and older) are switched off with a word once DRIFT3 is on, and a running one fetches its gear, lands at the plant and lies
// there (Jonas 16.11.2026: «Trekk først, så lever»; plan2Ops). DRIFT3 was off until the page (DP3-3) was built, so the game never had the
// new plan with the old page.
let DRIFT3 = true;   // (on since DP3-3, 16.11.2026: the page is built; a let, so a unit test can switch it off)
const DRV3 = 5;
const DRP3 = {
  // the ring's diameter in nautical miles, fixed per gear (Jonas 16.11.2026: «Fast per redskap»; start values for the play tests)
  ring:{juksa:1, line:2, garn:2, teiner:1.5, auto:8, sno:8},
  // the depths each gear is set in, metres (the band the places are picked in before the echo sounder search of DP3-2; estimates:
  // the jig and nets on the banks and edges, the line deeper, crab pots shallow, the snow crab from 120 m, 06i-plan2-sno.js)
  depth:{juksa:[15, 150], line:[30, 400], garn:[10, 200], teiner:[5, 60], auto:[150, 1200], sno:[120, 500]},
  fieldsMax:4, perField:{line:4, teiner:15}, jigPlaces:2, spaceKm:0.4, autoPer:2,
  // the home: how much worse (in km) a home is where the crew do not rest well, where you do not, and the rorbu's price (an estimate)
  homeKm:{noRest:40, noMe:20, rorbu:3}, homeR:40,
  // the search with the echo sounder (DP3-2, chapter 3 of the plan; start values for the play tests, measured in tests/unit/plan3.test.mjs):
  // your experience while you have none of your own (a fresh fisher, Jonas 16.11.2026: «man arver en båt, så må man starte ganske lavt»;
  // the ranking step 134 gives you skills), how far the reading misses (the log's spread at experience 1 and 5), a haul under this share of
  // the field's first sends the boat searching again, the basic sounder's four steps, the most candidates in a ring, and the steps the
  // straight hops are checked in (km: land every 10 m, the depth every 40 m)
  sok:{sig:[0.9, 0.12], bad:0.5, levels:4, cand:36, land:0.01, deep:0.04}};
// the gear's key in DRP3 for the boat and her rig: the autoline and the snow crab vessel have their own
function plan3GearKey(rig){
  if (rig === 'line' && typeof autoL === 'function' && BOAT && BOAT.autoHooks && autoL()) return 'auto';
  if (rig === 'teiner' && typeof snoVessel === 'function' && snoVessel()) return 'sno';
  return RIGS[rig] ? rig : 'juksa';
}
// the gear in a sentence, «for juksa», «for line» (rigName says «Bare juksa» for the rig)
// (the ocean vessels' gear by its own name: «8,0 nm over for autoline», not «for line», DP3-4)
const plan3GearWord = rig => { const gk = plan3GearKey(rig); if (gk === 'auto') return ['autoline', 'the autoline']; if (gk === 'sno') return ['snøkrabbeteiner', 'the snow crab pots'];
  return rig === 'juksa' || !RIGS[rig] ? ['juksa', 'the jig'] : [RIGS[rig].no.toLowerCase(), RIGS[rig].en.toLowerCase()]; };
const plan3RingKm = rig => DRP3.ring[plan3GearKey(rig)] * NM / 2;   // the ring's radius, true km
// the gear the boat has aboard (and in the sea) and can rig for, with the choices under it: the bait (line and pots), the line's kind
// (when she has both), the jig's tackle (the mark hooks, and the halibut pilk with that gear aboard). The nets have nothing under them, and
// the autoline and the snow crab take the fleet's bait (plan2Bait), so no choice there. Only what is aboard is offered (Jonas 16.11.2026).
function plan3Gear(){
  const b = S.boat, out = [];
  for (const rig of Object.keys(RIGS)){
    const kind = RIGS[rig].kind, why = rig === rigOf() ? null : rigBlock(rig);   // (the rig she has is offered; rigBlock says «already rigged» for it)
    if (!kind){ const has = !!b.gear || ((S.equip && S.equip.jukse) || 0) > 0; if (!has || why || (typeof vesselJigs === 'function' && !vesselJigs())) continue;
      out.push({rig, gk:'juksa', tackle:['mark'].concat(b.kgear ? ['kveite'] : []), bait:[], lk:[]}); continue; }
    if (why || ownedUnits(kind) < 1) continue;
    const gk = plan3GearKey(rig), lk = kind === 'line' && gk !== 'auto' ? ['hyse', 'bank'].filter(k => p2Units('line', k) > 0) : [];
    out.push({rig, gk, tackle:[], lk, bait:gk === 'auto' || gk === 'sno' || kind === 'garn' ? [] : Object.keys(BAITS)});
  }
  return out;
}
// a new plan: the ring and the gear only; plan3Derive fills the rest
function plan3New(ring, rig, pick){
  pick = pick || {};
  const o = plan2New({v:DRV3, rig, ring:{x:ring.x, y:ring.y, r:plan3RingKm(rig)}, bait:pick.bait || null, lk:pick.lk || null, tackle:pick.tackle || null});
  o.jig = rig === 'juksa';   // (one gear only, Jonas 16.11.2026: «Bare ett redskap»; the jig is a gear of its own)
  o.sokSeed = Math.floor(Math.random() * 2147483647);   // (the search's noise, DP3-2: drawn once, so the plan reads the same open and closed)
  return o;
}
// ---- the ring's water: points on a grid inside it where the gear can stand (sea, deep enough and not too deep, open by the rules).
// Reads the map, so the ring's blocks must be in (plan3Make loads them); a block that is not in counts as no water there
function plan3Spots(o){
  const c = o.ring, r = c.r, gk = plan3GearKey(o.rig), band = DRP3.depth[gk], kind = p2Kind(o), out = [], step = r / 4;
  for (let dx = -r; dx <= r + 1e-9; dx += step) for (let dy = -r; dy <= r + 1e-9; dy += step){
    if (dx * dx + dy * dy > r * r) continue;
    const q = {x:c.x + dx, y:c.y + dy}; let d;
    try { if (isLand(q)) continue; d = depthF(q); } catch (e){ continue; }
    if (!(d >= band[0] && d <= band[1])) continue;
    const why = kind ? ruBlockMsg({p:q, len:BOAT.len, gear:o.rig === 'teiner' ? 'teiner' : kind, sp:kind === 'teine' ? potSp() : null, egn:p2Auto(o), H:p2Sno(o) ? p2SnoSeason(S.t / 60, 0).openAt : S.t / 60})
      : ruBlockMsg({p:q, len:BOAT.len, gear:'juksa', sp:o.tackle === 'kveite' ? 'kveite' : null, hand:!(S.equip && S.equip.jukse > 0)});
    if (why) continue;
    // (the middle of the band first: the log of the depth against the log of the band's middle, as depthFactor reads a depth)
    out.push({x:q.x, y:q.y, d, s:Math.abs(Math.log(d / Math.sqrt(band[0] * band[1])))});
  }
  return out;
}
// how many places the gear wants, and the units on each (never more than she owns, p2Left)
function plan3Split(o){
  const gk = plan3GearKey(o.rig), kind = p2Kind(o);
  if (!kind) return {k:'juks', n:[], places:DRP3.jigPlaces};
  if (gk === 'sno' || gk === 'auto'){ const u = p2Units(kind, gk === 'auto' ? 'auto' : null); if (u < 1) return {k:'felt', n:[]}; if (gk === 'sno') return {k:'felt', n:[u]}; const f = Math.min(DRP3.fieldsMax * 2, Math.ceil(u / DRP3.autoPer)); return {k:'felt', n:split(u, f)}; }   // (the autoline in fields of DRP3.autoPer lenker: a field is one string, 6.5 km a lenke, and two lie along a chord of the 8 nm ring; DP3-4)
  if (kind === 'garn'){ const nets = (S.pgear && S.pgear.nets) || [], per = Math.max(1, (nets[0] || {n:6}).n), u = ownedUnits('garn'); const f = Math.max(1, Math.min(DRP3.fieldsMax, Math.floor(u / per))); return {k:'felt', n:u < 1 ? [] : split(Math.min(u, f * per), f)}; }
  const u = kind === 'line' ? p2Units('line', o.lk || 'hyse') : ownedUnits(kind); if (u < 1) return {k:'felt', n:[]};
  const f = Math.max(1, Math.min(DRP3.fieldsMax, Math.ceil(u / DRP3.perField[kind === 'line' ? 'line' : 'teiner'])));
  return {k:'felt', n:split(u, f)};
  function split(u, f){ const a = []; for (let i = 0; i < f; i++) a.push(Math.floor(u / f) + (i < u % f ? 1 : 0)); return a.filter(n => n > 0); }
}
// the places in the ring: the best spots for the gear by the depth, apart from each other. They are the fields' fixed points, which the
// legs are kept for (plan2Make, plan2Key); the echo sounder's search (DP3-2, below) puts the gear at a spot of its own in the ring (q.at),
// and the fixed point is the reserve when the search finds nothing
function plan3Places(o, spots){
  const S3 = plan3Split(o), want = S3.k === 'juks' ? S3.places : S3.n.length, gap = Math.max(DRP3.spaceKm, o.ring.r / 3), got = [];
  for (const q of spots.slice().sort((a, b) => a.s - b.s || a.x - b.x || a.y - b.y)){ if (got.length >= want) break; if (got.every(g => kmTrue(g, q) >= gap)) got.push(q); }
  // (a small ring may not hold the gap: the nearest spots then)
  for (const q of spots){ if (got.length >= want) break; if (!got.includes(q)) got.push(q); }
  const soak = p2SoakDef(o), lk = p2Kind(o) === 'line' ? (p2Auto(o) ? 'auto' : o.lk || 'hyse') : null;
  return got.map((q, i) => S3.k === 'juks' ? {id:plan2Sid(), k:'juks', x:q.x, y:q.y} : {id:plan2Sid(), k:'felt', x:q.x, y:q.y, n:S3.n[i], soak, hdg:null, lk});
}
// ---- the home: the place by the ring the crew sleep well at, and you when you are aboard, the nearest of them; a rorbu's night counts a
// little against it. An ocean vessel lies at the nearest plant whose quay takes her (H2c). Scored in km (DRP3.homeKm), the lowest wins
function plan3HomeScore(c){ const K = DRP3.homeKm; return c.d + (c.rest ? 0 : K.noRest) + (c.me ? 0 : K.noMe) + (c.rorbu ? K.rorbu : 0); }
function plan3Home(o){
  const c = o.ring, b = S.boat, hav = BOAT.cls === 'hav';
  if (hav){ const P = p2Plants().sort((a, q) => kmTrue(a.p, c) - kmTrue(q.p, c)); return P.length ? P[0].id : null; }
  const ids = new Set(), add = id => { const p = portById(id); if (!p) return; if (id !== (S.home || HOME0) && portServices(p).verft) return; ids.add(id); };
  if (portById(S.home || HOME0) && kmTrue(portById(S.home || HOME0).p, c) < DRP3.homeR * 1.5) add(S.home || HOME0);
  if (b.status === 'port') add(b.port);
  try { if (siteFits(b.type)) for (const R of rorbuSites(c, DRP3.homeR).filter(R => siteFits(b.type, R.id)).slice(0, 6)) add(R.id); } catch (e){}
  try { for (const q of havnOptions(c, 25).slice(0, 4)) add(q.place.id); } catch (e){}
  for (const q of PORTS.filter(q => !q.rorbu && kmTrue(q.p, c) < 30)) add(q.id);
  const me = meAboard(), cands = [...ids].map(id => ({id, d:kmTrue(portById(id).p, c), rest:plan2RestOk(id), me:!me || p2MeRate(id, false) > 0, rorbu:isRorbu(id)}));
  cands.sort((a, q) => plan3HomeScore(a) - plan3HomeScore(q) || a.d - q.d);
  return cands.length ? cands[0].id : null;
}
// the rhythm: the ocean vessels round the clock only (Jonas 07.11.2026); else round the clock when the boat and the people aboard allow it
// (plan2WatchWhy), and day trips otherwise: out in the morning, the catch landed fresh, the night in port (trips of several days kept the fish
// aboard for days and rested the crew at a plant's quay, and were no better for a boat that cannot go round the clock; DP3-1 16.11.2026)
function plan3Rhythm(o){
  if (p2Hav() || p2Lag()) return 'watch';
  const V = VESSELS[S.boat.type] || {}, st = {house:!!V.watch, bunks:V.berths || 0, crewMax:V.crewMax || 0};
  const aboard = crewAboard(null, true).length + (meAboard() ? 1 : 0);
  if (!plan2WatchWhy(st, aboard)) return 'watch';
  return 'day';
}
// the weather: «Vanlig» as this boat takes it (the page's presets before, clamped to her own limits; GUI review F5)
function plan3Wx(){
  if (BOAT.cls === 'hav'){ const W = DRP2.hav.wx.normal; return {wind:Math.min(W.wind, Math.round(windLim())), hs:Math.min(W.hs, Math.round(seaLim() * 10) / 10)}; }
  return {wind:Math.min(13, Math.round(BOAT.risk[2] || 20)), hs:Math.min(2.5, Math.round(BOAT.risk[1] * 0.95 * 10) / 10)};
}
// the skipper and the mate when you are not aboard: the two with the most experience and seamanship aboard, when none are named. The
// plan names them; the player can change them on the Crew page as before
function plan3Roles(){
  if (meAboard() || p2Lag()) return null;
  const on = crewAboard(null, true).filter(c => c.attr), sc = c => c.attr.erf + c.attr.sjo;
  if (on.length < 2) return null;
  let sk = crewSkipper(); if (!sk || !on.includes(sk)){ sk = on.slice().sort((a, b) => sc(b) - sc(a))[0]; setSkipper(sk.id); }
  let mt = crewMate(); if (!mt || mt === sk || !on.includes(mt)){ mt = on.filter(c => c !== sk).sort((a, b) => sc(b) - sc(a))[0]; setMate(mt.id); }
  return {sk:sk.name, mate:mt.name};
}
// why the ring will not do, or null: no water for the gear in it (land, too shallow or deep, closed by the rules)
function plan3RingWhy(o, spots){
  const S3 = plan3Split(o);
  if (S3.k === 'felt' && !S3.n.length) return gL('Båten har ikke noe ' + rigName(o.rig).toLowerCase() + ' om bord.', 'The boat has no ' + rigName(o.rig).toLowerCase() + ' aboard.');
  if (!spots.length){ const w = plan3GearWord(o.rig); return gL('Ringen har ingen plass for ' + w[0] + ': det er land, for grunt, for dypt eller stengt der. Flytt ringen.', 'The ring has no room for ' + w[1] + ': it is land, too shallow, too deep or closed there. Move the ring.'); }
  return null;
}
// ---- «find the plan»: the answers from the ring, the gear, the boat and the crew, into the v4 fields the engine reads. Pure but for the
// map reads in plan3Spots and the roles it names; the caller has the ring's blocks in (plan3Make)
function plan3Derive(o, spots){
  spots = spots || plan3Spots(o);
  const why = plan3RingWhy(o, spots); if (why) return why;
  o.jig = o.rig === 'juksa';
  o.home = plan3Home(o) || o.home; o.anchor = false;
  o.places = plan3Places(o, spots);
  o.sok = plan3SokPrep(o, spots); if (o.sokSeed == null) o.sokSeed = Math.floor(Math.random() * 2147483647);
  o.wx = plan3Wx(); o.rhythm = plan3Rhythm(o); o.days = 3; o.dep = 5;
  const sno = p2Sno(o), hav = p2Hav() || p2Lag();
  // the landing: a day trip lands every trip (the fish fresh at the plant the same day), a trip of days on its last day, round the clock
  // when the hold is full; the ocean vessels by their own rules (H2c, H3c). The freshness lands sooner in each (planDay mustFresh)
  o.land = {mode:'near', port:null, when:sno ? 'days' : hav ? 'full' : o.rhythm === 'day' ? 'trip' : o.rhythm === 'multi' ? 'days' : 'full', days:sno ? DRP2.sno.days : hav ? DRP2.hav.days : o.days};
  o.derived = {t:S.t, roles:plan3Roles()};
  return null;
}
// the bait and the tackle the plan fishes with go on the boat's own gear (they are vessel fields: S.pgear, S.target), and the boat is
// rigged and her harbour berth held, once the plan is made (nothing of it stays when the making fails)
function plan3Apply(o){
  if (isBerth(o.home)) havnHold(o.home);
  if (o.bait && BAITS[o.bait] && S.pgear) S.pgear.baitPref = o.bait;
  if (o.rig === 'juksa' && o.tackle) S.target = o.tackle === 'kveite' && S.boat.kgear ? 'kveite' : (S.target === 'kveite' ? null : S.target);
  if (rigOf() !== o.rig){ const w = rigSet(o.rig); if (w) return w[0]; }
  return null;
}
// make it: the ring's map in, the answers derived, then Driftsplan 2's legs (plan2Make). From anywhere: at sea or in port, aboard or not
async function plan3Make(o, cb){
  if (!o.ring){ const w = gL('Velg et sted for planen: trykk i kartplotteren der båten skal fiske.', 'Choose a place for the plan: tap the chart plotter where the boat is to fish.'); o.err = w; if (cb) cb(w); return; }
  // (out to where a string laid with its middle at the ring's edge ends, plan3Heads)
  { const S3 = plan3Split(o), D = DRP2.sno, L = p2Sno(o) ? 2 * (6 + D.row * Math.ceil(Math.max(...(S3.n || [1])) / D.cols) + D.cols * D.col / 2) : Math.max(0, ...(S3.n || []).map(n => plan3StrKm(o, {n, lk:p2Auto(o) ? 'auto' : o.lk}))); try { await mapNeed(o.ring, o.ring.r + 2 + L / 2); } catch (e){} }
  // (the skipper and the mate the plan names, put back when the plan is not made)
  const was = (S.crew || []).map(c => [c, !!c.sk, !!c.mate]), back = () => { for (const [c, sk, mt] of was){ if (sk) c.sk = true; else delete c.sk; if (mt) c.mate = true; else delete c.mate; } };
  const why = plan3Derive(o); if (why){ back(); o.err = why; o.made = null; if (cb) cb(why); return; }
  return plan2Make(o, err => { if (err){ back(); if (cb) cb(err); return; } const w = plan3Apply(o); if (w){ o.err = w; o.made = null; back(); } else o.p3v = 4; if (cb) cb(w || null); });   // (p3v: made by DP3-4's rules, PLAN2UI start)
}
// ---- the old plans when DRIFT3 is on (Jonas 16.11.2026: «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak på
// automatikk, så den ikke driver avgårde», «Trekk først, så lever»): a v4 plan that runs and that someone aboard can sail fetches the gear
// in the sea and lands the hold at its plant, and lies there; then it is gone. One that is off, held by you, or that nobody aboard can
// sail, is gone at once and the boat lies where she is. Returns the plan to run (the retiring one) or null
function plan3Retire(o){
  const name = S.boatName, T = gL('Driftsplan', 'Operations plan'), sea = () => mySets().length ? [' Redskapet i sjøen står der det står.', ' The gear in the sea stays where it is.'] : ['', ''];
  const again = [' Lag en ny driftsplan under Driftsplan: velg et sted og et redskap.', ' Make a new operations plan under Operations plan: choose a place and a gear.'];
  if (o.retire){ if (o.on) return o; S.ops = null; const at = S.boat.status === 'port' ? (portById(S.boat.port) || {}).name : null, s2 = sea();
    // (it stopped on the way, plan2Stop, or left gear: where she lies, why, and the gear that still stands)
    if (o.stop || !at || s2[0]) msg(T, 'Den gamle driftsplanen for «' + name + '» kom ikke helt i mål' + (o.stop ? ': ' + o.stop.no : '.') + ' Båten ligger ' + (at ? 'ved ' + at : 'der den er') + '.' + s2[0] + again[0], 'The old operations plan for «' + name + '» did not finish' + (o.stop ? ': ' + o.stop.en : '.') + ' The boat lies ' + (at ? 'at ' + at : 'where she is') + '.' + s2[1] + again[1]);
    else msg(T, '«' + name + '» ligger ved ' + at + '.' + again[0], '«' + name + '» lies at ' + at + '.' + again[1]);
    return null; }
  // who can sail her: a wait (a day off, nets with you alone, a one-hand boat while you are ashore) is no reason to drop the plan, it
  // waits as Driftsplan 2 does; a skipper and a mate not named are named by the plan when two aboard can be (plan3Roles)
  const work = mySets().length > 0 || holdTotal() >= 0.5; let cw = plan2CrewWhy(o, true);
  if (cw && !cw.wait && cw.k === 'roles'){ plan3Roles(); cw = plan2CrewWhy(o, true); }
  if (o.on && !o.held && work && (!cw || cw.wait) && o.M){
    if (S.plan && S.plan.ops) plan2Abort(o);
    o.retire = true; o.fetch = true; o.home = o.M; o.homeA = null; o.anchor = false; o.run = null; o.hold = 0; o.paused = null; o.stop = null;
    const M = portById(o.M) || {};
    msg(T, 'Driftsplanen er laget på nytt, og den gamle planen for «' + name + '» er slått av. Båten trekker redskapet, leverer fangsten på ' + (M.name || 'mottaket') + ' og blir liggende der.', 'The operations plan has been made anew, and the old plan for «' + name + '» is switched off. The boat hauls the gear, lands the catch at ' + (M.name || 'the plant') + ' and lies there.');
    return o;
  }
  if (S.plan && S.plan.ops) plan2Abort(o);   // (a trip of the plan's under way stops where she is)
  S.ops = null; const s3 = sea();
  msg(T, 'Driftsplanen er laget på nytt, og den gamle planen for «' + name + '» er slått av. Båten blir liggende der den er.' + s3[0] + again[0], 'The operations plan has been made anew, and the old plan for «' + name + '» is switched off. The boat lies where she is.' + s3[1] + again[1]);
  return null;
}

// ===== DP3-2: the search with the echo sounder (16.11.2026, docs/planer/driftsplan-3.md chapter 3, «Søket med ekkoloddet»).
// Jonas 16.11.2026: «Jeg tenker spillerens karakter søker rundt i området med ekkoloddet etter fisken, og eventuelt flytter seg når fangsten
// blir dårlig», and a better sounder and the skipper's experience both make a better search: «Ja, begge teller». The day gets a step of
// its own, 'sok' (planDay): the boat sails a pattern in the ring and the one at the helm reads the picture; the gear goes where they saw most
// of what the gear and the bait take. What is kept when the plan is made (plan3SokPrep, the map is in then): the candidates in the ring, the
// ones each field reaches from its fixed point by a straight hop in clean water, and the pattern for each sounder (its range gives the
// length). What is read when the pattern is sailed (plan3Search, the boat is in the ring, so its waters are in): density through the
// sounder, with noise by the reader's experience, seeded by the plan (o.sokSeed) and the search's number, so it reads the same open and
// closed (catchUp). Nothing here is asynchronous. The sounder and the heat map you see yourself are not changed (12-heat.js is only read).
// the sounder the plan reads with: the best the boat has (the settings only turn the picture off; 12-heat.js heatTier)
function plan3Tier(){ const e = S.equip || {}; return e.sonar ? 'sonar' : e.chirp ? 'chirp' : 'basic'; }
const P3TIER = {basic:['ekkoloddet', 'the echo sounder'], chirp:['CHIRP-ekkoloddet', 'the CHIRP sounder'], sonar:['sonaren', 'the sonar']};
// who reads the picture: you when you are aboard (a fixed low experience until the ranking step 134), else the skipper; an ocean vessel's
// teams have a skipper of their own (H2b) of middling experience
function plan3Reader(){
  // (the ocean vessel's teams have their own skipper on the bridge, H2b: he reads it, also with you aboard; DP3-4)
  if (p2Lag()) return {erf:3, who:gL('skipperen', 'the skipper')};
  // (you read it with your own experience: the ceiling of your level, RANK1-a in 09e-fartstid.js; 1.5 with no sea time, as before it)
  if (meAboard()) return {erf:fsErf(), who:null};
  const sk = actingSkipper(); if (sk && sk.attr) return {erf:sk.attr.erf, who:sk.name};
  return {erf:fsErf(), who:null};
}
// how far the reading misses: the spread of its log, from experience 1 to 5
const plan3Sig = erf => { const [a, b] = DRP3.sok.sig; return a + (b - a) * clamp((erf - 1) / 4, 0, 1); };
// what the gear and its bait take of each species, as the haul counts it (10-gear.js: SELQ and baitF for nets and line, the crab and its
// bait for pots, jigTake for the jig); a weight a species, the sum against density is what the gear would see
function plan3Take(o, H){
  const kind = p2Kind(o), w = {}, bait = o.bait || (S.pgear && S.pgear.baitPref) || 'makrell';
  if (!kind){ for (const sp of SP){ const f = jigTake(sp, H, o.tackle || 'mark'); if (f > 0) w[sp] = f; } return w; }
  if (kind === 'teine'){ const sp = potSp(); w[sp] = baitF(bait, sp); return w; }
  const ty = kind === 'garn' ? ((S.pgear && S.pgear.nets[0]) || {}).ty : null, key = kind === 'line' ? 'line:' + (o.lk || 'hyse') : ty && ty !== 'bunn' ? 'garn:' + ty : 'garn', sel = SELQ[key] || {};
  for (const sp in sel) if (sel[sp] > 0) w[sp] = sel[sp] * (kind === 'line' ? baitF(bait, sp) : 1);
  return w;
}
// the fish there for the gear: the plain truth the search tries to find (the unit test's yardstick)
function plan3Truth(p, H, take, den){ den = den || density; let v = 0; for (const sp in take) v += take[sp] * den(sp, p, H); return v; }
// what the sounder shows at a spot: the cell it falls in on the sounder's own grid (HEAT.tiers cs, as the heat map), all the fish together on
// the simple sounder, which cannot tell them apart, and the species the gear takes on CHIRP and sonar; the sonar sees where the schools go,
// so it reads them half a soak ahead
function plan3See(p, H, tier, take, den, ahead){
  den = den || density; const T = HEAT.tiers[tier] || HEAT.tiers.basic, cs = T.cs, c = {x:(Math.floor(p.x / cs) + 0.5) * cs, y:(Math.floor(p.y / cs) + 0.5) * cs};
  if (!T.pick){ let v = 0; for (const sp of SP) v += den(sp, c, H); return v; }
  return plan3Truth(c, tier === 'sonar' ? H + (ahead || 0) : H, take, den);
}
// a straight hop in clean water (land every 10 m, the depth at the lowest water of the fortnight every 40 m, as plan2LegOk reads a leg)
function plan3Clean(a, b){
  const d = dist(a, b); if (d < 0.005) return true;
  const n = Math.max(1, Math.ceil(d / DRP3.sok.land)), k = Math.max(1, Math.round(DRP3.sok.deep / DRP3.sok.land)), tl = plan2TideMin();
  for (let j = 1; j <= n; j++){ const p = {x:a.x + (b.x - a.x) * j / n, y:a.y + (b.y - a.y) * j / n}; try { if (isLand(p) || ((j % k) === 0 || j === n) && depthF(p) + tl < BOAT.draft + 0.5) return false; } catch (e){ return false; } }
  return true;
}
// kept when the plan is made (the ring's map is in): {cand [[x, y]], reach {place id: [candidate]}, track {tier: [[x, y]]}, end {tier: place
// id}, seen {tier: [candidate]}, km {tier}}. The pattern starts at the first place's fixed point (its legs are kept), goes in straight hops
// to the nearest candidate the sounder has not yet seen, and ends at the nearest place's fixed point it has a clean hop to (else back along
// its own hops to the first); the sounder sees what is within its range along the whole way. All of it is inside the ring: the candidates
// and the places are, and a straight line between two points in a circle stays in it
function plan3SokPrep(o, spots){
  const A = o.places, A0 = A[0]; if (!A0) return null;
  const pts = spots.slice().sort((a, b) => a.s - b.s || a.x - b.x || a.y - b.y).slice(0, DRP3.sok.cand).map(q => [+q.x.toFixed(4), +q.y.toFixed(4)]);
  for (const q of A) if (!pts.some(c => dist({x:c[0], y:c[1]}, q) < 0.005)) pts.push([+q.x.toFixed(4), +q.y.toFixed(4)]);
  const P = i => ({x:pts[i][0], y:pts[i][1]}), memo = new Map(), clean = (a, b, ka, kb) => { const k = ka < kb ? ka + '|' + kb : kb + '|' + ka; if (!memo.has(k)) memo.set(k, plan3Clean(a, b)); return memo.get(k); };
  const reach = {}, all = new Set();
  for (const q of A){ reach[q.id] = []; pts.forEach((c, i) => { if (clean(q, P(i), 'q' + q.id, i)) { reach[q.id].push(i); all.add(i); } }); }
  const track = {}, ends = {}, seen = {}, km = {};
  for (const t of Object.keys(HEAT.tiers)){
    const R = HEAT.tiers[t].r, U = new Set(all), S0 = new Set(), seq = [{p:A0, k:'q' + A0.id}];
    const look = (a, b) => { const n = Math.max(1, Math.ceil(kmTrue(a, b) / 0.1)); for (let j = 0; j <= n; j++){ const p = {x:a.x + (b.x - a.x) * j / n, y:a.y + (b.y - a.y) * j / n}; for (const i of [...U]) if (kmTrue(p, P(i)) <= R){ S0.add(i); U.delete(i); } } };
    look(A0, A0);
    // (the next hop: the most the sounder sees anew per km on the way, of the candidates not seen yet with a clean hop to them)
    const gain = (a, b) => { const n = Math.max(1, Math.ceil(kmTrue(a, b) / 0.1)); let k = 0; for (const i of U){ for (let j = 0; j <= n; j++){ const p = {x:a.x + (b.x - a.x) * j / n, y:a.y + (b.y - a.y) * j / n}; if (kmTrue(p, P(i)) <= R){ k++; break; } } } return k; };
    for (let g = 0; g < 60 && U.size; g++){ const cur = seq[seq.length - 1]; let nx = null, bs = -1;
      for (const i of [...U].sort((x, y) => x - y)){ if (!clean(cur.p, P(i), cur.k, i)) continue; const sc = gain(cur.p, P(i)) / (kmTrue(cur.p, P(i)) + 0.3); if (sc > bs + 1e-12){ bs = sc; nx = i; } }
      if (nx == null) break; seq.push({p:P(nx), k:nx}); look(cur.p, P(nx)); }
    // the end: the nearest place with a clean hop from the last point, else back along the pattern to the first place
    const out = seq.slice(1).map(s => s.p), last = seq[seq.length - 1]; let end = A0;
    if (seq.length > 1){ const E = A.filter(q => clean(last.p, q, last.k, 'q' + q.id)).sort((a, b) => kmTrue(last.p, a) - kmTrue(last.p, b))[0];
      if (E){ end = E; if (kmTrue(last.p, E) > 0.005) out.push({x:E.x, y:E.y}); }
      else { let k = seq.length - 1; while (k > 0){ let j = 0; while (j < k - 1 && !clean(seq[k].p, seq[j].p, seq[k].k, seq[j].k)) j++; out.push(seq[j].p); k = j; } } }
    let L = 0, prev = A0; for (const p of out){ L += kmTrue(prev, p); prev = p; }
    track[t] = out.map(p => [+p.x.toFixed(4), +p.y.toFixed(4)]); ends[t] = end.id; seen[t] = [...S0].sort((a, b) => a - b); km[t] = Math.round(L * 1000) / 1000;
    // (a sounder that sees further sees at least as much along a shorter-ranged one's pattern: that pattern when it is shorter)
    for (const t2 of Object.keys(track)){ if (t2 === t || !(km[t2] < km[t]) || !(HEAT.tiers[t2].r <= R)) continue;
      const pp = [A0].concat(track[t2].map(c => ({x:c[0], y:c[1]}))), S2 = new Set(); for (let j = 0; j < pp.length; j++){ const a = pp[Math.max(0, j - 1)], b = pp[j], n = Math.max(1, Math.ceil(kmTrue(a, b) / 0.1)); for (let k = 0; k <= n; k++){ const p = {x:a.x + (b.x - a.x) * k / n, y:a.y + (b.y - a.y) * k / n}; for (const i of all) if (kmTrue(p, P(i)) <= R) S2.add(i); } }
      if (S2.size >= seen[t].length){ track[t] = track[t2].slice(); ends[t] = ends[t2]; km[t] = km[t2]; seen[t] = [...S2].sort((a, b) => a - b); } }
  }
  // the headings each field's string can lie in at each candidate it reaches, read from the map now (a string's end can be kilometres from
  // where the boat will be when she reads the search, outside the waters loaded round her, MAPD.simR); the search then only keeps the
  // strings from crossing each other, so it reads nothing of the map and plays the same open and closed
  const lay = {};
  if (p2Kind(o)) for (const q of A) if (q.k === 'felt'){ lay[q.id] = {}; for (const i of reach[q.id]){ const hs = p2Sno(o) ? (plan3SnoFits(o, q, P(i)) ? [0] : []) : plan3Heads(o, q, P(i)); if (hs.length) lay[q.id][i] = hs.map(h => +h.toFixed(4)); } }
  return {cand:pts, reach, track, end:ends, seen, km, lay};
}
// where the search's pattern ends (a place's fixed point) for the sounder the boat has
function plan3SokEnd0(o, tier){ const K = o.sok, id = K && K.end ? K.end[tier || plan3Tier()] : null; return o.places.find(q => q.id === id) || o.places[0]; }
// the snow crab's strings round a spot (06i-plan2-sno.js p2SnoLenke, its pattern side by side and in rows): the corners of the pattern fit
// (land, depth, the rules, a clean way from the field's point: p2SnoFit), so the whole field can stand there
function plan3SnoFits(o, q, at){
  const D = DRP2.sno, n = Math.max(1, q.n || 1), W = Math.max(1, Math.min(n, D.cols)), t = {id:q.id, x:q.x, y:q.y, n, hdg:q.hdg, at};
  for (const k of [...new Set([0, W - 1, n - W, n - 1].filter(k => k >= 0 && k < n))]){ if (p2SnoFit(t, k)) return false; }
  return true;
}
// the string's length on a field (a line of its tubs, a string of nets or pots), true km
function plan3StrKm(o, q){ const kind = p2Kind(o); if (!kind || !q || !(q.n > 0)) return 0; if (kind === 'line'){ const lk = q.lk || o.lk || 'hyse'; return lineKm(lk, q.n * (LINE_KINDS[lk] || LINE_KINDS.hyse).hooks); } return q.n * GEAR[kind].km; }
// the string laid with its middle on the spot the search found: the catch is reckoned at the string's middle (10-gear.js soakHour, setMid),
// so that is where the fish must be. Along the line through the ring's middle first (the longest chord, so most of a long string lies in
// the ring), then turned; both ends at sea on 5 m or more, the string clear of land (legClear, as the set itself checks it, setGeomExact),
// open by the rules at its start (gearRules), a clean hop to its start from the field's fixed point, and crossing no other field's string.
// {st (where the set starts), e, hdg} or null. (A line of 4 tubs of haddock line is 3.6 km, the ring for line 3.7 km across)
const plan3Ends = (o, q, at, h) => { const half = plan3StrKm(o, q) / 2, ux = Math.sin(h), uy = -Math.cos(h); return {st:{x:at.x - ux * half, y:at.y - uy * half}, e:{x:at.x + ux * half, y:at.y + uy * half}}; };   // (the string's length laid out in the frame's km, as setGeomExact does)
// the headings the string can lie in at a spot, in the order tried (reads the map; plan3SokPrep keeps them)
function plan3Heads(o, q, at){
  const kind = p2Kind(o), out = []; if (!(plan3StrKm(o, q) > 0.01)) return out;
  const c = o.ring, h0 = kmTrue(at, c) > 0.05 ? Math.atan2(c.x - at.x, -(c.y - at.y)) : 0, sp = kind === 'teine' ? potSp() : null, gear = kind === 'teine' ? 'teiner' : kind;
  for (const dh of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.57]) for (const flip of [0, Math.PI]){
    const h = ((h0 + dh + flip) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), {st, e} = plan3Ends(o, q, at, h);
    try { if (isLand(st) || isLand(e) || depthF(st) < 5 || depthF(e) < 5 || !legClear(st, e) || !plan3Clean(q, st)) continue;
      if (ruBlockMsg({p:st, len:BOAT.len, gear, sp, egn:p2Auto(o)})) continue; } catch (err){ continue; }
    out.push(h); if (out.length >= 6) break;
  }
  return out;
}
// the string at a spot: the first of the headings kept (or read now, hs undefined: the unit test) that crosses no other field's string
function plan3Lay(o, q, at, segs, hs){
  if (!(plan3StrKm(o, q) > 0.01)) return {st:{x:at.x, y:at.y}, e:{x:at.x, y:at.y}, hdg:null};
  const cross = (a, b, p, r) => { const f = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x); return f(a, b, p) * f(a, b, r) < 0 && f(p, r, a) * f(p, r, b) < 0; };
  for (const h of hs || plan3Heads(o, q, at)){ const {st, e} = plan3Ends(o, q, at, h); if ((segs || []).some(z => cross(st, e, z.st, z.e))) continue; return {st, e, hdg:h}; }
  return null;
}
// the search as the day reckons it: the pattern's length, the hours at cruising speed, the fuel, the sounder and who reads it
function plan3SokEst(o){
  const K = o.sok, tier = plan3Tier(), km = K ? K.km[tier] || 0 : 0, v = Math.max(1, BOAT.vcruise || 7), h = km / (v * NM), R = plan3Reader();
  let l = 0; try { l = fuelLph(v, 0) * h; } catch (e){}
  return {km, h, l:Math.round(l * 10) / 10, tier, who:R.who, erf:R.erf};
}
// the places that want a search before the gear goes out: a field with nothing standing whose gear is ready, never searched or with a
// haul that fell (q.move); a jig place never searched. None on the ocean vessels (their day is DP3-4's) or when the plan has no search kept
function plan3SokNeed(o, st){
  if (!o.sok || !o.sok.cand || !o.sok.cand.length) return [];
  const kind = p2Kind(o), hav = p2Auto(o) || p2Sno(o), out = [], mine = (x, q) => x.fid === q.id || String(x.fid || '').startsWith(q.id + '#');
  for (const q of o.places){
    if (q.k === 'juks'){ if (!kind && q.sokT == null) out.push(q.id); continue; }
    // (the ocean vessels' gear is ready by their own day: the lenker on the magazines, the strings of pots; DP3-4)
    if (!kind || st.sets.some(x => mine(x, q)) || (q.sokT != null && !q.move) || (!hav && plan2Ready(kind, st, q.lk) < 1)) continue;
    out.push(q.id);
  }
  return out;
}
// the reading: the candidates the pattern saw, through the sounder, with the reader's noise (a log-normal spread, plan3Sig, from the plan's
// seed and the search's number), and for each place in ids the one it reaches with the most, apart from the places already put (a third of
// the ring, then 0.4 km, then anywhere) and, after a haul that fell, not where it stood. A place with nothing seen keeps its fixed point (the
// reserve). opt (the unit test): {den, tier, erf, seed}. Returns [{id, i (candidate, -1 for the reserve), v (the reading), at}]
function plan3Search(o, ids, H, opt){
  opt = opt || {}; const K = o.sok; if (!K || !K.cand || !K.cand.length) return [];
  const den = opt.den || density, tier = opt.tier || plan3Tier(), erf = opt.erf != null ? opt.erf : plan3Reader().erf, seed = (opt.seed != null ? opt.seed : o.sokSeed || 0) | 0, n = o.sokN = (o.sokN || 0) + 1;
  const take = plan3Take(o, H), ahead = p2Kind(o) ? p2SoakDef(o) / 2 : 0.5, sig = plan3Sig(erf), seen = new Set(K.seen[tier] || K.seen.basic || []), P = i => ({x:K.cand[i][0], y:K.cand[i][1]});
  const raw = K.cand.map((c, i) => seen.has(i) ? plan3See(P(i), H, tier, take, den, ahead) : null);
  // (the simple sounder in four steps against the best it saw)
  let R = raw; if (!(HEAT.tiers[tier] || {}).pick){ const mx = Math.max(0, ...raw.filter(v => v != null)); R = raw.map(v => v == null ? null : mx > 0 ? Math.ceil(DRP3.sok.levels * v / mx - 1e-9) / DRP3.sok.levels : 0); }
  const s0 = (seed + Math.imul(n, 7919)) | 0, z = i => { const u1 = Math.max(1e-12, h2(s0, 2 * i + 1)), u2 = h2(s0, 2 * i + 2); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
  const Rn = R.map((v, i) => v == null ? null : v * Math.exp(sig * z(i)));
  const gap = Math.max(DRP3.spaceKm, o.ring.r / 3), put = o.places.filter(q => !ids.includes(q.id) && q.k !== 'juks').map(q => q.at || q), out = [];
  const segs = o.places.filter(q => !ids.includes(q.id) && q.st && q.at && q.hdg != null).map(q => ({st:q.st, e:{x:2 * q.at.x - q.st.x, y:2 * q.at.y - q.st.y}}));
  for (const id of ids){ const q = o.places.find(x => x.id === id); if (!q) continue;
    const bad = q.move ? (q.at || q) : null, mine = q.k === 'juks' ? o.places.filter(x => x.k === 'juks' && x !== q).map(x => x.at || x) : put;
    const ok = (K.reach[q.id] || []).filter(i => Rn[i] != null && !(bad && kmTrue(bad, P(i)) < DRP3.spaceKm));
    // (the best by the reading that the gear will lie at: the string with its middle there, plan3Lay; opt.lay false in the unit test, no map)
    let best = -1, lay = null; for (const g of [gap, DRP3.spaceKm, 0]){ const L = ok.filter(i => mine.every(z2 => kmTrue(z2, P(i)) >= g - 1e-9)).sort((a, b) => Rn[b] - Rn[a] || a - b);
      for (const i of L){ const y = q.k === 'juks' || opt.lay === false ? {st:P(i), e:P(i), hdg:null} : p2Sno(o) ? (!K.lay || (K.lay[q.id] && K.lay[q.id][i]) ? {st:P(i), e:P(i), hdg:null} : null) : K.lay ? (K.lay[q.id] && K.lay[q.id][i] ? plan3Lay(o, q, P(i), segs, K.lay[q.id][i]) : null) : plan3Lay(o, q, P(i), segs); if (y){ best = i; lay = y; break; } } if (best >= 0) break; }
    q.at = best >= 0 ? P(best) : null; q.st = lay && lay.hdg != null ? {x:lay.st.x, y:lay.st.y} : null; q.hdg = lay && lay.hdg != null ? lay.hdg : null; q.move = false; q.q1 = null; q.sokT = S.t; q.sokN = n;
    if (q.k !== 'juks'){ put.push(q.at || q); if (lay) segs.push(lay); }
    out.push({id, i:best, v:best >= 0 ? Rn[best] : null, at:q.at});
  }
  o.sokLast = {t:S.t, tier, erf, n, ids:ids.slice()};
  return out;
}
// the pattern sailed (plan2Step, the trip that ended): read it when she is back at the first place in the ring; a trip cut on the way (the
// weather, a takeover) reads nothing, and the day laid again searches again
function plan3SokEnd(o, tr, H){
  const b = S.boat, A = tr.sokEnd ? o.places.find(q => q.id === tr.sokEnd) : o.places[0]; if (!A || b.status === 'port' || dist(b.pos, A) > 0.3 || !tr.sok || !tr.sok.length) return false;
  const R = plan3Reader(), got = plan3Search(o, tr.sok, H), T = P3TIER[plan3Tier()];
  const pl = id => { const q = o.places.find(x => x.id === id), i = q ? o.places.filter(x => x.k === q.k).indexOf(q) + 1 : '?'; return q && q.k === 'juks' ? ['juksplass ' + i, 'jig place ' + i] : ['felt ' + i, 'field ' + i]; };
  const no = got.map(g => pl(g.id)[0]).join(', '), en = got.map(g => pl(g.id)[1]).join(', ');
  log('Søkte gjennom ringen med ' + T[0] + (R.who ? ', og ' + R.who + ' leste bildet' : '') + '. Redskapet settes der det sto mest fisk for det (' + no + ').', 'Searched the ring with ' + T[1] + (R.who ? ', and ' + R.who + ' read the picture' : '') + '. The gear is set where most fish stood for it (' + en + ').');
  return true;
}
// a haul that fell (plan2Sea): the catch mark of the field's haul (10-gear.js finishHaul, S.marks: kilos a unit against a usual haul for the
// soak) against its first haul at the spot; under DRP3.sok.bad of it, the field is searched again before its gear goes out (Jonas
// 16.11.2026: «eventuelt flytter seg når fangsten blir dårlig»), and when this trip was to set it again, the trip is cut here and the day
// laid again (the search first). The haul is watched while it runs (o.p3h), since the set is gone from S.sets once it is in. True: cut
function plan3HaulWatch(o, H){
  const b = S.boat, kind = p2Kind(o); if (!kind) return false;
  if (b.gop && b.gop.op === 'haul'){ if (!o.p3h || o.p3h.sid !== b.gop.sid){ const s = (S.sets || []).find(x => x.id === b.gop.sid), q = s && s.fid && o.places.find(x => x.id === s.fid && x.k === 'felt'); o.p3h = q ? {sid:b.gop.sid, fid:q.id, m:setMid(s), t:S.t} : null; } return false; }
  const w = o.p3h; if (!w) return false; o.p3h = null;
  const m = (S.marks || []).filter(x => x.t >= w.t && x.g === kind && dist(x, w.m) < 0.05).pop(), q = o.places.find(x => x.id === w.fid); if (!m || !q) return false;
  if (q.q1 == null){ q.q1 = m.q; return false; }
  if (!(m.q < DRP3.sok.bad * q.q1)) return false;
  q.move = true;
  const pl = S.plan, i = o.places.filter(x => x.k === 'felt').indexOf(q) + 1;
  plan2Say(o, 'Felt ' + i + ' ga under halvparten av den første trekkingen der. Søker etter fisken i ringen før redskapet settes ut igjen.', 'Field ' + i + ' gave less than half of its first haul there. Searching the ring for the fish before the gear goes out again.');
  if (!(pl && pl.wps.slice(pl.idx).some(x => x.act && x.act.only === 'set' && x.act.fid === q.id))) return false;
  const tr = o.run && o.run.trip; if (tr) plan2Caught(o, tr); plan2Abort(o); b.status = 'idle'; b.v = 0; if (o.run) o.run.replan = true;
  return true;
}
