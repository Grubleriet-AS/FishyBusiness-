"""The launch's leaderboard and profile (Jonas 16.11.2026; ui/10v-profil.js, ui/phone/09-vaer-post-salg-redning.js, ui/10h-world.js worldTop,
supabase/migrations/20261116120000_lansering.sql). With the cloud stubbed in the page (cloudRpc answers as top_list, profile_get and
av_mine would): Salgslaget's three kinds (kilos, kroner, total) with the founders' badge and the kroner column, a tap on a row opens that
player's profile, the player's own profile from the home screen with the picture's state, and a database without top_list (404): the
kilos from world_top and «kommer snart» for the others. RANK1-c (steg 134): the fourth kind, Fartstid (top_list 'fs'), with the level and
no kilos or kroner, and «kommer snart» from a server without it (404, or a top_list that answers 'kg'). Both formats. Prints values and OK/FEIL lines; screenshots in tests/out/."""
import asyncio, json, os, re
from _env import boot, GAME, OUT
from playwright.async_api import async_playwright

STUB = """() => {
  window.__rpc = [];
  CLOUD.on = true; CLOUD.user = {id:'user_test'}; CLOUD.guest = false;
  const row = (rank, hid, boat, user, kg, kr, f, me) => ({rank, hid, boat, user, kg, kr, f, me, port:'finnsnes', company:''});
  const T = {
    kg:{kind:'kg', grp:'open', rows:[row(1, 'aaaaaaaaaa', 'Havbris', 'Ola', 1800, 0, 1, false), row(2, 'bbbbbbbbbb', 'Sjøsprøyt', 'Kari', 1200, 0, null, false), row(3, 'cccccccccc', S.boatName, 'Meg', 300, 0, 7, true)], mine:{rank:3, kg:300, kr:9000}, n:3},
    kr:{kind:'kr', grp:'open', rows:[row(1, 'bbbbbbbbbb', 'Sjøsprøyt', 'Kari', 1200, 61000, null, false), row(2, 'aaaaaaaaaa', 'Havbris', 'Ola', 1800, 52000, 1, false)], mine:null, n:2},
    tot:{kind:'tot', grp:'open', rows:[{...row(1, 'aaaaaaaaaa', 'Havbris', 'Ola', 25000, 900000, 1, false), worth:910000}], mine:null, n:1},
    tkg:{kind:'tkg', grp:'open', rows:[{...row(1, 'aaaaaaaaaa', 'Havbris', 'Ola', 25000, 900000, 1, false), worth:910000}], mine:null, n:1},
    fs:{kind:'fs', grp:'all', rows:[{rank:1, hid:'bbbbbbbbbb', user:'Kari', boat:'Sjøsprøyt', y:43, f:null, me:false}, {rank:2, hid:'aaaaaaaaaa', user:'Ola', boat:'Havbris', y:12, f:1, me:false}], mine:{rank:9, y:2}, n:9}};
  const P = {hid:'aaaaaaaaaa', me:false, user:'Ola', fs:120000, since:'2026-11-17T08:00:00Z', f:1, img:null, boat:'Havbris', vtype:'sjark',
    prof:{fleet:2, value:850000, worth:910000, company:'Havbris AS', form:'AS', ach:12, boats:[{n:'Havbris', t:'sjark'}, {n:'Lille Havbris', t:'trebat'}], recs:[{sp:'torsk', kg:31.5}, {sp:'kveite', kg:48}], sk:{juksa:3.2, line:2.4, garn:1.5, teiner:1.5, sloy:2.9, is:2.7, sort:1.5, bad:9}},
    kg:25000, kr:900000, ports:4, rank:1, n:40};
  window.__old = false;
  cloudRpc = async (fn, a) => { window.__rpc.push(fn);
    if (fn === 'top_list' && window.__big){   // the long list: 250 skippers, 20 on the first page, then pages of off and n
      const all = Array.from({length:250}, (_, i) => ({rank:i + 1, hid:'h' + String(i).padStart(9, '0'), user:'Skipper ' + (i + 1), boat:'Båt ' + (i + 1), y:40 - Math.floor(i / 7), f:null, me:false}));
      window.__pages.push(a.off == null ? 'first' : a.off + '+' + a.n);
      return {kind:a.kind, grp:'all', rows:a.off == null ? all.slice(0, 20) : all.slice(a.off, a.off + a.n), off:a.off || 0, mine:{rank:420, y:3}, n:250}; }
    if (fn === 'top_list'){ if (window.__old) throw new Error('top_list 404'); if (a.h0 != null){ window.__mo = [a.h0, a.h1]; return {...T[a.kind], kind:a.kind}; } return a.kind === 'fs' && window.__oldFs ? T.kg : T[a.kind]; }
    if (fn === 'world_top') return T.kg;
    if (fn === 'profile_get') return a.hid === 'me' ? {...P, hid:'cccccccccc', me:true, user:'Meg', f:7, prof:{...P.prof, company:'', form:'ENK', fleet:1, boats:[{n:S.boatName, t:'trebat'}]}} : P;
    if (fn === 'av_mine') return {img:null, state:'wait'};
    return null; };
}"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        res = {}
        for w, h, tag in ((1280, 800, 'liggende'), (800, 1280, 'staende')):
            pg = await br.new_page(viewport={'width': w, 'height': h})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await boot(pg, GAME + ',no3d')
            await pg.evaluate(STUB)
            await pg.evaluate("() => { PHONE.open('salg'); }")
            # the app Toppliste ('salg') is the leaderboard alone, with no tabs for prices or landings (Jonas 16.11.2026)
            tab = await pg.evaluate("() => PHONE.app === 'salg' && !document.querySelector('#phone [data-pa=sub]') && /Toppliste|Leaderboard/.test(document.querySelector('#phone').textContent)")
            hid0 = await pg.evaluate("() => ({kinds:document.querySelectorAll('#phone [data-pa=salgK]').length, groups:document.querySelectorAll('#phone [data-pa=salgG]').length, filt:!!document.querySelector('#phone [data-pa=salgF]'), table:!!document.querySelector('#phone table.pf-top')})")
            got = {}
            # (Jonas 16.11.2026: the start is all time by kroner with kg, kr and the company's worth; the filter has «Ranger etter» and
            # «Periode»: week, month, all time) start: as it opens; kg and kr: this week; mnd: this month by kilos; tkg: all time by kilos
            async def pick(pa, v):
                await pg.evaluate("() => { const f = document.querySelector('#phone [data-pa=salgF]'); if (f && !f.classList.contains('on')) f.click(); }"); await pg.wait_for_timeout(100)
                await pg.evaluate("([pa, v]) => { const b = document.querySelector('#phone [data-pa=' + pa + '][data-s=' + v + ']'); if (b) b.click(); }", [pa, v])
            for k, P, K in (('start', None, None), ('kg', 'w', 'kg'), ('kr', 'w', 'kr'), ('mnd', 'm', 'kg'), ('tkg', 'all', 'kg'), ('tot', 'all', 'kr'), ('fs', None, 'fs')):
                if P: await pick('salgP', P)
                if K: await pick('salgK', K)
                await pg.wait_for_timeout(400); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
                got[k] = await pg.evaluate("""() => { const t = document.querySelector('#phone table.pf-top'); return t ? {rows:t.querySelectorAll('tr.pf-tap').length, kr:/<th class="n">kr<\\/th>/.test(t.outerHTML), badge:t.querySelectorAll('.pf-fb').length,
                  first:(t.querySelector('tr.pf-tap td:nth-child(2)') || {}).textContent || '', txt:t.innerText, kg:/<th class="n">kg<\\/th>/.test(t.outerHTML),
                  worth:/Selskapsverdi/.test(t.innerText), head:(document.querySelector('#phone .ph-card h4') || {}).textContent || ''} : null; }""")
                # (tilbakemelding #121) what Founder #N means, in the text of the list's card, not only in a title a touch screen never shows
                if got[k]: got[k]['why'] = await pg.evaluate("() => /de 100 første som leverte fisk|first 100 who landed fish/.test(document.querySelector('#phone table.pf-top').closest('.ph-card').innerText)")
                await pg.screenshot(path=os.path.join(OUT, 'profil-topp-%s-%s.png' % (k, tag)))
            # a tap on the first row of the total list opens that player's profile
            await pg.evaluate("() => { const r = document.querySelector('#phone tr.pf-tap'); if (r) r.click(); }")
            await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
            other = await pg.evaluate("() => ({app:PHONE.app, txt:(document.querySelector('#phone .ph-appv') || {}).innerText || '', bars:document.querySelectorAll('#phone .rk-sk').length})")
            await pg.screenshot(path=os.path.join(OUT, 'profil-annen-%s.png' % tag))
            # the own profile from the home screen
            await pg.evaluate("() => { PHONE.open('home'); }"); await pg.wait_for_timeout(200)
            await pg.evaluate("() => { const b = document.querySelector('#phone [data-pa=open][data-a=profil]'); if (b) b.click(); }")
            await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(300)
            mine = await pg.evaluate("() => ({app:PHONE.app, want:PROF.want, txt:(document.querySelector('#phone .ph-appv') || {}).innerText || '', pick:!!document.querySelector('#phone [data-pa=pfav]'), bars:document.querySelectorAll('#phone .rk-sk').length})")
            await pg.screenshot(path=os.path.join(OUT, 'profil-egen-%s.png' % tag))
            # the long list (Jonas 16.11.2026: «scrolle nedover laaaaangt» and «Din plassering #420 … øverst over tabellen»): the first 20,
            # then the next hundred each time the bottom comes into view, until «Det var hele lista»
            await pg.evaluate("() => { window.__big = true; window.__pages = []; for (const k in WTOP) delete WTOP[k]; WTOP_NEW.off = 0; PHONE.open('salg'); }")
            await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
            big = {'place': await pg.evaluate("() => (document.querySelector('#phone .pf-place') || {}).innerText || ''"), 'n': []}
            await pg.screenshot(path=os.path.join(OUT, 'profil-lang-topp-%s.png' % tag))
            for _ in range(4):
                big['n'].append(await pg.evaluate("() => document.querySelectorAll('#phone table.pf-top tr.pf-tap').length"))
                await pg.evaluate("() => { const v = document.getElementById('phView'); v.scrollTop = v.scrollHeight; }")
                await pg.wait_for_timeout(700); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(300)
            big['n'].append(await pg.evaluate("() => document.querySelectorAll('#phone table.pf-top tr.pf-tap').length"))
            big['end'] = await pg.evaluate("() => !!document.querySelector('#phone .pf-end') && !document.querySelector('#phone .pf-more')")
            big['ranks'] = await pg.evaluate("() => { const r = [...document.querySelectorAll('#phone table.pf-top tr.pf-tap td:first-child')].map(x => +x.textContent); return r.every((v, i) => v === i + 1); }")
            big['pages'] = await pg.evaluate("() => window.__pages.slice()")
            big['scroll'] = await pg.evaluate("() => document.getElementById('phView').scrollTop > 2000")
            await pg.screenshot(path=os.path.join(OUT, 'profil-lang-bunn-%s.png' % tag))
            await pg.evaluate("() => { window.__big = false; for (const k in WTOP) delete WTOP[k]; }")
            # RANK1-c: a top_list that does not know 'fs' answers 'kg': the tab says it is coming
            async def fsSoon():
                await pg.evaluate("() => { for (const k in WTOP) delete WTOP[k]; WTOP_NEW.off = 0; PHONE.open('salg'); }")
                await pg.evaluate("() => { const f = document.querySelector('#phone [data-pa=salgF]'); if (f) f.click(); }"); await pg.wait_for_timeout(100)
                await pg.evaluate("() => { const b = document.querySelector('#phone [data-pa=salgK][data-s=fs]'); if (b) b.click(); }")
                await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
                return await pg.evaluate("() => /fartstid kommer snart|sea time is coming soon/.test((document.querySelector('#phone .ph-appv') || {}).innerText || '') && !document.querySelector('#phone table.pf-top')")
            await pg.evaluate("() => { window.__oldFs = true; }"); fsKg = await fsSoon(); await pg.evaluate("() => { window.__oldFs = false; }")
            # (after the review) the migration run while the page is open: the next fetch shows the list, no reload
            await pg.evaluate("() => { if (WTOP.fs) WTOP.fs.at = 0; PHONE.render(); }"); await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
            fsBack = await pg.evaluate("() => !!document.querySelector('#phone table.pf-top') && /Nivå 12|Level 12/.test(document.querySelector('#phone table.pf-top').innerText)")
            # not signed in: a line about signing in, never the local kilo list under the sea time filter
            await pg.evaluate("() => { window.__u = CLOUD.user; CLOUD.user = null; PHONE.render(); }"); await pg.wait_for_timeout(200)
            fsOut = await pg.evaluate("() => { const t = (document.querySelector('#phone .ph-appv') || {}).innerText || ''; return /logget inn|signed in/.test(t) && !/Fartøy|Vessel/.test(t); }")
            await pg.evaluate("() => { CLOUD.user = window.__u; }")
            # a database without top_list: the kilos from world_top, the others «kommer snart»
            await pg.evaluate("() => { window.__old = true; for (const k in WTOP) delete WTOP[k]; WTOP_NEW.off = 0; PHONE.open('salg'); }")
            await pg.evaluate("() => { const f = document.querySelector('#phone [data-pa=salgF]'); if (f) f.click(); }"); await pg.wait_for_timeout(100)
            await pg.evaluate("() => { const b = document.querySelector('#phone [data-pa=salgK][data-s=kr]'); if (b) b.click(); }")
            await pg.wait_for_timeout(500); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
            old = await pg.evaluate("() => ({soon:/kommer snart|coming soon/.test((document.querySelector('#phone .ph-appv') || {}).innerText || ''), rpc:window.__rpc.slice(-4)})")
            fs404 = await fsSoon()
            res[tag] = {'hid0': hid0, 'tab': tab, 'got': got, 'other': {'app': other['app'], 'ola': 'Ola' in other['txt'], 'founder': 'Founder #1' in other['txt'], 'worth': '910' in other['txt'], 'skills': 'Milepæler' in other['txt'] or 'Milestones' in other['txt'], 'bars': other['bars'], 'juksa': 'Juksa' in other['txt'] and '3,2' in other['txt']},
                        'mine': {'app': mine['app'], 'want': mine['want'], 'wait': 'venter på godkjenning' in mine['txt'] or 'waiting for approval' in mine['txt'], 'pick': mine['pick'], 'open': 'åpen for alle' in mine['txt'] or 'open to all' in mine['txt'], 'bars': mine['bars']},
                        'old': old['soon'], 'fsKg': fsKg, 'fs404': fs404, 'fsBack': fsBack, 'fsOut': fsOut, 'big': big, 'mo': await pg.evaluate("() => !!window.__mo && window.__mo[1] - window.__mo[0] === 31 * 24"), 'errs': errs}
            res[tag]['other']['why'] = bool(re.search(r'de 100 første som leverte fisk|first 100 who landed fish', other['txt']))
            print(tag, json.dumps(res[tag], ensure_ascii=False))
            await pg.close()
        await br.close()
    for tag, r in res.items():
        g = r['got']; z = r['hid0']
        print('OK  ' if z['filt'] and z['table'] and z['kinds'] == 0 and z['groups'] == 0 else 'FEIL', tag + ': topplista står alene, valgene er gjemt bak Filter-knappen (Jonas 16.11.2026)', json.dumps(z))
        print('OK  ' if r['tab'] and g['kg'] and g['kg']['rows'] == 3 and g['kg']['kr'] and g['kg']['badge'] == 2 and not g['kg']['worth'] and g['kr'] and g['kr']['kr'] and 'Sjøsprøyt' in g['kr']['first'] and g['tot'] and g['tot']['rows'] == 1 else 'FEIL',
              tag + ': topplista denne uka i kilo (3 rader, merket på to) og kroner (Sjøsprøyt først), begge med kg og kr, og totalt', json.dumps(g, ensure_ascii=False)[:600])
        st = g.get('start') or {}
        print('OK  ' if st.get('rows') == 1 and st.get('kg') and st.get('kr') and st.get('worth') and re.search(r'910.000', st.get('txt', '')) and 'totalt' in st.get('head', '') and g['tot'] and g['tot']['worth'] else 'FEIL',
              tag + ': topplista åpner på Totalt med kg, kr og selskapsverdien (Jonas 16.11.2026)', json.dumps(st, ensure_ascii=False)[:300])
        print('OK  ' if (g.get('mnd') or {}).get('rows') == 3 and 'mars' in (g.get('mnd') or {}).get('head', '') and r['mo'] and (g.get('tkg') or {}).get('worth') and 'Ola' in (g.get('tkg') or {}).get('first', '') else 'FEIL',
              tag + ': måneden (spillmåneden som h0..h1) og hele tiden etter kilo (tkg) i filteret', json.dumps({k: g.get(k) for k in ('mnd', 'tkg')}, ensure_ascii=False)[:400], r['mo'])
        o = r['other']; print('OK  ' if o['app'] == 'profil' and o['ola'] and o['founder'] and o['worth'] and o['skills'] and o['bars'] == 7 and o['juksa'] else 'FEIL', tag + ': et trykk på raden åpner spillerens profil med navnet, Founder #1, selskapsverdien og ferdighetene (sju søyler, Juksa 3,2)', json.dumps(o))
        m = r['mine']; print('OK  ' if m['app'] == 'profil' and m['want'] is None and m['wait'] and m['pick'] and m['open'] and m['bars'] == 7 else 'FEIL', tag + ': egen profil fra hjemskjermen, bildet venter på godkjenning, knappen for å velge bilde, «åpen for alle», egne ferdigheter (sju søyler)', json.dumps(m))
        # (tilbakemelding #121) what Founder #N means stands in the text under the list and on the profile, not only in a title that a touch screen never shows
        print('OK  ' if (g.get('kg') or {}).get('why') and (g.get('fs') or {}).get('why') and r['other']['why'] else 'FEIL', tag + ': forklaringen av Founder-merket står synlig under topplista og på profilen',
              (g.get('kg') or {}).get('why'), (g.get('fs') or {}).get('why'), r['other']['why'])
        print('OK  ' if r['old'] else 'FEIL', tag + ': en database uten top_list: kroner sier «kommer snart»')
        f = g.get('fs') or {}
        print('OK  ' if f.get('rows') == 2 and 'Nivå 40 ★3' in f.get('txt', '') and 'Nivå 12' in f.get('txt', '') and 'Kari' in f.get('first', '') and 'Nivå 2' in f.get('txt', '') and not f.get('kr') and not f.get('kg') and f.get('badge') == 1 else 'FEIL',
              tag + ': fanen Fartstid (RANK1-c): skipperne etter nivået (stjernene over 40), din plass under, ingen kilo eller kroner', json.dumps(f, ensure_ascii=False))
        print('OK  ' if r['fsKg'] and r['fs404'] else 'FEIL', tag + ': Fartstid sier «kommer snart» når serveren ikke har den (404, eller top_list svarer med kilo)', r['fsKg'], r['fs404'])
        b = r['big']
        print('OK  ' if re.search(r'Din plassering\s*#420\s*av 250', b['place']) else 'FEIL', tag + ': «Din plassering #420 av 250» øverst over tabellen', b['place'])
        print('OK  ' if b['n'][0] == 20 and b['n'][-1] == 250 and b['n'] == sorted(b['n']) and b['end'] and b['ranks'] and b['scroll'] and b['pages'][:2] == ['first', '20+100'] else 'FEIL',
              tag + ': lista lastes videre mens du blar ned (20, så 100 om gangen) til «Det var hele lista», uten hull eller dobbel rad, og blir stående der du blar', json.dumps(b, ensure_ascii=False)[:400])
        print('OK  ' if r['fsBack'] else 'FEIL', tag + ': Fartstid kommer uten ny innlasting når serveren har fått migreringen')
        print('OK  ' if r['fsOut'] else 'FEIL', tag + ': uten innlogging sier Fartstid det, og viser ikke kilo-lista')
        print('OK  ' if not r['errs'] else 'FEIL', tag + ': sidefeil', r['errs'])

asyncio.run(main())
