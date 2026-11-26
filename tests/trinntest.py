"""The stages and the words (steg 152, K4 of docs/planer/regler-i-klartekst.md; Jonas 25.11.2026, V1 A and V3 A). A new save sees one
quota card first on Kvote › Mine kvoter, in plain words with the trade's own in brackets, and no paragraph signs without opening «Mer»;
the tabs for the season, the stocks and the market, the other papers, the later learning cards in Regler and the bigger boats in
Båthandel lie under «Mer» on the same page. With a coastal vessel and a structure quota everything stands as before, and «Vis alt» in
the settings gives that at every stage. What was shown once does not go away. The trade's words have the glossary's dotted line and
answer a tap. The handbook's quota tips come when they matter. Prints OK or FEIL."""
from _env import GAME, boot
import asyncio, json, os
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'k4')


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:460]) if extra != '' else ''))


# a new player after the first trip: the wooden boat in the open group, no blad B, the essentials first
NEW = """(() => { S.tut = 0; S.settings.rmAll = false; S.settings.rmMax = 0; S.company = ''; S.owned = ['trebat']; S.fm = {n:1, last:-1, kr:5000, b:false}; S.fleet.length = 1; bindVessel(S.fleet[0]); S.me = S.cur; S.licFree = [];
  const b = S.boat, Y = PORTS.find(q => q.sted === 'verft'); b.status = 'port'; b.port = Y.id; b.pos = {...Y.p}; b.type = 'trebat'; applyVessel(); S.lic = null; S.hold = []; S.tripOwner = true; S.plan = null; freshQuota().torsk = 900; return rmStage(); })()"""
KVOTE = """(() => { PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render(); const ph = document.getElementById('phone'), tabs = [...ph.querySelectorAll('.ph-sub button')].map(b => b.textContent);
  const cards = [...ph.querySelectorAll('.ph-card')], first = cards.find(c => !c.closest('details')), mer = [...ph.querySelectorAll('details.ph-mer')].map(d => d.dataset.mer);
  const c = ph.querySelector('.ph-appv') || ph, cl = c.cloneNode(true); cl.querySelectorAll('details').forEach(d => d.remove()); const open = cl.textContent;
  return {tabs, first:first ? first.className + ' | ' + first.textContent.slice(0, 200) : '', mer, par:(open.match(/§/g) || []).length, open:open.slice(0, 0), plain:/felleskvoten for småbåter \\(åpen gruppe\\)/.test(open) && /Taket ditt i år \\(maksimalkvote\\)/.test(open) && /Det du har uansett \\(garantert kvote\\)/.test(open),
    alone:['Maksimalkvote', 'Garantert kvote', 'Fartøykvote'].filter(w => new RegExp('(^|[^(])' + w + '([^)]|$)').test(open)), ord:[...ph.querySelectorAll('.ordw')].filter(e => !e.closest('details')).map(e => e.textContent)}; })()"""
BOATS = """(() => { DOCK.open('fartoy'); const e = document.querySelector('#drawerBody [data-pa=mksel]:not([data-k])'); if (e) e.click(); const d = document.getElementById('drawerBody');
  const r = {tabs:[...d.querySelectorAll('.ph-sub.mk button')].map(b => b.textContent), mer:[...d.querySelectorAll('details.ph-mer[data-mer=baater] button')].map(b => b.textContent.replace(' ›', ''))}; DOCK.close(); return r; })()"""
