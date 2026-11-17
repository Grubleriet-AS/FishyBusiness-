// ---------- the route editor: waypoint names, a timeline for the list, undo and redo, moving and inserting points ----------
// Waypoints are named for the route as it is sailed: WP0 is where it starts (the harbour or the boat), then WP1, WP2 … The points a
// harbour adds on the way out and in (w.auto 'out' or 'in') are shown dimmed and marked so.
const wpName = i => 'WP' + i;
const legName = i => wpName(i) + '→' + wpName(i + 1);   // the leg that ends at draft index i
function wpTag(w){ return w.auto === 'out' ? (S.lang === 'no' ? 'utseiling' : 'way out') : w.auto === 'in' ? (S.lang === 'no' ? 'innseiling' : 'way in') : ''; }
const courseDeg = (a, c) => trueDeg(Math.atan2(c.x - a.x, -(c.y - a.y)), a);   // the chart is grid north up: the true course is the grid's + gamma
const deg3s = d => String(Math.round(d) % 360).padStart(3, '0') + '°';
// the draft leg by leg: course to steer, length, and when the boat gets to each point and leaves it (game minutes). Gear work at a
// point is not counted, the same as in the estimate.
// where the draft starts: the boat's berth
const draftOrigin = () => quayPos(S.boat);
const draftPort = () => S.boat.status === 'port' && berthKind(S.boat) !== 'naust' ? S.boat.port : null;
function draftTimeline(){
  const b = S.boat, e = estimate(), v = Math.max(1, e.v), out = [];
  let a = draftOrigin(), T = S.draftDep && S.draftDep > S.t ? S.draftDep : S.t;
  const T0 = T;
  // (each leg's time with the stream along it at the time she is there, Ø9 F8b: curLegH, 16b-dyn.js)
  S.draft.forEach(w => { const km = kmTrue(a, w); T += curLegH(a, w, v, T / 60) * 60; const arrive = T; T += (w.fish || 0) * 60; out.push({nm:km / NM, crs:courseDeg(a, w), arrive, leave:T}); a = w; });
  return {dep:T0, legs:out, end:T};
}

// --- history: every change to the draft can be undone and redone, 100 steps per vessel; it is not saved
const RHIST = {};
const rhist = () => RHIST[S.cur] || (RHIST[S.cur] = {u:[], r:[]});
function draftEdit(fn){
  const before = JSON.stringify(S.draft), out = fn();
  if (JSON.stringify(S.draft) !== before){ const h = rhist(); h.u.push(before); if (h.u.length > 100) h.u.shift(); h.r.length = 0; }
  return out;
}
function draftUndo(){ const h = rhist(); if (!h.u.length) return false; h.r.push(JSON.stringify(S.draft)); S.draft = JSON.parse(h.u.pop()); return true; }
function draftRedo(){ const h = rhist(); if (!h.r.length) return false; h.u.push(JSON.stringify(S.draft)); S.draft = JSON.parse(h.r.pop()); return true; }
function draftForget(all){ if (all) for (const k in RHIST) delete RHIST[k]; else { const h = rhist(); h.u.length = 0; h.r.length = 0; } }
// the draft can be edited while the boat lies in port or still at sea, and no departure is waiting
const canEditDraft = () => ['port', 'idle'].includes(S.boat.status) && !(S.plan && S.plan.depAt) && !(S.plan && S.boat.status !== 'idle');
function routeChanged(){ hzCache.k = ''; panelDirty = true; renderDyn(); renderRouteTools(); try { chartWarm(S.draft && S.draft.length > 1 ? [S.boat.pos, ...S.draft] : S.plan && S.plan.wps); } catch (e){} }

