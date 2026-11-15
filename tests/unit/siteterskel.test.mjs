// The sites behind a sill (steg 126 AS1, 14.11.2026; Ferdig når 3 in docs/planer/start/126.md): SITE_SILL (src/data/siteout.json,
// tools/rorbu/siteout.py) holds the deepest draught that gets out from a rorbu or Father's naust where not even kyst15 does at any tide.
// siteFits(type, pid) turns away a boat that draws more, as it turns away one over 15 m, and siteWhy says why in both languages.
export default function (t){
  const K = t.K, SILL = K.get('SITE_SILL'), V = K.get('VESSELS'), keep = {...SILL};
  try {
    for (const k in SILL) delete SILL[k];
    SILL.rbX = 1.6; SILL.rbY = 0;
    t.ok(K.siteFits('kyst15') && K.siteFits('kyst15', 'rbZ'), 'siteFits: kyst15 passer et sted uten terskel, og uten sted');
    t.ok(!K.siteFits('kyst21') && !K.siteFits('kyst21', 'rbZ'), 'siteFits: over 15 m passer ikke, med eller uten sted');
    t.ok(!K.siteFits('kyst15', 'rbX'), 'siteFits: kyst15 (3,0 m) passer ikke bak en terskel på 1,6 m');
    t.ok(K.siteFits('sjark', 'rbX') && V.sjark.draft === 1.6, 'siteFits: en sjark som stikker 1,6 m, passer bak 1,6 m');
    t.ok(!K.siteFits('sjarkny', 'rbX'), 'siteFits: den nye sjarken (2,06 m) passer ikke bak 1,6 m');
    t.ok(!K.siteFits('trebat', 'rbY'), 'siteFits: 0 betyr at ingen båt kommer ut');
    t.eq(K.siteWhy('kyst15', 'rbZ'), null, 'siteWhy: null der båten passer');
    const w = K.siteWhy('kyst15', 'rbX');
    t.ok(w && /grunne/.test(w[0]) && /1,6 m/.test(w[0]) && /1\.6 m/.test(w[1]), 'siteWhy: grunna og dypgangen, på norsk og engelsk', w);
    const w0 = K.siteWhy('trebat', 'rbY', true);
    t.ok(w0 && /^Naustet/.test(w0[0]) && /ingen vei ut/.test(w0[0]), 'siteWhy: naustet, og ingen båt', w0);
    const wl = K.siteWhy('kyst21', 'rbX');
    t.ok(wl && /15 m/.test(wl[0]), 'siteWhy: over 15 m sier lengden først', wl);
  } finally { for (const k in SILL) delete SILL[k]; Object.assign(SILL, keep); }
}
