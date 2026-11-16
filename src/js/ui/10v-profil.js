// ===== The profile and the founders' badge (Jonas 16.11.2026, before the launch: «profil-side med brukernavn, fartstid, ferdigheter,
// potensiell rederi-info, antall båter, founders badge, profilbilde, selskapsverdi og total fangst statistikk, Plassering på topplisten.
// Profilsiden skal være åpen for andre brukere»; supabase/migrations/20261116120000_lansering.sql) =====
// The Profil app shows the player's own profile, and any other player's from the leaderboard or the AIS card (PROF.open(hid)). What only
// the game knows (the boats, the fleet's value, the company's worth, the form, the milestones, the records) goes up with prof_put when it
// changes, at most every ten minutes with the shared world (ui/10h-world.js worldShare); the sea time, the name, the catch landed and the
// place on the total list are the server's own. Everything is open to all (Jonas: «Alt åpent, ikke valgbart»). Haill is never in it.
// The picture: the player's own, shrunk to 256 px, shown to others only once the admin has approved it (Jonas: «Eget bilde med
// godkjenning»; players from 13 years). «Ferdigheter»: the player has no skill figures of their own in the game (only the crew has, core/
// 13-work.js stSkill), so the profile shows what the player has done: the milestones and the biggest fish of each species (09b-records.js).
const PROF = (() => {
  const C = new Map(), L2 = (no, en) => S.lang === 'en' ? en : no;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
  const kv = (a, b) => '<div class="ph-kv"><span>' + a + '</span><span>' + b + '</span></div>';
  const vName = t => { const V = VESSELS[t]; return V && V.name ? esc(V.name[S.lang] || V.name.no) : esc(t); };
  const on = () => typeof CLOUD !== 'undefined' && CLOUD.on && CLOUD.user;
  let want = null;   // whose profile the app shows: a public id, or null for the player's own
  const redraw = () => { if (typeof PHONE !== 'undefined' && PHONE.isOpen() && PHONE.app === 'profil') PHONE.render(); };
  // one profile, fetched at most every 30 seconds; e.err 'old' while the database does not have it yet
  function get(hid){
    if (!on()) return null;
    const k = hid || 'me'; let e = C.get(k); if (!e){ if (C.size > 40) C.delete(C.keys().next().value); C.set(k, e = {at:0, data:null, busy:false, err:null}); }
    if (!e.busy && Date.now() - e.at > 30000){ e.busy = true;
      cloudRpc('profile_get', {hid:k}).then(d => { e.data = d; e.err = null; }).catch(x => { e.err = / 404$/.test(x.message) ? 'old' : 'net'; })
        .finally(() => { e.busy = false; e.at = Date.now(); redraw(); }); }
    return e;
  }
  function open(hid){ want = hid || null; if (typeof PHONE !== 'undefined') PHONE.open('profil'); }
  // the game's own figures for the profile
  function figures(){
    const fl = S.fleet || [], value = fl.reduce((a, v) => { try { return a + vesselValue(v); } catch (e){ return a; } }, 0);
    const debt = ((S.loan && S.loan.bal) || 0) + ((S.loanIN && S.loanIN.bal) || 0), spare = (S.bank && S.bank.spare) || 0;
    const recs = Object.values(typeof recState === 'function' ? recState() : (S.rec || {})).filter(r => r && r.kg > 0).sort((a, b) => b.kg - a.kg).slice(0, 6).map(r => ({sp:r.sp, kg:+(+r.kg).toFixed(1)}));
    return {fleet:fl.length, value:Math.round(value), worth:Math.round(value + (S.cash || 0) + spare - debt), company:String(S.company || '').slice(0, 40), form:S.form === 'AS' ? 'AS' : 'ENK',
      ach:S.ach && S.ach.d ? Object.keys(S.ach.d).length : 0, boats:fl.slice(0, 20).map(v => ({n:String(vget(v, 'boatName') || '').slice(0, 24), t:(vget(v, 'boat') || {}).type || ''})), recs};
  }
  let lastPut = '';
  async function put(){
    if (!on() || (typeof isGuest === 'function' && isGuest())) return;
    const d = figures(), k = JSON.stringify(d); if (k === lastPut) return;
    // (false: the server held it back, at most every 30 s; the next round sends it again)
    try { const r = await cloudRpc('prof_put', {d}); if (r !== false){ lastPut = k; C.delete('me'); } } catch (e){}
  }
  // the player's own picture: where it stands (wait, ok, no)
  const AV = {mine:null, at:0, busy:false, up:false};
  function avMine(){
    if (!on() || AV.busy || Date.now() - AV.at < 30000) return AV.mine; AV.busy = true;
    cloudRpc('av_mine', {}).then(r => { AV.mine = r || null; }).catch(() => {}).finally(() => { AV.busy = false; AV.at = Date.now(); redraw(); });
    return AV.mine;
  }
  async function avPick(file){
    if (!file || !/^image\//.test(file.type)){ toast(L2('Det er ikke et bilde.', 'That is not a picture.')); return; }
    AV.up = true; redraw();
    try {
      const u = URL.createObjectURL(file), im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; }); URL.revokeObjectURL(u);
      const s = Math.min(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 256;
      c.getContext('2d').drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);   // (the middle square)
      await cloudRpc('av_put', {img:c.toDataURL('image/jpeg', 0.82)});
      AV.at = 0; C.delete('me'); toast(L2('Bildet er sendt. Andre ser det når det er godkjent.', 'The picture is sent. Others see it once it is approved.'), 6000);
    } catch (e){ toast(/too soon/.test(e.message) ? L2('Vent et minutt før du bytter bilde igjen.', 'Wait a minute before you change the picture again.') : L2('Fikk ikke sendt bildet. Prøv igjen.', 'Could not send the picture. Try again.')); }
    AV.up = false; redraw();
  }
  function avAsk(){ const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => avPick(i.files && i.files[0]); i.click(); }
  // the founders' badge: the number of the first hundred who landed fish
  const badge = no => no ? '<span class="pf-fb" title="' + L2('En av de 100 første som leverte fisk', 'One of the first 100 who landed fish') + '">Founder #' + no + '</span>' : '';
  const krN = n => fmt(Math.round(n || 0), 0) + ' kr';
  function page(){
    if (!on()) return '<div class="ph-c"><div class="ph-card"><p class="ph-note">' + L2('Profilen vises når du er logget inn.', 'The profile shows when you are signed in.') + '</p></div></div>';
    const e = get(want), d = e && e.data, me = !want || (d && d.me);
    if (e && e.err === 'old') return '<div class="ph-c"><div class="ph-card"><p class="ph-note">' + L2('Profilene kommer snart.', 'The profiles are coming soon.') + '</p></div></div>';
    if (!d) return '<div class="ph-c"><div class="ph-card"><p class="ph-note">' + (e && e.err ? L2('Fikk ikke hentet profilen. Sjekk nettet.', 'Could not fetch the profile. Check the network.') : e && e.at && !e.busy ? L2('Fant ikke spilleren.', 'Player not found.') : L2('Henter profilen …', 'Fetching the profile …')) + '</p></div></div>';
    const P = d.prof || {}, h = ['<div class="ph-c">'];
    // the head: the picture, the name, the badge and the sea time
    const mine = me ? avMine() : null, img = d.img || (me && mine && mine.img) || '';
    const pic = /^data:image\/(jpeg|png|webp);base64,/.test(img) ? '<img class="pf-img" alt="" src="' + img + '">' : '<span class="pf-img pf-none">' + esc((d.user || '?').slice(0, 1).toUpperCase()) + '</span>';
    h.push('<div class="ph-card pf-head">' + pic + '<div><h4 style="margin:0">' + esc(d.user || L2('Uten navn', 'No name')) + '</h4>' + badge(d.f) +
      '<p class="ph-note" style="margin:4px 0 0">' + (typeof fsText === 'function' ? esc(fsText(d.fs || 0, true)) : '') + (d.since ? ' · ' + L2('med siden ', 'since ') + new Date(d.since).toLocaleDateString(S.lang === 'en' ? 'en-GB' : 'nb-NO') : '') + '</p></div></div>');
    if (me){ const st = mine && mine.state;
      h.push('<div class="ph-card"><h4>' + L2('Profilbilde', 'Profile picture') + '</h4><p class="ph-note">' + (st === 'wait' ? L2('Bildet ditt venter på godkjenning. Til da ser de andre forbokstaven din.', 'Your picture is waiting for approval. Until then the others see your initial.')
        : st === 'no' ? L2('Bildet ble ikke godkjent. Velg et annet.', 'The picture was not approved. Choose another.') : st === 'ok' ? L2('Bildet ditt er godkjent og synlig for alle.', 'Your picture is approved and visible to all.')
        : L2('Velg et bilde. Det vises for andre når det er godkjent.', 'Choose a picture. It shows to others once it is approved.')) + '</p><div class="ph-btncol"><button class="ph-btn" data-pa="pfav"' + (AV.up ? ' disabled' : '') + '>' +
        (AV.up ? L2('Sender …', 'Sending …') : L2('Velg profilbilde', 'Choose a profile picture')) + '</button></div></div>'); }
    // the leaderboard and the catch
    h.push('<div class="ph-card"><h4>' + L2('Fangst', 'Catch') + '</h4>' + kv(L2('Plass på topplista (totalt)', 'Place on the leaderboard (total)'), d.rank ? '#' + d.rank + ' ' + L2('av ', 'of ') + fmt(d.n || 0, 0) : '–') +
      kv(L2('Landet i alt', 'Landed in all'), fmt(d.kg || 0, 0) + ' kg') + kv(L2('Fangstverdi i alt', 'Catch value in all'), krN(d.kr)) + (d.ports ? kv(L2('Mottak levert til', 'Plants delivered to'), fmt(d.ports, 0)) : '') + '</div>');
    // the company and the boats
    if (P.fleet != null){
      h.push('<div class="ph-card"><h4>' + (P.form === 'AS' ? esc(P.company || L2('Rederi', 'Company')) : L2('Foretaket', 'The business')) + '</h4>' +
        kv(L2('Form', 'Form'), P.form === 'AS' ? L2('Aksjeselskap', 'Limited company') : L2('Enkeltpersonforetak', 'Sole proprietorship')) +
        kv(L2('Selskapsverdi', 'Company worth'), krN(P.worth)) + kv(L2('Flåtens verdi', 'Fleet value'), krN(P.value)) + kv(L2('Båter', 'Boats'), fmt(P.fleet, 0)) +
        (P.boats || []).map(b => kv(esc(b.n || '–'), vName(b.t))).join('') + '</div>');
      h.push('<div class="ph-card"><h4>' + L2('Ferdigheter', 'Skills') + '</h4>' + kv(L2('Milepæler', 'Milestones'), fmt(P.ach || 0, 0)) +
        ((P.recs || []).length ? '<p class="ph-note" style="margin:6px 0 2px">' + L2('Største fisk', 'Biggest fish') + '</p>' + P.recs.map(r => kv(esc(typeof spName === 'function' && SPECIES[r.sp] ? spName(r.sp) : r.sp), fmt(r.kg, 1) + ' kg')).join('') : '') + '</div>');
    } else if (!me) h.push('<div class="ph-card"><p class="ph-note">' + L2('Spilleren har ikke vært inne siden profilene kom.', 'The player has not been in since the profiles came.') + '</p></div>');
    if (me) h.push('<p class="ph-note" style="padding:0 4px">' + L2('Profilen din er åpen for alle spillerne.', 'Your profile is open to all the players.') + '</p>');
    h.push('</div>'); return h.join('');
  }
  // «Se profilen» on another player's AIS card (ui/03-map.js aisInfo)
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pfo]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); open(b.dataset.pfo);
  }, true);
  return {get, open, put, page, badge, avAsk, get want(){ return want; }, set want(v){ want = v || null; }};
})();