// --- the floating undo and redo buttons over the zoom buttons on the chart
let rtKey = '';
function renderRouteTools(){
  routeSeaWatch();   // the sea along the route on the cards (below), added after each draw of the panel
  const u = $('rUndo'), r = $('rRedo'); if (!u) return;
  // the side panel shows (on a wide screen) only when there is a route: drawn, being found, or being sailed (the user's wish 02.10.2026)
  const routing = S.draft.length > 0 || !!S.plan || LEIA_BUSY;
  if (document.body.classList.contains('routing') !== routing){ document.body.classList.toggle('routing', routing); if (routing) document.body.classList.remove('sidehide'); if (document.body.classList.contains('vplot')){ applyView(); scheduleStatic(); } }
  const h = rhist(), key = [S.cur, S.lang, canEditDraft(), S.draft.length, S.draft.length && S.draft[S.draft.length - 1].port, h.u.length, h.r.length, LEIA_ARM, LEIA_BUSY, document.body.classList.contains('v3d'), S.boat.status, !!S.plan].join('|');
  if (key === rtKey) return; rtKey = key;
  // play starts the route drawn; while the boat sails it, pause (the user's wish 02.10.2026)
  const pl = $('rPlay'), mode = routePlayMode(), L = (no, en) => S.lang === 'no' ? no : en;
  if (pl){ pl.hidden = !mode; pl.classList.toggle('pause', mode === 'pause'); pl.setAttribute('aria-label', mode === 'pause' ? L('Pause: stopp båten på ruta', 'Pause: stop the boat on the route') : L('Start ruta', 'Start the route')); }
  const on = canEditDraft() && (S.draft.length > 0 || h.u.length > 0 || h.r.length > 0), lb = $('rAuto');
  { const cl = $('rClear'); if (cl){ cl.hidden = !(canEditDraft() && S.draft.length > 0); cl.setAttribute('aria-label', S.lang === 'no' ? 'Slett ruta' : 'Delete the route'); } }
  u.hidden = r.hidden = !on; u.disabled = !h.u.length; r.disabled = !h.r.length;
  if (lb){ lb.hidden = !canEditDraft() || document.body.classList.contains('v3d'); lb.disabled = LEIA_BUSY || !!(S.draft.length && S.draft[S.draft.length - 1].port); lb.classList.toggle('on', LEIA_ARM || LEIA_BUSY); lb.classList.toggle('busy', LEIA_BUSY); lb.setAttribute('aria-label', 'Autonav'); }
  u.setAttribute('aria-label', S.lang === 'no' ? 'Angre' : 'Undo'); r.setAttribute('aria-label', S.lang === 'no' ? 'Gjør om' : 'Redo');
}
// 'play' when a route is drawn and the boat lies still, 'pause' while it sails a route, else null
function routePlayMode(){
  const b = S.boat;
  if (S.plan && b.status === 'sailing' && !S.plan.ops) return 'pause';
  if (S.draft.length && canEditDraft() && ['port', 'idle'].includes(b.status) && !(S.plan && S.plan.depAt)) return 'play';
  return null;
}
// pause: the boat stops where it is, and what is left of the route goes back to the draft, so play goes on with it (and it can be
// changed first)
function routePause(){
  const b = S.boat; if (!S.plan || b.status !== 'sailing') return;
  S.draft = S.plan.wps.slice(S.plan.idx).map(w => ({...w})); S.draftSpeed = S.plan.speed || S.draftSpeed; if (S.plan.full != null) S.draftFull = !!S.plan.full; draftForget();
  S.plan = null; b.status = 'idle'; b.v = 0;
  log('Pause på ruta. Trykk ▶ for å gå videre.', 'Paused on the route. Tap ▶ to go on.');
}
function routePlay(){
  const m = routePlayMode(); if (!m) return;
  if (m === 'pause') routePause(); else { const el = document.createElement('button'); el.dataset.act = 'start'; doAct(el); }
  routeChanged(); renderPanel(); renderActs(); save();
}
function routeUndoRedo(redo){ if (!canEditDraft()) return; if (redo ? draftRedo() : draftUndo()){ routeChanged(); save(); } }

