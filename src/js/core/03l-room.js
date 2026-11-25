// ===== Handlingsrommet: one layer between the rules and the screen (steg 149, K1 of docs/planer/regler-i-klartekst.md) =====
// The rules are where they were: the group a boat fishes in (access, 03-simulation.js), the quotas (03d-quota.js), the places and the
// gear (03e-rules.js), what is confiscated at a landing (landConf, below), what a purchase needs (deal, kmBuyWhy, mbMoveWhy). This
// file owns no rule and no state. It only reads, and gives the screen finished answers to the player's three questions:
//   rmMeters(H)       how much have I left?          a row for each quota or cap that binds the boat now
//   rmBuy(offer)      what does this purchase change? the group and this year's cod before and after, and who loses access
//   rmWhy(code, ctx)  why can I not?                  a sentence, how to mend it, and the law behind it
// with rmNow() (the rules where the boat is, with her group and quota laid on top), rmStage() (how far the player has come, which
// decides what is shown first, never what is allowed) and rmTerm() (the plain word for a term of the trade, RM_TERMS).
// K2–K4 draw from these; nothing on the screen asks them yet.
const RM = {near:0.8, half:0.5};   // a meter turns yellow at 80 %; half the quota is where the HUD starts to show it (K2). Start values

// what the sales organisation confiscates of the hold if it is landed now (cod beyond the fresh-fish allowance and the quota, bycatch
// over its limits): the share of each species. Apart from sell() so the quay can show it before you land (R4); q is not changed
// the compensation for landing what is confiscated (Jonas 11.11.2026: «Dette må inn. Jeg vet at fiskere utnytter seg av slikt regelverk
// bevist, så det er realistisk»): forskrift om inndraging av fangst og bruk av inndregne midlar (FOR-2010-03-12-390) § 3, «Vederlaget
// skal setjast til 20 % av verdien av meirfangsten eller den ulovlege fangsten», given when the catch «ikkje var tilsikta». The game
// cannot tell intent, so every confiscation of fish and snow crab gets it (the regulation leaves out king crab over quota and the
// pelagic species; the game confiscates neither). On the landing note as a row of its own, and in the total
const CONF_PAY = 0.2;
function landConf(H, q, acc){
  const kgOf = sp => S.hold.filter(x => x.sp === sp).reduce((a, x) => a + x.kg, 0), wk = weekOfH(H), ffTot = q.ffW === wk ? q.ffTot : 0, ffCod = q.ffW === wk ? q.ffCod : 0;
  // the fresh-fish allowance counts fish only (assumed: shellfish do not count), and fresh fish only (J-187-2026 § 25: the fresh landings;
  // fish frozen aboard is not fresh)
  const saleKg = S.hold.reduce((a, x) => a + (SPECIES[x.sp].shell || x.frozen || (x.sp === 'hyse' && x.cls === 2) ? 0 : grade(x.fresh) === 'V' ? 0 : x.kg), 0);
  // Ø10b: the cod taken where it may only be a bycatch (the Skagerrak outside the baseline, 5 % of what was taken there; 05-vessels.js
  // bycConf) is confiscated first, whatever the quota says; the rest of the cod goes on as before
  // Ø10c: the cod taken where it goes on a cap south of 62° N (the North Sea's open group, the jig exception in the Skagerrak: 3 tonnes
  // each, 03d-quota.js sorConf) is counted against that cap and not against the quota north of 62° N; over the cap it may be a bycatch
  // (15 % and 5 % of the catch from there), and the rest is confiscated
  const codAll = kgOf('torsk'), Z = bycConf(), SQ = sorConf(S.boat.byc, codAll - Z.kg, q, sorAcc()), codKg = Math.max(0, codAll - Z.kg - SQ.cod), confBy = {};   // share of each species that is confiscated
  let codFF = 0, codQ = 0, codConf = 0, byCod = 0;
  if (acc === 'none'){
    // no access (J-30-2026 § 35): cod, haddock and saithe together at most 10 % of the landing, cut back evenly, and at most 2 t of cod a year
    const ths = codKg + kgOf('hyse') + kgOf('sei'), f = ths > 0 ? Math.min(1, BYCATCH.share * holdTotal() / ths) : 1;
    byCod = Math.min(codKg * f, Math.max(0, BYCATCH.cod - (q.byCod || 0))); codConf = codKg - byCod;
    if (f < 1){ confBy.hyse = 1 - f; confBy.sei = 1 - f; }
  } else {
    // cod: the fresh-fish allowance first, then the quota; the rest is confiscated by the sales organisation
    const pct = ffPct(H), ffAllow = pct ? Math.max(0, pct * (ffTot + saleKg) - ffCod) : 0, codFresh = S.hold.reduce((a, x) => a + (x.sp === 'torsk' && !x.frozen ? x.kg : 0), 0) * (codAll > 0 ? codKg / codAll : 1);
    codFF = Math.min(codFresh, ffAllow); codQ = Math.min(codKg - codFF, codRoom(H)); codConf = codKg - codFF - codQ;
    // the closed group's haddock and saithe: the maximum quota, then up to 30 % haddock and 20 % saithe as bycatch in each landing
    // (J-187-2026 §§ 18 and 19); the rest is confiscated
    // an ocean permit (H2a): no bycatch of cod or haddock beyond the vessel quota, and saithe without a gillnet-saithe permit only as
    // bycatch, 25 % of the landing (J-187-2026 § 14; the 50 % while the gillnet-saithe fishery is open is not in the game)
    if (acc === 'lukket' && S.lic.hav){ const LQ = licQ(S.lic, H), all = holdTotal();
      for (const [sp, share] of [['hyse', 0], ['sei', HAVBY.sei]]){ const k = kgOf(sp), cap = LQ[sp] && isFinite(LQ[sp][0]) ? Math.max(0, LQ[sp][0] - q[sp]) : 0, ok = Math.min(k, Math.max(cap, share * all)); if (k > 0 && ok < k - 0.01) confBy[sp] = 1 - Math.max(0, ok) / k; } }
    else if (acc === 'lukket'){ const LQ = licQ(S.lic, H), all = holdTotal();
      for (const [sp, share] of [['hyse', 0.3], ['sei', 0.2]]){ const k = kgOf(sp), ok = Math.min(k, Math.max(LQ[sp][0] - q[sp], share * all)); if (k > 0 && ok < k - 0.01) confBy[sp] = 1 - Math.max(0, ok) / k; } }
  }
  if (codAll > 0 && codConf + Z.kg + SQ.kg > 0.001) confBy.torsk = Math.min(1, (codConf + Z.kg + SQ.kg) / codAll);
  // ling and tusk for vessels of 28 m and over (J-128-2026 and the proposal for 2027, 03d-quota.js lbShare): ling at most 35 % of the
  // landing all year, tusk free until the group quota is taken and then at most 15 %
  if (BOAT.len >= 28 && acc !== 'none') for (const sp of ['lange', 'brosme']){ const k = kgOf(sp), sh = lbShare(sp, H); if (k > 0 && sh < 1){ const ok = Math.min(k, sh * holdTotal()); if (ok < k - 0.01) confBy[sp] = 1 - ok / k; } }
  // snow crab (H3a, H3b): the live crab first on the extra quota, then everything on the vessel quota with the flexibility (round weight,
  // 10e-krabbefabrikk.js snoLandQ); the rest is confiscated
  { const k = kgOf('snokrabbe'); if (k > 0){ const conf = acc === 'lukket' && S.lic && S.lic.id === 'krab' ? snoLandQ(H, q).conf : k; if (conf > 0.01) confBy.snokrabbe = Math.min(1, conf / k); } }
  // Greenland halibut: the maximum quota in the direct fishery, otherwise at most 7 % of the week's landings (03d-quota.js bkAllow)
  const bkKg = kgOf('blakveite'), bkOk = bkKg > 0 ? bkAllow(H, bkKg, holdTotal()) : 0;
  if (bkKg > 0 && bkOk < bkKg - 0.01) confBy.blakveite = 1 - bkOk / bkKg;
  return {saleKg, codKg, confBy, codFF, codQ, codConf, byCod, bkOk, zConf:Z.kg, zBy:Z.by, sConf:SQ.kg, sBy:SQ.by, sOk:SQ.ok};
}

