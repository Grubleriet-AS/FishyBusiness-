// The open group's two additions to the cod quota (KV1, steg 148, 25.11.2026; J-161-2026 §§ 22 and 23, read on fiskeridir.no the same
// day; Jonas: «Kystfiskeordningen, Alderstillegget»). § 22: 3.5 tonnes on top of the quota in § 21 for an owner who lives in one of the
// municipalities named (the home harbour, S.home). § 23: 2 tonnes guaranteed for an owner of 30 or younger, which every player counts
// as. § 21 last paragraph still holds: no bycatch of cod beyond the quotas. The coastal scheme has its own set-aside, so the cod landed
// on it is not taken from the open group's quota (codGroupKg).
export default function (t){
  const K = t.K, {newState, ensureFleet, PORTS, codLimits, codLimitNow, codRoom, quotaState, yearQuota, EPOCH} = K;
  t.ok(typeof K.kystOrd === 'function' && typeof K.openAdd === 'function' && typeof K.codGroupKg === 'function', 'kystOrd, openAdd og codGroupKg finnes');
  if (typeof K.kystOrd !== 'function' || typeof K.openAdd !== 'function' || typeof K.codGroupKg !== 'function') return;
  const {kystOrd, openAdd, codGroupKg} = K;
  const Hd = (y, m, d) => (Date.UTC(y, m - 1, d, 12) - EPOCH) / 36e5;
  const mk = home => { const S = newState(); S.home = home; S.qseed = K.get('WORLD_SEED'); K.set('S', S); ensureFleet(); return S; };
  const byName = n => PORTS.filter(p => p.mk && p.name === n)[0];

  // ---- § 22: who is in the scheme. All of Finnmark, the named municipalities in Troms and Nordland, and nobody else
  const IN = ['Båtsfjord', 'Berlevåg', 'Vadsø', 'Kiberg', 'Bugøynes', 'Tana', 'Varangerbotn', 'Mehamn', 'Kjøllefjord', 'Honningsvåg', 'Havøysund', 'Forsøl', 'Hasvik', 'Øksfjord', 'Russenes',
    'Burfjord', 'Skjervøy', 'Sørkjosen', 'Olderdalen', 'Samuelsberg', 'Vannvåg', 'Lødingen'];
  const OUT = ['Botnhamn', 'Senjahopen', 'Tromsdalen', 'Oldervik', 'Krokelvdalen', 'Engenes', 'Andenes', 'Myre', 'Svolvær', 'Henningsvær', 'Stamsund', 'Værøy', 'Leines', 'Smøla vest', 'Egersund'];
  const miss = [...IN, ...OUT].filter(n => !byName(n));
  t.eq(miss.join(', '), '', 'alle stedene i stikkprøven finnes som havner med mottak (' + (IN.length + OUT.length) + ' steder)');
  t.eq(IN.filter(n => byName(n) && !kystOrd(byName(n).id)).join(', '), '', '§ 22: ' + IN.length + ' steder i Finnmark, Nord-Troms og Lødingen er i kystfiskeordningen');
  t.eq(OUT.filter(n => byName(n) && kystOrd(byName(n).id)).join(', '), '', 'og ' + OUT.length + ' utenfor er det ikke (Senja, Tromsø, Ibestad, Vesterålen, Lofoten, Steigen, Nordmøre, Rogaland)');
  t.ok(!kystOrd('vangshamn') && !kystOrd('finnsnes') && !kystOrd('husoy'), 'fars naust i Vangshamn og de gamle Senja-havnene er utenfor (Senja kommune)');
  t.ok(!kystOrd(null) && !kystOrd('finnes-ikke'), 'et hjemsted som ikke finnes, gir ikke tillegget');
  // every home harbour north of 62° N has an answer from its own or the nearest plant's municipality, and the count in the scheme is the
  // register's: no harbour falls in by a missing municipality
  { const homes = PORTS.filter(p => p.mottak), inn = homes.filter(p => kystOrd(p.id));
    t.ok(inn.length >= 40 && inn.length < homes.length / 2, inn.length + ' av ' + homes.length + ' hjemsteder langs kysten er i ordningen');
    t.eq(inn.filter(p => K.natLL(p.p).lat < 68).map(p => p.name).join(', '), '', 'ingen sør for 68° N (Hamarøy er den sørligste kommunen i § 22)'); }

  // ---- the quota: § 21 + § 22 + § 23, before and after the stop, for the three length groups
  const H0 = Hd(2026, 2, 20), O = yearQuota(2026).open;
  t.eq([O.kyst, O.alder].join(' / '), '3.5 / 2', '2026: 3,5 t og 2 t (§§ 22 og 23)');
  // (the maximum quota of § 21 may have been raised on 1 May or 1 June in the save's own year, openMaxAdd: the checks are against § 21 as it stands)
  { mk('vangshamn'); const a = openAdd(H0), l = codLimits(H0), b21 = (O.max[0] + K.openMaxAdd(H0)) * 1000;
    t.eq([a.kyst, a.alder, a.sum].join(' / '), '0 / 2000 / 2000', 'Vangshamn (Senja): bare alderstillegget, 2 t');
    t.eq([l.base.max, l.base.guar].join(' / '), b21 + ' / 3000', '§ 21 står for seg for trebåten (under 8 m): ' + b21 / 1000 + ' t maksimalt og 3,0 t garantert');
    t.eq([l.max - l.base.max, l.guar].join(' / '), '2000 / 5000', 'og kvoten er § 21 + 2 t: 5,0 t garantert'); }
  { const by = byName('Båtsfjord'); mk(by.id); const a = openAdd(H0), l = codLimits(H0), q = quotaState();
    t.eq([a.kyst, a.alder, a.sum].join(' / '), '3500 / 2000 / 5500', 'Båtsfjord: kystfiskeordningen 3,5 t og alderstillegget 2 t');
    t.eq([l.max - l.base.max, l.guar].join(' / '), '5500 / 8500', 'trebåten i Båtsfjord: § 21 + 5,5 t, 8,5 t garantert');
    t.eq(codLimitNow(H0), K.codOpen(H0) ? l.max : l.guar, 'grensen nå er maksimalkvoten med tilleggene før stoppen og den garanterte med dem etter');
    q.torsk = codLimitNow(H0) - a.sum; t.eq(codRoom(H0), 5500, 'en som hadde fylt § 21-kvoten, har 5,5 t å gå på med en gang');
    q.torsk = codLimitNow(H0); t.eq(codRoom(H0), 0, 'og ingenting over: § 21 siste ledd, ingen bifangst ut over kvotene'); }
  // a later year: the additions follow the open group's quota like its other quotas, and never go negative
  { mk('finnsnes'); for (const y of [2027, 2029, 2032]){ const o = yearQuota(y).open, f = o.Q / yearQuota(2026).open.Q;
      t.ok(Math.abs(o.kyst - 3.5 * f) <= 0.051 && Math.abs(o.alder - 2 * f) <= 0.051 && o.alder > 0, y + ': tilleggene følger gruppekvota (' + o.kyst + ' og ' + o.alder + ' t ved ' + f.toFixed(2) + ' ganger 2026)'); } }
  // a vessel with a right in the closed group has neither
  { const S = mk(byName('Båtsfjord').id); S.lic = {id:'h10', hl:'10–10,9 m', kf:K.HJ.h10.kf}; const l = codLimits(H0), c = K.licQ(S.lic, H0).torsk;
    t.eq([l.max, l.guar].join(' / '), c + ' / ' + c, 'lukket gruppe: fartøykvoten alene, ingen tillegg (' + (c / 1000).toFixed(1) + ' t)'); }

  // ---- the letter: once a year, when over half of the quota is landed, with what the quota is made of
  { const S = mk(byName('Båtsfjord').id), q = quotaState(), lim = codLimitNow(S.t / 60), n0 = S.msgs.length;
    q.torsk = 0.4 * lim; K.openAddNews(S.t / 60); t.eq(S.msgs.length, n0, 'under halve kvoten: ikke noe brev');
    q.torsk = 0.6 * lim; K.openAddNews(S.t / 60); const m = S.msgs[S.msgs.length - 1];
    t.ok(S.msgs.length === n0 + 1 && m.from === 'Fiskeridirektoratet' && /kystfiskeordningen/.test(m.no) && /alderstillegg/.test(m.no) && m.no.includes((lim / 1000).toFixed(1).replace('.', ',')), 'over halve: ett brev fra Fiskeridirektoratet med kystfiskeordningen, alderstillegget og kvoten (' + (lim / 1000).toFixed(1) + ' t)');
    K.openAddNews(S.t / 60); t.eq(S.msgs.length, n0 + 1, 'og bare én gang i året'); }
  { const S = mk('vangshamn'), q = quotaState(); q.torsk = codLimitNow(S.t / 60); K.openAddNews(S.t / 60); const m = S.msgs[S.msgs.length - 1];
    t.ok(m && !/kystfiskeordningen/.test(m.no) && /alderstillegg/.test(m.no), 'utenfor ordningen nevner brevet bare alderstillegget'); }
  // ---- what is taken from the group quota: the coastal scheme's part is the top 3.5 t of the vessel's limit and has its own set-aside
  t.eq(codGroupKg(0, 1000, 6000, 0), 1000, 'uten kystfiskeordningen går hele landingen på gruppekvota');
  t.eq(codGroupKg(4000, 1000, 9500, 3500), 1000, 'med den: under 6,0 t (§ 21 og alderstillegget) går alt på gruppekvota');
  t.eq(codGroupKg(5800, 1000, 9500, 3500), 200, 'en landing over grensen på 6,0 t deles: 200 kg på gruppekvota, 800 kg på kystfiskeordningen');
  t.eq(codGroupKg(7000, 500, 9500, 3500), 0, 'og over 6,0 t går alt på kystfiskeordningen');
  t.eq(codGroupKg(3000, 2000, Infinity, 3500), 2000, 'fritt fiske (ingen grense): alt på gruppekvota');
}
