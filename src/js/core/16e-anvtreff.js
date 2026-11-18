// ===== THE CATCH: WHERE THE PLAYERS' BOATS TOUCH WHAT IS NOT CLEAN WATER (the autonav routine's «fangsten», Jonas 18.11.2026:
// «hvordan skal vi da fange opp mønstre for hvor ekte spillere grunnstøter, går gjennom kaier, kræsjer i havner og alt sånt?»;
// docs/planer/autonav-null-treff.md) =====
// The hunt (tools/autonav/jakt.py) sails made-up trips; this is the same look-out on the players' own. While a route steers the boat
// (Autonav, a route drawn in the chart plotter, the way home, the plan, the safety net; not by hand), every fourth tick of the boat model
// her hull's points are tested against land, the bottom under her keel, everything fixed in the sea (11b-obstacles.js fixNear: the piers,
// the quays, the breakwaters, the floating docks, the rorbuer's and the naust's quays), a harbour unit's quay and fill, the marks, the
// wind turbines and the bridges' piers and decks lower than her (obsIndex), and the vessels lying still (fixBoats). Each thing she touches
// is told once a trip, and each trip's start and end, through the cloud's queue (ui/10f-cloud.js cloudEv): nothing is kept in the queue
// without a session (CLOUD.sid), and the server stores the batch only for a player who has said yes (players.consent).
//   anv_trip {t, ph:'start'|'end', how, boat, nm, end}          t: a random id for the trip, not for the player or the session
//   anv_hit  {t, w, x, y, boat, kn, hd, ph, how, leg, dS, dE}   w what, x/y where (km, the game's frame, 3 decimals), kn her speed,
//                                                               hd her heading (degrees, true), ph the phase, leg [idx, n], dS/dE metres
//                                                               from the trip's start and from the route's end
// The version is on the session (sessions.version). Read with tools/autonav/treff.py (supabase agent_autonav).
const ANV = {cur:null, f:0, pts:[[0.5, 0], [0.3, 0.5], [0.3, -0.5], [0, 0.5], [0, -0.5], [-0.45, 0.5], [-0.45, -0.5]], R:{}};
// how the route came to be: the way home (returning), the plan (ops), Autonav's own (leia), else drawn in the chart plotter
function anvHow(pl){ if (!pl) return null; if (pl.returning) return 'retur'; if (pl.ops) return 'drift'; if ((pl.wps || []).some(w => w && (w.leia || w.obs))) return 'autonav'; return 'tegnet'; }
const anvSend = (k, d) => { try { if (typeof cloudEv === 'function') cloudEv(k, d); } catch (e){} };
const anvXY = p => ({x:+(+p.x || 0).toFixed(3), y:+(+p.y || 0).toFixed(3)});
// once a tick of the boat model (16b-dyn.js dynTick): the trip begun or ended, and every fourth the look
function anvTick(){
  const b = S.boat, pl = S.plan, steer = !!pl && b.status === 'sailing' && !(typeof helmOn === 'function' && helmOn()), c = ANV.cur;
  if (c && (!steer || pl !== c.pl)){ anvSend('anv_trip', {t:c.t, ph:'end', how:c.how, boat:c.boat, nm:+(c.nm || 0).toFixed(2), end:b.status, hits:c.n}); ANV.cur = null; }
  if (!steer) return;
  if (!ANV.cur){ const end = pl.wps[pl.wps.length - 1] || b.pos;
    ANV.cur = {t:Math.random().toString(36).slice(2, 10), pl, how:anvHow(pl), boat:b.type, from:{x:b.pos.x, y:b.pos.y}, end:{x:end.x, y:end.y}, last:{x:b.pos.x, y:b.pos.y}, seen:new Set(), n:0, nm:0, left:false};
    let nm = 0, a = b.pos; for (let i = pl.idx; i < pl.wps.length; i++){ nm += dist(a, pl.wps[i]); a = pl.wps[i]; } ANV.cur.nm = nm / NM;
    anvSend('anv_trip', {t:ANV.cur.t, ph:'start', how:ANV.cur.how, boat:b.type, nm:+ANV.cur.nm.toFixed(2)}); }
  if (++ANV.f % 4) return;
  try { anvLook(ANV.cur); } catch (e){}
}
// what her hull touches now, each thing once a trip
function anvLook(c){
  const b = S.boat, d = b.dyn; if (!d || d.X == null || !(typeof dynLive === 'function' && dynLive())) return;
  const pl = S.plan, P = dynCalOf(b).P, L = P.L, B = P.B, sn = Math.sin(d.psi), cs = Math.cos(d.psi), kn = Math.hypot(d.u || 0, d.v || 0) / KN_MS;
  if (!c.left && dist(b.pos, c.from) > 0.3) c.left = true;
  const dS = Math.round(dist(b.pos, c.from) * 1000), dE = Math.round(dist(b.pos, c.end) * 1000), T = DYN.line;
  // (her own berth: under a knot within one and a half lengths of the start or the end, the fenders, as the hunt has it)
  if (kn < 1 && (dS < 1.5 * L || dE < 1.5 * L)) return;
  const ph = T && (T.assist > T.s || (T.back > 0 && T.s < T.sOut)) ? 'hender' : pl && pl.replan ? 'sikkerhetsnett' : !c.left && dS < 300 ? 'ut fra kai' : dE < 300 && pl && pl.wps.some(w => w.port) ? 'inn mot kai' : 'seiling';
  const hit = (w, key, p) => { const k = w + '|' + key; if (c.seen.has(k) || c.n >= 40) return; c.seen.add(k); c.n++;
    anvSend('anv_hit', Object.assign({t:c.t, w}, anvXY(p), {boat:b.type, kn:+kn.toFixed(1), hd:Math.round(trueDeg(d.psi, b.pos)) % 360,
      ph, how:c.how, leg:pl ? [pl.idx, pl.wps.length] : null, dS, dE})); };
  const pts = ANV.pts.map(([fx, fy]) => { const xc = fx * L, yc = fy * B; return [d.X + xc * sn + yc * cs, d.Y - (xc * cs - yc * sn)]; });
  // land, and a harbour unit's quay and fill
  for (const [x, z] of pts){ const p = {x:x / 1000, y:z / 1000}; let u = false, l = false; try { u = onUnitGround(p); l = !u && isLand(p); } catch (e){ continue; }
    if (u){ hit('kai', 'u' + Math.round(x / 50) + ',' + Math.round(z / 50), p); break; } if (l){ hit('land', Math.round(x / 50) + ',' + Math.round(z / 50), p); break; } }
  // the bottom under her keel (the harbours dredged as the keel has them, 07-harbours.js depthNav)
  try { if (keelClear(b) < 0) hit('grunn', Math.round(d.X / 50) + ',' + Math.round(d.Y / 50), b.pos); } catch (e){}
  // everything fixed in the sea, and the vessels lying still
  for (const [x, z] of pts){ for (const o of fixNear(x, z, 0)) if (fixDist(o, x, z).d < 0){ hit(o.k || 'brygge', Math.round((o.x != null ? o.x : o.x0) / 10) + ',' + Math.round((o.z != null ? o.z : o.z0) / 10), {x:x / 1000, y:z / 1000}); }
    for (const o of fixBoats(x, z)) if (o.t === 1 && Math.abs(o.x - x) < o.l + o.w && Math.abs(o.z - z) < o.l + o.w && fixDist(o, x, z).d < 0) hit('båt', Math.round(o.x / 10) + ',' + Math.round(o.z / 10), {x:x / 1000, y:z / 1000}); }
  // the marks, the wind turbines and the bridges (a deck only where it is lower than she is)
  const idx = obsIndex(), C = HIND.C, air = obsAir();
  for (const [x, z] of pts){ const Lc = idx.get(Math.floor(x / C) * 1048576 + Math.floor(z / C)); if (!Lc) continue;
    for (const o of Lc){ if (o.why === 'buoy' || o.t === 1) continue; if (o.t === 2 && o.under >= air) continue; if (obsDist(o, x, z, x, z) > 0) continue;
      hit(o.t === 2 ? 'brudekke' : o.B ? 'brupilar' : o.why === 'turbine' ? 'vindturbin' : 'merke', String(o.id), {x:x / 1000, y:z / 1000}); } }
}