// ---- the stage (plan 4.2): 1 the open group, 2 blad B reached, 3 a right in the company, 4 a coastal vessel, several boats or a
// structure quota, 5 an ocean permit. Derived from what the save already holds, and from what stays (blad B, the company, the types
// owned), so it does not fall when a boat is sold. Nothing is stored
function rmStage(){
  const fleet = S.fleet || [], lics = fleet.map(v => vget(v, 'lic')).filter(Boolean), cls = t => (VESSELS[t] || {}).cls;
  const types = (S.owned || []).concat(fleet.map(v => (vget(v, 'boat') || {}).type));
  if (types.some(t => cls(t) === 'hav') || lics.some(l => l.hav)) return 5;
  if (types.some(t => cls(t) === 'kyst') || fleet.length > 1 || lics.some(l => (l.st && l.st.length) || l.two)) return 4;
  if (S.company || lics.length || (S.licFree && S.licFree.length)) return 3;
  return bladB() ? 2 : 1;
}

// ---- the open group's cod limit now for a boat of this length (codLimitNow for a boat that is not the bound one)
function rmOpenLimit(len, H){
  const y = yearH(H), O = yearQuota(y).open, g = len < 8 ? 0 : len < 10 ? 1 : 2, sd = codStopDoy(y), open = sd == null || doyH(H) < sd;
  return open ? (O.max[g] + openMaxAdd(H)) * 1000 : O.guar[g] * 1000;
}