// --- moving a point with a finger, and inserting one on a leg with its «+» handle
// A press within 22 px of a waypoint takes it (not the harbour at the end); a press on a leg's middle handle makes a new point there.
// The point follows the finger; if it ends on land it turns red and goes back. A second finger cancels, so the chart can be pinched.
let RDRAG = null;
const WP_HIT = 22, INS_HIT = 18, INS_MIN = 64;   // px
function legEnds(i){ return [i === 0 ? draftOrigin() : S.draft[i - 1], S.draft[i]]; }
// the legs long enough on screen to carry a «+» handle, with the handle's position
function insHandles(){
  const out = []; if (!canEditDraft()) return out;
  for (let i = 0; i < S.draft.length; i++){ const [a, c] = legEnds(i); if (dist(a, c) * view.px < INS_MIN) continue; out.push({i, p:{x:(a.x + c.x) / 2, y:(a.y + c.y) / 2}}); }
  return out;
}
function routeGrab(mp){
  if (!canEditDraft() || !S.draft.length) return null;
  let best = null, bd = WP_HIT / view.px;
  // (a port's point nearer than the waypoint takes the tap: the route ends there; the ways out and in lie close by the harbour)
  for (const p of PORTS){ const d = dist(p.p, mp); if (d < bd) bd = d; }
  S.draft.forEach((w, i) => { if (w.port) return; const d = dist(w, mp); if (d < bd){ bd = d; best = {kind:'move', i}; } });
  if (!best){ let hd = INS_HIT / view.px; for (const hdl of insHandles()){ const d = dist(hdl.p, mp); if (d < hd){ hd = d; best = {kind:'ins', i:hdl.i, p:hdl.p}; } } }
  if (best){ best.before = JSON.stringify(S.draft); best.land = false; best.moved = false; }
  return best;
}
let rdragRaf = 0;
function routeDragMove(g, mp){
  if (g.kind === 'ins'){ S.draft.splice(g.i, 0, {x:mp.x, y:mp.y, port:null, fish:0}); g.kind = 'move'; g.inserted = true; }
  const w = S.draft[g.i]; w.x = mp.x; w.y = mp.y; delete w.auto; delete w.leia; g.moved = true; g.land = isLandUI(mp); RDRAG = g;
  if (!rdragRaf) rdragRaf = requestAnimationFrame(() => { rdragRaf = 0; renderDyn(); });
}
function routeDragCancel(g){ S.draft = JSON.parse(g.before); RDRAG = null; routeChanged(); }
function routeDragEnd(g){
  RDRAG = null;
  if (!g.moved){
    if (g.kind === 'ins'){
      if (isLandUI(g.p)){ toast(t('on_land')); return; }
      draftEdit(() => S.draft.splice(g.i, 0, {x:g.p.x, y:g.p.y, port:null, fish:0}));
    } else { routeFocus(g.i); wpChip(g.i); return; }
  } else if (g.land){ S.draft = JSON.parse(g.before); toast(S.lang === 'no' ? 'Punktet havnet på land og er flyttet tilbake.' : 'The point landed on land and has been moved back.'); }
  else { const now = S.draft; S.draft = JSON.parse(g.before); draftEdit(() => { S.draft = now; }); }
  routeChanged(); save();
}
// show a waypoint's card in the list
function routeFocus(i){
  if (tab !== 'route') setTab('route');
  if (window.innerWidth <= 700) document.body.classList.add('drawer');
  requestAnimationFrame(() => { const li = document.querySelector('#panel .wpc[data-i="' + i + '"]'); if (!li) return; li.scrollIntoView({block:'nearest', behavior:'smooth'}); li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); });
}
// A tap on a point of the route opens a small card by it in the chart (tilbakemelding #128, 17.11.2026: «vanskelig å slette rutepunkt som er
// satt feil»; Jonas: «få opp spørsmålet når man trykker på et WP, mens når man holder og drar så flytter man det … en intuitiv løsning som
// ser bra ut»): the point's name and place, its fishing time with − and +, «Slett punktet», and × to close; holding and dragging moves the
// point as before (routeDragMove). Only where the point is seen in the chart: under the route panel (portrait) the panel's own card with
// its × is the way. It goes at a tap outside it, or after a while without a touch
function wpChip(i){
  let el = document.getElementById('wpChip'); if (el) el.remove();
  const w = S.draft[i]; if (!w || w.port || !canEditDraft()) return;
  const c = mapToClient(w), L = (no, en) => S.lang === 'no' ? no : en;
  const at = document.elementFromPoint(c.x, c.y); if (!at || !(at === svg || svg.contains(at))) return;
  el = document.createElement('div'); el.id = 'wpChip'; el.className = 'wpchip'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', wpName(i + 1));
  const fishTxt = () => w.fish > 0 ? t('fish_h', w.fish) : t('no_fish');
  el.innerHTML = '<div class="wpchip-h"><b>' + wpName(i + 1) + '</b><small>' + coordStr(w) + '</small><button type="button" class="wpchip-x" aria-label="' + L('Lukk', 'Close') + '">×</button></div>' +
    '<div class="wpchip-f"><span>' + L('Fisketid', 'Fishing') + '</span><button type="button" data-d="-1" aria-label="−">−</button><output>' + fishTxt() + '</output><button type="button" data-d="1" aria-label="+">+</button></div>' +
    '<button type="button" class="wpchip-del">' + L('Slett punktet', 'Delete the point') + '</button><i class="wpchip-arrow"></i>';
  document.body.appendChild(el);
  const r = el.getBoundingClientRect(), x = Math.round(Math.min(innerWidth - r.width / 2 - 8, Math.max(r.width / 2 + 8, c.x))), below = c.y - r.height - 22 < 56;
  el.style.left = x + 'px'; el.style.top = Math.round(below ? c.y + 22 : c.y - r.height - 22) + 'px'; el.classList.toggle('below', below);
  el.querySelector('.wpchip-arrow').style.left = Math.round(c.x - x + r.width / 2) + 'px';
  let tm = 0; const arm = () => { clearTimeout(tm); tm = setTimeout(go, 12000); };
  const go = () => { clearTimeout(tm); el.remove(); document.removeEventListener('pointerdown', away, true); };
  const away = e => { if (!el.contains(e.target)) go(); };
  el.querySelector('.wpchip-x').onclick = go;
  for (const b of el.querySelectorAll('.wpchip-f button')) b.onclick = () => { if (S.draft[i] !== w) return go(); doAct({dataset:{act:+b.dataset.d > 0 ? 'fp' : 'fm', i:String(i)}, disabled:false}); el.querySelector('output').textContent = fishTxt(); arm(); };
  el.querySelector('.wpchip-del').onclick = () => { go(); if (S.draft[i] === w){ draftEdit(() => S.draft.splice(i, 1)); routeChanged(); save(); toast(L('Punktet er slettet. Angre med pila ved kartet.', 'The point is deleted. Undo with the arrow by the chart.')); } };
  setTimeout(() => document.addEventListener('pointerdown', away, true), 0); arm();
}
// a map point on the screen (for the tests and the first-trip guide)
function mapToClient(p){ const m = svg.getScreenCTM(); return {x:m.a * p.x + m.c * p.y + m.e, y:m.b * p.x + m.d * p.y + m.f}; }

