// The calendar moved to 2026 on the shared clock (16.11.2026, docs/planer/kalender-2026.md; core/01-world.js calEpoch, calMigrate;
// Jonas: «jeg vil at spillet starter fra 1.januar fra nå», «Sørg for at det ikke blir tull i regnskapet til spillere»). The minutes are
// untouched; the date of a minute moves, and the years a save has stored follow once.
export default function (t){
  const K = t.K, {calEpoch, calMigrate, EPOCH_LOCAL, EPOCH_WORLD, WORLD_T0, GAME_RATE, CAL_NOW} = K;
  // 1. the two calendars: a local build as before; the shared clock at 1 January 2026 06:00 at 17.11.2026 03:00 UTC, the same hour of
  //    the day as before at every minute, and the same weekday (the weeks of the game are counted from minute 0)
  t.eq(calEpoch(false), Date.UTC(2027, 2, 1, 6), 'et lokalt bygg har kalenderen fra 1. mars 2027 som før');
  t.eq(K.EPOCH, EPOCH_LOCAL, 'enhetstestene går på den lokale kalenderen');
  const min = real => (real - WORLD_T0) * GAME_RATE / 60000, R0 = Date.UTC(2026, 10, 17, 3);
  t.eq(new Date(calEpoch(true) + min(R0) * 60000).toISOString(), '2026-01-01T06:00:00.000Z', 'på den felles klokka er det 1. januar 2026 kl. 06 den 17.11.2026 kl. 03 UTC');
  t.eq(new Date(EPOCH_LOCAL + min(R0) * 60000).toISOString(), '2027-11-11T06:00:00.000Z', '… og før flyttingen var det samme minuttet 11. november 2027 kl. 06');
  t.eq(new Date(EPOCH_WORLD).getUTCHours(), new Date(EPOCH_LOCAL).getUTCHours(), 'klokkeslettet er det samme: dag og natt flyttet seg ikke');
  t.eq(new Date(EPOCH_WORLD).getUTCDay(), new Date(EPOCH_LOCAL).getUTCDay(), 'ukedagen er den samme: spillets uker teller fra minutt 0');
  t.eq(new Date(EPOCH_WORLD).getUTCFullYear(), 2025, 'alt som er spilt før nyttår, ligger i 2025');

  // 2. a save from before: every year stored goes back by two, once; hours and minutes stand; money and boats are not touched
  const lic = {id:'u11', since:2027, landY:2027, st:[{id:'x', kf:1, from:2027, until:2047}], coop:{y:2027, id:'a'}, flex:{y:2027, kg:5}, fu:{until:9000, y:2027, n:3}};
  const o = {v:2, t:366000, cash:160703085, lic, quota:{y:2027, torsk:1200, hyse:3},
    fleet:[{id:'v1', lic, quota:{y:2027, torsk:7}}, {id:'v2', lic:{id:'krab', since:2027, flex:{y:2027, kg:9}}, quota:{y:2027, snokrabbe:40}}],
    openUsed:{y:2027, torsk:5}, stats:{revenue:900, costs:300, y:{2027:{fangst:900, drivstoff:-300}}}, tx:{y:2027, rev0:0, cost0:0, paid:120, days:[1, 2]},
    txY:{2027:{form:'ENK'}}, taxLast:{y:2027}, licFree:[{id:'f', y:2027, landY:2027, st:[{from:2027, until:2047}], until:14860, H0:6100}],
    mkt:{km:{wait:{L1:{listing:1, item:{y:2027, st:[{from:2027, until:2047}], lic:{since:2027}, quota:{y:2027}}}}}},
    qy:{2027:{d:300, me:4}}, fest:{y:2027, best:21}, seasonSeen:{skrei2027:1, evskrei2027:1, evskrei2027x:1, fest2027:1, fest2027a:1, annet:1},
    evPending:[{id:'skrei', y:2027}], ach:{ev:{skrei2027:{kg:10}}}, press:{told:{s2027:1, ptorsk15:1}}, bkq:{y:2027}, qyY:2027,
    loan:{next:400000}, boat:{pos:{x:412.5, y:1203.25}}};
  const before = JSON.stringify({t:o.t, cash:o.cash, loan:o.loan, boat:o.boat, rev:o.stats.revenue, costs:o.stats.costs, paid:o.tx.paid, days:o.tx.days});
  calMigrate(o);
  t.eq(o.cal, CAL_NOW, 'lagringen er merket som flyttet'); t.ok(o.calTell === true, 'og spilleren får beskjed én gang');
  t.eq(JSON.stringify({t:o.t, cash:o.cash, loan:o.loan, boat:o.boat, rev:o.stats.revenue, costs:o.stats.costs, paid:o.tx.paid, days:o.tx.days}), before, 'klokka, pengene, lånet, båtens plass, inntekter, kostnader og betalt skatt er urørt');
  t.eq([o.quota.y, o.fleet[0].quota.y, o.fleet[1].quota.y, o.openUsed.y, o.tx.y, o.taxLast.y, o.fest.y, o.bkq.y, o.qyY], [2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025], 'kvoteåret, skatteåret og de andre årene er 2025');
  t.eq([lic.since, lic.landY, lic.st[0].from, lic.st[0].until, lic.coop.y, lic.flex.y, lic.fu.y, lic.fu.until], [2025, 2025, 2025, 2045, 2025, 2025, 2025, 9000], 'tillatelsens år er flyttet én gang, også når båten og flåten deler den; timene står');
  t.eq([o.fleet[1].lic.since, o.fleet[1].lic.flex.y], [2025, 2025], 'de andre båtenes tillatelser følger');
  t.eq([Object.keys(o.stats.y), Object.keys(o.txY), Object.keys(o.qy)], [['2025'], ['2025'], ['2025']], 'regnskapsåret, det lukkede skatteåret og gruppens år heter 2025');
  t.eq(o.stats.y[2025], {fangst:900, drivstoff:-300}, 'postene i regnskapet er de samme');
  t.eq([o.licFree[0].y, o.licFree[0].landY, o.licFree[0].st[0].until, o.licFree[0].until, o.licFree[0].H0], [2025, 2025, 2045, 14860, 6100], 'en rett uten båt: årene flyttet, timene ikke');
  { const it = o.mkt.km.wait.L1.item; t.eq([it.y, it.st[0].from, it.lic.since, it.quota.y], [2025, 2025, 2025, 2025], 'en kjøpt vare som venter på en båt'); }
  t.eq(Object.keys(o.seasonSeen).sort(), ['annet', 'evskrei2025', 'evskrei2025x', 'fest2025', 'fest2025a', 'skrei2025'], 'det som er sett «for året», gjelder 2025');
  t.eq([o.evPending[0].y, Object.keys(o.ach.ev), Object.keys(o.press.told).sort()], [2025, ['skrei2025'], ['ptorsk15', 's2025']], 'ventende sesongslutt, merkene og første skrei');
  const snap = JSON.stringify(o); calMigrate(o); t.eq(JSON.stringify(o), snap, 'en gang til endrer ingenting');
  // 3. a new game is born on the new calendar and is never moved
  const n = K.newState(); t.eq(n.cal, CAL_NOW, 'et nytt spill er født med merket'); const ns = JSON.stringify(n); calMigrate(n); t.eq(JSON.stringify(n), ns, 'og flyttes aldri');
  t.eq(calMigrate(null), null, 'ingen lagring: ingenting');
}