// ---- the meters: a row for each quota or cap that binds the bound boat now.
//   sp      the species
//   kind    open (the open group's maximum or guaranteed quota), vessel (a vessel quota), max (a maximum quota), by (no access: the
//           year's cap on cod as bycatch), nsjo, skag4 (the caps south of 62° N)
//   used    landed on it this year; aboard: in the hold now and counted on it; limit, left (limit − used; Infinity for no limit)
//   conf    what of the species aboard would be confiscated if she landed now (landConf: the fresh-fish allowance and the bycatch
//           shares are in it, so it is the truth where used + aboard against the limit is only the meter)
//   state   ok, near (from RM.near), full (what is aboard does not fit, or nothing is left), none (no access)
function rmMeters(H){
  H = H == null ? S.t / 60 : H;
  const q = quotaState(), acc = access(), y = yearH(H), kgOf = sp => (S.hold || []).reduce((a, x) => a + (x.sp === sp ? x.kg : 0), 0), out = [];
  let C = null; try { C = landConf(H, q, acc); } catch (e){ C = null; }
  const conf = sp => C && C.confBy[sp] ? C.confBy[sp] * kgOf(sp) : 0;
  const row = (sp, kind, used, aboard, limit, extra) => { const tot = used + aboard;
    out.push(Object.assign({sp, kind, used, aboard, limit, left:Math.max(0, limit - used), conf:conf(sp),
      state:kind === 'by' ? 'none' : !isFinite(limit) ? 'ok' : tot >= limit - 0.5 ? 'full' : tot >= RM.near * limit ? 'near' : 'ok'}, extra || {})); };
  const codAb = C ? C.codKg : Math.max(0, kgOf('torsk') - sorCodAboard());   // (the cod from the caps south of 62° N is not on this quota)
  if (acc === 'none') row('torsk', 'by', q.byCod || 0, codAb, BYCATCH.cod, {share:BYCATCH.share});
  else { const l = codLimits(H); row('torsk', acc === 'open' ? 'open' : 'vessel', q.torsk || 0, codAb, codLimitNow(H), {max:l.max, guar:l.guar, stopped:!codOpen(H), ff:ffPct(H)}); }
  if (acc === 'lukket'){ const LQ = licQ(S.lic, H);
    for (const sp of ['hyse', 'sei']){ const lim = LQ[sp] && LQ[sp][0]; if (lim > 0 && isFinite(lim)) row(sp, 'max', q[sp] || 0, kgOf(sp), lim, {guar:LQ[sp][1]}); } }
  { const ab = kgOf('blakveite'), used = bkUsed(H); if (ab > 0.5 || used > 0.5) row('blakveite', 'max', used, ab, bkMax(BOAT.len, y), {direct:bkDirect(H, BOAT.len)}); }
  { const Q = snoQuota(H); if (Q) row('snokrabbe', 'vessel', q.snokrabbe || 0, kgOf('snokrabbe'), Q.max); }
  for (const k of ['nsjo', 'skag4']){ const ab = (((S.boat && S.boat.byc) || {})[k] || {}).cod || 0, used = q[k] || 0;
    if (ab > 0.5 || used > 0.5) row('torsk', k, used, ab, SORQ[k].max, {conf:0}); }   // (its confiscation is in the cod row's, landConf counts the cod as one)
  return out;
}

