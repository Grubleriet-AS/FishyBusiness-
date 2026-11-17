// Jonas 15.11.2026 (the old wooden boat, alone, jigging): «når jeg fikser med juksa så driver jo båten litt avgårde, men så plutselig så setter
// den fart helt av seg selv til der jeg startet å jukse. Jeg mener at så lenge ingen står ved roret på en båt, så skal den jo ikke kunne gå
// av seg selv». The cause: lieDrift (16b-dyn.js) ran her back up over the jigging ground at five knots whenever she had drifted 400 m off
// it, whoever was aboard. Now the engine runs her only with someone at the helm (lieHelmCan, b.lieHelm, workCtx's ror), she turns slowly
// with the wind lying still (lieTurn), and at anchor wind against the stream lays her across (anchorSwing).
// Jonas 17.11.2026 (the plan, the wooden boat, alone: «så drifter jeg avgårde mens jeg bruker juksa siden ingen kjører båten»; «Begge»):
// alone and not jigging by hand yourself, you reel in, take the helm and run her back up (the jig stands meanwhile); and a drift anchor
// (EQUIP.drivanker) takes most of the wind's drift off her and holds her bow to the wind.
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), b = S.boat, LIE = K.get('LIE'), R = Math.PI / 180;
  const keep = {}; for (const n of ['dynDrift', 'windAt', 'isLand', 'groundCheck', 'coastDist', 'curBoat', 'crewAboard', 'hsWork', 'hsAt', 'anchorForce', 'anchorReach', 'anchorGear']) keep[n] = K.get(n);
  try {
    // the wind blows her east (grid), 1 km/h-ish: 0.3 m/s; open water everywhere
    let U = 8; const down = 90 * R;
    K.set('dynDrift', () => ({e:0.3, n:0, v:0.3, a:down})); K.set('windAt', () => U); K.set('isLand', () => false); K.set('groundCheck', () => null);
    K.set('coastDist', () => 5); K.set('curBoat', () => ({tx:0, ty:0})); K.set('hsWork', () => 0.3); K.set('hsAt', () => 0.3);
    S.lang = 'no'; S.tut = 0; S.me = S.cur; S.plan = null; b.type = 'trebat'; K.applyVessel(); b.port = null; b.gop = null; b.anch = null; b.fuel = 50;
    const at = (st, crew) => { S.crew = crew ? [Object.assign(K.genCrew(), {bi:false, off:false, sleepW:false, fatigue:10, morale:62, traits:[]})] : [];
      b.status = st; b.pos = {x:500, y:500}; b.heading = 0; b.drv = null; b.driftHome = null; b.lieHelm = null; b.lieHd = null; S.log = []; };
    const run = n => { let ups = 0, far = 0; const h = {...b.pos}; for (let i = 0; i < n; i++){ S.t++; K.lieDrift(S.t / 60); if (b.drv && b.drv.up) ups++; far = Math.max(far, K.dist(h, b.pos)); } return {ups, far}; };
    const said = re => S.log.some(l => re.test(l.no || ''));

    const W = K.get('window');
    // 1. alone at the rail jigging by hand yourself («Jukse selv»): she drifts off the ground and never runs back by herself (0.3 m/s:
    // 18 m a minute, 400 m in 23 minutes)
    at('fishing', false); K.set('crewAboard', () => []); W.jigActive = true; let r = run(60); W.jigActive = false;
    t.eq(r.ups, 0, 'alene ved rekka med «Jukse selv»: båten setter aldri fart av seg selv tilbake til feltet (' + r.ups + ' minutter med motor)');
    t.ok(r.far > 1.0, 'alene med «Jukse selv»: hun driver videre med vinden (' + Math.round(r.far * 1000) + ' m på en time)');
    t.ok(said(/Ingen står ved roret/) && !said(/kjører opp igjen/i), 'alene med «Jukse selv»: loggen sier at ingen står ved roret, ikke at hun kjører opp igjen');
    t.ok(b.lieHelm == null, 'alene med «Jukse selv»: ingen står ved roret i arbeidsfordelingen (b.lieHelm er ikke satt)');
    // 1b. alone, the plan or the reels jigging (not by hand yourself): you reel in, take the helm and run her back up, and nobody jigs meanwhile
    at('fishing', false); r = run(60);
    t.ok(r.ups > 0 && r.far < LIE.up + 0.06, 'alene uten «Jukse selv»: du kjører henne opp igjen selv (' + r.ups + ' minutter, lengst ' + Math.round(r.far * 1000) + ' m av)');
    t.ok(said(/Sveiver inn juksa/), 'alene: loggen sier at du sveiver inn juksa og kjører opp igjen');
    at('fishing', false); for (let i = 0; i < 40 && !(b.drv && b.drv.up); i++){ S.t++; K.lieDrift(S.t / 60); }
    let A0 = K.workAssign(); t.ok(b.lieHelm === S.t && A0.length === 1 && A0[0].st === 'ror', 'alene: minuttet hun kjøres opp, står du ved roret', A0.map(p => p.st));
    b.gear = true; t.eq(K.fishEffort(), 0, 'alene: ingen jukser mens du kjører opp (juksingen står)');
    S.t += 3; t.ok(K.fishEffort() > 0, 'alene: når du er oppe igjen, jukser du igjen');

    // 2. with a hand aboard: one takes the helm and runs her back up, and the deck shows who steers
    K.set('crewAboard', keep.crewAboard); at('fishing', true); r = run(60);
    t.ok(r.ups > 0 && r.far < LIE.up + 0.06, 'med mannskap: en står ved roret og kjører henne opp igjen (' + r.ups + ' minutter, lengst ' + Math.round(r.far * 1000) + ' m av)');
    // a minute of the run: someone at the helm, someone else at the rail
    at('fishing', true); for (let i = 0; i < 40 && !(b.drv && b.drv.up); i++){ S.t++; K.lieDrift(S.t / 60); }
    t.ok(b.drv && b.drv.up && b.lieHelm === S.t, 'med mannskap: minuttet hun kjøres, er merket (b.lieHelm)');
    let A = K.workAssign(); t.ok(A.filter(p => p.st === 'ror').length === 1 && A.some(p => p.st === 'fiske'), 'med mannskap: én ved roret, én jukser', A.map(p => (p.c ? 'mann:' : 'du:') + p.st));
    // with «Jukse selv» on, you stay at the rail and the hand steers
    W.jigActive = true; A = K.workAssign(); W.jigActive = false;
    t.ok(A.find(p => !p.c).st === 'fiske' && A.find(p => p.c).st === 'ror', 'med mannskap og «Jukse selv»: du står ved rekka, mannskapet ved roret', A.map(p => (p.c ? 'mann:' : 'du:') + p.st));
    S.t += 3; A = K.workAssign(); t.ok(!A.some(p => p.st === 'ror'), 'når motoren ikke går lenger, står ingen ved roret', A.map(p => p.st));

    // 3. toward the land alone: you leave the rail for the helm and hold her off (she never drifts ashore with someone awake aboard)
    K.set('crewAboard', () => []); at('fishing', false); K.set('coastDist', () => 0.05); S.t++; K.lieDrift(S.t / 60);
    t.ok(b.lieHelm === S.t && !b.drv, 'mot land alene: du går til roret og holder henne unna');
    A = K.workAssign(); t.eq(A.length === 1 && A[0].st, 'ror', 'mot land alene: du står ved roret det minuttet');
    // nobody awake aboard (you ashore, no hands): no engine, she lies against the land as one adrift does, and nobody is set at the helm
    at('fishing', false); const me0 = S.me; S.me = 'annen'; S.t++; K.lieDrift(S.t / 60);
    t.ok(b.lieHelm == null && said(/blir liggende der/) && !said(/Motoren holder/), 'mot land og ingen våkne: ingen motor, hun blir liggende, og loggen sier det');
    S.me = me0; K.set('coastDist', () => 5);

    // 4. she turns slowly with the wind lying still: across it in the end, not in one go, faster in a stronger wind, not at all in calm
    const off = () => Math.abs(Math.abs(K.dynAng(b.heading, down)) - 90 * R) / R;   // degrees from lying across
    W.jigActive = true;   // (you at the rail: she lies and turns, never run back up, so the half hour of turning is hers alone)
    at('fishing', false); b.heading = down; U = 8; S.t++; K.lieDrift(S.t / 60); const d1 = 90 - off();
    t.ok(d1 > 3 && d1 < 30, 'i ro med baugen rett le, 8 m/s: hun dreier sakte, ' + d1.toFixed(0) + ' grader det første minuttet');
    for (let i = 0; i < 25; i++){ S.t++; K.lieDrift(S.t / 60); }
    t.ok(off() < 10, 'etter en halvtime ligger hun tvers på vinden (' + off().toFixed(0) + ' grader fra tvers)');
    t.ok(b.lieHd && b.lieHd.t === S.t && b.lieHd.h1 === b.heading, 'kartet og 3D dreier henne over minuttet fra der hun lå (b.lieHd)');
    at('fishing', false); b.heading = down; U = 3; S.t++; K.lieDrift(S.t / 60); const d3 = 90 - off();
    t.ok(d3 > 0 && d3 < d1 / 2, 'i svak vind (3 m/s) dreier hun langsommere (' + d3.toFixed(1) + ' grader første minuttet)');
    at('fishing', false); b.heading = down; U = 0.5; S.t++; K.lieDrift(S.t / 60);
    t.ok(Math.abs(K.dynAng(b.heading, down)) < 1e-9, 'i stille vær dreier hun ikke');
    U = 8; W.jigActive = false;
    // a big boat with the windage forward lies with her bow further off downwind than across
    const T = K.lieTurn('bunntral', 90 * R, {a:down}, 8), dd = Math.abs(K.dynAng(T.to, down)) / R;
    t.ok(dd < 85 && dd > 50, 'en stor båt med styrhuset forut faller av med baugen mer mot le (' + dd.toFixed(0) + ' grader fra le)');

    // 5. at anchor: wind against an equal stream lays her across the rode; wind alone, head to it
    K.set('anchorReach', () => 30); K.set('anchorGear', () => ({L:7, hf:1, max:60, scope:4, w:10, fair:2, haul:5, chain:false}));
    const anch = (Fw, Fc) => { b.status = 'idle'; b.pos = {x:500, y:500.03}; b.heading = 0; b.anch = {x:500, y:500, depth:10, rode:40, out:40, up:null, mv:null};
      // the wind blows her south (grid +y), the stream north
      K.set('anchorForce', () => ({x:0, y:Fw - Fc, Fw, Fc, Fs:0, U:Fw > 1 ? 8 : 0, cur:Fc > 1 ? {x:0, y:-0.5} : {x:0, y:0}, aw:Math.PI}));
      let worst = 0; for (let i = 0; i < 40; i++){ S.t++; K.anchorSwing(S.t / 60); const m = b.anch && b.anch.mv; if (!m) break; b.pos = {x:b.pos.x + m.x, y:b.pos.y + m.y}; b.heading = m.hd; b.anch.mv = null;
        if (i > 20) worst = Math.max(worst, Math.abs(K.dynAng(b.heading, Math.atan2(b.anch.x - b.pos.x, -(b.anch.y - b.pos.y))))); }
      return worst / R; };
    const wOnly = anch(400, 0), opp = anch(400, 380);
    t.ok(wOnly < 15, 'på anker i vind alene: baugen mot ankeret, opp mot vinden (høyst ' + wOnly.toFixed(0) + ' grader av)');
    t.ok(opp > 35, 'på anker med vind mot like sterk strøm: hun legger seg på tvers av ankertauet (' + opp.toFixed(0) + ' grader av)');

    // 6. the drift anchor: with it out she drifts a third as far in the wind and lies bow to it; the current takes her as before
    b.anch = null; K.set('crewAboard', () => []); W.jigActive = true;
    at('fishing', false); r = run(20); const free = r.far;
    S.equip.drivanker = true; at('fishing', false); b.heading = 0; r = run(40); const dr = K.dist({x:500, y:500}, b.pos) / 2;
    t.ok(Math.abs(dr / free - LIE.drogue) < 0.05, 'drivanker: hun driver ' + Math.round(dr / free * 100) + ' % så langt i vinden (' + Math.round(dr * 1000) + ' mot ' + Math.round(free * 1000) + ' m på 20 min)');
    t.ok(Math.abs(K.dynAng(b.heading, down + Math.PI)) / R < 10, 'drivanker: baugen mot vinden (' + (Math.abs(K.dynAng(b.heading, down + Math.PI)) / R).toFixed(0) + ' grader av)');
    K.set('curBoat', () => ({tx:0.2, ty:0})); at('fishing', false); const p0 = {...b.pos}; S.t++; K.lieDrift(S.t / 60); S.t++; K.lieDrift(S.t / 60);
    t.ok(Math.abs((b.pos.x - p0.x) - (0.3 * LIE.drogue + 0.2) * 60 / 1000) < 1e-6, 'drivanker: strømmen tar henne som før, bare vinden bremses');
    S.equip.drivanker = false; W.jigActive = false; at('fishing', false); b.heading = 0; S.t++; K.lieDrift(S.t / 60);
    t.ok(!K.lieDrogue(b) || false, 'uten drivanker ute: vanlig drift');
    t.ok(K.equipFits('drivanker', 'trebat') && !K.equipFits('drivanker', Object.keys(K.VESSELS).find(k => K.VESSELS[k].cls === 'hav')), 'drivanker: passer kystbåtene, ikke havbåtene');
  } finally { for (const n in keep) K.set(n, keep[n]); S.crew = []; b.anch = null; if (S.equip) delete S.equip.drivanker; const W = K.get('window'); if (W) W.jigActive = false; }
}
