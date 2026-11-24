// Banen (core/17b-bane.js; Autonav 2.0 F2, steg 142): the way as straight pieces and arcs she can turn, the speed along it by her
// stopping distance, the points for a plan, the sweep of her hull along it, and the minute step that follows it.
export default function (t){
  const K = t.K, FARB = K.get('FARB'); K.set('S', K.newState());
  const far = {x:9e6, z:9e6}, at = (dx, dz) => [far.x + dx, far.z + dz];
  const sea = o => Object.assign({land:() => 0, coast:() => [1e9, 0], depth:() => 50, tide:() => 0, zc:() => 0, pocket:() => false, known:() => true}, o || {});
  // (a boat that turns on 20 m, sails 5 m/s and stops on v * v * 2 metres: 50 m from 5 m/s)
  const o = {R:20, vmax:5, stop:v => v * v * 2, end:true};
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
  } finally { FARB.w = null; FARB.test = null; }
}