// ---- the rules where the boat is (ruNow), with her group and her cod quota laid on top. ruNow is not changed: it knows the place, the
// gear and the length, not the group north of 62° N, so a boat without access got «✓ Lov her». {v, items, top}: top is what the
// status line says first
const RM_NOW = {
  acc:{k:'rmacc', v:'warn', no:'Bare bifangst: båten har ingen kvote', en:'Bycatch only: the boat has no quota'},
  full:{k:'rmfull', v:'warn', no:'Torskekvoten er full', en:'The cod quota is full'}};
function rmNow(H){
  let r = {v:'ok', items:[]}; try { r = ruNow() || r; } catch (e){}
  const extra = [];
  try { const m = rmMeters(H).find(x => x.sp === 'torsk' && (x.kind === 'by' || x.kind === 'open' || x.kind === 'vessel'));
    if (m && m.kind === 'by') extra.push(RM_NOW.acc); else if (m && m.state === 'full') extra.push(RM_NOW.full); } catch (e){}
  const items = (r.items || []).concat(extra), rank = {no:2, warn:1, ok:0}, v = extra.length && rank[r.v] < 1 ? 'warn' : r.v;
  return {v, items, top:items.find(i => i.v === 'no') || extra[0] || items.find(i => i.v === v && i.v !== 'ok') || null};
}

// ---- what a purchase changes, worked out without changing anything. offer:
//   {kind:'lic', id (the right), type (the boat it comes with), ti}   the yard's boat with a right, traded in (ti) or for the fleet
//   {kind:'hull', type, ti, keep}                                     the yard's boat without one (keep: the old right stays as a free right)
//   {kind:'right', id, used, y, v}                                    a right put on the boat v (the quota market; used: landed on it in year y)
//   {kind:'boat', type, lic}                                          a boat for the fleet from the broker, with or without a right
// Gives {now, after, loses, seller}: now and after are {acc, limit, used, left} for the boat it is about (now is null for a boat that is
// new to the fleet); loses is the boat that loses her place in the open group, by id; seller the kilos of this year's cod the seller
// has fished on the right (§ 29). The same functions as the purchase itself uses (licQ, sellerCod, openVesselId)
function rmBuy(offer, H){
  H = H == null ? S.t / 60 : H; if (!offer) return null;
  const y = yearH(H), fleet = S.fleet || [], ov = openVesselId(), cur = curVessel();
  const st = (acc, limit, used) => ({acc, limit, used, left:Math.max(0, limit - used)});
  const nowOf = v => withVessel(v, () => { const acc = access(), q = quotaState(); return acc === 'none' ? st('none', BYCATCH.cod, q.byCod || 0) : st(acc, codLimitNow(H), q.torsk || 0); });
  const licAfter = (id, len, used) => { const lim = licQ({id}, H, len).torsk, u = used != null ? used : Math.round(lim * sellerCod(id, H)); return {after:st('lukket', lim, u), seller:u}; };
  const others = v => fleet.some(x => x !== v && vget(x, 'lic'));   // (a right elsewhere in the company: no boat of hers is in the open group)
  // the owner's open-group cod this year follows the owner (§ 29): what the open boat has landed, or what was kept when she left the group
  const openUsed = v => { const q = v && v.id === ov ? vget(v, 'quota') : null, a = q && q.y === y ? q.torsk || 0 : 0, O = S.openUsed && S.openUsed.y === y ? S.openUsed.torsk || 0 : 0; return Math.max(a, O); };
  const noLic = (type, v) => { const V = VESSELS[type] || {};
    if (V.cls === 'hav') return {after:{acc:'lukket', hav:true, limit:null, used:0, left:null}};
    if (V.len < 11 && !others(v)) return {after:st('open', rmOpenLimit(V.len, H), openUsed(v || vesselById(ov)))};
    return {after:st('none', BYCATCH.cod, v ? (vget(v, 'quota') || {}).byCod || 0 : 0)}; };
  let R;
  if (offer.kind === 'lic'){ const V = VESSELS[offer.type] || {}; R = licAfter(offer.id, V.len, null);
    R.now = offer.ti ? nowOf(cur) : null; R.loses = ov && !(offer.ti && ov === cur.id) ? ov : null; }
  else if (offer.kind === 'hull'){ const V = VESSELS[offer.type] || {};
    if (offer.ti){ R = noLic(offer.type, cur); R.now = nowOf(cur); R.loses = V.cls === 'hav' && ov && ov !== cur.id ? ov : null; R.lost = !!vget(cur, 'lic') && !offer.keep; }
    else { R = V.len < 11 && V.cls !== 'hav' && !fleet.some(x => vget(x, 'lic')) ? {after:null, why:'open'} : noLic(offer.type, null); R.now = null; R.loses = V.cls === 'hav' ? ov : null; } }
  else if (offer.kind === 'right'){ const v = offer.v, V = v && VESSELS[vget(v, 'boat').type]; if (!v || !V) return null;
    R = licAfter(offer.id, V.len, offer.used && offer.y === y ? offer.used.torsk || 0 : offer.used ? 0 : null); R.now = nowOf(v); R.loses = ov && ov !== v.id ? ov : null; }
  else if (offer.kind === 'boat'){ const V = VESSELS[offer.type] || {};
    if (offer.lic && HJ[offer.lic.id]){ R = licAfter(offer.lic.id, V.len, null); R.now = null; R.loses = ov; }
    else { R = V.len < 11 && V.cls !== 'hav' && !fleet.some(x => vget(x, 'lic')) ? {after:null, why:'open'} : noLic(offer.type, null); R.now = null; R.loses = null; } }
  else return null;
  if (R.seller == null) R.seller = null; if (R.loses == null) R.loses = null;
  return R;
}

