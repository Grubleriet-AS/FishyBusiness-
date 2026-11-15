// Steg 125e (Jonas 15.11.2026, a clip from the old wooden boat: «mange fisk som bare teleporterer ombord, mens mannen står å bløgger andre
// fisker»; «den i alle fall visuelt burde sveives inn og kastes ut igjen når den er helt oppe»; the pilk and ten hooks): the hand jig's
// round, deckcrew.js HANDJUKSA, played at 30 frames a second with the fish hooked in bursts while he bleeds (2.2 s a fish, the reel
// standing). Every fish hooked is counted where it is (waiting on the hooks below, on the line coming up, in his hands, bled): none may be
// let go while he fishes, no more than eleven come up at once, and the line goes down, is jigged, comes up and goes down again.
// Seen red 15.11.2026 against the rule drawSkiff had until steg 125e (the queue cut to 12 fish and 15 s, five fish to a crank, no line let
// down, put in HANDJUKSA.keep and .step for the run): the round and the empty crank red; and the kilos outside the tub without the fish
// waiting for the knife and in his hands (airKg in drawSkiff) gave 9 for 27.
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;

export default function (t){
  const {HANDJUKSA: H} = t.K, dt = 1 / 30;
  // (the same pseudo-random hooking every run)
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const A = H.fresh(), Q = [], bq = []; let hooked = 0, bled = 0, inHand = null, lost = 0, maxLine = 0, order = [], prevSt = null, upMono = 0, lastD = 0;
  for (let now = 0; now < 400; now += dt){
    // bursts: a shoal under the boat for 20 s of every 60, a fish every 0.7 s then; none after 200 s (the last 200 s he jigs on with nothing)
    if (now < 200 && (now % 60) < 20 && rnd() < dt / 0.7){ Q.push({sp:'torsk', kg:3, t:now * 1000}); hooked++; }
    const before = Q.length; H.keep(Q, true); lost += before - Q.length;
    const got = H.step(A, Q, dt, !!inHand || bq.length > 0); bq.push(...got);
    if (!inHand && bq.length) inHand = {f:bq.shift(), t:0};
    if (inHand && (inHand.t += dt) >= 2.2){ bled++; inHand = null; }
    maxLine = Math.max(maxLine, A.fish.length);
    if (A.st !== prevSt){ order.push(A.st); prevSt = A.st; }
    if (A.st === 'up' && A.d > lastD + 1e-9) upMono++; lastD = A.d;
    const all = Q.length + A.fish.length + bq.length + (inHand ? 1 : 0) + bled;
    if (all + lost !== hooked){ t.ok(false, 'regnskapet går ikke opp ved ' + now.toFixed(1) + ' s'); return; } }
  t.ok(lost === 0 && hooked > 40 && bled > 30, 'ingen fisk slippes mens han fisker (' + hooked + ' kroket, ' + bled + ' bløgget, ' + lost + ' borte, ' + Q.length + ' venter)');
  t.ok(maxLine <= 11 && maxLine >= 5, 'høyst elleve fisk på snøret om gangen (pilk + 10 kroker; høyst ' + maxLine + ')');
  const cyc = order.join(' ');
  t.ok(/down jig up top down jig up/.test(cyc), 'juksa går ned, nappes, sveives opp og slippes ned igjen (' + cyc.slice(0, 80) + ' …)');
  t.eq(upMono, 0, 'på vei opp går pilken bare oppover');
  t.ok(A.n.empty > 0, 'uten fisk sveives den opp likevel etter en stund (' + A.n.empty + ' tomme av ' + A.n.up + ')');
  // the tub is drawn with the catch less what is not in it yet: the fish waiting for the knife and the one in his hands are not in it
  { const A2 = H.fresh(); A2.fish = [{kg:3}]; const air = H.air(A2, [{kg:2}], [{kg:4}], [{kg:5}, {kg:6}], {f:{kg:7}});
    t.eq(air, 27, 'fisken som venter på kniven og den i hånda er ikke i karet ennå (kg utenfor karet)'); }
  // nobody fishes: the queue is let go (the fish are the game's already; nothing is drawn)
  { const Q2 = [{}, {}]; H.keep(Q2, false); t.eq(Q2.length, 0, 'køen tømmes når ingen fisker'); }
}
