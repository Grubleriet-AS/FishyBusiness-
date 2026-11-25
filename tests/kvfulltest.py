from _env import boot, OUT
# KV1 (steg 148, 25.11.2026): the open group's additions to the cod quota in the Kvote app and at the landing, and the card «Torskekvoten
# er full». J-161-2026 §§ 21–23: the quota by the vessel's length, 3.5 t from the coastal-fishing scheme for a home in the scheme's
# municipalities (Båtsfjord here) and 2 t as the age addition for everyone; no cod as bycatch beyond the quota. Pictures of Mine kvoter
# in 1280×800, 800×1280 and on a phone, with the quota full and with room left. The rules themselves: tests/unit/apentillegg.test.mjs.
import asyncio, json, os
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:700]) if extra != '' else ''))


FIT = """(() => { const d = document.querySelector('#phone'); if (!d) return ['none']; const r = d.getBoundingClientRect();
  return [...d.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.right > r.right + 1 && !e.closest('svg') && !e.closest('.ph-sub'); }).map(e => e.tagName + '.' + e.className).slice(0, 5); })()"""

# a save in the open group with the wooden boat, at home in `home` (a harbour's name, or an id), with `used` of the quota landed (1 = full)
SETUP = """((home, used) => { S.tut = 0; S.lic = null; S.boat.status = 'port'; const pt = portById(home) || PORTS.find(q => q.mk && q.name === home); S.home = pt.id;
  const q = freshQuota(), H = S.t / 60, lim = codLimitNow(H); q.torsk = Math.round(lim * used); PHONE.show(true); PHONE.open('kvote'); PHONE.dact('kvote', 'sub', {s:'mine'}); PHONE.render();
  const txt = sel => { const e = document.querySelector(sel); return e ? e.textContent : null; }, l = codLimits(H);
  const card = [...document.querySelectorAll('#phone .ph-card')].find(c => /åpen gruppe/.test((c.querySelector('h4') || {}).textContent || ''));
  const O = yearQuota(yearH(H)).open; return {home:pt.name, kyst:kystOrd(pt.id), yk:Math.round(O.kyst * 1000), ya:Math.round(O.alder * 1000), lim, base:[l.base.max, l.base.guar], add:l.add, full:txt('#kvFull'), first:(document.querySelector('#phone .ph-c') || {firstElementChild:null}).firstElementChild === document.querySelector('#kvFull'), card:card ? card.textContent : null, btn:!!document.querySelector('#kvFull [data-pa="sub"][data-s="mkt"]')}; })"""

