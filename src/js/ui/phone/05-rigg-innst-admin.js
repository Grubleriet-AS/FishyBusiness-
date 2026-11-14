  // the rig: one kind of fishing at a time, chosen in Om bord › Redskap when none of the boat's gear is in the sea (D4, Jonas 13.11.2026:
  // «"Redskap" og "rigg" kan slås sammen slik at man inne på redskap velger hvilket redskap som skal være aktivt»: one card with a row
  // for each rig, where the page of its own had a card each and a wall of text over them)
  function rigg(){
    const cur = rigOf();
    const need = {juksa:L('håndjuksa eller juksamaskin', 'a hand jig or jigging reels'), line:L('linehaler', 'a line hauler'), garn:handGear('garn') ? L('ingen haler: trekkes for hånd', 'no hauler: drawn by hand') : L('garnhaler', 'a net hauler'), teiner:L('teinehaler', 'a pot hauler')};
    const rows = Object.keys(RIGS).map(r => { const why = r === cur ? null : rigBlock(r);
      return '<div class="rig-r' + (r === cur ? ' on' : '') + '"><div class="rig-t"><b>' + L(RIGS[r].no, RIGS[r].en) + '</b><span>' + (r === cur ? L('rigget nå', 'rigged now') : why ? why[0] : L('krever ', 'needs ') + need[r]) + '</span></div>' +
        (r === cur ? '<span class="rig-on">✓</span>' : why ? '' : '<button class="ph-btn p" data-pa="rig" data-r="' + r + '">' + L('Rigg om', 'Re-rig') + '</button>') + '</div>'; }).join('');
    return '<div class="ph-c" style="padding-bottom:0"><div class="ph-card rigc"><h4>' + L('Rigg', 'Rig') + '</h4>' + rows +
      '<p class="ph-note">' + L('Ett redskap om gangen; juksa er alltid med når båten ligger i ro. Å rigge om er gratis og skjer med en gang, så lenge ingen garn, liner eller teiner står i sjøen.', 'One kind of gear at a time; the jig is always with you when the boat lies still. Re-rigging is free and at once, as long as no nets, lines or pots stand in the sea.') + '</p></div></div>';
  }
  // «Om bord» (UI 2, U2-2, 06.11.2026; was Beholdning): what the boat has: gear aboard and in the sea, the hold, the boat herself, and
  // the crew as the fifth tab (the Mannskap page, ui/05b-work.js, as it was; the dock's Mannskap button went)
  function beholdning(){
    // (D4: the tabs Redskap (with the rig), Last, Mannskap og drift, and the boat; «Lasterom» is «Last», for many boats carry the fish in
    // tubs on deck, Jonas 13.11.2026. A link to the old tab «rigg» lands on Redskap)
    if (sub.beholdning === 'rigg') sub.beholdning = 'gear';
    const tab = sub.beholdning || 'gear', head = subs('beholdning', [['gear', 'Redskap', 'Gear'], ['last', 'Last', 'Catch'], ['crew', 'Mannskap og drift', 'Crew and plan'], ['boat', 'Båten', 'The boat']]);
    if (tab === 'last') return head + last();
    if (tab === 'boat') return head + fartoy('min');
    if (tab === 'crew') return head + crewTab();
    // the shop's service sits here now, beside the crew's own upkeep (M2): only at a tackle shop's quay
    // (D4: Service is the tackle shop's third tab; here it is a short cut there, and only when gear aboard is worn and the shop is here)
    const svc = atKind('butikk') && svcWorn() ? '<div class="ph-c" style="padding-bottom:0"><div class="ph-card svc-l"><h4>' + L('Slitt redskap om bord', 'Worn gear aboard') + '</h4><p class="ph-note">' + L('Butikken her reparerer og bytter på halve tiden mot et gebyr.', 'The shop here mends and changes in half the time for a fee.') + '</p><button class="ph-btn p" data-pa="open" data-a="service">' + L('Til Service i butikken', 'To Service at the shop') + '</button></div></div>' : '';
    return head + svc + rigg() + (S.pgear ? redskap('bord') + redskap('sjo') : '');
  }
  // the crew tab: the Mannskap page with the plan's line (PAGES().arbeid), and the way to the Ansatte pages (who is signed on, with the
  // quarrel when one waits for an answer, and the crew exchange; ui/phone/13-mannskap-bank-meld.js), first with a quarrel aboard, else last
  function crewTab(){
    // (D4, Jonas 13.11.2026 «Enig»: the work aboard with the plan's line, and the way to those signed on (shares, dismissal, a quarrel
    // to answer: the Ansatte page), first with a quarrel aboard, else last. Nobody is listed twice on the tab, so the list of those signed
    // on is a page behind its button. The crew exchange is in Bygd, and only for hiring. The plan stands under them (the rest of D4,
    // 14.11.2026): the Driftsplan app, the chart's «Ferdig», the company's warnings and the wizard land on it here (DOCK.open 'drift').
    // Another boat's plan opens as her own page from the row under it, for Om bord is the boat you follow)
    const q = !!S.cevt, card = '<div class="ph-c" style="padding-' + (q ? 'bottom' : 'top') + ':0"><div class="ph-card' + (q ? ' conflict' : '') + '"><h4>' + L('Ansatte', 'Employees') + '</h4><p class="ph-note">' +
      (q ? '<b>' + L('Uløst krangel om bord.', 'Unresolved quarrel aboard.') + '</b> ' + L('Svar under Ansatte.', 'Answer under Employees.') : L('Hvem som er mønstret på, lott og oppsigelse. Nye folk ansetter du i Mannskapsbørsen under Bygd.', 'Who is signed on, shares and dismissal. New hands are hired at the crew exchange under Village.')) + '</p>' +
      '<button class="ph-btn' + (q ? ' p' : '') + '" data-pa="open" data-a="mannskap">' + L('Ansatte', 'Employees') + '</button></div></div>';
    const w = WORK.page(), others = (S.fleet || []).filter(v => v.id !== S.cur),
      plan = PLAN2UI.page() + (others.length ? '<div class="ph-c" style="padding-top:0"><div class="ph-card"><h4>' + L('Driftsplanen for de andre båtene', 'The plans of the other boats') + '</h4><div class="ops-days">' +
        others.map(v => '<button class="ph-btn alt" data-pa="p2-other" data-id="' + v.id + '">' + String(vget(v, 'boatName')).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]) + '</button>').join('') + '</div></div></div>' : '');
    return (q ? card + w : w + card) + plan;
  }
  function logg(){ return '<div class="ph-panel">' + panelLog() + '</div>'; }
  // Innstillinger in tabs (Jonas 16.11.2026: «Kan du fikse innstillinger-siden slik at den har faner øverst og ser mer proff ut?»): Spill,
  // Grafikk, Lyd and Konto (sub.innst). The manual helm is not a player's choice any more (Jonas: «Jeg vil bare ikke at spillere skal ha
  // mulighet til å manuelt kjøre båten selv»): its card is in the Admin app, and ui/11-boot.js turns it off for everyone else.
  // The graphics (PGFX, view3d/00-head.js, kept on the device): the level first, then what applies at once, then what needs the 3D view
  // started again (gfxPend holds those until «Bruk»).
  let gfxPend = null;
  // the game's own channels (Jonas 16.11.2026: «Kan du legge inn link til discord, tiktok, instagram, facebook og sånne ting noen steder?
  // Jeg tenker vi må ha en socials-side med linker»): the Fellesskap app and a line in «Om spillet». A channel without its address is
  // left out, so a new one is one line here
  const SOCIAL = [
    {k:'discord', n:'Discord', url:'https://discord.gg/zHej7f8j6', no:'Snakk med andre skippere, meld feil og få nytt først.', en:'Talk with other skippers, report bugs and hear the news first.', c:'#5865f2',
      ic:'<path d="M8.5 7.5c2.3-.7 4.7-.7 7 0M7 16.5c3.2 1.3 6.8 1.3 10 0M8.2 7.6C6.6 10 5.9 12.7 6 15.8c1 .9 2.1 1.5 3.3 1.9l.8-1.5M15.8 7.6c1.6 2.4 2.3 5.1 2.2 8.2-1 .9-2.1 1.5-3.3 1.9l-.8-1.5"/><circle cx="9.7" cy="12.6" r="1.1"/><circle cx="14.3" cy="12.6" r="1.1"/>'},
    {k:'tiktok', n:'TikTok', url:'https://www.tiktok.com/@det.store.bla', no:'Klipp fra kysten og fra det som bygges.', en:'Clips from the coast and from what is being built.', c:'#111',
      ic:'<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.4 2 4 4.5 4.2"/>'},
    {k:'instagram', n:'Instagram', url:'https://www.instagram.com/detstorebla.no/', no:'Bilder fra spillet og fra kysten.', en:'Pictures from the game and the coast.', c:'#c13584',
      ic:'<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".9"/>'},
    {k:'facebook', n:'Facebook', url:'', no:'Nyheter og samtaler med andre spillere.', en:'News and talk with other players.', c:'#1877f2',
      ic:'<path d="M14.5 20v-7h2.3l.4-2.8h-2.7V8.6c0-.8.3-1.3 1.4-1.3h1.4V4.8c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v1.9H9.4V13h2.3v7"/>'},
    {k:'youtube', n:'YouTube', url:'', no:'Lengre videoer og veiledninger.', en:'Longer videos and guides.', c:'#ff0000',
      ic:'<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M10.5 9.5v5l4.3-2.5z"/>'}];
  const socialOn = () => SOCIAL.filter(s => /^https:\/\//.test(s.url));
  const socialSvg = s => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + s.ic + '</svg>';
  function fellesskap(){
    const on = socialOn(), d = on.find(s => s.k === 'discord');
    return '<div class="ph-c">' + (d ? '<div class="ph-card so-hero"><h4>' + L('Bli med i fellesskapet', 'Join the community') + '</h4><p class="ph-note">' + L('Det Store Blå blir til mens du spiller. På Discord møter du de andre skipperne, får hjelp, melder fra om feil og hører det nye først.', 'Det Store Blå is being made while you play. On Discord you meet the other skippers, get help, report bugs and hear the news first.') + '</p>' +
      '<a class="ph-btn p so-btn" style="background:' + d.c + '" href="' + d.url + '" target="_blank" rel="noopener">' + socialSvg(d) + L('Åpne Discord', 'Open Discord') + '</a></div>' : '') +
      '<div class="ph-card"><h4>' + L('Følg Det Store Blå', 'Follow Det Store Blå') + '</h4>' + on.map(s => '<a class="so-row" href="' + s.url + '" target="_blank" rel="noopener"><span class="so-ic" style="background:' + s.c + '">' + socialSvg(s) + '</span><span class="so-t"><b>' + s.n + '</b><small>' + L(s.no, s.en) + '</small></span><span class="so-go">›</span></a>').join('') + '</div>' +
      '<p class="ph-note" style="padding:0 4px">' + L('Lenkene åpnes i en ny fane. Spillet går videre her.', 'The links open in a new tab. The game goes on here.') + '</p></div>';
  }
  const GFX_OFF = [['trees', 'Trær og vind i trærne', 'Trees and wind in the trees'], ['life', 'Fugler, dyr og liv på land', 'Birds, animals and life ashore'], ['foam', 'Skum og brottsjø', 'Foam and breaking seas'],
    ['fft', 'Detaljerte bølger', 'Detailed waves'], ['shore', 'Strand, skjær og småbåthavner', 'Beaches, skerries and marinas'], ['sun', 'Solglitter og skyskygger', 'Sun glitter and cloud shadows']];
  function innstGfx(){
    const g = typeof G3 !== 'undefined' && G3.gfx ? G3.gfx() : {res:1, fps:0, dist:1, shadow:true, off:{}}, now = typeof G3 !== 'undefined' && G3.quality ? G3.quality() : null;
    const q3 = S.settings.q3d || 'auto', ql = [['auto', L('Auto', 'Auto')], ['low', L('Lav', 'Low')], ['mid', L('Middels', 'Medium')], ['high', L('Høy', 'High')], ['ultra', L('Ultra', 'Ultra')]];
    const seg = (k, opts, cur) => '<div class="st-seg">' + opts.map(([v, l]) => '<button class="' + (String(cur) === String(v) ? 'on' : '') + '" data-pa="gfx" data-k="' + k + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
    const row = (name, note, ctl) => '<div class="st-row"><div class="st-l"><b>' + name + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>' + ctl + '</div>';
    const custom = g.res !== 1 || g.fps || g.dist !== 1 || g.shadow === false || GFX_OFF.some(([k]) => g.off && g.off[k]);
    const P = gfxPend || Object.assign({}, g.off || {}), dirty = gfxPend && GFX_OFF.some(([k]) => !!P[k] !== !!(g.off || {})[k]);
    return '<div class="ph-card st-card"><h4>' + L('Kvalitet', 'Quality') + (custom ? ' <span class="st-tag">' + L('Egendefinert', 'Custom') + '</span>' : '') + '</h4>' +
      row(L('Forhåndsvalg', 'Preset'), L('Auto går ned et nivå når bildene kommer for sjelden, og opp igjen når det er margin. Ultra går aldri på av seg selv.', 'Auto steps down a level when the frames come too slowly, and back up when there is room. Ultra never comes on by itself.') + (now && now.ultra === false ? ' ' + L('Denne enheten kan ikke bruke Ultra.', 'This device cannot use Ultra.') : ''),
        '<div class="st-seg">' + ql.map(([v, l]) => '<button class="' + (q3 === v ? 'on' : '') + '" data-pa="q3d" data-v="' + v + '">' + l + '</button>').join('') + '</div>') +
      row(L('Oppløsning', 'Resolution'), L('Andelen av nivåets piksler. Lavere gir flere bilder i sekundet og et mykere bilde.', 'The share of the level\'s pixels. Lower gives more frames a second and a softer picture.'), seg('res', [[0.5, '50 %'], [0.67, '67 %'], [0.8, '80 %'], [1, '100 %']], g.res)) +
      row(L('Bildetak', 'Frame cap'), L('Høyst så mange bilder i sekundet. Sparer batteri og varme.', 'At most this many frames a second. Saves the battery and the heat.'), seg('fps', [[30, '30'], [45, '45'], [60, '60'], [0, L('Fri', 'Free')]], g.fps || 0)) +
      row(L('Detaljavstand', 'Detail distance'), L('Hvor langt ut bygg og havner tegnes i full detalj.', 'How far out buildings and harbours are drawn in full detail.'), seg('dist', [[0.7, L('Kort', 'Short')], [1, L('Normal', 'Normal')], [1.4, L('Lang', 'Long')]], g.dist)) +
      row(L('Skygger', 'Shadows'), L('Skygger fra sola på bygg, terreng og båter.', 'Shadows from the sun on buildings, terrain and boats.'), seg('shadow', [[1, L('På', 'On')], [0, L('Av', 'Off')]], g.shadow === false ? 0 : 1)) +
      row(L('Vis bildetakt', 'Show frame rate'), L('Bilder i sekundet i et hjørne av 3D-bildet.', 'Frames a second in a corner of the 3D view.'), '<div class="st-seg"><button class="' + (S.settings.fpsShow ? 'on' : '') + '" data-pa="fpsShow" data-v="1">' + L('På', 'On') + '</button><button class="' + (S.settings.fpsShow ? '' : 'on') + '" data-pa="fpsShow" data-v="0">' + L('Av', 'Off') + '</button></div>') +
      '<p class="st-now">' + (now ? L('Nå: ', 'Now: ') + ['Lav', 'Middels', 'Høy', 'Ultra'][now.lvl] + (now.fps ? ' · ' + Math.round(now.fps) + L(' bilder/s', ' frames/s') : '') : L('3D-bildet er ikke i gang.', 'The 3D view is not running.')) + '</p></div>' +
      '<div class="ph-card st-card"><h4>' + L('Detaljer i verden', 'Detail in the world') + '</h4><p class="ph-note">' + L('Slå av det som tynger enheten din. Endringene gjelder når 3D-bildet startes på nytt.', 'Turn off what weighs on your device. The changes apply when the 3D view starts again.') + '</p>' +
      GFX_OFF.map(([k, no, en]) => row(L(no, en), '', '<div class="st-seg"><button class="' + (!P[k] ? 'on' : '') + '" data-pa="gfxOff" data-k="' + k + '" data-v="0">' + L('På', 'On') + '</button><button class="' + (P[k] ? 'on' : '') + '" data-pa="gfxOff" data-k="' + k + '" data-v="1">' + L('Av', 'Off') + '</button></div>')).join('') +
      '<div class="ph-btncol"><button class="ph-btn' + (dirty ? ' p' : ' alt') + '" data-pa="gfxApply"' + (dirty ? '' : ' disabled') + '>' + L('Bruk og start 3D på nytt', 'Apply and restart 3D') + '</button>' +
      (custom ? '<button class="ph-btn alt" data-pa="gfxReset">' + L('Tilbake til standard', 'Back to the defaults') + '</button>' : '') + '</div>' +
      '<p class="ph-note">' + L('Innstillingene gjelder bare denne enheten.', 'The settings apply to this device only.') + '</p></div>';
  }
  function innst(){
    const chk = (id, on) => '<input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '>';
    const tab = ['spill', 'grafikk', 'lyd', 'konto'].includes(sub.innst) ? sub.innst : 'spill';
    const tabs = '<div class="st-tabs">' + [['spill', L('Spill', 'Game')], ['grafikk', L('Grafikk', 'Graphics')], ['lyd', L('Lyd', 'Sound')], ['konto', L('Konto', 'Account')]]
      .map(([k, l]) => '<button class="' + (tab === k ? 'on' : '') + '" data-pa="sub" data-s="' + k + '">' + l + '</button>').join('') + '</div>';
    // (Jonas 16.11.2026: the map's credit line is gone from the 3D view, so the sources are one tap away for every player, not only a guest)
    const legal = '<div class="ph-card"><h4>' + L('Om spillet', 'About the game') + '</h4><p class="ph-note">' + [['kilder', 'Kilder og kartdata', 'Sources and map data'], ['vilkar', 'Vilkår', 'Terms'], ['personvern', 'Personvern', 'Privacy'], ['kontakt', 'Kontakt', 'Contact']]
      .map(([f, no, en]) => '<a href="' + f + '.html" target="_blank" rel="noopener">' + L(no, en) + '</a>').join(' · ') + '</p><p class="ph-note">' + L('Følg oss: ', 'Follow us: ') + socialOn().map(s => '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.n + '</a>').join(' · ') + '</p><p class="ph-note">' + L('Kartdata © Kartverket, Mapzen (CC BY) og © OpenStreetMap-bidragsytere (ODbL).', 'Map data © Kartverket, Mapzen (CC BY) and © OpenStreetMap contributors (ODbL).') + '</p></div>';
    let body = '';
    if (tab === 'spill') body = '<div class="ph-card ph-set"><h4>' + L('Språk', 'Language') + '</h4><div class="ph-lbl">' + (S.lang === 'no' ? 'Norsk' : 'English') + '<button class="ph-btn alt" data-pa="lang" style="margin:0">' + (S.lang === 'no' ? 'English' : 'Norsk') + '</button></div></div>' +
      '<div class="ph-card"><h4>HUD</h4><div class="ph-sub"><button class="' + (S.settings.hudOff ? '' : 'on') + '" data-pa="hudShow" data-v="1">' + L('Vis HUD', 'Show HUD') + '</button><button class="' + (S.settings.hudOff ? 'on' : '') + '" data-pa="hudShow" data-v="0">' + L('Skjul HUD', 'Hide HUD') + '</button></div><p class="ph-note">' +
      L('Statusboksen, den lille kartplotteren og kompasset. Hver boks kan også minimeres til en tynn stripe med «–» i hjørnet.', 'The status box, the little chart plotter and the compass. Each box can also be folded to a thin strip with «–» in its corner.') + '</p></div>' +
      '<div class="ph-card"><h4>' + L('Hjemsted', 'Home') + '</h4>' + kv(L('Holder til i', 'Based in'), (portById(S.home || HOME0) || PORTS[0]).name) +
        (S.moved ? '<p class="ph-note">' + L('Du har valgt nytt hjemsted.', 'You have chosen a new home.') + '</p>' : '<button class="ph-btn alt" data-pa="move">' + L('Velg et annet hjemsted langs kysten', 'Choose another home along the coast') + '</button><p class="ph-note">' + L('Én gang. Fars naust og hjemhavna blir der, men båten flyttes ikke. Du seiler dit selv.', 'Once. Father’s boathouse and your home harbour go there, but the boat is not moved: you sail there yourself.') + '</p>') + '</div>' +
      '<div class="ph-card ph-set"><h4>' + L('Sikkerhet', 'Safety') + '</h4><label>' + t('auto') + chk('setAuto', S.settings.autoOn) + '</label><label><span>' + L('Snu ved', 'Turn back at') + ' <output id="autoWOut">' + S.settings.autoW + ' m/s</output></span><input type="range" min="6" max="20" step="1" value="' + S.settings.autoW + '" id="autoW"' + (S.settings.autoOn ? '' : ' disabled') + '></label>' + '<label><span>' + t('auto_to') + '</span><select id="autoTo"' + (S.settings.autoOn ? '' : ' disabled') + '><option value="near"' + (S.settings.autoTo !== 'home' ? ' selected' : '') + '>' + t('auto_near') + '</option><option value="home"' + (S.settings.autoTo === 'home' ? ' selected' : '') + '>' + t('auto_home') + '</option></select></label>' + '<p class="ph-note">' + t('auto_n') + '</p></div>';
    else if (tab === 'grafikk') body = innstGfx();
    else if (tab === 'lyd') body = '<div class="ph-card"><h4>' + L('Lyd', 'Sound') + '</h4><div class="ph-sub">' + [[0, L('Av', 'Off')], [0.25, '25 %'], [0.5, '50 %'], [0.75, '75 %'], [1, '100 %']].map(([v, l]) => { const cur = S.settings.sound === false ? 0 : (S.settings.vol == null ? 0.6 : S.settings.vol); return '<button class="' + (Math.abs(cur - v) < 0.13 ? 'on' : '') + '" data-pa="snd" data-v="' + v + '">' + l + '</button>'; }).join('') + '</div><p class="ph-note">' +
      L('Motor, sjø, vind og regn, måker, og arbeidet i havna og om bord. Lyden starter når du trykker på skjermen.', 'Engine, sea, wind and rain, gulls, and the work in the harbour and aboard. The sound starts when you touch the screen.') + '</p></div>' +
      '<div class="ph-card"><h4>' + L('Musikk', 'Music') + '</h4><div class="ph-sub">' + [[0, L('Av', 'Off')], [0.2, L('Svak', 'Soft')], [0.35, L('Normal', 'Normal')], [0.6, L('Sterkere', 'Louder')]].map(([v, l]) => { const cur = S.settings.music == null ? 0.35 : S.settings.music; return '<button class="' + (Math.abs(cur - v) < 0.07 ? 'on' : '') + '" data-pa="mus" data-v="' + v + '">' + l + '</button>'; }).join('') + '</div><p class="ph-note">' +
      L('Rolig musikk i bakgrunnen, laget mens den spiller: myke akkorder og en klokke nå og da. Mørkere om natta og i dårlig vær.', 'Quiet music in the background, made as it plays: soft chords and a bell now and then. Darker at night and in bad weather.') + '</p></div>';
    else body = (typeof cloudCard === 'function' ? cloudCard() : '') + (typeof INSTALL !== 'undefined' ? INSTALL.card() : '') + legal +
      '<div class="ph-card"><h4>' + L('Lagret spill', 'Saved game') + '</h4><p class="ph-note">' + L('Artifacten og appen på hjemskjermen har hver sin lagring. Kopier koden her og lim den inn der for å ta med spillet.', 'The artifact and the app on the home screen keep their own saves. Copy the code here and paste it there to take the game along.') + '</p>' +
      '<button class="ph-btn alt" data-pa="saveOut">' + L('Kopier lagringen', 'Copy the save') + '</button><button class="ph-btn alt" data-pa="saveIn">' + L('Lim inn lagring', 'Paste a save') + '</button>' +
      (saveBox ? '<textarea id="saveCode" rows="4" style="width:100%;margin-top:8px;font:11px ui-monospace,monospace"' + (saveBox.mode === 'out' ? ' readonly' : ' placeholder="KYST2:…"') + '>' + (saveBox.text || '') + '</textarea>' +
        (saveBox.mode === 'in' ? '<button class="ph-btn" data-pa="saveLoad">' + L('Last inn dette spillet', 'Load this game') + '</button><p class="ph-note">' + L('Spillet her blir erstattet.', 'The game here is replaced.') + '</p>' : '<p class="ph-note">' + L('Koden er kopiert om nettleseren tillot det. Ellers marker og kopier den selv.', 'The code is copied if the browser allowed it. Otherwise select and copy it yourself.') + '</p>') : '') + '</div>' +
      '<div class="ph-card"><button class="ph-btn red" data-act="reset">' + t('reset') + '</button></div>';
    return '<div class="ph-c">' + tabs + body + '</div>';
  }
  // tools for testing while the game is built (02.10.2026): the clock's pace, a pause, and money in one tap. Not for players: in the
  // shared world everyone has the same clock (OVERLEVERING, «Felles verden og tid»), so the app goes before the game opens.
  function admin(){
    const pace = [[0, L('Pause', 'Pause')], [1, '6×'], [30, fmt(GAME_RATE * 30) + '×'], [300, fmt(GAME_RATE * 300) + '×'], [1800, fmt(GAME_RATE * 1800) + '×']];
    const day = S.mult ? 1440 / (GAME_RATE * S.mult) : 0, dur = day >= 60 ? fmt(day / 60, 1) + ' t' : day >= 1 ? fmt(day) + ' min' : fmt(day * 60) + ' s';
    // on the world's clock (core/01-world.js) the time scale is everyone's: the card says so, and only the tests have the pace buttons
    const wh = worldTf() / 60, clockCard = WCLOCK.on ? '<div class="ph-card"><h4>' + L('Felles klokke', 'One clock for all') + '</h4>' + kv(L('Verdens tid', 'World time'), dayStr(wh) + ' ' + hm(wh)) + kv(L('Spillet her', 'This game'), dayStr(S.t / 60) + ' ' + hm(S.t / 60)) +
      '<p class="ph-note">' + L('Alle spillerne går på samme klokke, 6 ganger fortere enn ekte tid. Den kan ikke stilles eller spoles fram.', 'Every player is on the same clock, 6 times real time. It cannot be set or moved on.') + '</p></div>' : null;
    return '<div class="ph-c">' + (clockCard || '<div class="ph-card"><h4>' + L('Tidsskala', 'Time scale') + '</h4><div class="ph-sub">' + pace.map(([v, l]) => '<button class="' + (S.mult === v ? 'on' : '') + '" data-pa="admPace" data-v="' + v + '">' + l + '</button>').join('') + '</div>' +
      '<p class="ph-note">' + (S.mult ? L('Klokka går ' + fmt(GAME_RATE * S.mult) + ' ganger fortere enn ekte tid, så et døgn i spillet tar ' + dur + '.', 'The clock runs ' + fmt(GAME_RATE * S.mult) + ' times real time, so a day in the game takes ' + dur + '.') : L('Tida står stille.', 'Time stands still.')) + '</p></div>') +
      // the manual helm: only here, for testing (Jonas 16.11.2026: the players plan routes in the chart plotter, Autonav or by hand)
      '<div class="ph-card"><h4>' + L('Manuell styring', 'Manual steering') + '</h4><div class="ph-sub"><button class="' + (S.settings.manual ? 'on' : '') + '" data-pa="manual" data-v="1">' + L('På', 'On') + '</button><button class="' + (S.settings.manual ? '' : 'on') + '" data-pa="manual" data-v="0">' + L('Av', 'Off') + '</button></div><p class="ph-note">' +
      L('Gass til høyre (fram, nøytral, bak; den blir stående der du slipper) og ratt til venstre (det går tilbake til midten) i 3D. Rører du dem på sjøen, tar du roret fra ruta eller Autonav. «Fortøy» kommer når du er sakte ved en kai, og «Kast loss» når du ligger fortøyd.', 'Throttle on the right (ahead, neutral, astern; it stays where you leave it) and wheel on the left (it springs back) in 3D. Touching them at sea takes the helm from the route or Autonav. «Moor» shows when you are slow at a quay, and «Cast off» when you lie moored.') + '</p></div>' +
      '<div class="ph-card"><h4>' + L('Penger', 'Money') + '</h4>' + kv(L('Kasse', 'Cash'), kr(S.cash)) + '<button class="ph-btn" data-pa="admCash">+ 100 000 kr</button></div>' +
      // a full tank anywhere, for trips along the coast before there are fuel quays outside Senja (the user's wish 03.10.2026)
      '<div class="ph-card"><h4>' + L('Drivstoff', 'Fuel') + '</h4>' + kv(L('Tanken', 'Tank'), fmt(S.boat.fuel) + ' / ' + fmt(BOAT.fuelCap) + ' L') + '<button class="ph-btn" data-pa="admFuel">' + L('Fyll tanken', 'Fill the tank') + '</button></div>' +
      // your own energy off, so you never tire or fall asleep while testing (the user's wish 03.10.2026)
      '<div class="ph-card"><h4>' + L('Energi', 'Energy') + '</h4>' + kv(L('Din energi', 'Your energy'), energyOff() ? L('av', 'off') : asleep() ? L('sover', 'asleep') : fmt(S.energy == null ? 100 : S.energy) + ' %') + '<button class="ph-btn' + (energyOff() ? ' alt' : '') + '" data-pa="admEnergy">' + (energyOff() ? L('Skru på energi', 'Turn energy on') : L('Skru av energi', 'Turn energy off')) + '</button>' +
      '<p class="ph-note">' + L('Av: du blir aldri sliten og sovner ikke.', 'Off: you never tire and do not fall asleep.') + '</p></div>' +
      // the fast-forward button for testing, until the purchase is built (HO2/HO3, docs/planer/hopp.md): the hop is free with it on
      '<div class="ph-card"><h4>' + L('Hopp over ruta (test)', 'Skip the route (test)') + '</h4>' + kv(L('Spoleknappen', 'The fast-forward button'), S.adm && S.adm.hopp ? L('på', 'on') : L('av', 'off')) + '<button class="ph-btn' + (S.adm && S.adm.hopp ? ' alt' : '') + '" data-pa="admHopp">' + (S.adm && S.adm.hopp ? L('Skru av', 'Turn off') : L('Skru på', 'Turn on')) + '</button>' +
      '<p class="ph-note">' + L('På: spoleknappen står under kino-knappen i 3D mens en rute seiles, og hoppet er gratis. Uten bryteren står den der butikken selger, og hoppet kjøpes.', 'On: the fast-forward button stands under the cinema button in 3D while a route is sailed, and the hop is free. Without the switch it stands where the shop sells, and the hop is bought.') + '</p></div>' +
      // the opening again: the letter alone, or a whole new game as a new player gets it (Jonas 05.10.2026: «jeg vil se hvordan konvolutt scenen ble»)
      '<div class="ph-card"><h4>' + L('Åpningen', 'The opening') + '</h4><p class="ph-note">' + L('Se brevet fra far igjen, eller start et helt nytt spill slik en ny spiller får det: brevet, båtnavnet og «Første tur».', 'See the letter from Father again, or start a whole new game as a new player gets it: the letter, the boat name and «First trip».') + '</p>' +
      '<button class="ph-btn" data-pa="admLetter">' + L('Vis brevet', 'Show the letter') + '</button> <button class="ph-btn red" data-pa="admNew">' + L('Start nytt spill', 'Start a new game') + '</button></div>' +
      '<p class="ph-note">' + L('Verktøy for testing. Appen fjernes før spillet får felles klokke.', 'Tools for testing. The app goes before the game gets a shared clock.') + '</p></div>';
  }
