// Banen (core/17b-bane.js; Autonav 2.0 F2, steg 142): the way as straight pieces and arcs she can turn, the speed along it by her
// stopping distance, the points for a plan, the sweep of her hull along it, and the minute step that follows it.
export default function (t){
  const K = t.K, FARB = K.get('FARB'); K.set('S', K.newState());
  const far = {x:9e6, z:9e6}, at = (dx, dz) => [far.x + dx, far.z + dz];
  const sea = o => Object.assign({land:() => 0, coast:() => [1e9, 0], depth:() => 50, tide:() => 0, zc:() => 0, pocket:() => false, known:() => true}, o || {});
  // (a boat that turns on 20 m, sails 5 m/s and stops on v * v * 2 metres: 50 m from 5 m/s)
  const o = {R:20, vmax:5, stop:v => v * v * 2, end:true, start:false};
  try {
    // a right-angle corner: east 200 m, then south 200 m
    let B = K.baneBuild([at(0, 0), at(200, 0), at(200, 200)], o);
    t.eq(B.P.map(p => p.k).join(''), 'lal', 'et hjørne blir et rett stykke, en bue og et rett stykke');
    t.near(B.P[1].r, 20, 1e-9, 'buen har hennes svingradius'); t.near(B.P[0].len, 180, 1e-9, 'det rette stykket slutter en radius før hjørnet (90°)');
    t.near(B.len, 180 + 20 * Math.PI / 2 + 180, 1e-9, 'lengden er stykkene og buen');
    let q = K.baneAt(B, 180 + 20 * Math.PI / 4);
    t.near(Math.hypot(q.X - (far.x + 180), q.Z - (far.z + 20)), 20, 1e-9, 'midt i buen er hun en radius fra buens sentrum');
    t.near(q.psi, Math.PI * 3 / 4, 1e-9, 'og kursen er midt mellom øst og sør (135°)');
    q = K.baneAt(B, B.len); t.near(Math.hypot(q.X - far.x - 200, q.Z - far.z - 200), 0, 1e-6, 'banen ender i siste punkt'); t.near(q.psi, Math.PI, 1e-9, 'med kurs sør');
    // a left turn: the centre on the other side
    B = K.baneBuild([at(0, 0), at(200, 0), at(200, -200)], o); q = K.baneAt(B, 180 + 20 * Math.PI / 4);
    t.near(Math.hypot(q.X - (far.x + 180), q.Z - (far.z - 20)), 20, 1e-9, 'en sving til babord har sentrum på den andre siden'); t.near(q.psi, Math.PI / 4, 1e-9, 'og kursen midt i er 45°');
    // legs too short for her radius: a tighter arc, and slower there
    B = K.baneBuild([at(0, 0), at(20, 0), at(20, 20)], o);
    t.near(B.P.find(p => p.k === 'a').r, 10, 1e-9, 'der leggene er korte, blir buen så stor som halve den korteste gir plass til'); t.ok(B.P.find(p => p.k === 'a').vl < o.vmax, 'og farten i den er lavere', B.P.find(p => p.k === 'a').vl);
    // the speed: full on the straight, down to the end by her stopping distance
    B = K.baneBuild([at(0, 0), at(1000, 0)], o);
    t.near(K.baneV(B, 500), 5, 1e-6, 'full fart midt på et langt rett stykke'); t.ok(K.baneV(B, 1000) <= 0.5 + 1e-6, 'og hun kommer fram i sakte fart', K.baneV(B, 1000));
    t.ok(K.baneV(B, 1000 - 60) > 4.9 && K.baneV(B, 1000 - 20) < 3.4, 'hun slakker av innenfor stopplengden (50 m fra 5 m/s): 20 m før er farten under 3,4 m/s', [K.baneV(B, 940), K.baneV(B, 980)]);
    t.ok(B.time > 1000 / 5 && B.time < 1000 / 5 + 40, 'tiden er litt mer enn lengden delt på farten', B.time);
    t.near(K.baneS(B, 100), 500, 1, 'etter 100 s er hun 500 m på vei'); t.eq(K.baneS(B, 1e6), 1000, 'og etter lang tid framme');
    const B2 = K.baneBuild([at(0, 0), at(1000, 0)], Object.assign({}, o, {end:false})); t.near(K.baneV(B2, 1000), 5, 1e-6, 'uten stopp i enden holder hun farten ut');
    const B4 = K.baneBuild([at(0, 0), at(1000, 0)], Object.assign({}, o, {start:true})); t.ok(K.baneV(B4, 0) <= 0.5 + 1e-6 && K.baneV(B4, 20) < 3.4 && K.baneV(B4, 60) > 4.9, 'fra kai tar hun fart slik hun mister den: sakte de første metrene, full fart etter stopplengden', [K.baneV(B4, 0), K.baneV(B4, 20), K.baneV(B4, 60)]);
    // a leg she may only have 2 m/s on (shallow water, her squat): slower there, full speed before and after
    const B5 = K.baneBuild([at(0, 0), at(400, 0), [far.x + 600, far.z, 0, 2], at(1000, 0)], Object.assign({}, o, {end:false}));
    t.ok(K.baneV(B5, 200) > 4.9 && K.baneV(B5, 500) <= 2 + 1e-6 && K.baneV(B5, 900) > 4.9 && K.baneV(B5, 390) < 3, 'et strekk med fartsgrense (grunt vann): sakte der, full fart før og etter, og hun slakker av før det', [K.baneV(B5, 200), K.baneV(B5, 390), K.baneV(B5, 500), K.baneV(B5, 900)]);
    // the points for a plan: the corner as chords, each with how far along it lies
    B = K.baneBuild([at(0, 0), at(200, 0), at(200, 200)], o); const pts = K.banePts(B);
    t.ok(pts.length >= 10 && Math.abs(pts[pts.length - 1].s - B.len) < 1e-6 && pts.every((p, i) => !i || p.s > pts[i - 1].s), 'punktene til planen ligger i rekkefølge langs banen, buen som korder', pts.length);
    t.near(pts[0].x * 1000 - far.x, 180, 1e-6, 'første punkt er der buen begynner');
    // the sweep of her hull along it
    const boat = {L:10, B:3, T:1.5, air:4};
    FARB.w = sea(); FARB.test = [{k:'c', what:'merke', id:'hjørne', x:far.x + 196, z:far.z + 4, r:0.5}];
    let h = K.baneFri(B, boat, 0); t.ok(h && h.id === 'hjørne' && h.i === 1, 'en stake innenfor hjørnet, der buen går, blir funnet i buen', h && [h.id, h.i]);
    FARB.test = [{k:'c', what:'merke', id:'ute', x:far.x + 200, z:far.z - 3, r:0.5}];
    t.eq(K.baneFri(B, boat, 0), null, 'en stake i selve hjørnepunktet (utenfor buen) er ikke i veien: banen går ikke dit');
    FARB.test = [{k:'c', what:'merke', id:'slutt', x:far.x + 200, z:far.z + 190, r:0.5}];
    h = K.baneFri(B, boat, 0); t.ok(h && h.id === 'slutt', 'en stake på det siste stykket blir funnet'); t.eq(K.baneFri(B, boat, 0, {skip:(q2, X, Z) => Math.hypot(q2.x - far.x - 200, q2.z - far.z - 200) < 15}), null, 'og ikke når det er det hun legger til ved (innen halvannen båtlengde fra enden)');
    // the minute step along it (05-vessels.js sail asks baneSail first): the plan holds the bane's points and what it is built again
    // from, and she comes to the end when the bane says she does
    const bb = K.baneBoat('sjark', 8), B3 = K.baneBuild([at(0, 0), at(600, 0), at(600, 900), at(900, 1200)], Object.assign({}, bb, {end:true})), S = K.get('S');
    const pl = {wps:[{x:0, y:0, port:null, fish:0, leia:true}], idx:0, speed:8}; K.planInto(pl, {pts:K.banePts(B3), bane:B3}, 0, 1);
    t.eq(pl.wps.length, K.banePts(B3).length, 'planen får banens punkter'); t.ok(pl.b2 && pl.b2.legs.length === 1 && !('bane' in pl) && JSON.stringify(pl).length < 4000, 'og en kort oppskrift på banen, ikke banen selv (planen lagres)', JSON.stringify(pl).length);
    const pl2 = JSON.parse(JSON.stringify(pl)); S.plan = pl2; S.boat.pos = {x:far.x / 1000, y:far.z / 1000}; S.boat.status = 'sailing';   // (as after a save and a load)
    let min = 0, at2 = null; while (pl2.idx < pl2.wps.length && min < 500){ if (!K.baneSail(pl2, S.boat, 99)) break; min++; if (min === 2) at2 = {x:S.boat.pos.x, y:S.boat.pos.y, h:S.boat.heading}; }
    t.ok(Math.abs(min * 60 - B3.time) < Math.max(60, B3.time * 0.02), 'hun er framme når banen sier det, innen 2 % (eller minuttet)', [min * 60, B3.time]);
    const q2 = K.baneAt(B3, K.baneS(B3, 120)); t.ok(at2 && Math.hypot(at2.x * 1000 - q2.X, at2.y * 1000 - q2.Z) < 12, 'og etter to minutter der banen sier hun er', at2 && Math.hypot(at2.x * 1000 - q2.X, at2.y * 1000 - q2.Z));
    t.near(S.boat.pos.x * 1000, far.x + 900, 0.01, 'turen ender i banens siste punkt');
    // never faster than the minute's own speed (the weather): 0.1 km a minute at most
    const pl3 = JSON.parse(JSON.stringify(pl)); S.plan = pl3; S.boat.pos = {x:far.x / 1000, y:far.z / 1000}; K.baneSail(pl3, S.boat, 0.1);
    t.near(Math.hypot(S.boat.pos.x * 1000 - far.x, S.boat.pos.y * 1000 - far.z), 100, 0.5, 'og aldri fortere enn minuttets egen fart');
    // a plan whose points were changed after the bane was put in has none (it sails as before)
    const pl4 = JSON.parse(JSON.stringify(pl)); pl4.wps.splice(1, 1); t.eq(K.baneSail(pl4, S.boat, 99), false, 'en plan som er endret etterpå, har ingen bane og seiler som før');
  } finally { FARB.w = null; FARB.test = null; }
}