// ---- the words (plan 4.5, V3 A; Jonas 25.11.2026: «Vi må gjerne bytte ut ord til noe som er mer forståelig for brukerne … mens det
// enda ivaretar autensiteten»): the plain word first, the trade's own word in brackets the first time on a page. One table, so a word
// is changed in one place. [plain, term] in Norwegian and in English; the English are proposals
const RM_TERMS = {
  open:{no:['felleskvoten for småbåter', 'åpen gruppe'], en:['the small boats\' shared quota', 'the open group']},
  closed:{no:['egen kvote', 'lukket gruppe'], en:['a quota of your own', 'the closed group']},
  right:{no:['kvoterett', 'hjemmel'], en:['quota right', 'participation right']},
  max:{no:['taket ditt i år', 'maksimalkvote'], en:['your cap this year', 'maximum quota']},
  guar:{no:['det du har uansett', 'garantert kvote'], en:['what you have in any case', 'guaranteed quota']},
  vessel:{no:['båtens kvote', 'fartøykvote'], en:['the boat\'s quota', 'vessel quota']},
  factor:{no:['kvotens størrelse', 'kvotefaktor'], en:['the size of the quota', 'quota factor']},
  access:{no:['lov til å fiske torsk, hyse og sei for salg', 'adgang'], en:['leave to fish cod, haddock and saithe for sale', 'access']},
  conf:{no:['får du ikke betalt for', 'inndratt'], en:['you are not paid for', 'confiscated']},
  bladb:{no:['yrkesfisker', 'blad B'], en:['professional fisher', 'blad B']},
  fresh:{no:['høsttillegget for fersk fisk', 'ferskfiskordningen'], en:['the autumn allowance for fresh fish', 'the fresh-fish scheme']},
  struct:{no:['kvote slått sammen fra en annen båt', 'strukturkvote'], en:['a quota merged from another boat', 'structure quota']},
  skipper:{no:['skipper om bord', 'høvedsmann'], en:['skipper aboard', 'master']}};
