// The heel from the wind (Jonas 17.11.2026, a boat at the quay in 23 m/s laid over some 30 degrees: «Båtene krenger også enormt mye i
// vinden. Kanskje for mye?» and «Gjelder dette flere båter? Det må fikses»): the house is a third of the length, not all of it, and
// moored the lines take the push at the deck. Every coastal boat stays well under her deck edge in a full gale at sea, and moored she
// lies near upright.
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), D = Math.PI / 180;
  for (const ty of ['trebat', 'snekke', 'sjark', 'hurtigsjark', 'sjarkny', 'kyst15']){
    S.boat.type = ty; K.applyVessel(); const St = K.stabOf(ty), sea = K.windHeel(St, 23), quay = K.windHeel(St, 23, true), mild = K.windHeel(St, 10);
    t.ok(sea < 20 * D && sea < St.deckEdge * 0.7, ty + ': 23 m/s på sjøen gir ' + (sea / D).toFixed(1) + '°, godt under ripa (' + (St.deckEdge / D).toFixed(0) + '°)');
    t.ok(quay <= sea * 0.3 && quay < 5 * D, ty + ': ved kai i 23 m/s ' + (quay / D).toFixed(1) + '°, nesten rett');
    t.ok(mild < 4 * D, ty + ': 10 m/s gir ' + (mild / D).toFixed(1) + '°');
  }
}
