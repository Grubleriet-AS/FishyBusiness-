"""The quota meter and the warnings (steg 150, K2 of docs/planer/regler-i-klartekst.md; Jonas 25.11.2026, V2 A: the meter shows when it
matters). At sea in the status box: nothing under half the quota, a row with a bar from half, yellow from 80 %, red with the kilos over
when what is aboard does not fit; a tap opens Kvote. On the strip (a phone) a mark on line 3 when it is yellow or red. The rules line
says «!» and «bare bifangst» to a boat without access, never «✓» (rmNow in core/03l-room.js). The quay has the meter beside the warning,
the landing note says what is left of the cod quota, and the home screen has the card «Torsk i år». Not in the first trip. Prints OK or FEIL."""
from _env import GAME, boot
import asyncio, json, os
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'k2')


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:420]) if extra != '' else ''))


SEA = """(() => { S.tut = 0; S.plan = null; const b = S.boat; b.status = 'idle'; b.port = null; S.tripOwner = true; S.lic = null; b.type = 'trebat'; applyVessel(); S.settings.hudMin = false; S.settings.hudFull = false; return 1; })()"""
# the cod landed and aboard as shares of the limit now
SET = """((a, ab) => { const lim = codLimitNow(S.t / 60), q = freshQuota(); q.torsk = lim * a; S.hold = ab > 0 ? [{sp:'torsk', kg:lim * ab, fresh:90, bled:true, iced:true, cls:1, hook:true}] : []; renderHud();
  const row = document.querySelector('#hud .row.qlink'), bar = row && row.querySelector('.qm'), rl = document.querySelector('#hud .row.rlink b'), l3 = document.querySelector('#hud .st.nx');
  return {row:!!row, txt:row ? row.textContent : '', cls:bar ? bar.className : '', w:bar ? [...bar.querySelectorAll('i')].map(i => Math.round(parseFloat(i.style.width))) : [], rules:rl ? rl.textContent : '', l3:l3 ? l3.textContent : '', l3cls:l3 ? l3.className : '', strip:document.body.classList.contains('hudstrip')}; })"""
NOACC = """(() => { S.boat.type = 'kyst15'; applyVessel(); freshQuota(); S.hold = [{sp:'torsk', kg:800, fresh:90, bled:true, iced:true, cls:1, hook:true}, {sp:'sei', kg:200, fresh:90, cls:1, hook:true}]; renderHud();
  const rl = document.querySelector('#hud .row.rlink b'), row = document.querySelector('#hud .row.qlink'), l3 = document.querySelector('#hud .st.nx');
  return {rules:rl ? rl.textContent : '', cls:rl ? rl.className : '', row:row ? row.textContent : '', l3:l3 ? l3.textContent : '', now:rmNow().top && rmNow().top.k}; })()"""
QUAY = """(() => { const tap = q => { const e = document.querySelector(q); if (e) e.click(); return !!e; };
  S.boat.type = 'trebat'; applyVessel(); S.lic = null; const b = S.boat, P = PORTS.find(q => q.mottak && q.pier !== false); b.status = 'port'; b.port = P.id; b.pos = {...P.p}; S.tripOwner = true;
  const lim = codLimitNow(S.t / 60), q = freshQuota(); q.torsk = lim * 0.9; S.hold = [{sp:'torsk', kg:lim * 0.3, fresh:90, bled:true, iced:true, cls:1, hook:true}];
  const w = landWarn(P), d = document.createElement('div'); d.innerHTML = w; const R = {landq:!!d.querySelector('.landq .qm'), warn:/inndratt/.test(d.textContent), q:(d.querySelector('.landq') || {}).textContent || ''};
  sell(); R.ls = S.lastSale && S.lastSale.qcod; R.lim = Math.round(lim); return R; })()"""
