// ===== Fartstid: years at sea, 0 to 40 (Jonas 07.10.2026; docs/engasjement.md, arbeidslista 1) =====
// The player's experience is counted as sea time, the thing every fisher knows: «12 år og 143 døgn fartstid». The years are the
// player's level and the points the xp (RANK1, docs/planer/rank1.md, Jonas 16.11.2026: «et fullverdig ranking system med lvl, xp, og
// ferdigheter», V1 A). The level opens: the ceiling of the player's own skills (fsCap, below), the overdraft at five years (BANK.kkFsY),
// the apprentice at ten (LAER.fs), the weight of the trip jobs (09g-turer.js) and the badges. No rank names. The years are points on a
// curve, points(N) = 1 000 000 · (N/40)^2.8: the first year comes on the
// first trip, the fifth in the first week, the tenth after a month, the twentieth after four or five months, the thirtieth after a
// year and the fortieth after two or three for one who plays steadily. Past forty the years go on as stars.
// Earned aboard: each game hour at sea with you aboard, and each landing by the square root of its value (a big boat gives more, not a
// hundred times more). Fish taken with luck counts like any fish. What the crews and the gear do while the game is closed counts a
// quarter («rederierfaring»): sea time is counted only for the one aboard. Time away also builds «uthvilt»: the next hours at sea
// with you aboard give double, up to a cap; it never runs out by waiting. Sea time is never sold, nor anything that raises it.
const FS = {MAX:40, TOP:1e6, EXP:2.8, SEA:80 / 60, LAND:3, AWAY:0.25, REST_H:120, REST_CAP:18 * 60};
let FS_AWAY = false;   // set while the time away is played (ui/08-actions.js catchUp)
function fsNeed(n){ return n <= 0 ? 0 : n <= FS.MAX ? FS.TOP * Math.pow(n / FS.MAX, FS.EXP) : FS.TOP + (n - FS.MAX) * (FS.TOP - fsNeed(FS.MAX - 1)); }
// years, the days into the next one (0–364), the share of it, and the stars past forty
function fsOf(p){
  p = Math.max(0, p || 0); let y = 0; while (y < 400 && p >= fsNeed(y + 1)) y++;
  const a = fsNeed(y), b = fsNeed(y + 1), f = Math.min(1, (p - a) / (b - a));
  return {y, d:Math.min(364, Math.floor(f * 365)), f, star:Math.max(0, y - FS.MAX)};
}
// the start: a game that has been played gets its sea time from what it did (the miles with you aboard, the trips and the landings)
function fsSeed(){
  const st = S.stats || {}, nm = (S.tat && S.tat.nm) || 0, trips = st.trips || 0, rev = Math.max(0, st.revenue || 0);
  return Math.round(FS.SEA * 60 * nm / 6 + (trips ? FS.LAND * Math.sqrt(rev / trips) * trips : 0));
}
function fsState(){ if (!S.fs) S.fs = {p:fsSeed(), rest:0, away:0}; return S.fs; }
function fsText(p, long){ const o = fsOf(p), en = S.lang === 'en';
  const yrs = o.y > FS.MAX ? FS.MAX + ' ' + (en ? 'years' : 'år') + ' ★' + o.star : o.y + ' ' + (en ? (o.y === 1 ? 'year' : 'years') : 'år');
  return long ? yrs + (en ? ' and ' + o.d + ' days at sea' : ' og ' + o.d + ' døgn fartstid') : yrs + (en ? ' at sea' : ' fartstid'); }
// points in: aboard and active they count whole (double while rested), away or by a crew without you a quarter
function fsAdd(pts, aboard){
  const F = fsState(), y0 = fsOf(F.p).y; let g = pts;
  if (FS_AWAY || !aboard){ g *= FS.AWAY; F.away = (F.away || 0) + g; }
  else if (F.rest > 0) g *= 2;
  F.p += g; const y1 = fsOf(F.p).y;
  if (y1 > y0) fsYear(y1);
  return g;
}
function fsYear(y){
  const t = fsText(fsNeed(y)), c = fsYearSkills(y), cs = c ? String(c).replace('.', ',') : '';
  log('Du har nå ' + t + '.' + (c ? ' Ferdighetene dine kan nå nå ' + cs + '.' : ''), 'You now have ' + t + '.' + (c ? ' Your skills can now reach ' + c + '.' : ''));
  // the first five years come fast (FS) and stand in the deck log only; after them a whole year is a toast too (spilltest 3, U4 and K3;
  // Jonas 05.11.2026, V3 A and V6c A)
  if (!FS_AWAY && y > 5 && typeof toast === 'function') toast((S.lang === 'en' ? 'Sea time: ' : 'Fartstid: ') + t);
  if (y % 10 === 0){ msg('Kystposten', 'Kystposten gratulerer med ' + y + ' år på havet. Det er ikke mange forunt.', 'The Coast Post congratulates you on ' + y + ' years at sea. Not many get there.'); pressPut('fs', {y}); };
}
// each game minute: an hour at sea with you aboard counts (rested time is used up only at sea)
function fsMinute(){
  let at = false; eachVessel(() => { if (meAboard() && S.boat.status !== 'port') at = true; });
  if (!at) return;
  const F = fsState(); fsAdd(FS.SEA, !FS_AWAY);
  if (!FS_AWAY && F.rest > 0) F.rest = Math.max(0, F.rest - 1);
}
// a landing: by the square root of its value
function fsLand(total){ return fsAdd(FS.LAND * Math.sqrt(Math.max(0, total || 0)), meAboard()); }
// time away builds rest: two game hours of double sea time for each real hour, up to eighteen
function fsRested(realMs){ const F = fsState(); F.rest = Math.min(FS.REST_CAP, (F.rest || 0) + realMs / 3.6e6 * FS.REST_H); }

