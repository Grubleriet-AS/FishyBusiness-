// ===== Driftsplan 3: the plan is a ring and a gear (16.11.2026, docs/planer/driftsplan-3.md). Part 1 (DP3-1): the model and «find the plan».
// Jonas 16.11.2026: «Spilleren [får] 2 enkle valg: sted og redskap … Deretter skal driftsplanen automatisk lage den planen som passer best
// for båten og mannskap. Driftsplanen skal kunne lages og startes fra hvor som helst». The player sets a ring (its size fixed per gear) and
// one gear with its bait or tackle; plan3Derive reckons the rest (home, the places in the ring, the units, the soak, the plant, the weather,
// the rhythm, the skipper and the mate) into the answers Driftsplan 2's engine runs (06g-plan2.js planDay, 06h-plan2-engine.js), so the
// engine, its legs, its waits and the world clock are the same. A v5 plan is a v4 plan with the ring on it, and DRV3 in o.v.
// Old plans (v4 and older) are switched off with a word once DRIFT3 is on, and a running one fetches its gear, lands at the plant and lies
// there (Jonas 16.11.2026: «Trekk først, så lever»; plan2Ops). DRIFT3 stays off until the page (DP3-3) is built, so the game never has the
// new plan with the old page.
const DRIFT3 = false;
const DRV3 = 5;
const DRP3 = {
  // the ring's diameter in nautical miles, fixed per gear (Jonas 16.11.2026: «Fast per redskap»; start values for the play tests)
  ring:{juksa:1, line:2, garn:2, teiner:1.5, auto:8, sno:8},
  // the depths each gear is set in, metres (the band the places are picked in before the echo sounder search of DP3-2; estimates:
  // the jig and nets on the banks and edges, the line deeper, crab pots shallow, the snow crab from 120 m, 06i-plan2-sno.js)
  depth:{juksa:[15, 150], line:[30, 400], garn:[10, 200], teiner:[5, 60], auto:[150, 1200], sno:[120, 500]},
  fieldsMax:4, perField:{line:4, teiner:15}, jigPlaces:2, spaceKm:0.4,
  // the home: how much worse (in km) a home is where the crew do not rest well, where you do not, and the rorbu's price (an estimate)
  homeKm:{noRest:40, noMe:20, rorbu:3}, homeR:40};