// --- «Autonav» (the button in the chart plotter, and the dock's Auto-nav): the next tap on the chart is where to go, and the route
// there follows the fairway (core/11-route.js). The skipper casts off himself with «Kast loss» (the user's wish 02.10.2026).
let LEIA_ARM = false, LEIA_BUSY = false, LEIA_RU = null;   // LEIA_RU: the closed place tapped last, so a second tap goes there after all
function leiaArm(on){
  if (on && !tutAllow('waypoint')) return;
  if (on && S.draft.length && S.draft[S.draft.length - 1].port){ toast(t('ends_port')); return; }
  LEIA_ARM = on && canEditDraft(); if (LEIA_ARM) toast(S.lang === 'no' ? 'Autonav: trykk i kartet der du vil. Båten finner en trygg vei dit.' : 'Autonav: tap the chart where you want to go. The boat finds a safe way there.');
  panelDirty = true; renderPanel(); renderRouteTools();
}
// the way from where the route starts to the goal (gPort its harbour, or null), as a tap in the chart plotter finds it: Autonav's search
// (leiaRoute), and from Father's naust (atN, port the plant's id) the harbour's own way, and from the naust or a rorbu the way by water
// from the berth when that finds none. Out of the tap so tests/allesteder.py and tools/rorbu/siteout.py ask the way the game asks it (steg 126, 14.11.2026: the
// test asked the search alone and found no way from the naust at Sørarnøy, Hidrasund, Tufjord and Gjesvær, where the chart plotter has one)
async function draftWay(start, goal, aPort, gPort, atN, port, nt){   // (nt: Father's naust as the end, naustTarget, whose route is the plant's with its berth last)
  let res = await leiaRoute({x:start.x, y:start.y}, goal, aPort, gPort);
  // Father's naust in a basin the 100 m grid sees as shut to the sea (Øksfjord, tilbakemelding #39: no way found to the first trip's
  // ring): the way out is then the harbour's own, by its approach path
  // (from the naust a way with a leg over land counts as none: the route panel greys «Kast loss» for it, estimate().bad, and the first
  // trip stood as fast as with no way; Fosnavåg 08.11.2026 with the field of 17.09.2027, where the sealed harbour's way out crosses its
  // fill, approachPath pt.free)
  // (a rorbu's berth the same way as the naust's: from the rorbu by its own approach the search found no way at Austein and Åsværgården,
  // and from where the way by water from its berth ends it did, steg 126, 14.11.2026)
  const site = atN || (!!aPort && isRorbu(aPort));
  const legsOk = r => { let a = {x:start.x, y:start.y}; for (const w of r.wps){ if (!legClearMemo(a, w)) return false; a = w; } return true; }, fails = r => !!r.why || (site && !legsOk(r));
  if (fails(res) && atN && port && approachPath(portById(port)).length){ const r = await leiaRoute({x:start.x, y:start.y}, goal, port, gPort); if (res.why || !fails(r)) res = r; }
  // and where neither finds it (Averøy and Sleneset 08.11.2026: «Fant ingen trygg rute dit.» on the first trip, which then could not
  // leave the quay): the way by water from the berth to the harbour or to open water (naustWay, core/07c-naust.js, the same test that
  // places the naust), then on: from the harbour point the very route a boat at the plant's quay gets (her start, quayPos, is that
  // point), else from where the way ends; the first whose legs all keep off land
  if (fails(res) && site && port){ const way = naustWay({x:start.x, y:start.y}, port, BOAT.draft + LEIA.minOver), H = portById(port);   // (the water this boat needs: SITE_DRAFT, the default, is kyst15's)
    if (way && way.length > 1){ const e = way[way.length - 1], to = goal, id = gPort, pre = way.slice(1), tries = [];
      if (way.to === 'harbour') tries.push([pre.concat(dist(e, H.p) > 0.002 ? [{x:H.p.x, y:H.p.y}] : []), H.p, port], [pre, e, port]);
      tries.push([pre, e, null]);
      for (const [P0, from, ap] of tries){ const r2 = await leiaRoute({x:from.x, y:from.y}, to, ap, id); if (r2.why) continue;
        const r3 = {wps:P0.concat(r2.wps), nm:r2.nm, st:r2.st}; if (res.why) res = r3; if (!fails(r3)){ res = r3; break; } } } }
  // and the same the other way: into a rorbu, where the search finds no way to its point (the last leg to the berth fails at the mend in
  // the shallow water by the shore: Mehamn, Kongsfjord, Havøysund and some forty more at the lowest tide, steg 126, 15.11.2026, tests/
  // allesteder.py with the way in): the way by water out from its berth (naustWay, as above), turned, and the route to where that way
  // ends (Jonas 15.11.2026: «Alle steder spillerens båt kan fortøye må være tilgjengelig via autonav både inn og ut av»)
  if (res.why && gPort && gPort !== port && isRorbu(gPort)){ const bp = berthPose(gPort, S.boat.type, 'main');
    const way = bp && naustWay({x:bp.x, y:bp.y}, gPort, BOAT.draft + LEIA.minOver);
    // (to where the way ends, else from there out to her and turned: the end of that way lies by the shore, and a route that ends in
    // water that shallow is none, «For grunt der», while the route from it is found, Tømmervik)
    if (way && way.length > 1){ const e = way[way.length - 1]; let r2 = await leiaRoute({x:start.x, y:start.y}, {x:e.x, y:e.y}, aPort, null);
      if (r2.why){ const r4 = await leiaRoute({x:e.x, y:e.y}, {x:start.x, y:start.y}, null, aPort); if (!r4.why && r4.wps && r4.wps.length) r2 = {wps:r4.wps.slice(0, -1).reverse().concat([{x:e.x, y:e.y}]), nm:r4.nm, st:Object.assign({}, r4.st, {rev:true})}; }
      if (!r2.why && r2.wps && r2.wps.length){ const nm = r2.nm + dist(e, goal) / NM; res = {wps:r2.wps.concat(way.slice(1, -1).reverse(), [{x:goal.x, y:goal.y}]), nm, st:Object.assign({}, r2.st, {siteIn:way.length})}; } } }
  // into Father's naust where it lies outside the plant's basin: the way along the quay from the plant's harbour point to its berth goes
  // far round (Smøla nord, steg 126, 15.11.2026: the naust on the island's other side, berthPath 2.5 km round it into the shallows at the
  // lowest tide, tests/allesteder.py with the way in). Then as a rorbu: the route to where the way by water out from its berth ends, and
  // that way turned
  if (nt && !res.why && res.wps && res.wps.length){ const bp = berthPose(nt.port, S.boat.type, 'naust');
    const q = res.wps.length > 1 ? res.wps[res.wps.length - 2] : start, W = bp ? berthPath({x:q.x, y:q.y}, bp) : null, len = A => A.reduce((s, p, k) => k ? s + dist(A[k - 1], p) : 0, 0);
    if (W && len(W) > 2 * dist(q, bp) + 0.2){ const way = naustWay({x:bp.x, y:bp.y}, nt.port, BOAT.draft + LEIA.minOver);
      if (way && way.length > 1 && way.to !== 'harbour'){ const e = way[way.length - 1]; let r2 = await leiaRoute({x:start.x, y:start.y}, {x:e.x, y:e.y}, aPort, null);
        if (r2.why){ const r4 = await leiaRoute({x:e.x, y:e.y}, {x:start.x, y:start.y}, null, aPort); if (!r4.why && r4.wps && r4.wps.length) r2 = {wps:r4.wps.slice(0, -1).reverse().concat([{x:e.x, y:e.y}]), nm:r4.nm, st:Object.assign({}, r4.st, {rev:true})}; }
        if (!r2.why && r2.wps && r2.wps.length) res = {wps:r2.wps.concat(way.slice(1, -1).reverse(), [{x:goal.x, y:goal.y}]), nm:r2.nm + len(way) / NM, st:Object.assign({}, r2.st, {naustIn:way.length})}; } } }
  return res;
}
async function leiaTo(pt, buoy, act){   // buoy: to a set's buoy, to haul it (the rules are not asked); act: what the boat does there (a haul)
  const b = S.boat; LEIA_ARM = false;
  if (!canEditDraft() || LEIA_BUSY) return;
  if (S.draft.length && S.draft[S.draft.length - 1].port){ toast(t('ends_port')); return; }
  const r = 22 / view.px; let near = null, bd = 1e9;
  const ownT = view.z < PLACE_Z ? placeOwnIds() : null;   // (far out only the places the chart shows, 03-map.js PLACE_Z)
  for (const p of PORTS){ if (ownT && !ownT.has(p.id)) continue; const d = dist(p.p, pt); if (d < r && d < bd){ bd = d; near = p; } }
  // a rorbu's quay (07d-rorbu.js), when the chart is close enough to show its name and not in «Første tur» (a tap in the field's ring
  // went to a rorbu by it)
  let sillR = null;   // (a rorbu the boat does not get out from at any tide, SITE_SILL: not a place to go; a tap on its shore says why)
  if (view.z >= 2 && !tutOn() && siteFits(S.boat.type)) for (const R of rorbuSites(pt, r + 0.05)){ const d = dist(R.p, pt); if (d < r && d < bd){ if (!siteFits(S.boat.type, R.id)){ sillR = sillR || R; continue; } bd = d; near = R; } }
  // a harbour of the coast's packs: Autonav goes to a free berth there (07e-havn.js), when no place of the game is nearer
  if (view.z >= 2 && !tutOn() && !near && !buoy){ const B = havnTapNear(pt, r); if (B) near = B; }
  if (!near && !buoy) near = portByLabel(pt);
  // an ocean vessel only to a plant whose quay fits her and that takes her catch (06b-coastports.js portWhy, havsteget H0)
  if (near && (near.mottak || near.havOnly)){ const why = portWhy(near, b.type); if (why){ toast(S.lang === 'en' ? why[1] : why[0]); return; } }
  // from Father's naust the way starts at its berth, not by the harbour's way out from the plant (tilbakemelding #20)
  const atN = !S.draft.length && b.status === 'port' && berthKind(b) === 'naust';
  const start = S.draft.length ? S.draft[S.draft.length - 1] : draftOrigin(), aPort = !S.draft.length && !atN ? draftPort() : null;
  // Father's naust as the end (07c-naust.js naustTarget); in its own harbour the way there is short, straight from the harbour point
  const nt = naustTarget(pt, r);
  if (nt && atN){ toast(t('already_here')); return; }
  if (!nt && near && aPort === near.id && !atN){ toast(t('already_here')); return; }
  // (a tap by one of the coast's harbours, shut to the players: says why, and a tap on its water is a point of the route as before)
  if (!near && !nt && !buoy && view.z >= 2 && havnShutAt(pt, r)){ toast(S.lang === 'en' ? HAVN_WHY[1] : HAVN_WHY[0]); if (isLandUI(pt)) return; }
  if (!near && !nt && !buoy && sillR && isLandUI(pt)){ const why = siteWhy(S.boat.type, sillR.id); toast(S.lang === 'en' ? why[1] : why[0]); return; }
  if (!near && !nt && isLandUI(pt)){ toast(t('on_land')); return; }
  // a tap in water too shallow for the boat (by the shore): the nearest point within 500 m that is deep enough, with a word about it;
  // none, no route (Autonav never ends on a shoal, 08.10.2026)
  if (!near && !nt && !buoy){ const dq = deepNear(pt, 0.5); if (!dq){ toast(S.lang === 'no' ? 'For grunt der for båten. Trykk litt lenger ut.' : 'Too shallow there for the boat. Tap a little farther out.'); return; }
    if (dq !== pt){ toast(S.lang === 'no' ? 'For grunt der. Autonav går til dypere vann ' + Math.round(dist(dq, pt) * 1000 / 50) * 50 + ' m unna.' : 'Too shallow there. Autonav goes to deeper water ' + Math.round(dist(dq, pt) * 1000 / 50) * 50 + ' m away.'); pt = dq; } }
  if (nt && (aPort === nt.port || (!aPort && dist(start, nt) < 1))){ draftEdit(() => S.draft.push({x:nt.x, y:nt.y, port:nt.port, berth:'naust', fish:0})); if (tab !== 'route') setTab('route'); routeChanged(); save(); return; }
  if (nt){ near = portById(nt.port); }
  // R4: a place where the rules stop your boat fishing (the fjord lines by length, the baseline zones, closed fields): Autonav goes to
  // the nearest place within 3 km where it may, and says why; the same place tapped again within a minute goes there after all
  let goal = pt;
  if (!near && !buoy && !tutOn() && RU.ok){ const c = ruCtx(), q = {p:pt, len:c.len, gear:c.gear, sp:c.sp, hand:c.hand}, rb = ruBlockMsg(q), L = (no, en) => S.lang === 'no' ? no : en;
    const again = LEIA_RU && dist(LEIA_RU.p, pt) < 0.3 && Date.now() - LEIA_RU.t < 60000; LEIA_RU = null;
    if (rb && !again){ const o = ruOpenNear(pt, q, 3);
      if (o){ goal = o; LEIA_RU = {p:{x:pt.x, y:pt.y}, t:Date.now()}; const m = Math.round(dist(o, pt) * 1000 / 50) * 50;
        toast(rb + L(' Autonav går til nærmeste sted der du kan fiske, ' + m + ' m unna. Trykk samme sted igjen for å gå helt dit.', ' Autonav goes to the nearest place where you may fish, ' + m + ' m away. Tap the same place again to go all the way.')); }
      else toast(rb + L(' Du kan seile dit, men ikke fiske der.', ' You may sail there, but not fish there.')); } }
  const before = JSON.stringify(S.draft); LEIA_BUSY = true; panelDirty = true; renderPanel(); renderRouteTools();
  let res; try { res = await draftWay(start, near ? near.p : goal, aPort, near ? near.id : null, atN, b.port, nt); }
  finally { LEIA_BUSY = false; }
  if (JSON.stringify(S.draft) !== before){ routeChanged(); return; }   // the route was changed while the way was being found
  if (res.why){ toast(S.lang === 'no' ? res.why[0] : res.why[1]); routeChanged(); return; }
  draftEdit(() => { res.wps.forEach((q, i) => { const last = i === res.wps.length - 1; S.draft.push(last && near ? {x:near.p.x, y:near.p.y, port:near.id, fish:0} : {x:q.x, y:q.y, port:null, fish:0, leia:true}); });
    if (nt){ const e = S.draft[S.draft.length - 1]; Object.assign(e, {x:nt.x, y:nt.y, berth:'naust'}); } });   // on to the naust from its harbour's way in
  // at a set's buoy the haul starts on arrival (tilbakemelding #31: «skal båten automatisk starte å trekke lina»)
  if (act && !near && S.draft.length){ const e = S.draft[S.draft.length - 1]; e.act = act; e.leia = false; }
  if (near && window.innerWidth <= 700) document.body.classList.add('drawer');
  if (tab !== 'route') setTab('route');
  routeChanged(); save();
}
// the point itself when it is deep enough for the boat (or its water is not loaded yet: the route finder then says), else the nearest
// point within maxKm (rings of 16) at sea with the boat's safe depth, else null
function deepNear(p, maxKm){
  const sd = safeDepth(), ok = c => { if (isLandUI(c)) return false; if (!mapSimAt(c) || !mapReadyAt(c, 0)) return true; try { return depthF(c) >= sd + 1; } catch (e){ return true; } };
  const okp = (() => { if (isLandUI(p)) return false; if (!mapSimAt(p) || !mapReadyAt(p, 0)) return true; try { return depthF(p) >= BOAT.draft + LEIA.minOver - leiaTideCredit(p, p); } catch (e){ return true; } })();   // (the tide's credit as the route finder has it)
  if (okp) return p;
  for (const r of [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5]){ if (r > maxKm) break;
    for (let i = 0; i < 16; i++){ const a = i * Math.PI / 8, c = {x:p.x + Math.sin(a) * r, y:p.y - Math.cos(a) * r}; if (ok(c) && clearLine(c, p)) return c; } }
  return null;
}
// the drawn route laid again by Autonav through the same stops (17.11.2026, the groundings on yellow legs of drawn routes, #122-#124;
// Jonas: «varsler bedre ved start av utrygge ruter … mer intuitivt hvordan autonav brukes»): each stop (a harbour, a fishing place, a
// point where the boat does something, and the end) keeps what it was, and the way between them is the fairway's (leiaRoute), so no
// leg is yellow. A stretch Autonav finds no way on leaves the route as it was and says why. Returns true when the route was laid
async function draftToLeia(){
  if (!S.draft.length || LEIA_BUSY || !canEditDraft()) return false;
  const q0 = draftOrigin(), stops = [{p:{x:q0.x, y:q0.y}, port:draftPort(), w:null}];
  S.draft.forEach((w, i) => { if (w.port || wpStop(w) || i === S.draft.length - 1) stops.push({p:{x:w.x, y:w.y}, port:w.port || null, w}); });
  const before = JSON.stringify(S.draft), out = []; LEIA_BUSY = true; panelDirty = true; renderPanel();
  try {
    for (let i = 1; i < stops.length; i++){
      const r = await leiaRoute(stops[i - 1].p, stops[i].p, stops[i - 1].port, stops[i].port);
      if (r.why || !r.wps || !r.wps.length){ toast(S.lang === 'no' ? 'Autonav fant ingen trygg vei til ' + (stops[i].port ? 'havna' : 'punkt ' + (S.draft.indexOf(stops[i].w) + 1)) + '. ' + (r.why ? r.why[0] : '') : 'Autonav found no safe way to ' + (stops[i].port ? 'the harbour' : 'point ' + (S.draft.indexOf(stops[i].w) + 1)) + '. ' + (r.why ? r.why[1] : '')); return false; }
      r.wps.forEach((q, k) => out.push(k === r.wps.length - 1 ? Object.assign({}, stops[i].w) : {x:q.x, y:q.y, port:null, fish:0, leia:true}));
    }
  } finally { LEIA_BUSY = false; }
  if (JSON.stringify(S.draft) !== before){ routeChanged(); return false; }   // (changed while the way was being found)
  draftEdit(() => { S.draft = out; });
  toast(S.lang === 'no' ? 'Autonav la ruta i trygt vann. Se over den og kast loss.' : 'Autonav laid the route in safe water. Look it over and cast off.');
  routeChanged(); save(); return true;
}
// how the drawn route compares with following the fairway through the same stops: worked out in the background, then shown
const LEIA_CMP = {key:'', res:null, busy:false, timer:0};
function leiaStops(){
  const b = S.boat, q = draftOrigin(), out = [{p:{x:q.x, y:q.y}, port:!S.draft.length ? null : draftPort()}];
  S.draft.forEach((w, i) => { if (w.port || wpStop(w) || i === S.draft.length - 1) out.push({p:{x:w.x, y:w.y}, port:w.port || null}); });
  return out;
}
function leiaCompare(){
  if (!S.draft.length || S.draft.every(w => w.leia || w.port || w.auto)) return null;
  const st = leiaStops(), key = safeDepth() + '|' + st.map(s => s.p.x.toFixed(3) + ',' + s.p.y.toFixed(3) + (s.port || '')).join(';');
  if (LEIA_CMP.key === key) return LEIA_CMP.res;
  clearTimeout(LEIA_CMP.timer);
  LEIA_CMP.timer = setTimeout(async () => {
    if (LEIA_CMP.busy) return; LEIA_CMP.busy = true;
    try {
      let nm = 0;
      for (let i = 1; i < st.length; i++){ const r = await leiaRoute(st[i - 1].p, st[i].p, st[i - 1].port, st[i].port); if (r.why){ nm = null; break; } nm += r.nm; }
      LEIA_CMP.key = key; LEIA_CMP.res = nm == null ? null : {nm};
    } finally { LEIA_CMP.busy = false; }
    panelDirty = true; renderPanel();
  }, 350);
  return null;
}

