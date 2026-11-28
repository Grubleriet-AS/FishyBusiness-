// ===== STYRINGEN: SHE IS CARRIED ALONG THE BANE WHILE THE GAME IS LOOKED AT (Autonav 2.0 F3, steg 143, 27.11.2026) =====
// Jonas 27.11.2026: «Vi må bare fikse denne autonav-funksjonen slik at den fungerer for alle hver gang. Den må funke 100% feilfritt»,
// and his choice 10 the same day: «Ført langs banen» (in place of choice 3, «Fysikk med hjelp»). The bane (17b-bane.js) is what
// the planner checked her whole hull along (17c-plan.js). The minute step follows it by the clock when the game is shut (baneSail);
// here the boat model's tick does the same while it is open (baneTick): the same place, heading and speed at the same time, so what
// was checked free is what is sailed, whichever of the two moves her. The manoeuvring model (16b-dyn.js dynAuto: the rudder, the
// propeller, the wind's push) has her only where the plan has no bane, and when the player steers himself.
// One call in 16b-dyn.js dynTick, before dynAuto; the minute's books while the model has her leave a plan with a bane as it is
// (dynMinute: no detours laid into it, obsSail and landSail, which would make it a plan without a bane).
const STYR = {job:0, hold:6, snap:25, look:{t:-1, s:-1, hit:null, since:0, told:false, again:-1e9}};   // (hold: game minutes she waits for her banes before she sails as before; snap: m from where a way starts within which she is set on it)
function styrTick(b, d, dtG){ const pl = S.plan; if (!pl) return false;
  if (pl.b2w && styrWait(pl)){ d.u = d.v = d.r = 0; b.v = 0; return true; }   // (her banes are being found: she lies where she is)
  if (!pl.b2) return false;
  // (a way that starts where she is not: she has drifted on the fishing ground since the plan was made. Found again from where she is)
  const g = baneLeg(pl); if (g && g.sea && pl.idx === g.i0 && pl.b2.at !== g.i0 && Math.hypot(d.X - g.q[0][0], d.Y - g.q[0][1]) > STYR.snap){ styrLeg(pl, g); d.u = d.v = d.r = 0; b.v = 0; return true; }
  const x0 = d.X, y0 = d.Y, W = styrWatch(pl, b, d); if (!baneTick(pl, b, d, dtG, W)) return false;
  DYN.nm = (DYN.nm || 0) + Math.hypot(d.X - x0, d.Y - y0) / 1852; return true; }
// whether the plan has a bane where she is (the minute's books and the views ask)
function styrOn(pl){ return !!(pl && pl.b2 && baneLeg(pl)); }
// whether she waits for her banes: the search this page started is still at it, and no longer than STYR.hold game minutes. A plan
// saved while it waited (the game shut right after «Kast loss») has nobody searching for it when it is loaded: it sails as before
function styrWait(pl){ const w = pl.b2w; if (!w) return false; if (w.id === STYR.job && S.t - w.t <= STYR.hold && S.t >= w.t) return true; delete pl.b2w; return false; }
// The plan onto checked banes, at «Kast loss» (06-services.js depart, with #autonav2; Jonas' choices 2 and 10: a route is put on the
// nearest safe bane, and that bane is what she sails). Each way she is sent, to a stop or to a point the player drew himself, is
// searched with her whole hull (17c-plan.js planBane), from her berth and to her berth where the end is a harbour, and put into the
// plan in place of the route's own points (planInto) when all are searched and the plan is as it was. A way with no bane keeps the
// route it had, and is sailed as before. She waits at the quay meanwhile (styrWait): the search takes seconds, the lines minutes.
// (find: the search, planBane; the unit tests give their own. A plain function that hands back the promise, so the tests can ask for it by name)
function styrPlan(pl, find){ if (!pl || pl.b2 || pl.b2w || !planOn()) return Promise.resolve(false); const b = S.boat, ty = b.type, id = ++STYR.job; pl.b2w = {id, t:S.t}; find = find || planBane;
  const mine = () => S.plan === pl && pl.b2w && pl.b2w.id === id, done = ok => { if (pl.b2w && pl.b2w.id === id) delete pl.b2w; return ok; }, kind = w => w.berth === 'naust' ? 'naust' : 'main';
  return (async () => { try { const n0 = pl.wps.length, i00 = pl.idx, via = []; for (let i = i00; i < n0; i++) if (!pl.wps[i].leia || i === n0 - 1) via.push(i);
    const inPort = (b.status === 'port' || b.status === 'unmooring') && b.port; let from = inPort ? planEnd(b.port, ty, berthKind(b) === 'naust' ? 'naust' : 'main') : null, a = from ? {x:from.x, y:from.y} : {x:b.pos.x, y:b.pos.y}, i0 = i00; const legs = [];
    for (const i of via){ const w = pl.wps[i], to = w.port ? planEnd(w.port, ty, kind(w)) : null, z = to ? {x:to.x, y:to.y} : {x:w.x, y:w.y}, stop = wpStop(w) || i === n0 - 1; let R = null;
      try { R = await find(a, z, ty, {kn:BOAT.vmax, from, to, end:stop}); } catch (e){}
      if (!mine() || pl.wps.length !== n0 || pl.idx !== i00 || pl.b2) return done(false);   // (the plan was changed or dropped meanwhile)
      if (R && R.bane) legs.push({i0, i1:i + 1, R, sea:!from && i0 > i00});
      a = z; from = to; i0 = i + 1; }
    for (let k = legs.length - 1; k >= 0; k--){ planInto(pl, legs[k].R, legs[k].i0, legs[k].i1); if (legs[k].sea) pl.b2.legs[pl.b2.legs.length - 1].sea = true; }
    return done(legs.length > 0); } catch (e){ return done(false); } })(); }