# the landing: cod aboard over what is left goes on the quota up to the limit with the additions, and the rest is confiscated
LAND = """((over) => { const H = S.t / 60, q = quotaState(), room = codRoom(H); S.hold = [{sp:'torsk', kg:room + over, t:S.t, q:1}, {sp:'sei', kg:200, t:S.t, q:1}];
  const r = landConf(H, q, access()); S.hold = []; return {acc:access(), room, codQ:Math.round(r.codQ), conf:Math.round(r.codConf), grp:Math.round(codGroupKg(q.torsk, r.codQ, codLimitNow(H), openAdd(H).kyst))}; })"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width': 1280, 'height': 800})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        # 1. Båtsfjord, the quota full: the card on top, with what is open and the dates, and the quota card with both additions
        a = await pg.evaluate(SETUP + "('Båtsfjord', 1)"); f = a['full'] or ''; yk, ya = a['yk'], a['ya']; t1 = lambda kg, n=1: (('%.' + str(n) + 'f') % (kg / 1000)).replace('.', ',')
        # (the test's own clock stands in 2027, where the additions have followed the open group's quota from 3.5 and 2 t: the year's own are asked)
        check(a['kyst'] and a['add'] == {'kyst': yk, 'alder': ya, 'sum': yk + ya} and a['lim'] == a['base'][0] + yk + ya and abs(yk / ya - 1.75) < 0.06, 'Båtsfjord er i kystfiskeordningen: § 21 + årets kystfisketillegg (%s t) + alderstillegg (%s t)' % (t1(yk), t1(ya)), {k: a[k] for k in ('home', 'lim', 'base', 'add')})
        check(a['first'] and 'Torskekvoten er full' in f and 'Hyse og sei' in f and 'Ny kvote' in f and 'Blad B' in f and 'ikke lov å ha torsk som bifangst' in f and a['btn'],
              'full kvote: kortet «Torskekvoten er full» står øverst i Mine kvoter med hva som er åpent, datoene, blad B og knappen til Marked', f[:400])
        check('Ferskfiskordningen' in f and ('Maksimalkvoten kan bli økt' in f or 'stoppet' in (a['card'] or '')), 'og det sier når ferskfiskordningen starter, og når maksimalkvoten kan bli økt så lenge fisket ikke er stoppet', f[:300])
        c = a['card'] or ''
        check('Kystfiskeordningen+ %s t' % t1(yk) in c and 'Alderstillegg+ %s t' % t1(ya) in c and 'Kvoten din nå%s t' % t1(a['lim']) in c and 'Igjen nå0,00 t' in c, 'kvotekortet viser § 21, kystfiskeordningen, alderstillegget, summen og at ingenting er igjen', c[:420])
        fits = [await pg.evaluate(FIT)]
        await pg.screenshot(path=os.path.join(OUT, 'kvfull_baatsfjord_liggende.png'))
        ld = await pg.evaluate(LAND + "(300)")
        check(ld['acc'] == 'open' and ld['room'] == 0 and ld['codQ'] == 0 and ld['conf'] == 300, 'full kvote: 300 kg torsk om bord blir inndratt, ingen bifangst ut over kvoten (§ 21)', ld)
        for w, h, tag in [(800, 1280, 'staaende'), (390, 844, 'telefon')]:
            await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(300)
            await pg.evaluate("PHONE.render()"); await pg.wait_for_timeout(200); fits.append(await pg.evaluate(FIT))
            await pg.screenshot(path=os.path.join(OUT, 'kvfull_baatsfjord_%s.png' % tag))
            await pg.evaluate("(() => { const e = [...document.querySelectorAll('#phone .ph-card')].find(c => /åpen gruppe/.test((c.querySelector('h4') || {}).textContent || '')); if (e) e.scrollIntoView({block:'center'}); })()"); await pg.wait_for_timeout(200)
            await pg.screenshot(path=os.path.join(OUT, 'kvfull_kvotekort_%s.png' % tag))
        await pg.set_viewport_size({'width': 1280, 'height': 800}); await pg.wait_for_timeout(200)
        # 2. Vangshamn on Senja, the quota of § 21 just landed: outside the scheme, 2 t to go on, no card
        b = await pg.evaluate(SETUP + "('vangshamn', 0)"); room = await pg.evaluate("(() => { const q = quotaState(), l = codLimits(); q.torsk = codOpen(S.t / 60) ? l.base.max : l.base.guar; PHONE.render(); return {room:codRoom(S.t / 60), full:!!document.querySelector('#kvFull'), card:[...document.querySelectorAll('#phone .ph-card')].find(c => /åpen gruppe/.test((c.querySelector('h4') || {}).textContent || '')).textContent}; })()")
        check(not b['kyst'] and b['add'] == {'kyst': 0, 'alder': ya, 'sum': ya} and room['room'] == ya and not room['full'], 'Vangshamn (Senja) er utenfor: bare alderstillegget, og den som hadde fylt § 21-kvoten, har det igjen og ser ikke kortet', {'add': b['add'], 'room': room['room'], 'full': room['full']})
        check('gjelder ikke hjemstedet ditt' in room['card'] and 'Alderstillegg+ %s t' % t1(ya) in room['card'] and 'Igjen nå%s t' % t1(ya, 2) in room['card'], 'kvotekortet sier at kystfiskeordningen ikke gjelder hjemstedet, og viser alderstillegget og det som er igjen', room['card'][:420])
        await pg.evaluate("(() => { const e = [...document.querySelectorAll('#phone .ph-card')].find(c => /åpen gruppe/.test((c.querySelector('h4') || {}).textContent || '')); if (e) e.scrollIntoView({block:'center'}); })()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=os.path.join(OUT, 'kvfull_vangshamn_liggende.png')); fits.append(await pg.evaluate(FIT))
        ld = await pg.evaluate(LAND + "(500)")
        check(ld['room'] == ya and ld['codQ'] == ya and ld['conf'] == 500 and ld['grp'] == ya, 'leveringen: alderstillegget går på kvoten (alt på gruppekvota utenfor ordningen) og 500 kg over blir inndratt', ld)
        # 2b. the cod aboard counts as in the log's warning: 1 000 kg left on the quota and 1 200 kg aboard shows the card, with what is left
        ab = await pg.evaluate("(() => { const q = quotaState(), lim = codLimitNow(S.t / 60); q.torsk = lim - 1000; S.hold = [{sp:'torsk', kg:1200, t:S.t, q:1}]; PHONE.render(); const a = (document.querySelector('#kvFull') || {}).textContent || ''; S.hold = [{sp:'torsk', kg:400, t:S.t, q:1}]; PHONE.render(); const b = !!document.querySelector('#kvFull'); S.hold = []; return {a, b}; })()")
        check('Torsken om bord fyller kvoten' in ab['a'] and 'Torsk om bord1 200 kg' in ab['a'].replace('\u00a0', ' ') and not ab['b'], 'torsken om bord teller: 1 000 kg igjen og 1 200 kg om bord viser kortet «Torsken om bord fyller kvoten», 400 kg om bord gjør det ikke', ab['a'][:160])
        # 2c. the fresh-fish scheme on (after 29 June): the card says what goes outside the quota, not that all cod is confiscated
        ff = await pg.evaluate("(() => { const t0 = S.t, y = yearH(S.t / 60); S.t = Math.round(hOfDoy(y, doyOf(y, 8, 1)) * 60); const q = freshQuota(), H = S.t / 60, pct = ffPct(H); q.torsk = codLimitNow(H); PHONE.render(); const a = (document.querySelector('#kvFull') || {}).textContent || ''; const fin = isFinite(codLimitNow(H)); S.t = t0; S.quota = null; PHONE.render(); return {a, pct, fin}; })()")
        check((not ff['fin']) or (ff['pct'] > 0 and 'går utenom kvoten' in ff['a'] and 'Når ferskfiskordningen starter' not in ff['a'] and 'Fisk hyse, sei og andre arter til torsken åpner igjen' not in ff['a']), '1. august med full kvote: kortet sier at torsk innenfor ferskfiskordningen går utenom kvoten, ikke at all torsk inndras', {'pct': ff['pct'], 'fin': ff['fin'], 'a': ff['a'][:260]})
        # 3. the coast, three more homes: north (Honningsvåg, in), middle (Henningsvær, out), south of 62° N (Egersund, out)
        for name, inn in [('Honningsvåg', True), ('Skjervøy', True), ('Henningsvær', False), ('Egersund', False)]:
            s = await pg.evaluate(SETUP + "(%s, 0.2)" % json.dumps(name))
            check(s['kyst'] == inn and s['add']['kyst'] == (yk if inn else 0) and s['add']['alder'] == ya and not s['full'], '%s: %s, kvoten %s t' % (name, 'i kystfiskeordningen' if inn else 'utenfor', ('%.1f' % (s['lim'] / 1000)).replace('.', ',')), s['add'])
        # the part of a landing on the coastal scheme's 3.5 t is not the group's
        g = await pg.evaluate("(() => { const pt = PORTS.find(q => q.mk && q.name === 'Båtsfjord'); S.home = pt.id; const q = freshQuota(), lim = codLimitNow(S.t / 60); q.torsk = lim - 4000; return (" + LAND + ")(0); })()")
        check(g['codQ'] == 4000 and g['grp'] == 4000 - yk, 'Båtsfjord, 4 000 kg igjen: bare det under kystfisketillegget går på gruppekvota, resten på ordningens egen avsetning', g)
        check(all(not x for x in fits), 'ingenting stikker ut av telefonen i 1280×800, 800×1280 eller 390×844', fits)
        await pg.evaluate("PHONE.show(false)")
        print('errors:', errs[:5]); await br.close()

asyncio.run(main())