SLIP = """(() => { const h = typeof slipHtml === 'function' ? slipHtml() : null; const all = document.body.innerHTML; const d = document.createElement('div'); d.innerHTML = all; const e = d.querySelector('.slipq'); return {row:e ? e.textContent : null, bar:!!(e && e.querySelector('.qm'))}; })()"""
HOME = """(() => { S.boat.status = 'idle'; S.boat.port = null; const lim = codLimitNow(S.t / 60), q = freshQuota(); q.torsk = lim * 0.3; S.hold = []; PHONE.open('home'); const c = [...document.querySelectorAll('#phone .ph-now')].find(e => /Torsk i år/.test(e.textContent)); const t = c ? c.textContent : null; PHONE.show(false); return t; })()"""
TUT = """(() => { S.tut = {v:2, i:5}; const lim = codLimitNow(S.t / 60); quotaState().torsk = lim; S.hold = [{sp:'torsk', kg:500, fresh:90, bled:true, iced:true, cls:1, hook:true}]; const n0 = S.log.length; S.boat.status = 'fishing'; const R = {tut:typeof tutOn === 'function' && tutOn()}; S.tut = 0; return R; })()"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        errs = []
        for nm, (w, h) in {'liggende': (1280, 800), 'staaende': (800, 1280), 'telefon': (390, 844)}.items():
            pg = await br.new_page(viewport={'width': w, 'height': h}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); await boot(pg, GAME)
            await pg.evaluate(SEA); await pg.wait_for_timeout(300)
            r = {k: await pg.evaluate(SET + '(%s, %s)' % v) for k, v in {'lav': (0.2, 0.1), 'halv': (0.4, 0.2), 'gul': (0.5, 0.35), 'rod': (0.5, 0.7)}.items()}
            strip = r['lav']['strip']
            if not strip:
                check(not r['lav']['row'], nm + ': under half the quota the box has no quota row', r['lav'])
                check(r['halv']['row'] and 'r1' not in r['halv']['cls'] and 'r2' not in r['halv']['cls'] and abs(r['halv']['w'][0] - 40) <= 1 and abs(r['halv']['w'][1] - 20) <= 1 and 'igjen' in r['halv']['txt'], nm + ': from half the quota a row with the bar: landed and aboard', r['halv'])
                check('r1' in r['gul']['cls'], nm + ': yellow from 80 %', r['gul'])
                check('r2' in r['rod']['cls'] and 'kg over' in r['rod']['txt'], nm + ': red with the kilos over when what is aboard does not fit', r['rod'])
                check('Torskekvoten er full' in r['rod']['rules'] and '✓' not in r['rod']['rules'], nm + ': the rules row says the quota is full too, so no two places disagree', r['rod']['rules'])
                await pg.evaluate(SET + '(0.5, 0.35)'); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'boks-gul-%s.png' % nm))
                await pg.evaluate(SET + '(0.5, 0.7)'); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'boks-rod-%s.png' % nm))
                await pg.evaluate("PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'open'}); PHONE.show(false)")   # (another tab stood there last)
                await pg.evaluate(SET + '(0.4, 0.2)'); await pg.evaluate("document.querySelector('#hud .row.qlink').click()"); await pg.wait_for_timeout(400)
                op = await pg.evaluate("({open:PHONE.isOpen ? PHONE.isOpen() : !!document.querySelector('#phone.on, body.ph-on'), txt:(document.getElementById('phone') || {}).textContent || ''})")
                on = await pg.evaluate("(document.querySelector('#phone .ph-sub button.on') || {}).textContent || ''")
                check('Mine kvoter' in op['txt'] and on == 'Mine kvoter', nm + ': a tap on the row opens Kvote on «Mine kvoter», whatever tab stood there last', on)
                await pg.evaluate("PHONE.show(false)")
                await pg.evaluate(SET + '(0.5, 0.7)'); hc = await pg.evaluate("(() => { const d = document.createElement('div'); d.innerHTML = panelHold(); const e = d.querySelector('.holdconf'); return e ? e.textContent : null; })()")
                check(hc is not None and 'ikke får betalt' in hc, nm + ': the hold table says what of it would not be paid for now', hc); await pg.evaluate("PHONE.show(false)")
            else:
                check('Torskekvote' not in r['lav']['l3'] and 'Torskekvote' not in r['halv']['l3'], nm + ': the strip says nothing about the quota while it is not yellow', [r['lav']['l3'], r['halv']['l3']])
                check('Torskekvote' in r['gul']['l3'] and 'r1' in r['gul']['l3cls'], nm + ': the strip has the mark, yellow, from 80 %', [r['gul']['l3'], r['gul']['l3cls']])
                ev = await pg.evaluate("(() => { S.boat.fishUntil = S.t + 90; S.boat.status = 'fishing'; return 1; })()"); g2 = await pg.evaluate(SET + '(0.5, 0.35)'); r2 = await pg.evaluate(SET + '(0.5, 0.7)'); await pg.evaluate("(() => { S.boat.fishUntil = null; S.boat.status = 'idle'; })()")
                check('Torsk' not in g2['l3'] and 'kg over' in r2['l3'], nm + ': a yellow mark gives way to the next event, a red one does not', [g2['l3'], r2['l3']])
                check('r2' in r['rod']['l3cls'] and 'kg over' in r['rod']['l3'], nm + ': and red with the kilos over when it is full', [r['rod']['l3'], r['rod']['l3cls']])
                await pg.evaluate(SET + '(0.5, 0.35)'); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'stripe-gul-%s.png' % nm))
            na = await pg.evaluate(NOACC)
            check(na['now'] == 'rmacc' and ('✓' not in (na['rules'] + na['l3'])) and ('bifangst' in (na['rules'] + na['l3']).lower()), nm + ': a boat without access gets «!» and «bare bifangst», not «✓»', na)
            await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'uten-adgang-%s.png' % nm))
            if nm != 'telefon':   # the pictures of the quay, the landing note and the home screen, for the eye
                await pg.evaluate("(() => { S.boat.type = 'trebat'; applyVessel(); S.lic = null; const b = S.boat, P = PORTS.find(q => q.mottak && q.pier !== false); b.status = 'port'; b.port = P.id; b.pos = {...P.p}; S.tripOwner = true; const lim = codLimitNow(S.t / 60), q = freshQuota(); q.torsk = lim * 0.9; S.hold = [{sp:'torsk', kg:lim * 0.3, fresh:90, bled:true, iced:true, cls:1, hook:true}]; DOCK.open('lever'); })()")
                await pg.wait_for_timeout(500); await pg.evaluate("(() => { const e = document.querySelector('#drawerBody .landq'); if (e) e.scrollIntoView({block:'center'}); })()"); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'kaia-%s.png' % nm))
                sl = await pg.evaluate("(() => { sell(); DOCK.open('lever'); const e = document.querySelector('#drawerBody .slipq'); if (e) e.scrollIntoView({block:'center'}); return e ? e.textContent : null; })()")
                await pg.wait_for_timeout(1500); await pg.evaluate("(() => { const e = document.querySelector('#drawerBody .slipq'); if (e) e.scrollIntoView({block:'center'}); })()"); await pg.wait_for_timeout(200); await pg.screenshot(path=os.path.join(OUT, 'seddel-%s.png' % nm))
                check(sl is not None and 'Igjen av torskekvoten' in sl, nm + ': the landing note in the drawer has the row «Igjen av torskekvoten»', sl)
                await pg.evaluate("DOCK.close(); S.boat.status = 'idle'; S.boat.port = null; PHONE.open('home')"); await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(OUT, 'hjem-%s.png' % nm)); await pg.evaluate("PHONE.show(false)")
            if nm == 'liggende':
                q = await pg.evaluate(QUAY)
                check(q['landq'] and q['warn'], 'the quay: the meter stands beside the warning', q)
                check(q['ls'] and abs(q['ls'][1] - q['lim']) <= 1 and q['ls'][0] >= q['lim'] - 1, 'the landing note keeps what is landed on the cod quota and the limit', q)
                hm = await pg.evaluate(HOME)
                check(hm is not None and ' av ' in hm, 'the home screen has the card «Torsk i år»', hm)
            await pg.close()
        print('errors:', errs[:5]); await br.close()

asyncio.run(main())