// --- the sea along the route (Ø8, 06.11.2026): the wave height on each leg at the minute the boat is there, as the local forecast gives it
// (hsAtFc, the same as the «Ved båten» column of the Vær tab's table; Jonas 06.11.2026, R1 A: the forecast, not the sea that will come,
// which a skipper cannot know), on the leg's card after the ETA. Red from the boat's own limit
// (BOAT.risk[0], the sea she handles safely, as the Fartøy app states it), as the rule lines on the cards are red, and «farlig» from her
// danger limit (risk[1]); a line under the cards names the legs over the limit. The cards are drawn by panelRoute (07-guide.js); the route
// editor adds the sea to them after each draw (a MutationObserver on the panel, set up from renderRouteTools), so that file is left alone.
const ROUTE_SEA = {step:0.5, maxN:24};   // km between the samples along a leg, and at most this many on one leg (the sea changes on a few hundred metres at a harbour's mouth: every 1 km showed 0,7 m where Bodø's gave 1,2 m)
// the sea leg by leg: the highest forecast sea along the leg at the minute the boat passes each sample, and its level against the boat's limits
function draftSea(tl){
  const r = BOAT.risk, now = S.t / 60, out = []; let a = draftOrigin(), T0 = tl.dep;
  S.draft.forEach((w, i) => {
    const lg = tl.legs[i], n = Math.max(1, Math.min(ROUTE_SEA.maxN, Math.ceil(dist(a, w) / ROUTE_SEA.step)));
    let hs = 0;
    for (let k = i === 0 ? 0 : 1; k <= n; k++){ const f = k / n, p = {x:a.x + (w.x - a.x) * f, y:a.y + (w.y - a.y) * f}, T = T0 + (lg.arrive - T0) * f;
      try { hs = Math.max(hs, hsAtFc(p, T / 60, now)); } catch (e){} }   // (a block of the sea not loaded yet: the leg shows what the rest gives)
    // (the stream on the leg, Ø9 F8b: the strongest she meets where a sound's stream may reach, how much of it is against her, and
    // whether the wind sea runs against it there: «krapp sjø i strømmen»)
    let cur = null; try { const hd = Math.atan2(w.x - a.x, -(w.y - a.y)), dd = dist(a, w);
      for (let s = 0, n = 0; s <= dd && n < 3000; n++){ const f = dd > 0 ? s / dd : 0, p = {x:a.x + (w.x - a.x) * f, y:a.y + (w.y - a.y) * f}; if (!stromNear(p).length){ s += 1; continue; } s += 0.25;   // (every 250 m where a sound's stream may reach, as curLegH)
        const Hh = (T0 + (lg.arrive - T0) * f) / 60, C = curEff(curAt(p, Hh)); if (!(C.m >= CURW.krapp) || (cur && C.m <= cur.m)) continue;
        const sc = seaCur(p, Hh, hsParts(p, Hh)); cur = {m:C.m, kn:C.m * 3600 / 1852, ag:-(C.x * Math.sin(hd) - C.y * Math.cos(hd)) * 3600 / 1852, krapp:!!(sc && sc.krapp)}; } } catch (e){}
    out.push({hs, lvl:hs >= r[1] ? 2 : hs >= r[0] ? 1 : 0, cur});
    a = w; T0 = lg.leave;
  });
  return out;
}
let ROUTE_SEA_OBS = null;
function routeSeaWatch(){
  if (ROUTE_SEA_OBS || typeof MutationObserver === 'undefined') return;
  const el = document.getElementById('panel'); if (!el) return;
  ROUTE_SEA_OBS = new MutationObserver(() => routeSeaDraw()); ROUTE_SEA_OBS.observe(el, {childList:true}); routeSeaDraw();
}
function routeSeaDraw(){
  const el = document.getElementById('panel'); if (!el || el.querySelector('.wsea')) return;   // (drawn already: our own nodes wake the observer too)
  const ul = el.querySelector('ul.wpcards'); if (!ul || !S.draft.length) return;
  const L = (no, en) => S.lang === 'no' ? no : en, sea = draftSea(draftTimeline()), over = [], strom = [];
  ul.querySelectorAll('li.wpc[data-i]').forEach(li => {
    const i = +li.dataset.i, q = sea[i], wg = li.querySelector('.wg'); if (!q || !wg) return;
    const sp = document.createElement('span'); sp.className = 'wsea';
    // (inline: «.wpc .wg b» sets the ink colour with more weight than «.bad», and styles.css is another session's)
    sp.innerHTML = L('Sjø ', 'Sea ') + '<b' + (q.lvl ? ' style="color:var(--bad)"' : '') + '>' + fmt(q.hs, 1) + ' m' + (q.lvl > 1 ? L(' farlig', ' dangerous') : '') + '</b>';
    wg.appendChild(sp); if (q.lvl) over.push([i, q]);
    // (the stream on the leg: its speed, with or against her, and the steep sea where the wind stands against it)
    if (q.cur){ const c = q.cur, s2 = document.createElement('span'); s2.className = 'wsea'; const way = c.ag > 0.5 * c.kn ? L(' imot', ' against') : c.ag < -0.5 * c.kn ? L(' med', ' with you') : L(' på tvers', ' across');
      s2.innerHTML = L('Strøm ', 'Stream ') + '<b' + (c.krapp ? ' style="color:var(--bad)"' : '') + '>' + fmt(c.kn, 1) + ' kn' + way + '</b>'; wg.appendChild(s2); if (c.krapp) strom.push(i); }
  });
  if (strom.length){ const p = document.createElement('p'); p.className = 'bad wsea'; p.textContent = '✕ ' + L('Krapp sjø i strømmen på etappe ', 'A short, steep sea in the stream on leg ') + strom.slice(0, 4).map(legName).join(', ') + L(': vinden står mot strømmen når båten er der.', ': the wind stands against the stream when the boat is there.'); ul.after(p); }
  if (!over.length) return;
  const r = BOAT.risk, p = document.createElement('p'); p.className = 'bad wsea';
  p.textContent = '✕ ' + L('Varselet gir sjø over båtens grense på ', 'The forecast gives a sea over the boat\'s limit of ') + fmt(r[0], 1) + ' m ' + L('på etappe ', 'on leg ') +
    over.slice(0, 4).map(([i, q]) => legName(i) + ' (' + fmt(q.hs, 1) + ' m)').join(', ') + (over.length > 4 ? ' …' : '') + L(' når båten er der.', ' when the boat is there.') +
    (over.some(x => x[1].lvl > 1) ? L(' Over ' + fmt(r[1], 1) + ' m er det farlig for denne båten.', ' Over ' + fmt(r[1], 1) + ' m it is dangerous for this boat.') : '');
  ul.after(p);
}
