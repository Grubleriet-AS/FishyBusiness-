// ---- an admin's correction, delivered to this game (26.11.2026; supabase/migrations/20261126120000_fixes.sql, the tab «Korrigering» in
// /admin). The server never touches the save: the game asks for its open corrections (fix_pending) a little after start, every ten
// minutes while it is shown and when it is shown again, does each in its own state and tells the server what it did (fix_done). Only the
// page that has the game asks (TAB.held / TAB.lost: a page that has passed it on sends nothing). One that must wait (not in port, too much
// fish aboard, another vessel followed) is told as a wait and asked again, and the player is told once (S.fixTold, kept in the save).
// A row done is kept in the save (S.fixDone, core undoBuyApply), and the server is told done only once the save with it has reached the
// account (CLOUD.lastSave is the save's own time): a save that fails leaves the row open, and the next round saves and tells again.
// Kinds: 'undo_buy' (core/03-simulation.js undoBuyApply).
const ADMFIX = {busy:false};
const ADMFIX_WAIT = {
  port:['Kystmegleren har en melding til deg om båtkjøpet: gå til kai, så ordnes det.', 'The broker has word about your vessel purchase: go alongside, and it will be put right.'],
  hold:['Kystmegleren har en melding til deg om båtkjøpet: lever fangsten først, så ordnes det.', 'The broker has word about your vessel purchase: land the catch first, and it will be put right.'],
  type:['Kystmegleren har en melding til deg om båtkjøpet: ta roret på båten det gjelder, i havn, så ordnes det.', 'The broker has word about your vessel purchase: take the helm of the vessel it is about, in port, and it will be put right.']
};
// the save with the correction on the account: true once it is there. A save made at or after t0 has reached it (CLOUD.lastSave is the
// time of the save that did); not S.lastReal after the wait, which the game's own saves move on meanwhile (Julian 26.11.2026: the
// correction was done and saved, and the server was never told). A save that did not go (another one under way, the network) asks
// again in half a minute rather than in ten
async function admfixSaved(){
  const t0 = Date.now();
  try { await cloudSaveSoon(false, true); } catch (e){ console.error(e); }
  if (CLOUD.lastSave >= t0) return true;
  setTimeout(fixClaim, 30000); return false;
}
async function fixClaim(){
  if (ADMFIX.busy || typeof CLOUD === 'undefined' || !CLOUD.on || !CLOUD.user || CLOUD.guest || typeof S === 'undefined' || !S || !S.boat) return;
  if (typeof TAB !== 'undefined' && (TAB.held || TAB.lost)) return;
  ADMFIX.busy = true;
  try {
    let list; try { list = await cloudRpc('fix_pending', {}); } catch (e){ return; }   // (a server without the migration answers 404: nothing to do)
    for (const f of list || []){
      if (f.kind !== 'undo_buy') continue;   // a kind this game does not know waits for a game that does
      const d = f.data || {}, r = undoBuyApply({id:f.id, from:d.from, to:d.to, kr:d.kr == null ? null : +d.kr});
      if (!r.ok && r.why === 'done'){
        // done here before, the server not told (the save had not reached the account, or the answer was lost): save and tell now
        if (await admfixSaved()) await cloudRpc('fix_done', {fid:f.id, res:{...S.fixDone[f.id], from:d.from, to:d.to, at:new Date().toISOString()}, done:true}).catch(e => console.error(e));
        continue;
      }
      if (!r.ok){
        const told = S.fixTold || (S.fixTold = {});
        if (ADMFIX_WAIT[r.why] && !told[f.id]){ told[f.id] = 1; msg('Kystmegleren', ADMFIX_WAIT[r.why][0], ADMFIX_WAIT[r.why][1]); }
        cloudRpc('fix_done', {fid:f.id, res:{ok:false, why:r.why, type:S.boat.type, at:new Date().toISOString()}, done:r.why === 'bad'}).catch(e => console.error(e));
        continue;
      }
      const V = VESSELS[d.from], back = r.off > 0 ? [' (' + kr(r.off) + ' av det gikk til lånene)', ' (' + kr(r.off) + ' of it paid off the loans)'] : ['', ''];
      const no = f.note || ('Båtkjøpet er angret. ' + V.name.no + ' er din igjen, og ' + kr(r.kr) + ' er betalt tilbake' + back[0] + '.'),
        en = 'The vessel purchase is undone. The ' + V.name.en + ' is yours again, and ' + kr(r.kr) + ' has been paid back' + back[1] + '.';
      log(no, en); msg('Kystmegleren', no, en);
      if (typeof G3 !== 'undefined') try { G3.vesselChanged(); } catch (e){ console.error(e); }
      try { refreshAll(); } catch (e){}
      toast(S.lang === 'no' ? 'Båtkjøpet er angret: ' + V.name.no + ' er din igjen.' : 'The vessel purchase is undone: the ' + V.name.en + ' is yours again.');
      if (typeof cloudEv === 'function') cloudEv('fix_done', {k:f.kind, kr:r.kr});
      if (await admfixSaved()) await cloudRpc('fix_done', {fid:f.id, res:{...r, from:d.from, to:d.to, at:new Date().toISOString()}, done:true}).catch(e => console.error(e));
    }
  } finally { ADMFIX.busy = false; }
}
setTimeout(fixClaim, 20000);
setInterval(() => { if (document.visibilityState === 'visible') fixClaim(); }, 10 * 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(fixClaim, 3000); });
