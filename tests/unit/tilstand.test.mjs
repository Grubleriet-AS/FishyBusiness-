// The state around a change of boat and a moved right (steg 148, K0 of docs/planer/regler-i-klartekst.md, T3 and T4): a vessel's id is
// never given twice, a vessel that leaves takes what was kept under her id with her, and a fresh quota keeps the caps that follow the
// owner through the year (the bycatch cap, the caps south of 62° N, the week's fresh-fish figures and the confiscation statistics).
export default function (t){
  const K = t.K, {newState, ensureFleet, newVesselObj, vget, mbDrop, saldoOf, bkState, bkUsed, withVessel, freshQuota, quotaState, kmApply, kmOut, HJ, yearH, PORTS, portServices, VESSELS, TAX} = K;
  const mk = () => { const S = newState(); K.set('S', S); ensureFleet(); S.me = S.cur; S.cash = 5e7; S.boat.status = 'port'; S.fm = {n:0, last:-1, kr:0, b:true}; return S; };
  let S = mk();
  const port = PORTS.find(p => portServices(p).verft).id, H = S.t / 60, y = yearH(H);

  // ---- T3: the highest id sold, and a new boat bought after it
  const a = newVesselObj('sjark', port), b = newVesselObj('snekke', port);
  t.eq([a.id, b.id], ['v2', 'v3'], 'de to første kjøpte båtene er v2 og v3');
  saldoOf(b); S.saldo[b.id] = 12345;                 // her tax value, written down over the years
  bkState(H).v[b.id] = 800;                          // Greenland halibut landed on her this year
  S.mobScan = {[b.id]:S.t};
  S.sales = [{v:b.id, t:S.t, kg:100, total:1000, sp:[['torsk', 100]]}];
  t.ok(mbDrop(b), 'båten med høyest id er solgt');
  const c = newVesselObj('plastsjark', port);
  t.ok(c.id !== b.id, 'en båt kjøpt etter salget får en id ingen båt har hatt (fikk ' + c.id + ')');
  t.eq(saldoOf(c), Math.round(VESSELS.plastsjark.price * TAX.depF), 'den nye båtens saldo er hennes egen pris, ikke den solgtes');
  t.eq(withVessel(c, () => bkUsed(H)), 0, 'den nye båten har ikke landet blåkveite i år');
  t.ok(!(S.sales || []).some(s => s.v === c.id), 'den solgtes landinger er ikke den nye båtens');
  t.ok(S.saldo[b.id] == null && bkState(H).v[b.id] == null && S.mobScan[b.id] == null, 'det som sto på den solgtes id, er ryddet');
  // and once more: the new highest sold, with nothing kept under her id at all
  t.ok(mbDrop(c), 'den nye er solgt igjen');
  const d = newVesselObj('snekke', port);
  t.ok(d.id !== c.id && d.id !== b.id, 'heller ikke uten spor etter den solgte gis id-en på nytt (fikk ' + d.id + ')');
  // an old save without the counter: the ids kept under S.saldo and in the landings are not given again
  S = mk(); S.saldo = {v1:1000, v7:5000}; S.sales = [{v:'v9', t:S.t, kg:1, total:1}];
  t.eq(newVesselObj('sjark', port).id, 'v10', 'en gammel lagring: id-en går over alt som er lagret per id');

  // ---- T4: a right put on a boat and taken off again in the same year
  S = mk();
  const v = K.curVessel(), q0 = quotaState();
  Object.assign(q0, {torsk:1500, byCod:1200, nsjo:900, skag4:400, ffW:7, ffTot:3000, ffCod:500, conf:250, confKr:9000});
  const q1 = freshQuota();
  t.ok(q1 !== q0 && q1.torsk === 0 && q1.hyse === 0 && q1.sei === 0, 'freshQuota gir et nytt kvoteobjekt uten årets torsk, hyse og sei');
  t.eq([q1.byCod, q1.nsjo, q1.skag4], [1200, 900, 400], 'bifangsttaket og takene sør for 62° N står etter freshQuota');
  t.eq([q1.ffW, q1.ffTot, q1.ffCod], [7, 3000, 500], 'ukas ferskfisktall står');
  t.eq([q1.conf, q1.confKr], [250, 9000], 'det som er inndratt i år, står');
  // through the market's own way: the right on, then off
  const item = {kind:'right', id:'h9', flen:9.5, st:[], landY:y, used:{torsk:0, hyse:0, sei:0}, y};
  t.ok(kmApply(item, {v, how:'put'}, H) != null, 'hjemmelen er satt på båten');
  t.ok(kmOut({v, kind:'right'}, H), 'og tatt av igjen');
  const q2 = vget(v, 'quota');
  t.eq([q2.byCod, q2.nsjo, q2.skag4], [1200, 900, 400], 'satt på og tatt av: takene er ikke gitt tilbake');
  // a new year starts them afresh, as before
  S.quota = Object.assign({}, q2, {y:y - 1});
  const q3 = freshQuota();
  t.ok(!q3.byCod && !q3.nsjo && !q3.skag4, 'et kvoteobjekt fra i fjor tar ingenting med');
}
