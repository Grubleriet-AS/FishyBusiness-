// ---------- the deck log's other tab: the sales (D4, 14.11.2026: the tabs for seasons, events and gear went out, Jonas 13.11.2026) ----------
// Each tab is a list of pages in the same book (ui/06-logbook.js), oldest first, so a tab opens at its newest page. Everything here
// is read from what drives the game: the season rules and monthly prices in core, the weekly price movement (weekDev), the weather
// premium (supplyFactor), the gear that has stood in the sea (S.sets and S.gearLog) and the landing notes kept with each sale.
const BKL = (no, en) => S.lang === 'no' ? no : en;
const bkDate = m => { const d = gDate(m / 60); return String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear(); };
const pctS = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), 0) + ' %';
const bkHead = (no, en, sub) => '<div class="pg-h"><span class="pg-t">' + BKL(no, en) + '</span><span class="pg-d">' + (sub || '') + '</span></div>';
// --- sales: the landing notes, one to a page
function bookSales(){
  return S.sales.map((x, i) => {
    const d = x.d, p = portById(x.port), vt = S.fleet && S.fleet.length > 1 && x.v ? ' · «' + (vget(vesselById(x.v) || curVessel(), 'boatName') || '') + '»' : '';
    // (Jonas 16.11.2026: the page is our own, a Norwegian landing note as a form, not a book with a block and a drawing per species: one
    // table for the whole catch, the species once at the top of its rows, no fish drawn; the head as the note's boxes)
    const boat = vt ? vt.slice(4, -1) : (S.boatName || '');
    let h = '<div class="bk-form"><div class="bk-ft">' + BKL('SLUTTSEDDEL', 'LANDING NOTE') + '<span>' + (d ? BKL('nr. ', 'no. ') + String(d.id).padStart(4, '0') : '') + '</span></div>' +
      '<div class="bk-fg"><span><i>' + BKL('Kjøper', 'Buyer') + '</i><b class="hw">' + (p ? p.name : '–') + '</b></span><span><i>' + BKL('Fartøy', 'Vessel') + '</i><b class="hw">' + (boat || '–') + '</b></span>' +
      '<span><i>' + BKL('Dato', 'Date') + '</i><b class="hw">' + bkDate(x.t) + '</b></span><span><i>' + BKL('Kl.', 'Time') + '</i><b class="hw">' + hm(x.t / 60) + '</b></span></div></div>';
    if (!d){
      // older landings kept only kilos and kroner per species
      h += '<table class="lg bk-st"><thead><tr><th>' + BKL('Art', 'Species') + '</th><th>' + BKL('Vekt (kg)', 'Weight (kg)') + '</th></tr></thead><tbody>' + (x.sp || []).map(([sp, kg]) => '<tr><td>' + spName(sp) + '</td><td>' + fmt(kg, 0) + '</td></tr>').join('') + '</tbody></table>';
      return h + '<div class="pg-sum">' + BKL('Totalt ', 'Total ') + fmt(x.kg, 0) + ' kg · ' + kr(x.total) + '</div><p class="hw bk-note">' + BKL('Denne landingen ble ført før sluttsedlene kom i boka.', 'This landing was entered before the landing notes came into the book.') + '</p>';
    }
    const bySp = {}; for (const r of d.ln) (bySp[r[0]] = bySp[r[0]] || []).push(r);
    let sumKr = 0, sumKg = 0, sumN = 0;
    h += '<table class="lg bk-st bk-one"><thead><tr><th>' + BKL('Fiskeslag', 'Species') + '</th><th>' + BKL('Str.', 'Size') + '</th><th>' + BKL('Kv.', 'Gr.') + '</th><th>' + BKL('Tilst.', 'Cond.') + '</th><th>kg</th><th>' + BKL('Kr/kg', 'NOK/kg') + '</th><th>' + BKL('Beløp', 'Amount') + '</th></tr></thead><tbody>';
    for (const sp of Object.keys(bySp)){
      const sd = SPECIES[sp];
      bySp[sp].forEach(([, c, g, gut, kg, sum, n, fz], i) => { const cl = sd && sd.cls[c], wk = gut && sd ? kg / sd.uh : kg; sumKr += sum; sumKg += Math.round(wk); sumN += n || 0;
        h += '<tr' + (i === 0 ? ' class="bk-new"' : '') + '><td class="hw">' + (i === 0 ? spName(sp) : '') + '</td><td>' + (cl ? cl[2] : '') + '</td><td>' + g + '</td><td>' + (gut ? BKL('sløyd', 'gutted') : BKL('rund', 'round')) + (fz ? BKL(', fryst', ', frozen') : '') + '</td><td>' + fmt(Math.round(wk), 0) + '</td><td>' + fmt(sum / Math.max(wk, 0.01), 2) + '</td><td>' + fmt(sum, 0) + '</td></tr>'; });
    }
    h += '</tbody></table>';
    const row = (a, b, cls) => '<div class="bk-row' + (cls ? ' ' + cls : '') + '"><span>' + a + '</span><span class="hw">' + b + '</span></div>';
    h += '<div class="bk-tot">' + row(BKL('Sum fangst', 'Catch in all'), fmt(sumKg, 0) + ' kg · ' + kr(sumKr));
    const bon = [];
    if (d.ex) for (const n in d.ex) if (d.ex[n][1] > 0) bon.push([n === 'lever' ? BKL('Lever', 'Liver') : BKL('Rogn', 'Roe'), kr(d.ex[n][1])]);
    if (d.st && d.st[1] > 0) bon.push([BKL('Innloggingsbonus ', 'Login bonus ') + pctS(d.st[0]), kr(d.st[1])]);
    if (d.ord > 0) bon.push([BKL('Tillegg for oppdrag', 'Order premiums'), kr(d.ord)]);
    if (bon.length) h += '<div class="bk-sub">' + BKL('Tillegg', 'Additions') + '</div>' + bon.map(([a, b]) => row(a, b)).join('');
    const cost = [];
    if (d.conf && d.conf[1] > 0.5) cost.push([BKL('Inndratt over kvote eller bifangst', 'Confiscated over quota or bycatch'), '−' + kr(d.conf[1])]);
    if (d.ved > 0.5) cost.push([BKL('Vederlag for ilandføring, 20 % av det inndratte', 'Compensation for landing, 20 % of what was confiscated'), kr(d.ved)]);
    if (d.conf && d.conf[3] > 0.5) cost.push([BKL('Krabbe under minstemål', 'Undersized crab'), '−' + kr(d.conf[3])]);
    if (d.roe > 0.5) cost.push([BKL('Trekk for rognkrabbe', 'Berried crab deduction'), '−' + kr(d.roe)]);
    if (d.gf > 0.5) cost.push([BKL('Sløyd på mottaket', 'Gutted by the buyer'), '−' + kr(d.gf)]);   // (round haddock and saithe, R2)
    const tks = (d.tk || []).reduce((a, v) => a + v, 0);
    if (tks > 0) cost.push([BKL('Trekk til Fiskesalgslaget og staten', 'Sales organisation and state levies'), '−' + kr(tks)]);
    // the common costs and the shares (Økonomi 2, Ø2: [name, shares, kr, skipper]); a note from before has [name, part of the net]
    if (d.fk){ const [fl, fkr, ik, ikr, bkr, hkr, gkr] = d.fk; if (hkr > 0) cost.push([BKL('Felleskostnad: havneavgift', 'Common cost: harbour dues'), '(' + kr(hkr) + ')']); if (gkr > 0) cost.push([BKL('Felleskostnad: juksautstyr og tapt redskap', 'Common cost: jig tackle and gear lost'), '(' + kr(gkr) + ')']); if (fkr > 0) cost.push([BKL('Felleskostnad: drivstoff ', 'Common cost: fuel ') + fmt(fl, 0) + ' l', '(' + kr(fkr) + ')']); if (ikr > 0) cost.push([BKL('Felleskostnad: is ', 'Common cost: ice ') + fmt(ik, 0) + ' kg', '(' + kr(ikr) + ')']); if (bkr > 0) cost.push([BKL('Felleskostnad: agn', 'Common cost: bait'), '(' + kr(bkr) + ')']); }
    if (d.dl && (d.crew || []).length) cost.push([BKL('Delingsfangst ', 'Shared catch ') + kr(d.dl[0]) + BKL(', mannskapets del ', ', the crew\'s part ') + fmt(d.dl[1] * 100, 0) + ' %', '']);
    for (const r of d.crew || []){ const [nm, sh, k2, sk, sx] = r; cost.push(k2 != null ? [nm + ' · ' + lotS(sh) + (sk ? BKL(' + skippertillegg', ' + skipper\'s extra') + (sx ? ' ' + fmt(sx, 2) : '') : ''), '−' + kr(k2)] : [nm + ' · ' + fmt(sh * 100, 0) + ' % ' + BKL('lott', 'share'), '−' + kr(Math.round(sh * (x.total - tks)))]); }
    if (d.fine > 0) cost.push([BKL('Gebyr fra Fiskeridirektoratet', 'Fine from the Directorate'), '−' + kr(d.fine)]);
    if (cost.length) h += '<div class="bk-sub">' + BKL('Trekk og utgifter', 'Deductions and costs') + '</div>' + cost.map(([a, b]) => row(a, b, 'red')).join('');
    h += row('<b>' + BKL('Netto', 'Net') + '</b>', '<b>' + kr(x.total - tks - (d.lott || 0) - (d.fine || 0)) + '</b>', 'net') + '</div>';
    return h;
  });
}
// the entry for a set in the gear log, from the set itself
function gearLogEntry(s){
  const m = setMid(s), lbl = s.kind === 'garn' ? netN(s, s.n) : s.kind === 'line' ? [s.n + ' ' + (s.n === 1 ? 'stamp' : 'stamper') + ' ' + LINE_KINDS[s.lk].no.toLowerCase(), s.n + ' ' + (s.n === 1 ? 'tub' : 'tubs') + ' of ' + LINE_KINDS[s.lk].en.toLowerCase()] : [s.n + ' ' + POTS[s.pot].no.toLowerCase(), s.n + ' ' + POTS[s.pot].en.toLowerCase()];
  return {id:s.id, vid:s.vid, kind:s.kind, lbl, n:s.n, tSet:s.tSet, x:m.x, y:m.y, depth:s.depth, tHaul:null, kg:null, lost:null};
}
function bookTabPages(t, spread){
  if (t === 'salg'){ const p = bookSales(); return p.length ? p : [bkHead('Salg', 'Sales') + '<p class="hw">' + BKL('Ingen landinger ennå.', 'No landings yet.') + '</p>']; }
  return [];
}
