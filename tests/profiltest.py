"""The launch's leaderboard and profile (Jonas 16.11.2026; ui/10v-profil.js, ui/phone/09-vaer-post-salg-redning.js, ui/10h-world.js worldTop,
supabase/migrations/20261116120000_lansering.sql). With the cloud stubbed in the page (cloudRpc answers as top_list, profile_get and
av_mine would): Salgslaget's three kinds (kilos, kroner, total) with the founders' badge and the kroner column, a tap on a row opens that
player's profile, the player's own profile from the home screen with the picture's state, and a database without top_list (404): the
kilos from world_top and «kommer snart» for the others. RANK1-c (steg 134): the fourth kind, Fartstid (top_list 'fs'), with the level and
no kilos or kroner, and «kommer snart» from a server without it (404, or a top_list that answers 'kg'). Both formats. Prints values and OK/FEIL lines; screenshots in tests/out/."""
import asyncio, json, os
from _env import boot, GAME, OUT
from playwright.async_api import async_playwright

STUB = """() => {
  window.__rpc = [];
  CLOUD.on = true; CLOUD.user = {id:'user_test'}; CLOUD.guest = false;
  const row = (rank, hid, boat, user, kg, kr, f, me) => ({rank, hid, boat, user, kg, kr, f, me, port:'finnsnes', company:''});
  const T = {
    kg:{kind:'kg', grp:'open', rows:[row(1, 'aaaaaaaaaa', 'Havbris', 'Ola', 1800, 0, 1, false), row(2, 'bbbbbbbbbb', 'Sjøsprøyt', 'Kari', 1200, 0, null, false), row(3, 'cccccccccc', S.boatName, 'Meg', 300, 0, 7, true)], mine:{rank:3, kg:300, kr:9000}, n:3},
    kr:{kind:'kr', grp:'open', rows:[row(1, 'bbbbbbbbbb', 'Sjøsprøyt', 'Kari', 1200, 61000, null, false), row(2, 'aaaaaaaaaa', 'Havbris', 'Ola', 1800, 52000, 1, false)], mine:null, n:2},
    tot:{kind:'tot', grp:'open', rows:[row(1, 'aaaaaaaaaa', 'Havbris', 'Ola', 25000, 900000, 1, false)], mine:null, n:1},
    fs:{kind:'fs', grp:'all', rows:[{rank:1, hid:'bbbbbbbbbb', user:'Kari', boat:'Sjøsprøyt', y:43, f:null, me:false}, {rank:2, hid:'aaaaaaaaaa', user:'Ola', boat:'Havbris', y:12, f:1, me:false}], mine:{rank:9, y:2}, n:9}};
  const P = {hid:'aaaaaaaaaa', me:false, user:'Ola', fs:120000, since:'2026-11-17T08:00:00Z', f:1, img:null, boat:'Havbris', vtype:'sjark',
    prof:{fleet:2, value:850000, worth:910000, company:'Havbris AS', form:'AS', ach:12, boats:[{n:'Havbris', t:'sjark'}, {n:'Lille Havbris', t:'trebat'}], recs:[{sp:'torsk', kg:31.5}, {sp:'kveite', kg:48}], sk:{juksa:3.2, line:2.4, garn:1.5, teiner:1.5, sloy:2.9, is:2.7, sort:1.5, bad:9}},
    kg:25000, kr:900000, ports:4, rank:1, n:40};
  window.__old = false;
  cloudRpc = async (fn, a) => { window.__rpc.push(fn);
    if (fn === 'top_list'){ if (window.__old) throw new Error('top_list 404'); return a.kind === 'fs' && window.__oldFs ? T.kg : T[a.kind]; }
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
            for k in ('kg', 'kr', 'tot', 'fs'):
                await pg.evaluate("() => { const f = document.querySelector('#phone [data-pa=salgF]'); if (f) f.click(); }"); await pg.wait_for_timeout(100)
                await pg.evaluate("k => { const b = document.querySelector('#phone [data-pa=salgK][data-s=' + k + ']'); if (b) b.click(); }", k)
                await pg.wait_for_timeout(400); await pg.evaluate("() => PHONE.render()"); await pg.wait_for_timeout(200)
                got[k] = await pg.evaluate("""() => { const t = document.querySelector('#phone table.pf-top'); return t ? {rows:t.querySelectorAll('tr.pf-tap').length, kr:/<th class="n">kr<\\/th>/.test(t.outerHTML), badge:t.querySelectorAll('.pf-fb').length,
                  first:(t.querySelector('tr.pf-tap td:nth-child(2)') || {}).textContent || '', txt:t.innerText, kg:/<th class="n">kg<\\/th>/.test(t.outerHTML)} : null; }""")
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
                        'old': old['soon'], 'fsKg': fsKg, 'fs404': fs404, 'fsBack': fsBack, 'fsOut': fsOut, 'errs': errs}
            print(tag, json.dumps(res[tag], ensure_ascii=False))
            await pg.close()
        await br.close()
    for tag, r in res.items():
        g = r['got']; z = r['hid0']
        print('OK  ' if z['filt'] and z['table'] and z['kinds'] == 0 and z['groups'] == 0 else 'FEIL', tag + ': topplista står alene, valgene er gjemt bak Filter-knappen (Jonas 16.11.2026)', json.dumps(z))
        print('OK  ' if r['tab'] and g['kg'] and g['kg']['rows'] == 3 and not g['kg']['kr'] and g['kg']['badge'] == 2 and g['kr'] and g['kr']['kr'] and 'Sjøsprøyt' in g['kr']['first'] and g['tot'] and g['tot']['rows'] == 1 else 'FEIL',
              tag + ': topplista i kilo (3 rader, merket på to), kroner (kr-kolonnen, Sjøsprøyt først) og totalt', json.dumps(g, ensure_ascii=False))
        o = r['other']; print('OK  ' if o['app'] == 'profil' and o['ola'] and o['founder'] and o['worth'] and o['skills'] and o['bars'] == 7 and o['juksa'] else 'FEIL', tag + ': et trykk på raden åpner spillerens profil med navnet, Founder #1, selskapsverdien og ferdighetene (sju søyler, Juksa 3,2)', json.dumps(o))
        m = r['mine']; print('OK  ' if m['app'] == 'profil' and m['want'] is None and m['wait'] and m['pick'] and m['open'] and m['bars'] == 7 else 'FEIL', tag + ': egen profil fra hjemskjermen, bildet venter på godkjenning, knappen for å velge bilde, «åpen for alle», egne ferdigheter (sju søyler)', json.dumps(m))
        print('OK  ' if r['old'] else 'FEIL', tag + ': en database uten top_list: kroner sier «kommer snart»')
        f = g.get('fs') or {}
        print('OK  ' if f.get('rows') == 2 and 'Nivå 40 ★3' in f.get('txt', '') and 'Nivå 12' in f.get('txt', '') and 'Kari' in f.get('first', '') and 'Nivå 2' in f.get('txt', '') and not f.get('kr') and not f.get('kg') and f.get('badge') == 1 else 'FEIL',
              tag + ': fanen Fartstid (RANK1-c): skipperne etter nivået (stjernene over 40), din plass under, ingen kilo eller kroner', json.dumps(f, ensure_ascii=False))
        print('OK  ' if r['fsKg'] and r['fs404'] else 'FEIL', tag + ': Fartstid sier «kommer snart» når serveren ikke har den (404, eller top_list svarer med kilo)', r['fsKg'], r['fs404'])
        print('OK  ' if r['fsBack'] else 'FEIL', tag + ': Fartstid kommer uten ny innlasting når serveren har fått migreringen')
        print('OK  ' if r['fsOut'] else 'FEIL', tag + ': uten innlogging sier Fartstid det, og viser ikke kilo-lista')
        print('OK  ' if not r['errs'] else 'FEIL', tag + ': sidefeil', r['errs'])

asyncio.run(main())