// the plain word, with the term in brackets when first is true; [no, en]
function rmTermL(key, first){ const T = RM_TERMS[key]; if (!T) return [key, key]; return ['no', 'en'].map(l => first ? T[l][0] + ' (' + T[l][1] + ')' : T[l][0]); }
function rmTerm(key, first){ const t = rmTermL(key, first); return S && S.lang === 'en' ? t[1] : t[0]; }

// ---- why can I not? One table for the reasons a purchase or a move can give: the words deal() (notes, eq, cap), kmBuyWhy and kmWhy
// (km.*), mbMoveWhy (mv.*) and mbBuyWhy (mb.*) return, the trade-in with fish in the hold (hold), and where and when boats are bought.
// Each: a sentence [no, en], how to mend it (fix: [no, en] and the app that has it), and the law behind it (law) where there is one.
// ctx fills the figures in: {n, of, kr, need, boat, len}
const RM_WHY = {
  notes:{t:['Banken vil se tre leveringer før den låner ut. Du har {n}.', 'The bank wants to see three landings before it lends. You have {n}.'], fix:['Lever fangst {left} ganger til.', 'Land a catch {left} more times.']},
  eq:{t:['Du har for lite egenkapital til dette kjøpet. Banken krever {need}.', 'You have too little equity for this purchase. The bank asks for {need}.'], fix:['Spar opp, eller bytt inn båten din.', 'Save up, or trade in your boat.'], app:'bank'},
  cap:{t:['Banken låner ikke mer: all gjeld må holde seg innenfor 80 % av verdien på flåten.', 'The bank lends no more: all debt has to stay within 80% of the fleet\'s value.'], fix:['Betal ned lån, eller velg en rimeligere båt.', 'Pay down loans, or choose a cheaper boat.'], app:'bank'},
  cash:{t:['Du har ikke nok penger til dette.', 'You do not have the money for this.'], app:'bank'},
  bladb:{t:['Du må være yrkesfisker (blad B) for å eie en kvoterett. Du har {n} av {of} dager med levering.', 'You must be a professional fisher (blad B) to own a quota right. You have {n} of {of} days with a landing.'], fix:['Lever fangst med deg om bord til du er der.', 'Land catches with you aboard until you are there.'], app:'kvote', sub:'mine', law:'Deltakerloven § 6'},
  hold:{t:['Lever fangsten før du bytter inn «{boat}». Det som ligger i rommet, følger ikke med til den nye båten.', 'Land the catch before you trade in the «{boat}». What is in the hold does not go with you to the new boat.'], fix:['Gå til et mottak og lever.', 'Go to a fish plant and land it.']},
  yard:{t:['Båter kjøpes og selges på verftet.', 'Boats are bought and sold at the yard.'], fix:['Seil til et verft.', 'Sail to a yard.']},
  order:{t:['Verftet har alt en bestilling fra deg.', 'The yard already has an order from you.']},
  sale:{t:['«{boat}» har noe til salgs. Vent til salget er over.', 'The «{boat}» has something for sale. Wait until the sale is over.']},
  open:{t:['Rederiet kan bare ha én båt på felleskvoten for småbåter (åpen gruppe).', 'The company can only have one boat on the small boats\' shared quota (the open group).'], fix:['Bytt inn båten din, eller kjøp en båt med kvoterett.', 'Trade in your boat, or buy a boat with a quota right.'], law:'Deltakerforskriften (J-30-2026)'},
  'km.gone':{t:['Den er ikke til salgs lenger.', 'It is no longer for sale.']},
  'km.own':{t:['Dette er din egen.', 'This one is your own.']},
  'km.how':{t:['En kvote slått sammen fra en annen båt kan bare legges til en båt som alt har kvoterett.', 'A quota merged from another boat can only be added to a boat that already has a quota right.']},
  'km.boat':{t:['Velg en av båtene dine først.', 'Choose one of your boats first.']},
  'km.type':{t:['En havbåt kan ikke ta en kvoterett for kysten.', 'An ocean vessel cannot take a coastal quota right.']},
  'km.listed':{t:['Den båten ligger til salgs.', 'That boat is for sale.']},
  'km.haslic':{t:['Den båten har alt en kvoterett. Der kan en ny bare slås sammen med den.', 'That boat already has a quota right. A new one can only be merged with it there.']},
  'km.len':{t:['Kvoteretten hører til båter under {len} m og kan ikke flyttes til en båt på {len} m eller mer.', 'The quota right belongs to boats under {len} m and cannot be moved to a boat of {len} m or more.'], law:'Kvoteforskriften for kystflåten § 6'},
  'km.nolic':{t:['Båten har ingen kvoterett å slå den sammen med.', 'The boat has no quota right to merge it with.']},
  'km.group':{t:['Kvoter kan bare slås sammen innenfor samme lengdegruppe, og bare fra 11 m og opp.', 'Quotas can only be merged within the same length group, and only from 11 m up.'], law:'Kvoteforskriften for kystflåten § 9'},
  'km.cap':{t:['Båten har ikke plass til mer: det er et tak på hvor mye kvote én båt kan samle.', 'The boat has no room for more: there is a cap on how much quota one boat can gather.'], law:'Kvoteforskriften for kystflåten § 12'},
  'km.none':{t:['Båten har ingen kvoterett.', 'The boat has no quota right.']},
  'km.hav':{t:['Havtillatelsene selges sammen med båten, på verftet.', 'The ocean permits are sold with the vessel, at the yard.']},
  'km.two':{t:['Den andre kvoten fra den særlige ordningen kan ikke selges. Den faller bort.', 'The second quota from the special scheme cannot be sold. It falls away.'], law:'Kvoteforskriften kap. 2 § 6'},
  'km.sea':{t:['Båten må ligge i havn.', 'The boat must lie in port.']},
  'km.busy':{t:['Båten losser. Vent til hun er ferdig.', 'The boat is landing. Wait until she is done.']},
  'km.drift':{t:['Ingen fangst er levert på kvoteretten i år eller de to årene før.', 'No catch has been landed on the quota right this year or the two before.']},
  'km.coop':{t:['Kvoteretten er i kvotesamarbeid i år.', 'The quota right is in a quota cooperation this year.'], law:'J-161-2026 § 31'},
  'km.short':{t:['Kvoten har under ett år igjen.', 'The quota has under a year left.']},
  'mv.order':{t:['Båten byttes inn. Vent til det er gjort.', 'The boat is being traded in. Wait until that is done.']},
  'mv.same':{t:['Kvoteretten står alt på den båten.', 'The quota right is already on that boat.']},
  'mv.tolisted':{t:['Båten den skulle til, ligger til salgs.', 'The boat it would go to is for sale.']},
  'mb.open':{t:['Rederiet kan bare ha én båt på felleskvoten for småbåter (åpen gruppe).', 'The company can only have one boat on the small boats\' shared quota (the open group).'], fix:['Kjøp en båt med kvoterett, eller selg båten din først.', 'Buy a boat with a quota right, or sell your boat first.'], law:'Deltakerforskriften (J-30-2026)'}};
// mbMoveWhy and mbBuyWhy share the quota market's words where they mean the same
for (const k of ['gone', 'none', 'hav', 'listed', 'sea', 'busy', 'coop', 'boat', 'type', 'haslic', 'len']) RM_WHY['mv.' + k] = RM_WHY['km.' + k];
for (const k of ['gone', 'own']) RM_WHY['mb.' + k] = RM_WHY['km.' + k];
RM_WHY['mb.bladb'] = RM_WHY['km.bladb'] = RM_WHY.bladb; RM_WHY['mb.cash'] = RM_WHY['km.cash'] = RM_WHY.cash;
// {code, t:[no, en], fix:[no, en]|null, app, sub, law} with the figures filled in, or null for a code the table does not have
function rmWhy(code, ctx){
  const W = code && RM_WHY[code]; if (!W) return null;
  const c = ctx || {}, fill = s => s.replace(/\{(\w+)\}/g, (m, k) => c[k] != null ? c[k] : '');
  return {code, t:W.t.map(fill), fix:W.fix ? W.fix.map(fill) : null, app:W.app || null, sub:W.sub || null, law:W.law || null};
}
