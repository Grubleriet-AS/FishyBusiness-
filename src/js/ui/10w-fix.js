// ---- an admin's correction, delivered to this game (26.11.2026; supabase/migrations/20261126120000_fixes.sql, the tab «Korrigering» in
// /admin). The server never touches the save: the game asks for its open corrections (fix_pending) a little after start, every ten
// minutes while it is shown and when it is shown again, does each in its own state and tells the server what it did (fix_done). One that
// must wait (not in port, the vessel not of the type yet) is told as a wait and asked again; the player is told once what to do.
// Kinds: 'undo_buy' (core/03-simulation.js undoBuyApply).
const ADMFIX = {busy:false, told:{}};
const ADMFIX_WAIT = {
  port:['Kystmegleren har en melding til deg om båtkjøpet: gå til kai, så ordnes det.', 'The broker has word about your vessel purchase: go alongside, and it will be put right.'],
  hold:['Kystmegleren har en melding til deg om båtkjøpet: lever fangsten først, så ordnes det.', 'The broker has word about your vessel purchase: land the catch first, and it will be put right.']
};
async function fixClaim(){
  if (ADMFIX.busy || typeof CLOUD === 'undefined' || !CLOUD.on || !CLOUD.user || CLOUD.guest || typeof S === 'undefined' || !S || !S.boat) return;
  ADMFIX.busy = true;
  try {
    let list; try { list = await cloudRpc('fix_pending', {}); } catch (e){ return; }   // (a server without the migration answers 404: nothing to do)
    for (const f of list || []){
      if (f.kind !== 'undo_buy'){ continue; }   // a kind this game does not know waits for a game that does
      const d = f.data || {}, r = undoBuyApply({from:d.from, to:d.to, kr:d.kr == null ? null : +d.kr});
      if (!r.ok){
        const done = r.why === 'bad' || (r.why === 'type' && S.boat.type === d.from);   // closed: one that can never be done, and one already done (saved, the server not told); the rest wait
        if (ADMFIX_WAIT[r.why] && !ADMFIX.told[f.id]){ ADMFIX.told[f.id] = 1; msg('Kystmegleren', ADMFIX_WAIT[r.why][0], ADMFIX_WAIT[r.why][1]); }
        cloudRpc('fix_done', {fid:f.id, res:{ok:false, why:r.why, type:S.boat.type, at:new Date().toISOString()}, done}).catch(e => console.error(e));
        continue;
      }
      const V = VESSELS[d.from], no = f.note || ('Båtkjøpet er angret. ' + V.name.no + ' er din igjen, og ' + kr(r.kr) + ' er betalt tilbake' + (r.off > 0 ? ' (' + kr(r.off) + ' av det gikk til lånene)' : '') + '.');
      log(no, 'The vessel purchase is undone. The ' + V.name.en + ' is yours again, and ' + kr(r.kr) + ' has been paid back.');
      msg('Kystmegleren', no, 'The vessel purchase is undone. The ' + V.name.en + ' is yours again, and ' + kr(r.kr) + ' has been paid back' + (r.off > 0 ? ' (' + kr(r.off) + ' of it paid off the loans)' : '') + '.');
      if (typeof G3 !== 'undefined') try { G3.vesselChanged(); } catch (e){ console.error(e); }
      try { refreshAll(); } catch (e){}
      toast(S.lang === 'no' ? 'Båtkjøpet er angret: ' + V.name.no + ' er din igjen.' : 'The vessel purchase is undone: the ' + V.name.en + ' is yours again.');
      if (typeof cloudEv === 'function') cloudEv('fix_done', {k:f.kind, kr:r.kr});
      // the save first, then the server told: a game closed between the two does the row again on a save that is already right, and
      // undoBuyApply refuses it there ('type'), so it is never done twice
      try { await cloudSaveSoon(false, true); } catch (e){ console.error(e); }
      try { await cloudRpc('fix_done', {fid:f.id, res:{...r, from:d.from, to:d.to, at:new Date().toISOString()}, done:true}); } catch (e){ console.error(e); }
    }
  } finally { ADMFIX.busy = false; }
}
setTimeout(fixClaim, 20000);
setInterval(() => { if (document.visibilityState === 'visible') fixClaim(); }, 10 * 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(fixClaim, 3000); });
