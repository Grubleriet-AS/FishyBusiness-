// Autonav says when she slows to give way (tilbakemelding #156, 17.11.2026, the snekke «kjører i 3 knop, ofte»): sjvAuto slows her to
// 40 % of the route's speed while a manoeuvre is on and there is no room to the side, and the log now says so, once a manoeuvre, with
// the other vessel's name when the look has it (core/05e-sjovei.js).
export default function (t){
  const K = t.K; K.set('S', K.newState()); const S = K.get('S'), SJV = K.get('SJV');
  const keep = {own:SJV.own, warn:SJV.warn, off:SJV.ownOff};
  try {
    S.lang = 'no'; S.log = []; S.plan = {wps:[{x:0, y:0}], idx:0, speed:7};
    SJV.own = {id:'n1', side:1, nx:0, ny:0, tgt:0.05, rate:1, t0:0, t1:null, why:'15', slow:true, ease:false, f:0.35, v:5}; SJV.warn = {id:'n1', name:'Fjordbris'}; SJV.ownOff = 0;
    const d = {u:3, X:500000, Y:500000, psi:0};
    const a = K.sjvAuto(d, 0.2, 5000, null), b = K.sjvAuto(d, 0.2, 5000, null);
    const said = S.log.filter(l => /slakker av for å vike/.test(l.no || ''));
    t.ok(a && a.v < 7 * 0.5144 && said.length === 1 && /«Fjordbris»/.test(said[0].no), 'hun slakker av og sier det én gang, med navnet på den hun viker for', {v:a && a.v, log:said.map(l => l.no)});
  } finally { SJV.own = keep.own; SJV.warn = keep.warn; SJV.ownOff = keep.off; S.plan = null; }
}