// one way of the plan found again from where she is (she drifted from where it starts; a vessel has come to lie in it, styrWatch):
// the old one out of the plan and the new one in. Where there is none from here, the way's points stand and are sailed as before
function styrLeg(pl, g, find){ if (!pl || pl.b2w || !pl.b2) return Promise.resolve(false); const b = S.boat, id = ++STYR.job; pl.b2w = {id, t:S.t}; find = find || planBane;
  const i1 = g.i0 + g.n, w = pl.wps[i1 - 1], n0 = pl.wps.length, idx0 = pl.idx, to = w && w.port ? planEnd(w.port, b.type, w.berth === 'naust' ? 'naust' : 'main') : null;
  return (async () => { let R = null; try { R = await find({x:b.pos.x, y:b.pos.y}, to ? {x:to.x, y:to.y} : {x:w.x, y:w.y}, b.type, {kn:BOAT.vmax, to, end:g.end !== false}); } catch (e){}
  const ok = S.plan === pl && pl.b2w && pl.b2w.id === id && pl.wps.length === n0 && pl.idx === idx0 && pl.b2 && pl.b2.legs.includes(g);
  if (ok){ const Y = pl.b2; Y.legs.splice(Y.legs.indexOf(g), 1); if (R && R.bane){ planInto(pl, R, idx0, i1); Y.legs[Y.legs.length - 1].sea = true; } Y.at = -1; }
  if (pl.b2w && pl.b2w.id === id) delete pl.b2w; return !!(ok && R && R.bane); })(); }
// The watch (valg 1, «Liggende er hindre», and what was not there when the plan was made): what she may do along the bane now.
// - A vessel she must keep clear of (05e-sjovei.js, the look-out's own verdict SJV.own): she does not leave the bane, which is
//   what was checked free; she slackens to 40 % of her speed, 1 m/s in a harbour, and lies still where the look-out says stop.
//   In restricted visibility no more than the safe speed (sjvCapV).
// - A vessel lying still in the bane ahead (it came after the plan was made: the planner goes round those that lie there then):
//   looked for once a game second, her hull every half length as far as she needs to stop and two lengths more. She waits for
//   it, and after two game minutes the way is found again from where she is, round it.
// Gives baneTick's o: {hold, v (m/s at most)}. Only while the game is looked at: the minute step has the bane's own speeds.
function styrWatch(pl, b, d){ const o = {hold:false, v:1e9}, K = STYR.look;
  try { sjvFresh(true); const O = SJV.own, cap = sjvCapV(); if (cap < 1e8) o.v = cap;
    if (O && O.t1 == null){ if (O.harb){ if (O.stop) o.hold = true; else o.v = Math.min(o.v, 1); } else o.v = Math.min(o.v, Math.max(1, 0.4 * ((pl.speed || BOAT.vcruise || 6) * KN_MS))); } } catch (e){}
  const g = baneLeg(pl), Y = g && baneOf(g); if (!Y) return o; const B = Y.B, s = pl.b2.at === g.i0 ? pl.b2.s : 0;
  if (K.pl !== pl || K.t !== S.t || Math.abs(s - K.s) > 1){ if (K.pl !== pl){ K.since = 0; K.told = false; K.again = -1e9; } K.pl = pl; K.t = S.t; K.s = s; K.hit = null;
    try { const boat = planBoat(b.type, d.X, d.Y), L = boat.L, own = BANE.own * L, e0 = g.q[0], e1 = g.q[g.q.length - 1], v = Math.abs(d.u) + Math.abs(d.v), look = Math.min(B.len - s, v * v / 0.4 + 2 * L + 10);
      const sk = h => !(h.what === 'båt') || Math.hypot(h.x - e0[0], h.z - e0[1]) < own + (h.R || 0) || Math.hypot(h.x - e1[0], h.z - e1[1]) < own + (h.R || 0);
      for (let u = Math.min(look, L / 2); u <= look + 1e-6; u += L / 2){ const q = baneAt(B, s + u), h = farbPose(q.X, q.Z, q.psi, boat, S.t / 60, {m:1, boats:true, skip:sk}); if (h && h.what === 'båt'){ K.hit = h; break; } } } catch (e){} }
  if (K.hit){ o.hold = true; if (!K.since) K.since = S.t; if (!K.told){ K.told = true; log('Autonav venter: et fartøy ligger i veien.', 'Autonav is waiting: a vessel lies in the way.'); }
    if (S.t - K.since >= 2 && S.t - K.again >= 5 && !pl.b2w){ K.again = S.t; styrLeg(pl, g); } }
  else { K.since = 0; K.told = false; }
  return o; }
