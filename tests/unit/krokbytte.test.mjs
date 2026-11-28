// Tilbakemelding #342 (23.11.2026), #447, #462 and #464 (27.11.2026): alone aboard, «bytte kroker» and «nytt sett» never got done. The
// countdown stood at three minutes and the hour it would be done moved on for good (one player: two real days with the queue at 1/6).
// Two ways into it, both from core/13-work.js workAssign having nobody to give the job to:
//  - resting ashore (the naust or a rorbu) you are not on deck, the job waited for you, and the departure, which is what brings you
//    aboard, waited for the queue (05-vessels.js vesselStep, 06h-plan2-engine.js)
//  - tired (energy 30 and under), a small job never weighed up for the rest, and an open boat gives no rest at the quay
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), {applyVessel, workAssign, queueJob, jobMinute, restStart, resting} = K, b = S.boat;
  const jobsCallMe = () => typeof K.jobsCallMe === 'function' ? K.jobsCallMe() : false;   // (so the checks, not a missing name, are what is red before the fix)
  K.set('hsWork', () => 0.3); K.set('hsAt', () => 0.3);
  S.lang = 'no'; S.tut = 0; S.crew = []; S.me = S.cur; b.type = 'trebat'; applyVessel();
  const home = S.home || K.HOME0;
  const crew = (n, fat) => { S.crew = [...Array(n).keys()].map(() => Object.assign(K.genCrew(), {bi:false, off:false, sleepW:false, fatigue:fat, morale:62, traits:[]})); };
  const jobsRestBack = () => typeof K.jobsRestBack === 'function' ? K.jobsRestBack() : false;
  const lay = (energy, hour) => { S.restBack = null; S.t = Math.floor(S.t / 1440) * 1440 + hour * 60; b.status = 'port'; b.port = home; b.berth = 'main'; b.gop = null; b.land = null; b.iceUntil = 0; b.moorT = S.t - 90; b.castT = null; b.shift = null;
    S.plan = null; S.jobs = []; S.sleep = null; S.rest = null; S.energy = energy; S.mySt = 'pause'; };
  const job = (kind, h) => { queueJob({kind, k:'mark', lk:'line', n:50, need0:50, tot0:500, h, no:'Bytte', en:'Changing'}); return S.jobs[S.jobs.length - 1]; };
  // the minutes as the game takes them: the call from the naust (vesselStep), the hands for the minute, the job's minute
  const run = (j, max) => { for (let m = 1; m <= max; m++){ S.t++; jobsCallMe(); const A = workAssign(); const me = A.find(p => !p.c); S.mySt = me ? me.st : null; if (jobMinute(j, A)) return m; } return null; };

  // 1. alone and tired in port: the job is yours, tired or not (a worn-out skipper works slower, so half as long again is allowed)
  for (const [e, hour, kind, h] of [[100, 12, 'jg', 0.3], [55, 1, 'jg', 0.3], [30, 18, 'jg', 0.3], [12, 3, 'jg', 0.3], [30, 22, 'hk', 1.5], [12, 3, 'lr', 0.5]]){
    lay(e, hour); const m = run(job(kind, h), 600);
    t.ok(m != null && m <= h * 60 * 1.5 + 2, 'alene i havn, energi ' + e + ', kl. ' + hour + ', ' + kind + ' på ' + h + ' t: jobben blir gjort (' + m + ' min)'); }

  // 2. resting ashore with the job in the queue (a save from before the fix): you go aboard, and it is done
  for (const w of ['naust', 'rorbu']){
    lay(75, 12); S.rest = {port:b.port, w, t0:S.t, paid:S.t + 1e6}; t.ok(resting(), 'hviler i land (' + w + ') før jobben');
    const paid = S.rest.paid, cash = S.cash, j = job('jg', 0.3), m = run(j, 600);
    t.ok(m != null && m <= 20, 'hviler i ' + w + ' med «nytt sett» i køen: jobben blir gjort (' + m + ' min)');
    t.eq([S.rest, !!S.restBack], [null, true], 'mens du jobber, hviler du ikke, og hvilen er husket (' + w + ')');
    // the job is done (vesselStep takes it out of the queue): up again, on the night already paid for
    S.jobs = []; S.t++; t.eq(jobsRestBack(), true, 'jobben gjort: du går opp igjen (' + w + ')');
    t.eq([S.rest && S.rest.w, S.rest && S.rest.paid, S.cash, S.restBack], [w, paid, cash, null], 'samme hvile, samme betalte natt, ingenting betalt på nytt (' + w + ')'); }
  // she has left the harbour, or leaves this minute: the rest that waited is dropped
  lay(75, 12); S.restBack = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6}; b.status = 'sailing'; t.eq([jobsRestBack(), S.restBack, S.rest], [false, null, null], 'båten har gått: hvilen som ventet, er borte');
  lay(75, 12); S.restBack = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6}; S.plan = {depAt:S.t + 1, wps:[]}; t.eq([jobsRestBack(), S.rest], [false, null], 'avgang nå: du går ikke opp igjen'); S.plan = null;
  // the end time no longer moves away while it waits: one minute after the order it is within the job's own time
  lay(75, 12); S.rest = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6}; let j = job('jg', 0.3); const u0 = S.t + 0.3 * 60;
  for (let m = 0; m < 5; m++){ S.t++; jobsCallMe(); jobMinute(j, workAssign()); }
  t.ok(j.until != null && j.until <= u0 + 2, '«ferdig kl.» flytter seg ikke unna mens du hviler (' + (j.until - u0) + ' min etter den første tida)');

  // 3. going in to rest while your own job waits is refused before anything is paid, and goes through when the queue is empty
  lay(60, 12); j = job('hk', 1.5); const cash = S.cash, why = restStart();
  t.ok(Array.isArray(why) && /gjør du ferdig arbeidet først/.test(why[0]), 'hvile med egen jobb i køen: arbeidet først, med grunnen', why);
  t.eq([S.rest, S.cash, !!S.restBack], [null, cash, true], 'ingenting er betalt eller startet, men det er husket at du ba om hvile');
  S.jobs = []; S.t++; t.eq([jobsRestBack(), !!S.rest, S.restBack], [true, true, null], 'når jobben er gjort, går du og hviler av deg selv');
  // the hour in the answer is your own job's, not the yard's beside it
  lay(60, 12); j = job('jg', 0.3); S.jobs.push({kind:'svc', h:5, until:S.t + 300}); t.eq(K.jobsMineUntil(), j.until, 'klokkeslettet er din egen jobbs, ikke verftets ved siden av');
  // with another boat of the company on the screen, the question is still asked of the boat you are aboard
  { lay(60, 12); j = job('hk', 1.5); K.ensureFleet(); const v1 = S.fleet[0]; K.storeVessel(v1); const v2 = JSON.parse(JSON.stringify(v1)); v2.id = 'v2'; v2.jobs = []; v2.boatName = 'To'; S.fleet.push(v2); S.me = v1.id;
    K.bindVessel(v2); const c0 = S.cash, why2 = restStart();
    t.ok(Array.isArray(why2) && S.cash === c0 && !S.rest, 'ser på en annen båt i rederiet: fortsatt arbeidet først, ingenting betalt', [why2, c0 - S.cash, S.rest]);
    K.bindVessel(v1); S.fleet = [v1]; S.me = S.cur = v1.id; S.restBack = null; }
  lay(60, 12); t.eq(restStart(), null, 'uten jobb i køen: hvilen starter som før'); t.ok(resting(), 'og du hviler i naustet');

  // 4. with hands aboard the job is theirs: you stay ashore, and they do it
  crew(1, 20); lay(60, 12); S.rest = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6}; j = job('jg', 0.3);
  t.eq(jobsCallMe(), false, 'med mannskap om bord kalles du ikke ned fra naustet');
  const m4 = run(j, 600); t.ok(m4 != null && m4 <= 60, 'mannskapet gjør jobben mens du hviler (' + m4 + ' min)'); t.ok(!!S.rest, 'og du hviler fortsatt');
  crew(1, 20); lay(60, 12); j = job('hk', 1.5); t.eq(restStart(), null, 'med mannskap om bord kan du gå og hvile med jobb i køen');

  // 4b. a hand asleep on the watch below is aboard: the job is hers when she wakes, and nothing calls you down or keeps you from the
  // naust in the night (seen in driftsplan2test S9: two hands asleep in port with the lines to bait)
  crew(1, 20); S.crew[0].sleepW = true; lay(60, 2); S.rest = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6}; j = job('egn', 1);
  t.eq(jobsCallMe(), false, 'mannskapet sover på frivakt: du kalles ikke ned fra naustet'); t.ok(!!S.rest, 'og du hviler fortsatt (mannskapet sover)');
  lay(60, 2); j = job('egn', 1); t.eq(restStart(), null, 'mannskapet sover på frivakt: du kan gå og hvile med jobb i køen');
  lay(12, 2); j = job('jg', 0.3); S.t++; let A4 = workAssign();
  t.eq(A4.map(p => (p.c ? 'c' : 'me') + ':' + p.st + ':' + (p.jw ? 1 : 0)).join(' '), 'me:pause:0', 'sliten med mannskapet sovende: du tvinges ikke til jobben, den venter på dem');
  S.crew[0].sleepW = false; S.crew[0].off = true; lay(12, 2); j = job('jg', 0.3); S.t++; A4 = workAssign();
  t.ok(A4.length === 1 && A4[0].jw === j, 'mannskapet har fri (ikke om bord): da er jobben din');
  S.crew = []; lay(60, 12); S.jobs = [{kind:'svc', h:5, until:S.t + 300}]; S.rest = {port:b.port, w:'naust', t0:S.t, paid:S.t + 1e6};
  t.eq(jobsCallMe(), false, 'verftets jobb kaller deg ikke ned'); t.ok(!!S.rest, 'og du hviler mens verftet arbeider');
}