// the gear's key in DRP3 for the boat and her rig: the autoline and the snow crab vessel have their own
function plan3GearKey(rig){
  if (rig === 'line' && typeof autoL === 'function' && BOAT && BOAT.autoHooks && autoL()) return 'auto';
  if (rig === 'teiner' && typeof snoVessel === 'function' && snoVessel()) return 'sno';
  return RIGS[rig] ? rig : 'juksa';
}
const plan3RingKm = rig => DRP3.ring[plan3GearKey(rig)] * NM / 2;   // the ring's radius, true km
// the gear the boat has aboard (and in the sea) and can rig for, with the choices under it: the bait (line and pots), the line's kind
// (when she has both), the jig's tackle (the mark hooks, and the halibut pilk with that gear aboard). The nets have nothing under them, and
// the autoline and the snow crab take the fleet's bait (plan2Bait), so no choice there. Only what is aboard is offered (Jonas 16.11.2026).
function plan3Gear(){
  const b = S.boat, out = [];
  for (const rig of Object.keys(RIGS)){
    const kind = RIGS[rig].kind, why = rigBlock(rig);
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
    const why = kind ? ruBlockMsg({p:q, len:BOAT.len, gear:o.rig === 'teiner' ? 'teiner' : kind, sp:kind === 'teine' ? potSp() : null, H:p2Sno(o) ? p2SnoSeason(S.t / 60, 0).openAt : S.t / 60})
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
  if (gk === 'sno' || gk === 'auto'){ const u = p2Units(kind, gk === 'auto' ? 'auto' : null); if (u < 1) return {k:'felt', n:[]}; if (gk === 'sno') return {k:'felt', n:[u]}; const f = Math.min(2, u); return {k:'felt', n:split(u, f)}; }
  if (kind === 'garn'){ const nets = (S.pgear && S.pgear.nets) || [], per = Math.max(1, (nets[0] || {n:6}).n), u = ownedUnits('garn'); const f = Math.max(1, Math.min(DRP3.fieldsMax, Math.floor(u / per))); return {k:'felt', n:u < 1 ? [] : split(Math.min(u, f * per), f)}; }
  const u = kind === 'line' ? p2Units('line', o.lk || 'hyse') : ownedUnits(kind); if (u < 1) return {k:'felt', n:[]};
  const f = Math.max(1, Math.min(DRP3.fieldsMax, Math.ceil(u / DRP3.perField[kind === 'line' ? 'line' : 'teiner'])));
  return {k:'felt', n:split(u, f)};
  function split(u, f){ const a = []; for (let i = 0; i < f; i++) a.push(Math.floor(u / f) + (i < u % f ? 1 : 0)); return a.filter(n => n > 0); }
}
// the places in the ring: the best spots for the gear, apart from each other. (DP3-2 puts the echo sounder search here)
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
// (plan2WatchWhy), trips of three days on a boat with bunks, and day trips on one without
function plan3Rhythm(o){
  if (p2Hav() || p2Lag()) return 'watch';
  const V = VESSELS[S.boat.type] || {}, st = {house:!!V.watch, bunks:V.berths || 0, crewMax:V.crewMax || 0};
  const aboard = crewAboard(null, true).length + (meAboard() ? 1 : 0);
  if (!plan2WatchWhy(st, aboard)) return 'watch';
  return st.bunks > 0 ? 'multi' : 'day';
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
  if (!spots.length) return gL('Ringen har ingen plass for ' + rigName(o.rig).toLowerCase() + ': det er land, for grunt, for dypt eller stengt der. Flytt ringen.', 'The ring has no room for ' + rigName(o.rig).toLowerCase() + ': it is land, too shallow, too deep or closed there. Move the ring.');
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
  o.wx = plan3Wx(); o.rhythm = plan3Rhythm(o); o.days = 3; o.dep = 5;
  const sno = p2Sno(o), hav = p2Hav() || p2Lag();
  o.land = {mode:'near', port:null, when:sno ? 'days' : hav ? 'full' : o.rig === 'teiner' ? 'trip' : 'full', days:sno ? DRP2.sno.days : hav ? DRP2.hav.days : 2};
  o.derived = {t:S.t, roles:plan3Roles()};
  if (isBerth(o.home)) havnHold(o.home);
  return null;
}
// the bait and the tackle the plan fishes with go on the boat's own gear (they are vessel fields: S.pgear, S.target), when it starts
function plan3Apply(o){
  if (o.bait && BAITS[o.bait] && S.pgear) S.pgear.baitPref = o.bait;
  if (o.rig === 'juksa' && o.tackle) S.target = o.tackle === 'kveite' && S.boat.kgear ? 'kveite' : (S.target === 'kveite' ? null : S.target);
  if (S.boat.rig !== o.rig && !S.boat.gop){ const w = rigSet(o.rig); if (w) return w[0]; }
  return null;
}
// make it: the ring's map in, the answers derived, then Driftsplan 2's legs (plan2Make). From anywhere: at sea or in port, aboard or not
async function plan3Make(o, cb){
  try { await mapNeed(o.ring, o.ring.r + 2); } catch (e){}
  const why = plan3Derive(o); if (why){ o.err = why; o.made = null; if (cb) cb(why); return; }
  const w = plan3Apply(o); if (w){ o.err = w; if (cb) cb(w); return; }
  return plan2Make(o, cb);
}
// ---- the old plans when DRIFT3 is on (Jonas 16.11.2026: «Den slåes av og melding gies. Båten kjøres til nærmeste fiskemottak på
// automatikk, så den ikke driver avgårde», «Trekk først, så lever»): a v4 plan that runs and that someone aboard can sail fetches the gear
// in the sea and lands the hold at its plant, and lies there; then it is gone. One that is off, held by you, or that nobody aboard can
// sail, is gone at once and the boat lies where she is. Returns the plan to run (the retiring one) or null
function plan3Retire(o){
  const name = S.boatName;
  if (o.retire){ if (o.on) return o; S.ops = null; msg(gL('Driftsplan', 'Operations plan'), '«' + name + '» ligger ved ' + ((portById(S.boat.port) || {}).name || 'mottaket') + '. Lag en ny driftsplan under Driftsplan: velg et sted og et redskap.', '«' + name + '» lies at ' + ((portById(S.boat.port) || {}).name || 'the plant') + '. Make a new operations plan under Operations plan: choose a place and a gear.'); return null; }
  const work = mySets().length > 0 || holdTotal() >= 0.5, cw = plan2CrewWhy(o, true);
  if (o.on && !o.held && work && !cw && o.M){
    if (S.plan && S.plan.ops) plan2Abort(o);
    o.retire = true; o.fetch = true; o.home = o.M; o.homeA = null; o.anchor = false; o.run = null; o.hold = 0; o.paused = null; o.stop = null;
    msg(gL('Driftsplan', 'Operations plan'), 'Driftsplanen er laget på nytt, og den gamle planen for «' + name + '» er slått av. Båten trekker redskapet, leverer fangsten på ' + ((portById(o.M) || {}).name || 'mottaket') + ' og blir liggende der.', 'The operations plan has been made anew, and the old plan for «' + name + '» is switched off. The boat hauls the gear, lands the catch at ' + ((portById(o.M) || {}).name || 'the plant') + ' and lies there.');
    return o;
  }
  S.ops = null;
  const sea = mySets().length ? gL(' Redskapet i sjøen står der det står.', ' The gear in the sea stays where it is.') : '';
  msg(gL('Driftsplan', 'Operations plan'), 'Driftsplanen er laget på nytt, og den gamle planen for «' + name + '» er slått av. Båten blir liggende der den er.' + sea + ' Lag en ny plan under Driftsplan: velg et sted og et redskap.', 'The operations plan has been made anew, and the old plan for «' + name + '» is switched off. The boat lies where she is.' + sea + ' Make a new plan under Operations plan: choose a place and a gear.');
  return null;
}
