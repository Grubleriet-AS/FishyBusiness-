// The fine coast's point test (core/01d-coast.js coastQuery, and its copy in the field's worker in 17-farbar.js): a point on the very
// row of a level edge of the coast (the data's points sit on whole metres, and so do the field's cells' middles at 2 m) was counted
// as land along the whole cell beyond the edge's end. At Lindesnes (steg 142, 26.11.2026) that made a line with no width, 60 m long,
// across the mouth of the basin, and the field shut the harbour for every boat. The way down the cell's left side counted an edge
// met at the point's own row as not yet crossed, while the way across counted the row's own points as passed.
export default function (t){
  const {coastBuild, coastQuery, COAST} = t.K;
  const vu = (b, v) => { do { let c = v & 127; v = Math.floor(v / 128); if (v) c |= 128; b.push(c); } while (v); }, zz = v => v < 0 ? -2 * v - 1 : 2 * v;
  const enc = rings => { const b = []; vu(b, rings.length); for (const [cls, P] of rings){ vu(b, cls); vu(b, P.length); let x = 0, y = 0; for (const [px, py] of P){ vu(b, zz(px - x)); vu(b, zz(py - y)); x = px; y = py; } } return Uint8Array.from(b); };
  // land: x 0..110, y 0..150 (metres from the tile's corner); its bottom edge lies on y = 150 and crosses the cells' left side at x 100.371
  const I = coastBuild(enc([[0, [[0, 0], [110, 0], [110, 150], [0, 150]]]]), 1000, COAST.CC, COAST.COX, COAST.COY);
  t.eq(coastQuery(I, 130, 150), 0, 'et punkt på samme rad som en vannrett kant, utenfor landet, er sjø');
  t.eq(coastQuery(I, 130, 149.5), 0, 'like over raden er det sjø');
  t.eq(coastQuery(I, 105, 150.5), 0, 'like under landet er det sjø');
  t.eq(coastQuery(I, 105, 149.5), 1, 'like innenfor landet er det land');
  t.eq(coastQuery(I, 105, 150), 0, 'på landets egen nederste kant (raden telles som passert) er det sjø');
  t.eq(coastQuery(I, 130, 120), 0, 'ved siden av landet er det sjø');
  // every whole-metre point of the box, against the plain answer (the box with its top and right edges, not its bottom)
  // (a point on a right-hand edge is inside: the way across stops short of it)
  let bad = 0, n = 0;
  for (let y = 90; y <= 160; y++) for (let x = 90; x <= 140; x++){ n++; const want = x >= 0 && x <= 110 && y >= 0 && y < 150 ? 1 : 0; if (coastQuery(I, x, y) !== want) bad++; }
  t.eq(bad, 0, 'hver hele meter rundt hjørnet svarer som rektangelet (' + n + ' punkter)');
}
