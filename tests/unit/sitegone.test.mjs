// The rorbuer taken away (steg 126, Jonas 15.11.2026: «Om noen rorbuer er plassert på plasser som gjør det umulig å seile dit på laveste
// lavvann ved hjelp av autonav-funksjonen, fjerner du dem»): «gone» in src/data/rorbuer.json (tools/rorbu/rorbuvei.py --gone). Such a rorbu
// keeps its id in RBID (a save with the boat there is moved at start-up), is not in RORBUER (not drawn, not tapped), siteGone says so,
// siteFits turns every boat away, and siteWhy says why in both languages.
export default function (t){
  const K = t.K, RB = K.get('RBID'), list = K.get('RORBUER'), gone = [...K.get('RORBU_GONE')];
  t.ok(gone.includes('rb90') && gone.includes('rb426'), 'RORBU_GONE: Langvasseid og Austgulen er tatt bort', gone);
  t.ok(gone.every(id => RB.get(id) && RB.get(id).gone), 'RBID: de bortatte står der fortsatt, merket gone');
  t.ok(gone.every(id => !list.some(R => R.id === id)), 'RORBUER: de bortatte er ikke med');
  t.ok(gone.every(id => K.siteGone(id)) && !K.siteGone('rb1') && !K.siteGone(null), 'siteGone: sant bare for de bortatte');
  t.ok(gone.every(id => !K.siteFits('sjark', id) && !K.siteFits('kyst15', id)), 'siteFits: ingen båt passer en bortatt rorbu');
  const w = K.siteWhy('sjark', 'rb90');
  t.ok(w && /tatt bort/.test(w[0]) && w[1] && w[1].length > 10, 'siteWhy: sier at rorbua er tatt bort, på norsk og engelsk', w);
}
