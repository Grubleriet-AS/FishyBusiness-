// Styringen (core/17d-styr.js; Autonav 2.0 F3, steg 143): the plan onto checked banes at «Kast loss» (styrPlan), the wait while they
// are found (styrWait), one way found again (styrLeg), and the watch's word on a vessel she must keep clear of (styrWatch).
export default async function (t){
  const K = t.K, FARB = K.get('FARB'), PLAN = K.get('PLAN'), STYR = K.get('STYR'); K.set('S', K.newState()); const S = K.get('S');
  const far = {x:9e6, z:9e6}, km = (dx, dz) => ({x:(far.x + dx) / 1000, y:(far.z + dz) / 1000});
  const sea = o => Object.assign({land:() => 0, coast:() => [1e9, 0], depth:() => 50, tide:() => 0, zc:() => 0, pocket:() => false, known:() => true}, o || {});
  // the search the tests give: a straight bane between the two ends (built as planBane's is), or none where `no` says so
  const bb = K.baneBoat('sjark', 8), calls = [];
  const find = no => async (a, z, ty, o) => { calls.push({a, z, o}); await null; if (no && no(a, z)) return {why:['ingen']};
    const B = K.baneBuild([[a.x * 1000, a.y * 1000, 0], [z.x * 1000, z.y * 1000, 0]], Object.assign({}, bb, {end:o.end !== false})); return {bane:B, pts:K.banePts(B), nm:B.len / 1852}; };
  const plan = () => ({wps:[Object.assign(km(300, 0), {port:null, fish:0, leia:true}), Object.assign(km(600, 0), {port:null, fish:0}), Object.assign(km(900, 300), {port:null, fish:0, leia:true}), Object.assign(km(1200, 300), {port:null, fish:1})], idx:0, speed:8});
  const boatAt = () => { S.boat.pos = km(0, 0); S.boat.status = 'sailing'; S.boat.port = null; };
  FARB.w = sea();
  try {
    // ---- without the flag nothing is done ----
    PLAN.on = false; { const pl = plan(); S.plan = pl; boatAt(); t.eq(await K.styrPlan(pl, find()), false, 'uten flagget legges ingen bane i planen'); t.ok(!pl.b2 && !pl.b2w && pl.wps.length === 4, 'og planen står som den var'); }
    PLAN.on = true;
    // ---- the plan onto banes: one way to the point the player drew, one to the stop ----
    { const pl = plan(); S.plan = pl; boatAt(); calls.length = 0; const pr = K.styrPlan(pl, find());
      t.ok(pl.b2w && K.styrWait(pl), 'mens banene søkes, venter hun');
      t.eq(await pr, true, 'planen får baner'); t.ok(!pl.b2w && !K.styrWait(pl), 'og ventingen er over');
      t.eq(calls.length, 2, 'to veier søkes: til punktet spilleren tegnet, og til stoppet (rutas egne punkter er ikke mål)');
      t.ok(calls[0].o.end === false && calls[1].o.end === true, 'hun stopper ikke i et tegnet punkt, men i stoppet', calls.map(c => c.o.end));
      t.near(calls[0].a.x, km(0, 0).x, 1e-9, 'første vei går fra der hun er'); t.near(calls[1].a.x, km(600, 0).x, 1e-9, 'neste fra der den første endte');
      t.eq(pl.b2.legs.length, 2, 'planen har to baner'); const last = pl.wps[pl.wps.length - 1]; t.ok(last.fish === 1 && Math.abs(last.x - km(1200, 300).x) < 1e-6, 'stoppet står sist, som det var', last);
      t.ok(K.styrOn(pl) && K.baneLeg(pl) && K.baneOf(K.baneLeg(pl)), 'og banen der hun er, bygges igjen fra planen');
      t.ok(pl.wps.filter(w => !w.leia).length === 2 && pl.wps.filter(w => w.leia).every(w => w.bane), 'rutas egne punkter er byttet med banenes; punktet spilleren tegnet og stoppet står', pl.wps.length);
      // sailed by the minute step to the stop
      let min = 0; while (S.plan === pl && pl.idx < pl.wps.length && min < 200){ if (!K.baneSail(pl, S.boat, Infinity)) break; min++; }
      t.ok(min > 1 && min < 60, 'minuttsteget følger banene fram', min); }
    // ---- a way with no bane keeps the route it had ----
    { const pl = plan(); S.plan = pl; boatAt(); const ok = await K.styrPlan(pl, find((a, z) => Math.abs(z.x - km(600, 0).x) < 1e-9));
      t.eq(ok, true, 'én vei uten bane: planen får den andre'); t.eq(pl.b2.legs.length, 1, 'én bane');
      t.ok(pl.wps[0].leia && !pl.wps[0].bane && Math.abs(pl.wps[0].x - km(300, 0).x) < 1e-9 && !pl.wps[1].leia, 'veien uten bane har rutas punkter som før', pl.wps.slice(0, 2));
      t.eq(K.baneLeg(pl), null, 'og der seiler hun som før (ingen bane der hun er)'); }
    // ---- none at all ----
    { const pl = plan(); S.plan = pl; boatAt(); t.eq(await K.styrPlan(pl, find(() => true)), false, 'ingen vei har bane: planen står som den var'); t.ok(!pl.b2 && !pl.b2w && pl.wps.length === 4, 'uten bane og uten venting'); }
    // ---- the plan changed while the search was at it ----
    { const pl = plan(); S.plan = pl; boatAt(); const pr = K.styrPlan(pl, find()); pl.wps.push(Object.assign(km(1500, 300), {port:null, fish:0})); t.eq(await pr, false, 'en plan som ble endret mens søket gikk, røres ikke'); t.ok(!pl.b2 && !pl.b2w && pl.wps.length === 5, 'den er som spilleren gjorde den'); }
    { const pl = plan(); S.plan = pl; boatAt(); const pr = K.styrPlan(pl, find()); S.plan = null; t.eq(await pr, false, 'og en plan som ble forkastet, heller ikke'); t.ok(!pl.b2, 'ingen bane lagt i den'); }
    // ---- the wait ends by itself ----
    { const pl = plan(); S.plan = pl; pl.b2w = {id:STYR.job, t:S.t}; t.ok(K.styrWait(pl), 'hun venter på søket denne siden startet');
      S.t += STYR.hold + 1; t.ok(!K.styrWait(pl) && !pl.b2w, 'men ikke lenger enn ' + STYR.hold + ' spillminutter: da seiler hun som før');
      pl.b2w = {id:STYR.job + 7, t:S.t}; t.ok(!K.styrWait(pl) && !pl.b2w, 'og en plan lagret mens den ventet (ingen søker for den etter lasting), venter ikke'); }
    // ---- one way found again from where she is ----
    { const pl = plan(); S.plan = pl; boatAt(); await K.styrPlan(pl, find()); const g = K.baneLeg(pl), n1 = pl.b2.legs.find(q => q !== g).n; S.boat.pos = km(40, 80);
      t.eq(await K.styrLeg(pl, g, find()), true, 'veien hun er på, søkes igjen fra der hun er'); const g2 = K.baneLeg(pl);
      t.ok(g2 && g2 !== g && Math.abs(g2.q[0][0] - (far.x + 40)) < 0.01 && Math.abs(g2.q[0][1] - (far.z + 80)) < 0.01, 'den nye banen starter der hun er', g2 && g2.q[0]);
      t.ok(pl.b2.legs.length === 2 && pl.b2.legs.some(q => q !== g2 && q.n === n1) && K.baneOf(pl.b2.legs.find(q => q !== g2)), 'og den andre veien står', pl.b2.legs.map(q => [q.i0, q.n])); }
    // ---- the watch: a vessel she must keep clear of slows her on the bane, the look-out's stop holds her ----
    { const pl = plan(); S.plan = pl; boatAt(); await K.styrPlan(pl, find()); const SJV = K.get('SJV'), d = {u:3, v:0, r:0, psi:0, X:far.x, Y:far.z}, own0 = SJV.own;
      K.set('sjvFresh', () => {}); K.set('sjvCapV', () => 1e9);
      SJV.own = null; let o = K.styrWatch(pl, S.boat, d); t.ok(!o.hold && o.v > 1e8, 'ingen å vike for: banens egen fart', o);
      SJV.own = {t1:null, harb:false}; o = K.styrWatch(pl, S.boat, d); t.ok(!o.hold && Math.abs(o.v - 0.4 * 8 * 0.514444) < 0.01, 'viker hun for et fartøy, slakker hun til 40 % på banen (hun forlater den ikke)', o);
      SJV.own = {t1:null, harb:true, stop:false}; o = K.styrWatch(pl, S.boat, d); t.ok(!o.hold && o.v === 1, 'i havn 1 m/s', o);
      SJV.own = {t1:null, harb:true, stop:true}; o = K.styrWatch(pl, S.boat, d); t.ok(o.hold, 'og hun ligger stille der utkikken sier stopp', o);
      // the tick obeys: held she stays, slowed she is no faster than told
      const d2 = {u:0, v:0, r:0, psi:0, X:far.x, Y:far.z}; K.baneTick(pl, S.boat, d2, 10, {hold:true}); t.ok(Math.hypot(d2.X - far.x, d2.Y - far.z) < 0.01 && pl.b2.s === 0, 'holdt ligger hun der hun var');
      for (let k = 0; k < 60; k++) K.baneTick(pl, S.boat, d2, 1, {hold:false, v:1}); t.ok(pl.b2.s > 30 && pl.b2.s <= 60.01, 'med 1 m/s som tak har hun gått høyst 60 m på ett minutt', pl.b2.s);
      SJV.own = own0; }
  } finally { FARB.w = null; PLAN.on = null; }
}
