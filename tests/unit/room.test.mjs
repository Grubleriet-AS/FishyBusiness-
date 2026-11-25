// Handlingsrommet (steg 149, K1 of docs/planer/regler-i-klartekst.md; core/03l-room.js): the stage from what a save already holds, the
// meters against landConf, what a purchase changes against the functions the purchase itself uses, a text for every reason a purchase or
// a move can give, and the words. The layer only reads: the save is the same before and after every call.
export default function (t){
  const K = t.K, {newState, ensureFleet, newVesselObj, vget, curVessel, withVessel, access, quotaState, freshQuota, codLimitNow, codLimits, licQ, sellerCod, landConf, yearH, HJ, VESSELS, BYCATCH,
    LIC_OFFERS, PORTS, portServices, EPOCH, rmStage, rmMeters, rmNow, rmBuy, rmWhy, rmTerm, rmTermL, rmOpenLimit, RM, RM_TERMS, RM_WHY, kmApply, licStart, openUsedSave, openVesselId, deal, mbBuyWhy, kmBuyWhy, h2} = K;
  const at = (y, m, d) => (Date.UTC(y, m - 1, d) - EPOCH) / 36e5;
  const mk = (H) => { const S = newState(); K.set('S', S); ensureFleet(); K.applyVessel(); S.me = S.cur; S.cash = 5e7; S.boat.status = 'port'; S.tripOwner = true; if (H != null) S.t = Math.round(H * 60); return S; };
  const port = PORTS.find(p => portServices(p).verft).id;
  const fish = (sp, kg) => ({sp, kg, fresh:90, bled:true, iced:true, cls:1, hook:true});
  // (the lazy tables the core fills when first asked are not a change: this year's empty quota object, the open group's season worked out
  // to today, the Greenland halibut's year)
  const LAZY = ['quota', 'bkq', 'qy', 'qyY', 'licFree'];   // (licFree: kmFreeList makes the empty list when first read)
  const same = fn => { const a = JSON.parse(JSON.stringify(K.get('S'))); const r = fn(), b = JSON.parse(JSON.stringify(K.get('S')));
    const ch = [...new Set(Object.keys(a).concat(Object.keys(b)))].filter(k => !LAZY.includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    t.eq(ch, [], 'laget endrer ikke lagringen'); return r; };

  // ---- the stage
  let S = mk();
  t.eq(rmStage(), 1, 'trinn 1: ny lagring, én båt under 11 m');
  S.fm = {n:10, last:-1, kr:2e5, b:true}; t.eq(rmStage(), 2, 'trinn 2: blad B');
  S.lic = {id:'u7', hl:HJ.u7.hl, since:2026}; t.eq(rmStage(), 3, 'trinn 3: en hjemmel i rederiet');
  S.lic = null; S.company = 'Havbris Fiskeri'; t.eq(rmStage(), 3, 'trinn 3 står når hjemmelen er solgt (rederiet finnes)');
  S.owned = ['trebat', 'kyst15']; t.eq(rmStage(), 4, 'trinn 4: har eid en kystbåt');
  S.owned = ['trebat']; newVesselObj('snekke', port, {id:'h7', hl:HJ.h7.hl, since:2026}); t.eq(rmStage(), 4, 'trinn 4: flere båter');
  S.owned = ['trebat', 'autoliner']; t.eq(rmStage(), 5, 'trinn 5: har eid en havbåt');
  S = mk(); S.lic = {id:'h14', hl:HJ.h14.hl, since:2026, st:[{id:'h14', kf:4.7, from:2026, until:2046}]}; t.eq(rmStage(), 4, 'trinn 4: strukturkvote');

  // ---- the meters: the open group in March (no fresh-fish allowance)
  const H3 = at(2027, 3, 10);
  S = mk(H3); const lim = codLimitNow(H3);
  let M = same(() => rmMeters(H3));
  t.ok(M.length === 1 && M[0].sp === 'torsk' && M[0].kind === 'open' && M[0].state === 'ok' && M[0].limit === lim && M[0].left === lim, 'åpen gruppe, tom båt: én måler, torsk, hele kvoten igjen');
  quotaState().torsk = lim * 0.5; S.hold = [fish('torsk', lim * 0.35)];
  M = rmMeters(H3); t.eq([M[0].state, Math.round(M[0].aboard), Math.round(M[0].conf)], ['near', Math.round(lim * 0.35), 0], '85 % med det som er om bord: gul, ingenting inndras');
  S.hold = [fish('torsk', lim * 0.7)]; M = rmMeters(H3);
  t.eq(M[0].state, 'full', 'om bord får ikke plass: rød'); t.near(M[0].conf, lim * 0.2, 1, 'og måleren sier hva som inndras: det som er over');
  t.near(M[0].conf, landConf(H3, quotaState(), access()).codConf, 0.01, 'det samme som landConf');
  // the same in October, with the fresh-fish allowance running: the meter is red, and conf is landConf's (less than the plain overshoot)
  const H10 = at(2027, 10, 20); S = mk(H10); const l10 = codLimitNow(H10); quotaState().torsk = l10; S.hold = [fish('torsk', 300), fish('sei', 700)];
  M = rmMeters(H10); const C10 = landConf(H10, quotaState(), access());
  t.ok(M[0].state === 'full' && M[0].ff > 0, 'oktober, kvoten full: rød, og ferskfiskordningen løper (' + M[0].ff + ')');
  t.near(M[0].conf, C10.codConf, 0.01, 'inndragningen er landConf sin, med ferskfisktillegget'); t.ok(M[0].conf < 300, 'ferskfisktillegget tar noe av torsken (' + Math.round(M[0].conf) + ' av 300 kg inndras)');
  // no access: a boat of 14.99 m without a right
  S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); S.hold = [fish('torsk', 800), fish('sei', 200)];
  M = rmMeters(H3); t.ok(M[0].kind === 'by' && M[0].state === 'none' && M[0].limit === BYCATCH.cod, 'uten adgang: bifangsttaket på 2 t, ikke en kvote');
  t.near(M[0].conf, 800 * landConf(H3, quotaState(), 'none').confBy.torsk, 0.01, 'og det som inndras over 10 %'); t.ok(M[0].conf > 600, 'det meste av torsken inndras (' + Math.round(M[0].conf) + ' kg)');
  // the closed group: cod on the vessel quota, haddock and saithe on their maximum quotas where they have one
  S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); S.lic = {id:'h14', hl:HJ.h14.hl, since:2026}; freshQuota(); const LQ = licQ(S.lic, H3);
  quotaState().hyse = LQ.hyse[0]; S.hold = [fish('torsk', 1000), fish('hyse', 2000)];
  M = rmMeters(H3); const mh = M.find(x => x.sp === 'hyse'), mc = M.find(x => x.sp === 'torsk');
  t.ok(mc.kind === 'vessel' && mc.limit === LQ.torsk && mc.state === 'ok', 'lukket gruppe: torsk på fartøykvoten');
  t.ok(mh && mh.kind === 'max' && mh.state === 'full' && mh.conf > 0, 'hyse over maksimalkvoten: rød, og noe inndras (' + (mh && Math.round(mh.conf)) + ' kg)');
  t.ok(M.some(x => x.sp === 'sei' && x.kind === 'max' && x.state === 'ok'), 'sei har sin egen måler');
  // a vessel whose permit has no cod gets no cod row, and the status line does not call a quota full
  S = mk(H3); S.boat.type = 'snokrabbe'; K.applyVessel(); S.lic = {id:'krab', hav:true, kf:1, since:2026}; freshQuota();
  M = rmMeters(H3); t.ok(!M.some(x => x.sp === 'torsk') && M.some(x => x.sp === 'snokrabbe' && x.kind === 'vessel'), 'snøkrabbefartøyet: ingen torskemåler, snøkrabben på fartøykvoten');
  t.ok(!rmNow(H3).items.some(i => i.k === 'rmfull'), 'og Regler-linja sier ikke at torskekvoten er full');
  // the open-group boat out without her owner: bycatch only, and the reason is the owner, not the quota
  S = mk(H3); S.tripOwner = false; M = rmMeters(H3); t.eq([M[0].kind, M[0].why, rmNow(H3).items.some(i => i.k === 'rmowner')], ['by', 'owner', true], 'åpen gruppe uten eieren om bord: bifangst, og grunnen er eieren');
  S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); quotaState().byCod = BYCATCH.cod; t.eq(rmMeters(H3)[0].state, 'full', 'bifangsttaket på 2 t brukt: rød');
  // the fresh-fish allowance takes the cod: the meter is red, but the status line does not say «full» while nothing would be confiscated
  S = mk(H10); quotaState().torsk = codLimitNow(H10); S.hold = [fish('torsk', 50), fish('sei', 2000)]; M = rmMeters(H10);
  t.ok(M[0].state === 'full' && M[0].conf < 0.5 && !rmNow(H10).items.some(i => i.k === 'rmfull'), 'oktober, torsken går på ferskfisktillegget: ingen «full» på Regler-linja');
  S.hold = [fish('torsk', 3000)]; t.ok(rmNow(H10).items.some(i => i.k === 'rmfull'), 'men med torsk utover tillegget sier den det');
  // the North Sea cap when another of the company's boats holds the open-group place there: nothing left for this one
  S = mk(H3); { const o = newVesselObj('snekke', port); o.quota = {y:yearH(H3), torsk:0, hyse:0, sei:0, nsjo:500}; S.boat.byc = {nsjo:{cod:100}}; const r = rmMeters(H3).find(x => x.kind === 'nsjo'); t.eq([r.left, r.state], [0, 'none'], 'Nordsjøen: en annen av båtene har plassen, så ingenting er igjen her'); }
  // drawn holds: the sum of what the meters say is confiscated is landConf's, in each group
  let n = 0, bad = 0;
  for (let i = 0; i < 60; i++){ const u = k => h2(i * 7 + k, 4100 + k), H = [H3, H10, at(2027, 6, 5)][i % 3], g = i % 4;
    S = mk(H); if (g === 1){ S.boat.type = 'kyst15'; K.applyVessel(); } if (g === 2){ S.boat.type = 'sjark'; K.applyVessel(); S.lic = {id:'h9', hl:HJ.h9.hl, since:2026}; freshQuota(); } if (g === 3){ S.boat.type = 'kyst15'; K.applyVessel(); S.lic = {id:'h14', hl:HJ.h14.hl, since:2026}; freshQuota(); }
    const q = quotaState(), cl = codLimits(H).max; q.torsk = isFinite(cl) ? cl * u(1) * 1.1 : 0; if (S.lic){ const L2 = licQ(S.lic, H); for (const sp of ['hyse', 'sei']) if (isFinite(L2[sp][0])) q[sp] = L2[sp][0] * u(sp === 'hyse' ? 2 : 3) * 1.1; }
    S.hold = [fish('torsk', 50 + 3000 * u(4)), fish('hyse', 2000 * u(5)), fish('sei', 2000 * u(6)), fish('lange', 500 * u(7))];
    const C = landConf(H, q, access()), want = ['torsk', 'hyse', 'sei'].reduce((a, sp) => a + (C.confBy[sp] || 0) * S.hold.find(x => x.sp === sp).kg, 0);
    const Mi = rmMeters(H), seen = new Set(), got = Mi.reduce((a, r) => seen.has(r.sp) ? a : (seen.add(r.sp), a + r.conf), 0);
    // (haddock and saithe have a meter only where they have a maximum quota; where they are confiscated without one, the cod row's group says why)
    const extra = ['hyse', 'sei'].filter(sp => !seen.has(sp)).reduce((a, sp) => a + (C.confBy[sp] || 0) * S.hold.find(x => x.sp === sp).kg, 0);
    n++; if (Math.abs(got + extra - want) > 0.5) bad++; }
  t.eq([n, bad], [60, 0], 'trukne laster i de fire gruppene og tre årstider: målernes inndragning er landConf sin');

  // ---- the warnings at sea (steg 150): 80 % once a year, full once a game day, also while the fresh-fish scheme runs
  { const rmWarn = K.rmWarn; S = mk(H3); const L3 = codLimitNow(H3);
    t.eq(rmWarn(H3), [], 'tom båt, ingenting fisket: ingen varsler');
    quotaState().torsk = L3 * 0.5; S.hold = [fish('torsk', L3 * 0.35)]; let w = rmWarn(H3);
    t.ok(w.length === 1 && w[0].sp === 'torsk' && w[0].lvl === 1 && /igjen av/.test(w[0].t[0]), '85 % med det som er om bord: ett varsel («' + (w[0] && w[0].t[0]) + '»)');
    t.eq(rmWarn(H3 + 30), [], 'og ikke en gang til dagen etter');
    S.hold = [fish('torsk', L3 * 0.7)]; w = rmWarn(H3 + 30); t.ok(w.length === 1 && w[0].lvl === 2 && /bare 20 %/.test(w[0].t[0]) && /inndratt/.test(w[0].t[0]), 'over kvoten: «' + (w[0] && w[0].t[0]) + '»');
    t.eq(rmWarn(H3 + 31), [], 'ikke igjen samme døgn'); t.eq(rmWarn(H3 + 60).length, 1, 'men igjen neste døgn');
    t.ok(typeof S.codWarn === 'object' && S.codWarn.y === yearH(H3), 'tilstanden står i båtens S.codWarn');
    // October, the quota full, the fresh-fish scheme running: the old line never came then
    S = mk(H10); S.codWarn = 123456; quotaState().torsk = codLimitNow(H10); S.hold = [fish('torsk', 50), fish('sei', 2000)]; w = rmWarn(H10);
    t.ok(w.length === 1 && w[0].lvl === 1, 'oktober, torsken går på ferskfisktillegget: bare «nærmer seg», ikke «full» (og en gammel lagrings tall i S.codWarn tåles)');
    S.hold = [fish('torsk', 3000)]; w = rmWarn(H10); t.ok(w.length === 1 && w[0].lvl === 2 && /kg torsk om bord/.test(w[0].t[0]), 'oktober, torsk utover tillegget: varselet kommer («' + (w[0] && w[0].t[0]) + '»)');
    // the closed group's haddock over its maximum quota
    S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); S.lic = {id:'h14', hl:HJ.h14.hl, since:2026}; freshQuota(); quotaState().hyse = licQ(S.lic, H3).hyse[0]; S.hold = [fish('torsk', 1000), fish('hyse', 2000)];
    w = rmWarn(H3); t.ok(w.some(x => x.sp === 'hyse' && x.lvl === 2 && /Hysekvoten/.test(x.t[0])), 'hyse over maksimalkvoten i lukket gruppe varsles');
    // no access: no quota of hers, so no quota warning (the status line says «bare bifangst»)
    S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); S.hold = [fish('torsk', 800)]; t.eq(rmWarn(H3), [], 'uten adgang: ingen kvotevarsler'); }
  // the cod row kept for the minute is the meters' own
  S = mk(H3); quotaState().torsk = 1000; t.eq(K.rmCod().used, 1000, 'rmCod er torskeraden'); quotaState().torsk = 2000; t.eq(K.rmCod().used, 2000, 'og følger landingene');

  // ---- the rules with the group on top
  S = mk(H3); S.boat.type = 'kyst15'; K.applyVessel(); let N = same(() => rmNow(H3));
  t.ok(N.v !== 'ok' && N.items.some(i => i.k === 'rmacc') && N.top, 'uten adgang er ikke svaret «✓»: «' + (N.top && N.top.no) + '»');
  S = mk(H3); quotaState().torsk = codLimitNow(H3); N = rmNow(H3); t.ok(N.items.some(i => i.k === 'rmfull') && N.v !== 'ok', 'full torskekvote: «' + (N.top && N.top.no) + '»');
  S = mk(H3); N = rmNow(H3); t.ok(!N.items.some(i => i.k === 'rmacc' || i.k === 'rmfull'), 'åpen gruppe med kvote igjen: ingenting lagt på');

  // ---- what a purchase changes, against the functions the purchase uses
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; quotaState().torsk = 1200;
  const O = LIC_OFFERS.find(o => o.k === 'u7');
  let B = same(() => rmBuy({kind:'lic', id:O.id, type:O.ves, ti:true}, H3));
  t.eq([B.now.acc, B.now.used, B.now.limit], ['open', 1200, codLimitNow(H3)], 'kjøp med innbytte: nå åpen gruppe med det som er fisket');
  t.eq([B.after.acc, B.after.limit], ['lukket', licQ({id:'u7'}, H3, VESSELS[O.ves].len).torsk], 'etter: lukket gruppe med fartøykvoten');
  t.eq(B.seller, Math.round(B.after.limit * sellerCod('u7', H3)), 'selgerens del av årets kvote står før kjøpet'); t.ok(B.seller > 0 && B.after.left === B.after.limit - B.seller, 'og er trukket fra det som er igjen');
  t.eq(B.loses, null, 'båten som byttes inn, mister ingenting');
  // …and the purchase itself gives the same (licStart, as buylic does)
  { const sd = S.qseed, S2 = mk(H3); S2.qseed = sd; S2.fm = S.fm; S2.lic = {id:'u7', hl:HJ.u7.hl, since:2027}; const fished = licStart(S2.lic); t.eq([fished, licQ(S2.lic, H3).torsk], [B.seller, B.after.limit], 'licStart gir de samme tallene som kortet lover'); }
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true};
  B = rmBuy({kind:'lic', id:'h7', type:'snekke', ti:false}, H3); t.eq([B.now, B.loses], [null, S.cur], 'til flåten: startbåten mister plassen i åpen gruppe');
  B = rmBuy({kind:'hull', type:'kyst15', ti:true}, H3); t.eq([B.after.acc, B.after.limit], ['none', BYCATCH.cod], 'kystbåten uten hjemmel i bytte: ingen adgang, bare bifangsttaket');
  B = rmBuy({kind:'hull', type:'kyst15', ti:false}, H3); t.eq([B.after.acc, B.loses], ['none', null], 'kystbåten uten hjemmel til flåten: ingen adgang, startbåten beholder sin');
  B = rmBuy({kind:'hull', type:'skiff', ti:false}, H3); t.eq([B.after, B.why], [null, 'open'], 'en båt til under 11 m uten hjemmel i rederiet: ikke lov');
  quotaState().torsk = 900; B = rmBuy({kind:'hull', type:'plastsjark', ti:true}, H3);
  t.eq([B.after.acc, B.after.used, B.after.limit], ['open', 900, rmOpenLimit(VESSELS.plastsjark.len, H3)], 'bytte opp i åpen gruppe: det som er fisket, følger eieren, og taket er lengdegruppas');
  t.near(rmOpenLimit(S.boat && K.get('BOAT').len, H3), codLimitNow(H3), 0.5, 'rmOpenLimit for båten selv er codLimitNow');
  // from the closed group back: the right follows the old boat, the open-group cod kept by the owner comes back (§ 29)
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; const q0 = freshQuota(); q0.torsk = 1500; openUsedSave(q0); S.lic = {id:'u7', hl:HJ.u7.hl, since:2026}; freshQuota();
  B = rmBuy({kind:'hull', type:'snekke', ti:true}, H3); t.eq([B.now.acc, B.after.acc, B.after.used, B.lost], ['lukket', 'open', 1500, true], 'fra lukket til åpen: hjemmelen følger innbyttebåten, og årets torsk i åpen gruppe er med');
  B = rmBuy({kind:'hull', type:'snekke', ti:true, keep:true}, H3); t.eq(B.lost, false, 'med «behold som ledig hjemmel» er den ikke tapt');
  // a right put on a boat (the quota market), with what the seller landed on it this year
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; const v2 = newVesselObj('kyst15', port), y = yearH(H3);
  B = rmBuy({kind:'right', id:'h14', used:{torsk:7000, hyse:0, sei:0}, y, v:v2}, H3);
  t.eq([B.now.acc, B.after.acc, B.after.used, B.loses], ['none', 'lukket', 7000, S.cur], '«Sett på»: fra ingen adgang til lukket gruppe, med selgerens fangst, og startbåten mister åpen gruppe');
  { const lim2 = B.after.limit; kmApply({kind:'right', id:'h14', flen:14.9, st:[], used:{torsk:7000, hyse:0, sei:0}, y}, {v:v2, how:'put'}, H3);
    t.eq([withVessel(v2, () => access()), vget(v2, 'quota').torsk, withVessel(v2, () => codLimitNow(H3)), openVesselId()], ['lukket', 7000, lim2, null], 'kmApply gir det kortet lovet'); }
  // a right with a structure quota put on a boat: the whole quota, as kmApply gives it
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; { const v3 = newVesselObj('kyst15', port), st = [{id:'h14', kf:4.7, from:2026, until:2046}];
    B = rmBuy({kind:'right', id:'h14', st, used:{torsk:0, hyse:0, sei:0}, y, v:v3}, H3); kmApply({kind:'right', id:'h14', flen:14.9, st, used:{torsk:0, hyse:0, sei:0}, y}, {v:v3, how:'put'}, H3);
    t.eq(B.after.limit, withVessel(v3, () => codLimitNow(H3)), 'hjemmel med strukturkvote: taket er hele kvoten, som kmApply gir'); t.ok(B.after.limit > licQ({id:'h14'}, H3, 14.99).torsk * 1.5, 'og større enn hjemmelen alene'); }
  // two boats under 11 m without a right: the first in the fleet is the open-group boat, so the second traded for another small boat has no access
  S = mk(H3); { const v4 = newVesselObj('snekke', port); K.bindVessel(v4); B = rmBuy({kind:'hull', type:'plastsjark', ti:true}, H3);
    t.eq([openVesselId() !== v4.id, B.now.acc, B.after.acc], [true, 'none', 'none'], 'to småbåter uten hjemmel: den som ikke er åpen gruppe-båten, er det ikke etter innbytte heller'); }
  // the right kept as a free right at the trade-in: what was landed on it this year goes with the owner into the open group (mbMove)
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; S.lic = {id:'u7', hl:HJ.u7.hl, since:2026}; freshQuota().torsk = 3000;
  B = rmBuy({kind:'hull', type:'snekke', ti:true, keep:true}, H3);
  { const r = K.mbMove({v:curVessel()}, {free:true}); t.ok(r && r.ok, 'mbMove: hjemmelen er ledig'); t.eq([B.after.acc, B.after.used], [access(), quotaState().torsk], 'beholdt hjemmel: årets fangst på den følger eieren til åpen gruppe, som mbMove gjør (' + B.after.used + ' kg)'); }
  // nothing is bound while it reads: another boat's sheet leaves the bound boat as she was
  S = mk(H3); { const v5 = newVesselObj('kyst15', port), a = JSON.stringify(S); rmBuy({kind:'right', id:'h14', used:null, y, v:v5}, H3); t.ok(JSON.stringify(S) === a, 'rmBuy for en annen båt binder ingen båt og endrer ingenting'); }
  // the broker: a boat with a right for the fleet
  S = mk(H3); S.fm = {n:10, last:-1, kr:2e5, b:true}; B = rmBuy({kind:'boat', type:'sjark', lic:{id:'h9'}}, H3);
  t.eq([B.after.acc, B.loses, B.seller], ['lukket', S.cur, 0], 'megleren, båt med hjemmel uten kvoteobjekt: lukket gruppe, ingenting fisket på den, og startbåten mister åpen gruppe');
  { const lic = {id:'h14', st:[{id:'h14', kf:4.7, from:2026, until:2046}]}; K.licExtra(lic); const pk = {type:'kyst15', lic, quota:{y:yearH(H3), torsk:9000, hyse:0, sei:0}};
    B = rmBuy({kind:'boat', type:pk.type, lic:pk.lic, quota:pk.quota}, H3); const v = K.mbUnpack(pk, port);
    t.eq([B.after.used, B.after.limit], [vget(v, 'quota').torsk, licQ(vget(v, 'lic'), H3, VESSELS.kyst15.len).torsk], 'megleren, båt med hjemmel og strukturkvote: det mbUnpack gir (selgerens fangst og hele kvoten)'); }
  S = mk(H3); B = rmBuy({kind:'boat', type:'skiff', lic:null}, H3); t.eq(B.why, 'open', 'megleren, en småbåt til uten hjemmel: samme grunn som mbBuyWhy');
  t.eq(mbBuyWhy({type:'skiff', vessel:{lic:null}}, null), 'open', '(mbBuyWhy sier «open»)');

  // ---- why: a text in both languages for every word the checks can give
  // the words are read from the functions themselves, so a new one without a sentence turns this red
  const words = f => [...new Set([...String(f).matchAll(/(?:return|\?|:) '([a-z]+)'/g)].map(m => m[1]))];
  const codes = ['notes', 'eq', 'cap', 'cash', 'bladb', 'hold', 'yard', 'order', 'sale', 'open', 'hav.none']
    .concat([K.kmWhy, K.kmPutWhy, K.kmBuyWhy, K.kmStructWhy].flatMap(words).map(k => 'km.' + k))
    .concat([K.mbMoveWhy, K.kmWhy].flatMap(words).map(k => 'mv.' + k))
    .concat([K.mbBuyWhy, K.mbWhy].flatMap(words).map(k => 'mb.' + k));
  t.ok(codes.length > 60 && codes.includes('mv.hold') && codes.includes('km.many') && codes.includes('mb.gear'), 'grunnene er lest fra funksjonene (' + codes.length + ')');
  const miss = codes.filter(c => { const w = rmWhy(c, {n:1, of:10, left:2, need:'42 000 kr', boat:'Havbris', len:11}); return !w || !w.t[0] || !w.t[1] || /\{\w+\}/.test(w.t.join('') + (w.fix || []).join('')); });
  t.eq(miss, [], 'hver grunn har en setning på norsk og engelsk, uten tomme felt');
  // the words the real checks give are in the table
  S = mk(H3); S.sales = [{t:0, total:1}]; { const w0 = rmWhy(deal(5e9, 0).why); t.ok(w0 && /Du har 1\./.test(w0.t[0]) && /2 ganger/.test(w0.fix[0]), 'deal().why uten tre sluttsedler: tallene leses fra landingene (' + (w0 && w0.t[0] + ' ' + w0.fix[0]) + ')'); }
  for (const c of ['eq', 'cap']) t.ok(/'eq'|'cap'/.test(String(deal)) && rmWhy(c), 'deal kan gi «' + c + '», og den finnes');
  t.ok(rmWhy('km.' + kmBuyWhy({kind:'right', id:'h9'}, {v:curVessel(), how:'put'}, null)), 'kmBuyWhy uten blad B finnes i tabellen');
  t.eq(rmWhy('finnes-ikke'), null, 'en ukjent grunn gir null');
  const w = rmWhy('bladb', {n:6, of:10}); t.ok(/6 av 10/.test(w.t[0]) && w.law === 'Deltakerloven § 6' && w.app === 'kvote', 'blad B: tallene fylt inn, loven bak og hvor det står');

  // ---- the words
  t.eq(Object.keys(RM_TERMS).length, 13, 'tretten ord i tabellen');
  t.ok(Object.values(RM_TERMS).every(T => T.no.length === 2 && T.en.length === 2 && T.no.every(Boolean) && T.en.every(Boolean)), 'hvert ord har klartekst og fagord på norsk og engelsk');
  S.lang = 'no'; t.eq([rmTerm('open', true), rmTerm('open')], ['felleskvoten for småbåter (åpen gruppe)', 'felleskvoten for småbåter'], 'første gang med fagordet i parentes, så bare klartekst');
  S.lang = 'en'; t.eq(rmTerm('right', true), 'quota right (participation right)', 'på engelsk');
  t.eq(rmTermL('bladb', true), ['yrkesfisker (blad B)', 'professional fisher (blad B)'], 'begge språk');
  t.ok(RM.near === 0.8, 'gul fra 80 %');
}
