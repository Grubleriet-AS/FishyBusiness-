// Steg 125f (crewclip): a link of the walking map (vessel3d.js deckMap: a step, a ladder, a stair the model names, a squeeze past a bar)
// has its head on the floor it was made for. Where the head of a stair lies over a lower deck, the map holds the lower floor in that
// cell, and the way went on along the lower deck under the stair, through it: the snow crab boat's stair to the shelter deck, 4.4 m of
// deck walked through its treads. Every link of every boat: the two ends' heights in the map differ by the link's own rise (within 0.3 m).
export const scripts = ['js/figpose.js', 'js/vessel3d.js', 'js/deckcrew.js'];
export const data = true;

export default function (t){
  const K = t.K, {VESSELS, deckMap} = K, bad = [];
  let n = 0;
  for (const vt of Object.keys(VESSELS)){ const M = deckMap(vt); if (!M) continue;
    for (const [a, b, dy] of M.links){ n++; const ya = M.at(a)[1], yb = M.at(b)[1]; if (a === b || !(Math.abs(yb - ya - dy) <= 0.3)) bad.push(vt + ' ' + [ya, yb, dy].map(v => +(+v).toFixed(2)).join('/')); } }
  t.ok(n > 10 && !bad.length, 'dekkskartet: hver lenke ender på dørken den ble laget for (' + n + ' lenker)', bad.slice(0, 6));
}