RULES = """(() => { PHONE.open('regler'); PHONE.dact('regler', 'sub', {s:'laer'}); PHONE.render(); const ph = document.getElementById('phone'); const cl = (ph.querySelector('.ph-appv') || ph).cloneNode(true); cl.querySelectorAll('details').forEach(d => d.remove()); const r = {par:(cl.textContent.match(/§/g) || []).length, out:[...ph.querySelectorAll('.ph-card')].filter(c => !c.closest('details')).map(c => c.querySelector('h4').textContent), inn:[...ph.querySelectorAll('details.ph-mer .ph-card')].length}; PHONE.show(false); return r; })()"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        errs = []
        for nm, (w, h) in {'staaende': (800, 1280), 'liggende': (1280, 800), 'telefon': (390, 844)}.items():
            pg = await br.new_page(viewport={'width': w, 'height': h}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); await boot(pg, GAME)
            st = await pg.evaluate(NEW); k = await pg.evaluate(KVOTE)
            check(st == 1 and k['tabs'] == ['Mine kvoter', 'Priser', 'Landinger'], nm + ': a new save: three tabs, the season, the stocks and the market not among them', k['tabs'])
            check('kv-cod' in k['first'] and 'Torsk i år' in k['first'], nm + ': the quota card comes first', k['first'][:120])
            check(k['par'] == 0, nm + ': no paragraph sign without opening «Mer»', k['par'])
            check(k['plain'] and k['alone'] == [], nm + ': the plain words first, the trade\'s own in brackets, none of them alone', k['alone'])
            check(set(k['mer']) == {'kvote', 'papirer', 'faner'}, nm + ': the rest lies under «Mer» on the same page', k['mer'])
            check(any('åpen gruppe' in x for x in k['ord']) and any('maksimalkvote' in x for x in k['ord']) and any('garantert' in x for x in k['ord']), nm + ': the trade\'s words in the brackets have the glossary\'s line', k['ord'])
            sh = await pg.evaluate("(() => { PHONE.show(false); S.boat.status = 'port'; DOCK.open('fartoy'); const tap = q => { const e = document.querySelector('#drawerBody ' + q); if (e) e.click(); }; tap('[data-pa=mksel]:not([data-k])'); tap('[data-pa=mktab][data-s=lic]'); tap('[data-pa=mksel][data-k=trebat][data-o=u7]'); const c = document.getElementById('drawerBody').cloneNode(true); c.querySelectorAll('details').forEach(d => d.remove()); const t = c.textContent; DOCK.close(); return ['Hjemmelslengde', 'Torsk, fartøykvote', 'maks / garantert', 'lukket gruppe, hjemmel', 'har denne hjemmelen', 'Første båt i lukket gruppe', 'med hjemmel i lukket gruppe'].filter(w => t.includes(w)); })()")
            check(sh == [], nm + ': the yard\'s sheet for a boat with a quota right has none of the old lone terms', sh)
            await pg.evaluate("PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render()")
            tip = await pg.evaluate("(() => { const e = [...document.querySelectorAll('#phone .ordw')].find(x => /maksimalkvote/.test(x.textContent)); e.click(); const t = document.getElementById('ordTip'); return t && !t.hidden ? t.textContent : null; })()")
            check(tip is not None and 'Det meste båten kan lande' in tip, nm + ': a tap on «maksimalkvote» gives its sentence', tip)
            await pg.evaluate("document.body.click(); PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render()"); await pg.wait_for_timeout(300); await pg.screenshot(path=os.path.join(OUT, 'kvote-ny-%s.png' % nm))
            mer = await pg.evaluate("(() => { PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render(); const d = document.querySelector('#phone details[data-mer=faner]'); d.open = true; const b = d.querySelector('button[data-s=open]'); b.click(); return [...document.querySelectorAll('#phone .ph-sub button')].map(x => x.textContent); })()")
            check(len(mer) == 4 and 'Felleskvoten' in mer[3], nm + ': the season opened from «Mer» is a tab while it is open', mer)
            # an open fold stays open when the page is drawn anew
            st = await pg.evaluate("(async () => { PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render(); const d = document.querySelector('#phone details[data-mer=kvote]'); d.open = true; await new Promise(r => setTimeout(r, 80)); PHONE.render(); const d2 = document.querySelector('#phone details[data-mer=kvote]'); const o = d2.open; d2.open = false; await new Promise(r => setTimeout(r, 80)); PHONE.render(); return [o, document.querySelector('#phone details[data-mer=kvote]').open]; })()")
            check(st == [True, False], nm + ': an open «Mer» stays open when the page is drawn anew, and a closed one closed', st)
            await pg.evaluate("PHONE.show(false)")
            if nm == 'telefon': await pg.close(); continue
            b = await pg.evaluate(BOATS); r = await pg.evaluate(RULES)
            check(b['tabs'] == ['Småbåter', 'Med kvoterett'] and b['mer'] == ['Kystflåten', 'Havfiske'], nm + ': Båthandel: the small boats and the boats with a quota right, the bigger ones under «Mer»', b)
            check(len(r['out']) == 4 and r['inn'] == 5 and 'Fjordlinjene' in r['out'] and r['par'] == 0, nm + ': Regler › Lær mer: four cards first, five under «Mer», and no paragraph sign without opening a fold', r)
            # blad B: the market is a tab; a quota of her own: the season and the stocks too; a coastal vessel with a structure quota: everything, nothing folded
            t2 = await pg.evaluate("(() => { S.fm.b = true; return rmStage(); })()"); k2 = await pg.evaluate(KVOTE)
            check(t2 == 2 and k2['tabs'][-1] == 'Marked' and len(k2['tabs']) == 4, nm + ': blad B: the market is a tab', k2['tabs'])
            t4 = await pg.evaluate("(() => { S.boat.type = 'kyst15'; applyVessel(); S.owned.push('kyst15'); S.lic = {id:'h14', hl:HJ.h14.hl, since:2026, st:[{id:'h14', kf:4.7, from:2026, until:2046}]}; licExtra(S.lic); S.company = 'Test'; freshQuota(); return rmStage(); })()"); k4 = await pg.evaluate(KVOTE); b4 = await pg.evaluate(BOATS); r4 = await pg.evaluate(RULES)
            check(t4 == 4 and len(k4['tabs']) == 6 and k4['mer'] == [] and len(b4['tabs']) == 4 and b4['mer'] == [] and r4['inn'] == 0 and len(r4['out']) == 9, nm + ': a coastal vessel with a structure quota sees everything, nothing folded', [k4['tabs'], k4['mer'], b4, r4['inn']])
            await pg.evaluate("PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render()"); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'kvote-kyst-%s.png' % nm)); await pg.evaluate("PHONE.show(false)")
            # what was shown once does not go away: back in the wooden boat without a right, the pages stay
            k5 = await pg.evaluate("(() => { S.boat.type = 'trebat'; applyVessel(); S.lic = null; S.company = ''; S.owned = ['trebat']; S.fm.b = false; freshQuota(); return rmStage(); })()"); k5k = await pg.evaluate(KVOTE)
            check(k5 == 1 and len(k5k['tabs']) == 6 and k5k['mer'] == [], nm + ': what was shown once does not go away (the highest stage is kept)', [k5, k5k['tabs']])
            # «Vis alt» at stage 1
            await pg.evaluate(NEW); va = await pg.evaluate("(() => { PHONE.open('innst'); const b = [...document.querySelectorAll('#phone [data-pa=visAlt]')]; const has = b.length; PHONE.dact('innst', 'visAlt', {v:'1'}); PHONE.show(false); return {has, all:S.settings.rmAll}; })()"); k6 = await pg.evaluate(KVOTE)
            check(va['all'] is True and len(k6['tabs']) == 6 and k6['mer'] == [], nm + ': «Vis alt» gives everything at stage 1', [va, k6['tabs']])
            # the tips: half the quota at sea, and blad B
            tp = await pg.evaluate("(() => { const by = id => HB.find(x => x.id === id), R = {ids:['kvote', 'kvhalv', 'kvover', 'kvstopp', 'egenkvote'].filter(by).length}; S.settings.rmAll = false; S.boat.status = 'idle'; S.boat.port = null; const lim = codLimitNow(S.t / 60), q = freshQuota(); q.torsk = lim * 0.2; R.low = by('kvhalv').when(); q.torsk = lim * 0.6; R.half = by('kvhalv').when(); R.over0 = by('kvover').when(); S.hold = [{sp:'torsk', kg:lim, fresh:90, bled:true, iced:true, cls:1, hook:true}]; R.over = by('kvover').when(); S.hold = []; S.landN = 5; R.eg0 = by('egenkvote').when(); S.fm.b = true; R.eg = by('egenkvote').when(); R.txt = by('kvote').no; return R; })()")
            check(tp['ids'] == 5 and tp['low'] is False and tp['half'] is True and tp['over0'] is False and tp['over'] is True and tp['eg0'] is False and tp['eg'] is True and 'felleskvoten for småbåter (åpen gruppe)' in tp['txt'], nm + ': the tips come when they matter: half the quota, over it, blad B', tp)
            await pg.close()
        print('errors:', errs[:5]); await br.close()

asyncio.run(main())