// ===== Your own skills (RANK1-a, docs/planer/rank1.md, Jonas 16.11.2026: «siden litt av storyen i spillet er at man arver en båt, så må
// man starte ganske lavt på ferdighetene … På den måten vil også egenskapene forme seg etter hva spilleren faktisk bruker slags
// redskaper»; V2 A, V3 A) =====
// The crew's gear and deck skills, 1–5, for you: the four gears and gutting, icing and crab sorting. A new game starts on 1.5 in all
// (fresh at sea, not nothing). What you do decides which grow: each minute at sea on a station (S.mySt, workMinute) moves the skill
// that station trains (stationSkill, 14-crewlife.js) a quarter of the way to the ceiling an hour, a quarter as fast while the game is
// closed, as sea time. The level decides how high: fsCap(years) = 1.5 + 3.5 · (years/40)^0.6, 1.5 at none, 2.5 at five, 3 at ten and 5
// at forty. Your experience is that ceiling (fsErf): it is what you read the echo sounder with (plan3Reader). The skill makes you work
// faster on the station, fsSkF: 1 at 1.5 (as before this step), 1.25 at 5; never slower than before. Never sold, nor anything that
// raises them. (Start values for the play tests, all of them.)
const FSK = {start:1.5, top:5, capE:0.6, rate:0.25, eff:0.07, keys:['juksa', 'line', 'garn', 'teiner', 'sloy', 'is', 'sort']};
const fsCap = y => FSK.start + (FSK.top - FSK.start) * Math.pow(clamp((y || 0) / FS.MAX, 0, 1), FSK.capE);
const fsCapNow = () => fsCap(fsOf(fsState().p).y);
const fsErf = () => fsCapNow();
// the skills, made once: a game from before this step gets them from its sea time, at the ceiling for its years for the jig, the gutting
// and the icing every catch gets and the gear a boat of the fleet is rigged for or the bound boat owns (crab sorting with the pots);
// the gear it has not used, halfway (nobody works slower than before the step). (The landings, S.sales, keep the species, not the gear.)
function fsSkills(){
  const F = fsState(); if (F.sk) return F.sk;
  const cap = fsCapNow(), half = (FSK.start + cap) / 2, sk = {};
  // (the rigs of every boat in the fleet, vget; the gear owned is the bound boat's, ownedUnits)
  const rigs = typeof RIGS === 'undefined' ? [] : (S.fleet || []).map(v => { const b = typeof vget === 'function' ? vget(v, 'boat') : null; return b && RIGS[b.rig] ? RIGS[b.rig].kind : null; });
  const used = k => { if (k === 'juksa' || k === 'sloy' || k === 'is') return true;
    const kind = k === 'teiner' || k === 'sort' ? 'teine' : k; if (rigs.includes(kind)) return true;
    try { return typeof ownedUnits === 'function' && ownedUnits(kind) > 0; } catch (e){ return false; } };
  for (const k of FSK.keys) sk[k] = Math.round((used(k) ? cap : half) * 1000) / 1000;
  return (F.sk = sk);
}
const fsSk = k => FSK.keys.includes(k) ? fsSkills()[k] : null;
// how much faster you work on a station that trains skill k (1 for anything else)
const fsSkF = k => { const v = fsSk(k); return v == null ? 1 : Math.max(1, 1 + FSK.eff * (v - FSK.start)); };
// m minutes on a station training skill k: towards the ceiling, a quarter while the game is closed; a whole step is said in the deck log
function fsLearn(k, m = 1){
  const sk = fsSkills(); if (!(k in sk)) return 0;
  const cap = fsCapNow(), v0 = sk[k]; if (v0 >= cap) return 0;
  const v1 = Math.min(cap, v0 + (cap - v0) * (1 - Math.pow(1 - FSK.rate, m * (FS_AWAY ? FS.AWAY : 1) / 60)));
  sk[k] = v1;
  if (Math.floor(v1) > Math.floor(v0) && typeof SKILL_WHAT !== 'undefined' && SKILL_WHAT[k] && typeof log === 'function'){
    const w = SKILL_WHAT[k]; log('Du har blitt flinkere til å ' + w[0] + '.', 'You have got better ' + w[1] + '.'); }
  return v1 - v0;
}
// each minute with you aboard at sea: the station you stand on (workMinute)
function fsSkillMinute(st){
  if (!st || !meAboard() || !S.boat || S.boat.status === 'port' || typeof stationSkill !== 'function') return;
  const q = stationSkill(st); if (q && q[0] === 'gear') fsLearn(q[1], 1);
}
// the ceilings a new year lifts, for the year's line: «taket for sløying 2,6»
function fsYearSkills(y){ const a = fsCap(y - 1), b = fsCap(y); return b > a ? Math.round(b * 10) / 10 : 0; }
