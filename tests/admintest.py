"""The admin dashboard (src/admin/index.html → admin/ in the build, docs/lansering.md E) in its demo mode: every tab draws from the
same shape as admin_dashboard() without page errors, and without the cloud's keys it shows made-up numbers and no sign-in; with keys
it asks for the sign-in first. Pictures admin_*.png. Prints OK or FEIL."""
from _env import BASE
import re, asyncio, json, os
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)[:300]) if extra != '' else ''))


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={'width': 1100, 'height': 900}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(BASE + 'admin/?demo'); await pg.wait_for_selector('nav button', timeout=20000)
        tabs = await pg.evaluate("[...document.querySelectorAll('nav button')].map(b => b.dataset.t)")
        seen = {}
        for t in tabs:
            await pg.click('nav button[data-t="%s"]' % t); await pg.wait_for_timeout(150)
            seen[t] = await pg.evaluate("document.querySelector('main').innerText.length")
            if t in ('status', 'oversikt', 'tid', 'penger', 'mediekort', 'kapplop'): await pg.wait_for_timeout(300 if t == 'mediekort' else 0); await pg.screenshot(path='admin_%s.png' % t, full_page=True)
        demo = await pg.evaluate("!!document.querySelector('.demo') && !document.getElementById('login')")
        # (22 tabs from 17.11.2026: Status first; Lansering, the founders' count and the profile pictures from 16.11.2026; Kappløp from KL3)
        check(len(tabs) == 23 and tabs[0] == "status" and all(v > 40 for v in seen.values()), 'every tab of the dashboard draws in the demo', seen)
        # steg 153 (K5 of docs/planer/regler-i-klartekst.md, admin_regler): the share of landings with something confiscated, the reasons the
        # grey buttons showed, the «Mer» folds opened, the days from blad B to the first right, and the new tips in the handbook's list
        await pg.click('nav button[data-t="trakt"]'); await pg.wait_for_timeout(400); rg = await pg.evaluate("document.querySelector('main').innerText")
        check(all(s in rg for s in ('Kvoter og regler i klartekst', 'Leveringer med noe inndratt', '19 av 412', 'Fra blad B til første hjemmel', 'Banken vil se tre leveringer', 'Båthandel: større båter', 'Halve torskekvoten', 'Egen kvote')), 'the funnel has the card for the quotas and rules in plain words, and the handbook the new tips', [s for s in ('Kvoter og regler i klartekst', '19 av 412', 'Halve torskekvoten') if s not in rg])
        # the race (KL3, steg 118, admin_lop): the sums, the share with trim and with a hop to the start, the flags, never a name
        await pg.click('nav button[data-t="kapplop"]'); await pg.wait_for_timeout(200); lp = await pg.evaluate("document.querySelector('main').innerText")
        check(all(s in lp for s in ('Påmeldt', 'I mål', 'Brutt', 'Med trim i en etappe', 'Hoppet til startstreken', 'Snittida per klasse', 'Sakte', 'Havfartøy', 'Hvorfor forsøkene ble brutt', 'Forsøkene med merke', 'Sporet (sprang)')),
              'Kappløp: påmeldt, i mål, brutt og hvorfor, snittida per klasse, andelen med trim og med hopp til startstreken, og forsøkene med merke, som summer', lp[:200])
        jw = await pg.evaluate("jkWhy({kind:'lop', data:{rid:'lnk-1-30', vtype:'trebat', k:'fast', leg:0, h:16.17, min_h:20.54, vmax:8.5, trim:1}})")
        check('Kappløpet' in jw and 'For rask etappe' in jw and 'etappe 1' in jw and 'Fjern merket' in jw, 'Juks: et merke fra kappløpet sier sjekken, etappen og tallene', jw)
        # HS5b (27.11.2026, 20261127120000_cheat_worth.sql): a mark on the kroner says what the company was worth before and after (the cash,
        # the two accounts and the loans), what a new boat counts and a sold one explains; a mark from before it reads as it did
        jc = await pg.evaluate("jkWhy({kind:'cash', data:{v:2, base:'hist', cash0:50000, cash1:50000, bank0:120000, bank1:120000, debt0:5000000, debt1:4000000, w0:-4830000, w1:-3830000, 'in':850000, out:1150000, rise:700000, hours:0.01, land:0, ledger:0, cap:2, bucket:195000, unexplained:504998, day:804998, first:false, market:true, types0:'sjark', types1:'plastsjark'}})")
        jo = await pg.evaluate("jkWhy({kind:'cash', data:{cash0:15000, cash1:1400000, hours:0.02, land:0, ledger:0, cap:300, sale:0, equity:0, unexplained:1384700, day:1385000, first:false, type0:'trebat', type1:'trebat', fleet0:1, fleet1:1}})")
        nb = lambda v: v.replace('\u00a0', ' ').replace('\u202f', ' ')
        check(all(x in nb(jc) for x in ('Kasse og konti minus lån', 'kassa 50 000 kr', 'lån 5 000 000 kr → 4 000 000 kr', 'Ny båt teller 850 000 kr', 'Solgt båt eller hjemmel forklarer 1 150 000 kr', 'Uforklart 504 998 kr', 'Mot en bevart lagring', 'Båt fra megleren', 'sjark → plastsjark'))
              and 'Kassa 15 000 kr → 1 400 000 kr' in nb(jo) and 'Kasse og konti' not in jo,
              'Juks: et merke på kronene sier kassa, kontiene og lånene før og etter, hva en ny båt teller og en solgt forklarer; et merke fra før leses som før', {'ny': jc, 'gammel': jo})
        # the feedback agent: its report in the Agent tab, and under a feedback its suggestion, which «Bruk forslaget» only fills in
        await pg.click('nav button[data-t="agent"]'); await pg.wait_for_timeout(150); ag = await pg.evaluate("document.querySelector('main').innerText")
        await pg.click('nav button[data-t="tilbake"]'); await pg.wait_for_selector('[data-fbai]', timeout=5000)
        before = await pg.evaluate("document.querySelector('.fbrow [data-fbre]').value"); await pg.click('[data-fbai]')
        after = await pg.evaluate("[document.querySelector('.fbrow [data-fbst]').value, document.querySelector('.fbrow [data-fbre]').value]")
        await pg.screenshot(path='admin_agent.png', full_page=True)
        check('Gibostad' in ag and 'Åpne PR-er' in ag and before == '' and after == ['seen', 'Takk! Vi ser på Autonav ved Gibostad.'],
              'the Agent tab shows the reports, and «Bruk forslaget» fills in the suggested status and reply without saving', {'after': after})
        check(demo, 'without keys (or with ?demo) the numbers are marked made-up and there is no sign-in')
        # the media card (steg 28): the home ports by county (Kartverket's, tools/regions/fylke.py) with the parts of the coast under,
        # and the pictures of the formats from docs/sponsor/ (tests/mediekortshot.py), put in by build.mjs
        await pg.click('nav button[data-t="mediekort"]'); await pg.wait_for_timeout(300)
        mk = await pg.evaluate("""(() => { const c = [...document.querySelectorAll('main .card')], h = c.find(e => /Hjemhavn etter fylke/.test(e.textContent)), im = [...document.querySelectorAll('main .mk-img img')];
          return {fy:h ? h.textContent.slice(0, 400) : null, txt:h ? h.textContent.slice(-260) : '', img:im.length, ok:im.filter(i => i.complete && i.naturalWidth > 600).length}; })()""")
        nimg = len(json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'sponsor', 'format.json')))) if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'sponsor', 'format.json')) else 0
        check(mk['fy'] is not None and all(f in mk['fy'] for f in ('Troms', 'Nordland', 'Finnmark', 'Møre og Romsdal', 'Vestland', 'Rogaland')) and 'Etter landsdel: Nord-Norge' in mk['txt'] and 'Kartverket' in mk['txt']
              and nimg == 5 and mk['img'] == nimg and mk['ok'] == nimg, 'Mediekort viser hjemhavnene per fylke med landsdelene under, og de fem bildene av formatene', mk)
        await pg.screenshot(path='admin_mediekort.png', full_page=True)
        # the funnel's upgrades (OPP4, 20261107160000_funnel_tier.sql): the share who bought a tier within day 7, of those who have had
        # seven days, and the column per week
        await pg.click('nav button[data-t="trakt"]'); await pg.wait_for_timeout(200)
        tr = await pg.evaluate("""(() => { const m = document.querySelector('main'), k = [...m.querySelectorAll('.kpi')].find(e => /Kjøpt trinn innen dag 7/.test(e.textContent));
          return {kpi:k ? k.innerText.replace(/\s+/g, ' ') : null, col:[...m.querySelectorAll('th')].some(e => e.textContent === 'Trinn ≤ dag 7')}; })()""")
        await pg.screenshot(path='admin_trakt.png', full_page=True)
        check(tr['kpi'] and re.search(r'\d+ %', tr['kpi']) and 'som har hatt sju dager' in tr['kpi'] and tr['col'], 'the funnel shows the share with a tier bought within day 7, and a column per week', tr)
        # the sponsors' report after IAB 2.0 (steg 66): the three buckets, the shares, the distribution, the median and mean viewable
        # time, and the CSV with the same columns; pictures in both formats
        await pg.click('nav button[data-t="sponsorer"]'); await pg.wait_for_timeout(300)
        sp = await pg.evaluate("""(() => { const m = document.querySelector('main'), th = [...m.querySelectorAll('.sptw th')].map(e => e.textContent), k = [...m.querySelectorAll('.kpi')].map(e => e.innerText.replace(/\\s+/g, ' '));
          let csv = null; const U = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => { window.__csv = t; }); return 'blob:x'; };
          const a0 = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){}; document.getElementById('spCsv').click(); HTMLAnchorElement.prototype.click = a0; URL.createObjectURL = U;
          return {th, k, bars:m.querySelectorAll('.spbk').length, wide:document.documentElement.scrollWidth > innerWidth}; })()""")
        await pg.wait_for_timeout(200); csv = await pg.evaluate("window.__csv || ''")
        await pg.screenshot(path='admin_sponsorer_liggende.png', full_page=True)
        await pg.set_viewport_size({'width': 800, 'height': 1280}); await pg.wait_for_timeout(300)
        sp2 = await pg.evaluate("({wide:document.documentElement.scrollWidth > innerWidth})")
        await pg.screenshot(path='admin_sponsorer_staaende.png', full_page=True)
        await pg.set_viewport_size({'width': 1100, 'height': 900})
        need = ['Gjengitt', 'Synlige', 'Ikke synlige', 'Ubestemte', 'Fordelingen', 'Målt andel', 'Synlig andel', 'Gjensyn', 'Median synlig tid (s)', 'Snitt synlig tid (s)']
        head = csv.lstrip('\ufeff').split('\n')[0].split(';')
        check(all(n in sp['th'] for n in need) and sp['bars'] == 2 and any('Målt andel' in x for x in sp['k']) and any('Synlig andel' in x for x in sp['k'])
              and all(c in head for c in ('rendered', 'imp', 'nonview', 'undet', 'measured', 'viewable', 're', 'med', 'mean')) and not sp['wide'] and not sp2['wide'],
              'Sponsorer-fanen viser de tre bøttene, målt og synlig andel, fordelingen og median og snitt synlig tid, og CSV-en har kolonnene (IAB 3.2.10.2)', {'th': sp['th'], 'csv': head, 'wide': [sp['wide'], sp2['wide']]})
        # the marks (HS5, 20261110160000_cheat_flags.sql): the tab with the public id, what, how much over and when; a boat's name with
        # markup is shown as text; «La stå» and «Fjern merket» change the row, the switch turns; and the economy's numbers say whose they are
        await pg.set_viewport_size({'width': 1280, 'height': 800}); await pg.click('nav button[data-t="juks"]'); await pg.wait_for_selector('.jkrow', timeout=5000)
        jk = lambda: pg.evaluate("""(() => { const m = document.querySelector('main'), rows = [...m.querySelectorAll('.jkrow')].map(r => r.innerText.replace(/\\s+/g, ' '));
          return {rows, th:[...m.querySelectorAll('th')].map(e => e.textContent), tag:!!m.querySelector('.jkrow i'), keep:m.querySelectorAll('[data-jkkeep]').length, clr:m.querySelectorAll('[data-jkclr]').length,
                  sw:document.getElementById('jkSw').textContent, kpi:[...m.querySelectorAll('.kpi')].map(e => e.innerText.replace(/\\s+/g, ' ')), wide:document.documentElement.scrollWidth > innerWidth}; })()""")
        j0 = await jk(); await pg.screenshot(path='admin_juks_liggende.png', full_page=True)
        await pg.set_viewport_size({'width': 800, 'height': 1280}); await pg.wait_for_timeout(200); j0s = await jk(); await pg.screenshot(path='admin_juks_staaende.png', full_page=True)
        await pg.click('[data-jkkeep]'); await pg.wait_for_timeout(150); j1 = await jk()
        await pg.click('[data-jkclr]'); await pg.wait_for_timeout(150); j2 = await jk()
        pg.once('dialog', lambda d: asyncio.ensure_future(d.accept())); await pg.click('#jkSw'); await pg.wait_for_timeout(200); j3 = await jk()
        await pg.screenshot(path='admin_juks_paa.png', full_page=True)
        await pg.click('nav button[data-t="okonomi"]'); await pg.wait_for_timeout(200); ok_ = await pg.evaluate("document.querySelector('main').innerText")
        await pg.set_viewport_size({'width': 1100, 'height': 900})
        check(len(j0['rows']) == 3 and all(h in j0['th'] for h in ('Konto', 'Hva', 'Over', 'Sist')) and 'a1b2c3d4e5' in j0['rows'][0] and '1 085 000 kr' in j0['rows'][0].replace(' ', ' ') and 'Kronene' in j0['rows'][0]
              and not j0['tag'] and '<i>Storfangst</i>' in j0['rows'][1] and j0['keep'] == 1 and j0['clr'] == 2 and 'Slå på' in j0['sw'] and not j0['wide'] and not j0s['wide'],
              'the Juks tab lists the marks by the public id with what, how much over and when, a name with markup is text, and it fits both formats', {'rows': j0['rows'], 'keep': j0['keep'], 'clr': j0['clr'], 'wide': [j0['wide'], j0s['wide']]})
        check(j1['keep'] == 0 and 'Står, sett' in j1['rows'][0] and j1['clr'] == 2 and j2['clr'] == 1 and 'Fjernet' in j2['rows'][0] and 'Slå av' in j3['sw'] and any('På' in k for k in j3['kpi']),
              '«La stå» marks the row as seen, «Fjern merket» takes the mark away, and the switch turns after a question', {'keep': j1['keep'], 'clr': [j1['clr'], j2['clr']], 'sw': j3['sw'], 'kpi': j3['kpi']})
        check('Meldt av spillet' in ok_ and ok_.count('meldt av spillet') >= 2, "the economy's numbers are marked as reported by the game")
        # Kvotemarkedet (KM5): the sales a week against the takst, players against the register per group, the first bid, the events
        await pg.click('nav button[data-t="okonomi"]'); await pg.wait_for_timeout(400); km = await pg.evaluate("document.querySelector('main').innerText")
        await pg.set_viewport_size({'width': 1280, 'height': 800}); await pg.wait_for_timeout(150); await pg.screenshot(path='admin_kvotemarkedet.png', full_page=True)
        kmw = await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        check(all(h in km for h in ('Kvotemarkedet: salg per uke', 'Median mot taksten', 'Kjøpt fra spillere mot registeret', 'Andel fra spillere', 'Tid til første bud', 'Målingen', 'Kjøpt fra registeret'))
              and '96,2 %' in km and '10–10,9 m' in km and 'user_' not in km and kmw,
              'Økonomi i spillet has Kvotemarkedet: sales a week with the median against the takst, players against the register per group, the hours to the first bid and the events, never who', km[km.find('Kvotemarkedet'):][:300])
        # Korrigering (28.11.2026): «Legg inn» opens only with the e-mail WorkOS shows for the id, the same as the player wrote from, and
        # the box ticked; two different e-mails say so and keep it shut
        await pg.click('nav button[data-t="korr"]'); await pg.fill('#krWho', 'a1b2c3d4e5'); await pg.click('#krFind'); await pg.wait_for_timeout(300)
        kr = await pg.evaluate("""(() => { const b = () => document.getElementById('krAdd').disabled, g = () => document.getElementById('krGate').textContent, set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); };
          const r = {start:b()}; set('krMail', 'a@b.no'); set('krFromMail', 'c@b.no'); document.getElementById('krSeen').checked = true; document.getElementById('krSeen').dispatchEvent(new Event('change'));
          r.differ = b(); r.msg = g(); set('krFromMail', 'A@b.no '); r.same = b(); document.getElementById('krSeen').checked = false; document.getElementById('krSeen').dispatchEvent(new Event('change')); r.unticked = b(); return r; })()""")
        check(kr['start'] and kr['differ'] and 'ikke like' in kr['msg'] and not kr['same'] and kr['unticked'],
              'Korrigering: «Legg inn» stays shut until the WorkOS e-mail equals the one the player wrote from and the box is ticked', kr)
        # with keys: the sign-in comes first, nothing is fetched before it
        await pg.add_init_script("")
        raw = await (await pg.request.get(BASE + 'admin/')).text()
        # the page's own CSP (build.mjs, Ø6 funn 15): only its script by its hash, only Supabase; the copy below changes the script, so
        # it goes without it
        csp = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]*)">', raw)
        check(csp and "script-src 'sha256-" in csp.group(1) and "default-src 'none'" in csp.group(1) and 'unsafe-inline' not in csp.group(1).split('style-src')[0] and not errs,
              'the admin page has a strict CSP (its own script by hash, nothing else runs) and draws under it', csp.group(1)[:120] if csp else None)
        html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', raw).replace('const CFG = ', 'const CFG = {supabaseUrl:"https://sb.test", supabaseAnon:"anon"} || ')
        pg2 = await br.new_page(); reqs = []
        pg2.on('request', lambda r: reqs.append(r.url) if 'sb.test' in r.url else None)
        await pg2.route(BASE + 'admin/x', lambda route: route.fulfill(status=200, content_type='text/html', body=html))
        await pg2.goto(BASE + 'admin/x'); await pg2.wait_for_selector('#login #go', timeout=10000)
        check(not reqs, 'with keys the dashboard asks for the sign-in before it fetches anything', reqs)
        # the sign-in kept for 14 days (17.11.2026): a session from the second factor in localStorage outlives the tab; an access token about
        # to run out is renewed with the refresh token before the first call (the 14 days run from the code, t0 is kept); a 401 renews once
        # and calls again; after 14 days it asks for the sign-in without fetching anything
        async def keyed(sess, deny=None):
            pg3 = await br.new_page(); seen = []
            async def sb(route):
                rq = route.request; u = rq.url; auth = rq.headers.get('authorization', ''); seen.append((u.split('sb.test')[1].split('?')[0], auth[-2:], (rq.post_data or '')[:60]))
                if 'grant_type=refresh_token' in u:
                    return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'access_token': 'A2', 'refresh_token': 'R2', 'expires_in': 3600}))
                if '/rest/v1/rpc/' in u:
                    if deny and auth.endswith(deny): return await route.fulfill(status=401, content_type='application/json', body='{"message":"JWT expired"}')
                    fn = u.split('/rpc/')[1]
                    body = {'admin_dashboard': {'generated': '2026-11-17T02:00:00Z', 'overview': {'players': 5}, 'daily': []}, 'admin_trend': {'rows': [], 'base': {'players': 0, 'reg': 0}}, 'admin_funnel': {'weeks': []}}.get(fn, {})
                    return await route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
                await route.fulfill(status=404, body='{}')
            await pg3.route('https://sb.test/**', sb)
            await pg3.route(BASE + 'admin/x', lambda route: route.fulfill(status=200, content_type='text/html', body=html))
            await pg3.add_init_script('localStorage.setItem("dsbAdmin", %s)' % json.dumps(json.dumps(sess)))
            await pg3.goto(BASE + 'admin/x'); await pg3.wait_for_selector('#login, header .ht', timeout=10000); await pg3.wait_for_timeout(400)
            r = await pg3.evaluate("({login:!!document.getElementById('login'), ses:JSON.parse(localStorage.getItem('dsbAdmin') || 'null')})"); await pg3.close(); return r, seen
        import time as _t
        now = int(_t.time())
        k1, s1 = await keyed({'access_token': 'A1', 'refresh_token': 'R1', 'expires_at': now + 60, 't0': (now - 13 * 86400) * 1000})
        k2, s2 = await keyed({'access_token': 'A1', 'refresh_token': 'R1', 'expires_at': now + 3000, 't0': (now - 86400) * 1000}, deny='A1')
        k3, s3 = await keyed({'access_token': 'A1', 'refresh_token': 'R1', 'expires_at': now + 3000, 't0': (now - 15 * 86400) * 1000})
        rpc1 = [x for x in s1 if '/rpc/' in x[0]]
        check(not k1['login'] and s1 and 'refresh_token' in s1[0][2] and rpc1 and all(x[1] == 'A2' for x in rpc1) and k1['ses'] and k1['ses']['refresh_token'] == 'R2' and k1['ses']['t0'] == (now - 13 * 86400) * 1000
              and not k2['login'] and any(x[1] == 'A1' for x in s2) and any('refresh_token' in x[2] for x in s2) and k2['ses']['refresh_token'] == 'R2'
              and k3['login'] and not s3 and k3['ses'] is None,
              'the sign-in lasts 14 days: kept past the tab, the token renewed before it runs out and after a 401, and asked for again after 14 days', {'k3': k3, 's3': s3, 'k1': k1['login'], 'k2': k2['login']})
        print('errors:', errs[:3]); await br.close()


asyncio.run(main())
