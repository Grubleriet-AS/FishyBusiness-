// ---------- Ordboka: the trade's words explained where they stand (UI-redesign U10, grep 6) ----------
// The first time a word from the list stands in the drawer or a phone app, it gets a dotted line under it; a tap gives one sentence in
// plain words. Only running text is marked: never a button, a link, a tab, a heading or anything that acts on a tap, so a tap on a word
// never does two things. The words are the fishery's own; each sentence says what the word means in the game and at sea.
const ORDBOK = [
  // [regex for Norwegian, regex for English, Norwegian sentence, English sentence]
  ['sluttsedd\\p{L}*', 'landing notes?', 'Kvitteringen fra fiskemottaket på det du leverte: art, vekt, kvalitet, pris og trekkene. Den sendes også til salgslaget og Fiskeridirektoratet.', 'The fish plant\'s receipt for what you landed: species, weight, quality, price and the levies. It also goes to the sales organisation and the Directorate of Fisheries.'],
  ['bløgg\\p{L}*', 'bled|bleeding', 'Å skjære over blodårene ved gjellene så fisken blør ut. Bløgget fisk blir hvit i fisken og gir bedre pris.', 'Cutting the blood vessels by the gills so the fish bleeds out. Bled fish stays white and pays better.'],
  ['sløy(?:d|de|ing|er|e)?', 'gutted|gutting', 'Å ta ut innvollene. Sløyd fisk veier mindre, men holder seg lenger.', 'Taking out the innards. Gutted fish weighs less but keeps longer.'],
  ['lott(?:en|er|ene)?', 'shares?', 'Mannskapets del av fangsten etter felleskostnadene, delt etter avtalte andeler.', 'The crew\'s part of the catch after the common costs, split in agreed shares.'],
  ['kvote(?:n|r|ne)?', 'quotas?', 'Hvor mye av en art båten har lov til å fiske i året. Det som er over, blir inndratt ved levering.', 'How much of a species the boat may fish in a year. What is over is confiscated at landing.'],
  ['bifangst\\p{L}*', 'bycatch', 'Fisk av andre arter enn den du fisker etter. Det er grenser for hvor mye som kan være med.', 'Fish of other species than the one you fish for. There are limits to how much may come along.'],
  ['minstemål\\p{L}*', 'minimum size', 'Den minste størrelsen en fisk eller krabbe må ha for å kunne beholdes. Det som er mindre, skal slippes levende ut.', 'The smallest size a fish or crab must have to be kept. What is smaller goes back alive.'],
  ['juks(?:a|en)', 'jig', 'Fiske med snøre, krok og pilk som rykkes opp og ned, med hånda eller med juksamaskin.', 'Fishing with a line, hooks and a lure jerked up and down, by hand or with a jigging machine.'],
  ['teine(?:n|r|ne)?', '(?:crab )?pots?', 'Et bur som settes på bunnen med agn i, for krabbe. Det står ute og trekkes senere.', 'A cage with bait set on the bottom, for crab. It is left out and hauled later.'],
  ['garn(?:et|ene)?', 'nets?', 'Nett som står i sjøen en stund. Fisken setter seg fast i maskene.', 'Nets left standing in the sea for a while. The fish get caught in the meshes.'],
  ['haler(?:en|e|ne)?', 'haulers?', 'Vinsjen som trekker line, garn eller teiner opp fra bunnen.', 'The winch that hauls line, nets or pots up from the bottom.'],
  ['egning\\p{L}*', 'baiting', 'Å sette agn på krokene på lina, for hånd eller med maskin.', 'Putting bait on the hooks of the line, by hand or with a machine.'],
  ['ekkolodd\\p{L}*', 'echo sounder', 'Instrumentet som sender lyd ned i sjøen og viser dybden og fisken under båten.', 'The instrument that sends sound down into the sea and shows the depth and the fish under the boat.'],
  ['fangstfelt\\p{L}*', 'fishing field', 'Et nummerert område på kysten (hovedområde og lokasjon). Fangsten føres på feltet den ble tatt i.', 'A numbered area of the coast (main area and location). The catch is recorded on the field it was taken in.'],
  ['leia', 'fairway', 'Den merkede ruta langs kysten der det er trygt å seile, fri for grunner og skjær.', 'The marked route along the coast where it is safe to sail, clear of shallows and rocks.'],
  ['synkronrulling\\p{L}*', 'synchronous rolling', 'Når bølgene treffer i samme takt som båten ruller, blir rullingen større og større. Endre kurs eller fart.', 'When the waves hit in step with the boat\'s roll, the roll grows and grows. Change course or speed.'],
  ['nautiske mil|nautisk mil', 'nautical miles?', 'Avstand på sjøen: én nautisk mil er 1 852 meter. Skrives nm.', 'Distance at sea: one nautical mile is 1,852 metres. Written nm.'],
  // (steg 152, K4 of docs/planer/regler-i-klartekst.md; Jonas 25.11.2026, V3 A) the words of the regulation: the pages say the plain word first
  // and the trade's own in brackets, and Fiskeridirektoratet's letters, Kystposten and «Loven bak» keep the trade's own. Here each is
  // told in a sentence, so a tap on it answers. Checked against the system document's sources (kvoter-og-regler.md kap. 6)
  ['åpen gruppe', 'open group', 'Båter under 11 m uten hjemmel. De deler én gruppekvote, og hver båt har et tak (maksimalkvoten). Eieren må selv være om bord.', 'Boats under 11 m without a participation right. They share one group quota, and each boat has a cap (the maximum quota). The owner must be aboard.'],
  ['lukket gruppe', 'closed group', 'Båter med hjemmel. Hver båt har sin egen torskekvote hele året, og den stoppes ikke.', 'Boats with a participation right. Each has a cod quota of its own all year, and it is not stopped.'],
  ['hjemmel(?:en|slengde|slengden)?|hjemler|hjemlene|deltakeradgang\\p{L}*', 'participation rights?', 'Retten til å fiske i lukket gruppe. Den hører til båten og kan kjøpes og selges, og den som eier den, må stå på blad B.', 'The right to fish in the closed group. It belongs to the boat and can be bought and sold, and its owner must be on blad B.'],
  ['maksimalkvot\\p{L}*', 'maximum quotas?', 'Det meste båten kan lande av arten i år, så lenge gruppekvoten ikke er fisket.', 'The most the boat may land of the species this year, as long as the group quota is not fished.'],
  ['garantert(?:e)? kvot\\p{L}*', 'guaranteed quotas?', 'Det båten kan lande uansett, også etter at fisket på maksimalkvotene er stoppet.', 'What the boat may land in any case, also after fishing on the maximum quotas is stopped.'],
  ['fartøykvot\\p{L}*', 'vessel quotas?', 'Båtens egen kvote i lukket gruppe.', 'The boat\'s own quota in the closed group.'],
  ['kvotefaktor\\p{L}*', 'quota factors?', 'Tallet som sier hvor stor del av gruppas kvote hjemmelen gir.', 'The figure that says how large a part of the group\'s quota the right gives.'],
  ['adgang', 'access', 'At båten har lov til å fiske torsk, hyse og sei for salg. Uten adgang kan de bare være bifangst.', 'That the boat may fish cod, haddock and saithe for sale. Without access they can only be bycatch.'],
  ['inndratt|inndras|inndrar', 'confiscated', 'Fisk over kvoten eller regelen betaler salgslaget ikke for. Du får 20 % av verdien for å føre den i land.', 'Fish over the quota or the rule the sales organisation does not pay for. You get 20% of its value for landing it.'],
  ['blad B', 'blad B', 'Den delen av fiskermanntallet der de med fiske som hovedyrke står. Kreves for å kjøpe en båt med hjemmel.', 'The part of the fishermen\'s register for those with fishing as their main occupation. Needed to buy a boat with a participation right.'],
  ['ferskfiskordning\\p{L}*', 'fresh-fish scheme', 'Et tillegg om høsten: en del av ukas ferske leveringer kan være torsk utenom kvoten.', 'An allowance in the autumn: a part of the week\'s fresh landings may be cod beyond the quota.'],
  ['strukturkvot\\p{L}*', 'structure quotas?', 'Kvoten fra en annen båt i samme gruppe, lagt til din i 20 år med 10 % avkorting.', 'The quota of another boat in the same group, added to yours for 20 years less 10%.'],
  ['høvedsmann\\p{L}*', 'master', 'Den som fører båten. I åpen gruppe må eieren selv være om bord.', 'The one in command of the boat. In the open group the owner must be aboard.'],
  ['knop', 'knots?', 'Fart på sjøen: én nautisk mil i timen, omtrent 1,85 km/t. Skrives kn.', 'Speed at sea: one nautical mile an hour, about 1.85 km/h. Written kn.'],
];
const ORDRX = {};
const ordRx = lang => ORDRX[lang] || (ORDRX[lang] = ORDBOK.map(w => new RegExp('(?<![\\p{L}\\p{N}])(?:' + w[lang === 'en' ? 1 : 0] + ')(?![\\p{L}\\p{N}])', 'iu')));
// running text only: what acts on a tap, form fields, headings, tables' heads and the place head are left as they are
const ORD_SKIP = 'button,a,select,option,input,textarea,label,h1,h2,h3,h4,th,[data-act],[data-pa],[data-close],.pl-head,.ordw,.ph-tabs,.ph-sub,#drawerTabs';
function ordbok(root){
  if (!root || (S.settings && S.settings.ordbok === false)) return;
  const rx = ordRx(S.lang), done = new Set(), tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n => n.nodeValue.length > 2 && !(n.parentElement && n.parentElement.closest(ORD_SKIP)) ? 1 : 3});
  const nodes = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) nodes.push(n);
  for (const n of nodes){
    if (done.size === rx.length) break;
    let best = null;
    rx.forEach((r, i) => { if (done.has(i)) return; const m = r.exec(n.nodeValue); if (m && (!best || m.index < best.m.index)) best = {m, i}; });
    if (!best) continue;
    done.add(best.i);
    const a = n.splitText(best.m.index); a.splitText(best.m[0].length);
    const w = document.createElement('span'); w.className = 'ordw'; w.dataset.gl = best.i; w.tabIndex = 0; w.textContent = a.nodeValue; a.replaceWith(w);
  }
}
// the explanation: one card by the word, gone at the next tap anywhere
let ORD_TIP = null;
function ordTip(el, head, text){
  if (!ORD_TIP){ ORD_TIP = document.createElement('div'); ORD_TIP.id = 'ordTip'; ORD_TIP.setAttribute('role', 'tooltip'); document.body.appendChild(ORD_TIP); }
  if (text == null){ const w = ORDBOK[+el.dataset.gl]; if (!w) return; head = el.textContent; text = S.lang === 'en' ? w[3] : w[2]; }
  ORD_TIP.innerHTML = '<b>' + head + '</b>' + text;
  ORD_TIP.hidden = false; ORD_TIP.style.left = '0px'; ORD_TIP.style.top = '0px';
  const r = el.getBoundingClientRect(), tr = ORD_TIP.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const x = Math.max(8, Math.min(W - tr.width - 8, r.left + r.width / 2 - tr.width / 2)), y = r.bottom + 8 + tr.height < H - 8 ? r.bottom + 8 : Math.max(8, r.top - 8 - tr.height);
  ORD_TIP.style.left = Math.round(x) + 'px'; ORD_TIP.style.top = Math.round(y) + 'px';
}
// the chart plotter's instruments along the top (UI-redesign U8): a tap on one says what it shows
const ECDIS_EXPL = {
  ecHdg:['Styrekursen: retningen baugen peker, i grader fra nord.', 'The heading: the way the bow points, in degrees from north.'],
  ecSog:['Farten over grunnen i knop, det båten faktisk går med strøm og vind.', 'The speed over the ground in knots, what the boat really makes with current and wind.'],
  ecPos:['Posisjonen fra GPS-en, i breddegrad (N) og lengdegrad (Ø).', 'The position from the GPS, in latitude (N) and longitude (E).'],
  ecWpt:['Neste veipunkt på ruta: kursen og avstanden dit.', 'The next waypoint of the route: the course and the distance there.'],
  ecEta:['Når båten er framme ved neste veipunkt med farten nå.', 'When the boat reaches the next waypoint at the speed now.'],
  ecDep:['Dybden under båten fra ekkoloddet.', 'The depth under the boat from the echo sounder.'],
  ecTide:['Vannstanden over sjøkartets null, og når neste flo eller fjære kommer.', 'The water level above the chart datum, and when the next high or low water comes.'],
  ecSun:['Når sola står opp og går ned i dag.', 'When the sun rises and sets today.'],
};
document.addEventListener('click', e => {
  const g = e.target.closest && e.target.closest('.ordw');
  if (g){ e.stopPropagation(); e.preventDefault(); ordTip(g); return; }
  const f = e.target.closest && e.target.closest('#ecdisTop .ec-f'), b = f && f.querySelector('b[id]'), x = b && ECDIS_EXPL[b.id];
  if (x){ const sm = f.querySelector('small'); ordTip(f, sm ? sm.textContent : '', S.lang === 'en' ? x[1] : x[0]); return; }
  if (ORD_TIP && !ORD_TIP.hidden) ORD_TIP.hidden = true;
}, true);
document.addEventListener('scroll', () => { if (ORD_TIP) ORD_TIP.hidden = true; }, true);
