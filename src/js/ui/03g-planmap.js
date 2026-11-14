// ===== The operations plan on the chart plotter (Driftsplan 3, DP3-3, 16.11.2026, docs/planer/driftsplan-3.md): «Velg sted i kartet» on
// the Sted row opens the plotter with a bar over the chart; a tap in the sea sets the plan's ring (its size fixed per gear, Jonas 16.11.2026:
// «Fast per redskap»), another tap moves it, and a ring without room for the gear is refused with the reason (PLAN2UI.ringPut, plan3RingWhy).
// The ring is drawn whenever the plotter shows the plan's vessel, with the fields where the search put them (q.at, the strings q.st to the
// end) once the plan is made, and its home and plant. The state lives here, not on the page, so a redraw of the page cannot cut it short.
// Hooked into 03-map.js: tap, grab, drag and renderDyn. (Driftsplan 2's pins, cards and drags were taken out with this step.)
const PLANMAP = (() => {
  const L = (no, en) => S.lang === 'no' ? no : en;
  let on = false, vid = null, busy = false, msg = null;
  const bar = document.createElement('div'); bar.id = 'pmBar'; bar.hidden = true;
  $('aisCard').after(bar);
  const ops = () => { const o = typeof plan2Ops === 'function' ? plan2Ops() : null; return o && o.v === DRV3 && vid === S.cur ? o : null; };
  const mine = () => { const o = typeof plan2Ops === 'function' ? plan2Ops() : null; return o && o.v === DRV3 ? o : null; };
  const spot = q => q.at || q;
  // the chart round the ring (and home, when it is chosen), or round the boat when there is no ring yet
  function fit(o){
    const pts = [], c = o.ring; if (c){ pts.push({x:c.x - c.r, y:c.y - c.r}, {x:c.x + c.r, y:c.y + c.r}); } else pts.push(S.boat.pos);
    const hp = o.home && o.places.length ? portById(o.home) : null; if (hp) pts.push(hp.p);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    view.cx = (x0 + x1) / 2; view.cy = (y0 + y1) / 2;
    const span = Math.max(x1 - x0, y1 - y0) * 1.5 + 4; view.z = clamp(view.z * PLOT_KM / Math.max(PLOT_KM, span), ZMIN, ZMAX);
    applyView(); scheduleStatic();
  }
  function open(){
    const o = mine(); if (!o) return false;
    vid = S.cur; on = true; msg = null; document.body.classList.add('pm');   // (body.pm hides the HUD under the bar)
    if (typeof PHONE !== 'undefined' && PHONE.show) PHONE.show(false); if (typeof DOCK !== 'undefined' && DOCK.close) DOCK.close();
    openPlotter(); fit(o); render(); renderDyn(); return true;
  }
  // «Ferdig»: back to the page (D4: your own plan is in Om bord, whatever boat a page chose last: 'drift:own')
  function close(){ if (!on) return; on = false; msg = null; bar.hidden = true; document.body.classList.remove('pm'); if (typeof save === 'function') save(); renderDyn(); scheduleStatic(); if (typeof DOCK !== 'undefined' && DOCK.open) DOCK.open(vid === S.cur ? 'drift:own' : 'drift'); else if (typeof PHONE !== 'undefined' && PHONE.open) PHONE.open('drift'); }
  // a catch mark under a field's pin or the ring's middle hides its label (03-map.js, GUI review P2)
  const covers = (p, r) => { const o = mine(); if (!o || !o.ring) return false; return dist(o.ring, p) < r || o.places.some(q => dist(spot(q), p) < r); };
  function render(){
    const o = ops(); if (!on || !o){ bar.hidden = true; return; }
    bar.hidden = false;
    const d = fmt(DRP3.ring[plan3GearKey(o.rig)], 1), where = o.ring ? L('Ringen ligger ' + PLAN2UI.ringName(o.ring) + '. Trykk et annet sted for å flytte den.', 'The ring lies ' + PLAN2UI.ringName(o.ring) + '. Tap elsewhere to move it.') : L('Trykk i sjøen der båten skal fiske.', 'Tap the sea where the boat is to fish.');
    bar.innerHTML = '<div class="pm-h"><b>' + L('Driftsplan: stedet for «', 'Operations plan: the place for «') + S.boatName + '»</b><button type="button" data-pm="done">' + L('Ferdig', 'Done') + '</button></div>' +
      '<div class="pm-t"><span class="pm-hint">' + (busy ? L('Sjekker ringen …', 'Checking the ring …') : where) + ' ' + L('Ringen er ' + d + ' nm over for ' + plan3GearWord(o.rig)[0] + '.', 'The ring is ' + d + ' nm across for ' + plan3GearWord(o.rig)[1] + '.') + '</span></div>' +
      (msg ? '<div class="pm-day pm-why">' + msg + '</div>' : '');
  }
  bar.addEventListener('click', e => { const b = e.target.closest('[data-pm]'); if (b && !b.disabled && b.dataset.pm === 'done') close(); });
  // ---- the chart: a tap sets or moves the ring (03-map.js pointer handlers); nothing is dragged
  function tap(mp){
    const o = ops(); if (!on || !o) return false; if (busy) return true;
    busy = true; msg = null; render();
    PLAN2UI.ringPut(o, mp, why => { busy = false; msg = why || null; if (why) toast(why); render(); renderDyn(); scheduleStatic(); if (typeof PLAN2UI !== 'undefined' && PLAN2UI.rerender) PLAN2UI.rerender(); });
    return true;
  }
  const grab = () => null, dragMove = () => {}, dragEnd = () => {}, dragCancel = () => {};
  // the plan on the chart: the ring, and once it is made the fields where the search put them with their strings, home and the plant
  function svg(u){
    const o = mine(); if (!o || !o.ring) return '';
    if (!on && !o.on && !o.places.length) return '';   // (a ring not yet used is drawn only while it is chosen)
    const g = [], c = o.ring, n = (x, k) => x.toFixed(k || 3);
    g.push('<circle cx="' + n(c.x) + '" cy="' + n(c.y) + '" r="' + n(c.r) + '" fill="#ffd95e" fill-opacity=".08" stroke="#ffd95e" stroke-width="' + n(2.5 * u) + '" stroke-dasharray="' + n(8 * u) + ' ' + n(6 * u) + '" class="pm-ring"/>');
    g.push('<path d="M' + n(c.x - 6 * u) + ' ' + n(c.y) + 'h' + n(12 * u) + 'M' + n(c.x) + ' ' + n(c.y - 6 * u) + 'v' + n(12 * u) + '" stroke="#ffd95e" stroke-width="' + n(2 * u) + '"/>');
    g.push(txt({x:c.x - 30 * u, y:c.y + c.r + 16 * u}, L('Driftsplan', 'Plan') + ' · ' + fmt(DRP3.ring[plan3GearKey(o.rig)], 1) + ' nm', 'wpn', 12 * u, 'stroke-width="' + (3 * u) + '"'));
    // (the label up to the right, or every second field's down to the left, so two fields close together do not write over each other)
    const pin = (p, s, col, left) => { g.push('<circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="' + n(6.5 * u) + '" fill="' + col + '" stroke="#fff" stroke-width="' + n(2 * u) + '"/>'); g.push(txt(left ? {x:p.x - 9 * u, y:p.y + 18 * u} : {x:p.x + 9 * u, y:p.y - 7 * u}, s, 'wpn', 12 * u, 'stroke-width="' + (3 * u) + '"' + (left ? ' text-anchor="end"' : ''))); };
    if (o.places.length){ const fi = {felt:0, juks:0};
      // (the snow crab vessel's strings, side by side round the spot, 06i-plan2-sno.js p2SnoLenke)
      if (p2Sno(o)) for (const q of o.places) if (q.k === 'felt') for (let k = 0; k < q.n; k++){ const L2 = p2SnoLenke(q, k); g.push('<line x1="' + n(L2.a.x) + '" y1="' + n(L2.a.y) + '" x2="' + n(L2.b.x) + '" y2="' + n(L2.b.y) + '" stroke="#d9822b" stroke-width="' + n(2 * u) + '" stroke-linecap="round" class="pm-string"/>'); }
      for (const q of o.places) if (q.st && q.at){ const e = {x:2 * q.at.x - q.st.x, y:2 * q.at.y - q.st.y}; g.push('<line x1="' + n(q.st.x) + '" y1="' + n(q.st.y) + '" x2="' + n(e.x) + '" y2="' + n(e.y) + '" stroke="#d9822b" stroke-width="' + n(3 * u) + '" stroke-linecap="round" class="pm-string"/>'); }
      for (const q of o.places){ fi[q.k]++; pin(spot(q), q.k === 'felt' ? L('Felt ', 'Field ') + fi[q.k] : L('Juksplass ', 'Jig place ') + fi[q.k], q.k === 'felt' ? '#d9822b' : '#b05ad6', fi[q.k] % 2 === 0); }
      const hp = portById(o.home), mp = o.M ? portById(o.M) : null; if (hp && on) pin(o.homeA || hp.p, L('Hjem', 'Home'), '#29a36a'); if (mp && on && mp.id !== o.home) pin(mp.p, mp.name, '#2f7fd0'); }
    return '<g class="pm">' + g.join('') + '</g>';
  }
  return {open, close, tap, grab, dragMove, dragEnd, dragCancel, svg, render, covers, isOn:() => on, busy:() => busy};
})();
