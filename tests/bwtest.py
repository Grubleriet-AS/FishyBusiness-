"""The Black Week pack and the gift (27.11.2026, docs/planer/svart-fredag.md; core/03-simulation.js PACKS.blackweek and packOn,
ui/phone/01-haill-fiske-service.js kbShop, ui/10i-shop.js shopThanks): while it is sold its card stands first in Kaiboden with what it
saves from the real prices, the saving in kroner and its last day in words; a purchase gives 8 haill, Turbotrim and Skippertak for 3
days; the confirmation of another purchase, and of the gift (a Turbotrim that is no product of the shop), has one line about the pack
and a button that opens Kaiboden; and from the end of the sale the card and the line are gone, and a card that stood open sells nothing.
The pack's end is a date (unit test butikk.test.mjs); here it is moved round the test's own «now», so the test says the same after it.
In both formats, with pictures to tests/out/ (bw-*.png). Prints OK or FEIL."""
from _env import GAME, OUT, boot
import asyncio, json, os
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:500]) if extra != '' else ''))


GIFT = "[{g:{id:9001, product:'trim_2', data:{give:'trim', k:'t2', comp:true, bw:true}}, no:'Turbotrim er på hele flåten.', en:'Turbo tune is on the whole fleet.'}]"
HERO = """(() => { const h = document.querySelector('.kbs-hero.bw'), all = [...document.querySelectorAll('.kbs-hero')], b = h && h.querySelector('.kbs-buy'), r = b && b.getBoundingClientRect(), c = h && h.getBoundingClientRect();
  return {on:!!h, first:!!h && all[0] === h, n:all.length, txt:h ? h.textContent : '', btnH:r ? Math.round(r.height) : 0, btnW:r ? Math.round(r.width) : 0, w:c ? Math.round(c.width) : 0, vw:innerWidth,
    inside:!!c && c.left >= 0 && c.right <= innerWidth + 1, pic:!!h && !!h.querySelector('.kbs-hpic .ic-img, .kbs-hpic img, .kbs-hpic .kb-pic')}; })()"""


async def one(br, name, w, h):
    pg = await br.new_page(viewport={'width': w, 'height': h}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await boot(pg)
    J = lambda js: pg.evaluate('JSON.stringify(' + js + ')')
    # (the sale lasts three days from the test's own now, whatever the date is when it runs)
    await pg.evaluate("PACKS.blackweek.until = worldNow() + 3 * 864e5; S.haillFree = true; if (typeof icAtlas === 'function') icAtlas()")
    # the gold dot on the Kaiboden button in 3D: there while the pack is sold (the button asks every 20 s), gone when the button is tapped
    await pg.wait_for_function("document.getElementById('kbBtn').classList.contains('kb-ny')", timeout=30000)
    d0 = await pg.evaluate("(() => { const b = document.getElementById('kbBtn'), a = getComputedStyle(b, '::after'), p = getComputedStyle(b).position; return {w:a.width, c:a.backgroundColor, p}; })()")
    await pg.screenshot(path=os.path.join(OUT, 'bw-prikk-%s.png' % name))
    await pg.evaluate("S.haillInv = {haill:2, luksus:0}; document.getElementById('kbBtn').click()"); await pg.wait_for_timeout(600)   # (with haill in store: Kaiboden opened its store before)
    d1 = await pg.evaluate("document.getElementById('kbBtn').classList.contains('kb-ny')")
    check(d0['w'] == '11px' and d0['p'] != 'static' and not d1 and bool(await pg.evaluate("document.querySelector('.kbs-hero.bw')")), name + ': Kaiboden-knappen har en gullprikk mens pakken selges, og trykket åpner Kaiboden på pakken og tar prikken bort', [d0, d1])
    r = json.loads(await J(HERO)); t = r['txt']
    check(r['on'] and r['first'] and r['n'] == 2, name + ': Black Week-pakken står først i Kaiboden, over Sjøværspakken', {k: r[k] for k in ('on', 'first', 'n')})
    check(all(x in t for x in ('Black Week-pakken', 'Spar 45 %', '910 kr', 'Du sparer 411 kr', 'Selges til og med mandag 30.11', '8 haill', '3 døgn')), name + ': kortet sier innholdet, hva delene koster, hva du sparer og siste dag', t[:260])
    check(r['btnH'] >= 48 and r['inside'], name + ': kjøpsknappen er minst 48 px høy, og kortet er innenfor skjermen', {k: r[k] for k in ('btnH', 'btnW', 'w', 'vw', 'inside')})
    await pg.wait_for_timeout(1200)
    await pg.screenshot(path=os.path.join(OUT, 'bw-kaiboden-%s.png' % name))
    # where the shop is closed («Snart i salg») the card is not there
    off = await pg.evaluate("(() => { const f = shopMode; shopMode = () => 'off'; PHONE.render(); const r = !document.querySelector('.kbs-hero.bw') && !!document.querySelector('.kbs-hero'); shopMode = f; PHONE.render(); return r; })()")
    check(off and bool(await pg.evaluate("!!document.querySelector('.kbs-hero.bw')")), name + ': med butikken stengt står ikke Black Week-kortet der, bare Sjøværspakken')
    # the purchase (a test without payment where there is no cloud): what the card says is what is given
    b0 = json.loads(await J("{h:(S.haillInv || {}).haill || 0, trim:!!trimOn(S.boat), skip:skipOn()}"))
    await pg.evaluate("document.querySelector('.kbs-hero.bw .kbs-buy').click()"); await pg.wait_for_timeout(400)
    b1 = json.loads(await J("{h:(S.haillInv || {}).haill || 0, k:(trimRec(S.boat) || {}).k, left:Math.round(trimLeft(S.boat) / GAME_RATE), skip:skipOn(), sk:Math.round(skipLeft() / GAME_RATE)}"))
    check(b1['h'] - b0['h'] == 8 and b1['k'] == 't72' and b1['left'] == 72 and b1['skip'] and b1['sk'] == 72, name + ': kjøpet gir 8 haill, Turbotrim i 72 timer og Skippertak i 72 timer', [b0, b1])
    # the gift's confirmation: named by what it gives, no price, and the way to the pack
    await pg.evaluate("PHONE.show(false); document.getElementById('modal').hidden = true; shopThanks(%s)" % GIFT); await pg.wait_for_timeout(900)
    m = json.loads(await J("(() => { const m = document.getElementById('modal'), l = m.querySelector('.shoprc-bw'), b = m.querySelector('[data-bw]'), r = b && b.getBoundingClientRect(); return {open:!m.hidden, txt:m.textContent, line:l ? l.textContent : '', btn:b ? b.textContent : '', btnH:r ? Math.round(r.height) : 0}; })()"))
    check(m['open'] and 'En gave fra Det Store Blå' in m['txt'] and 'Turbotrim' in m['txt'] and '29 kr' not in m['txt'], name + ': gaven kvitteres som en gave med navnet Turbotrim og uten pris', m['txt'][:200])
    check(all(x in m['line'] for x in ('Black Week-pakken', '499 kr', '910 kr', 'Selges til og med mandag 30.11')) and m['btn'] == 'Se pakken' and m['btnH'] >= 48, name + ': kvitteringen har én linje om pakken og knappen «Se pakken»', {'line': m['line'], 'btn': m['btn'], 'h': m['btnH']})
    await pg.screenshot(path=os.path.join(OUT, 'bw-gave-%s.png' % name))
    # a window opened over the confirmation before it is answered (the report of the time away at the start does that) does not take
    # it away: it comes again when that window is closed
    await pg.evaluate("modal('<div class=\"ob\"><p>Mens du var borte</p><div class=\"btns\"><button class=\"btn p\" data-close>Ok</button></div></div>')"); await pg.wait_for_timeout(1500)
    over = await pg.evaluate("!document.querySelector('#modal .shoprc')")
    await pg.evaluate("document.querySelector('#modal [data-close]').click()")
    try: await pg.wait_for_function("!document.getElementById('modal').hidden && !!document.querySelector('#modal .shoprc-bw')", timeout=8000); back = True
    except Exception: back = False
    check(over and back, name + ': en kvittering som et annet vindu la seg over, kommer igjen når det vinduet lukkes', {'over': over, 'back': back})
    # the same in English
    await pg.evaluate("document.getElementById('modal').hidden = true; S.lang = 'en'; PHONE.open('trim')"); await pg.wait_for_timeout(400)
    en = await pg.evaluate("(document.querySelector('.kbs-hero.bw') || {}).textContent || ''")
    await pg.evaluate("PHONE.show(false); shopThanks(%s)" % GIFT); await pg.wait_for_timeout(900)
    en2 = await pg.evaluate("(document.querySelector('#modal .shoprc-bw') || {}).textContent || ''")
    check(all(x in en for x in ('The Black Week pack', 'Save 45 %', 'You save 411 kr', 'On sale through Monday 30 Nov')) and 'On sale through Monday 30 Nov' in en2, name + ': kortet og linja i kvitteringen på engelsk', [en[:200], en2])
    await pg.evaluate("document.getElementById('modal').hidden = true; S.lang = 'no'"); await pg.wait_for_timeout(1300)   # (the English one's own watch has seen it closed)
    await pg.evaluate("shopThanks(%s)" % GIFT); await pg.wait_for_timeout(900)
    await pg.evaluate("document.querySelector('#modal [data-bw]').click()"); await pg.wait_for_timeout(600)
    r = json.loads(await J(HERO))
    check(r['on'] and await pg.evaluate("document.getElementById('modal').hidden && document.body.classList.contains('ph-on')"), name + ': «Se pakken» lukker kvitteringen og åpner Kaiboden på pakken')
    # after the pack itself the confirmation does not sell it again
    await pg.evaluate("PHONE.show(false); shopThanks([{g:{id:9002, product:'pakke_blackweek', data:{give:'skip', k:'s72'}}, no:'x', en:'x'}])"); await pg.wait_for_timeout(900)
    check(not await pg.evaluate("!!document.querySelector('#modal .shoprc-bw, #modal [data-bw]')"), name + ': kvitteringen for pakken selv har ikke linja')
    await pg.evaluate("document.getElementById('modal').hidden = true")
    # the end: a card that stands open sells nothing, and the next look has neither the card nor the line
    await pg.evaluate("PHONE.open('trim')"); await pg.wait_for_timeout(400)
    b2 = json.loads(await J("{h:(S.haillInv || {}).haill || 0, left:Math.round(trimLeft(S.boat) / GAME_RATE)}"))
    await pg.evaluate("PACKS.blackweek.until = worldNow() - 1000; document.querySelector('.kbs-hero.bw .kbs-buy').click()"); await pg.wait_for_timeout(400)
    b3 = json.loads(await J("{h:(S.haillInv || {}).haill || 0, left:Math.round(trimLeft(S.boat) / GAME_RATE), toast:document.getElementById('toast').textContent}"))
    check(b3['h'] == b2['h'] and b3['left'] == b2['left'] and 'Tilbudet er over' in b3['toast'], name + ': etter slutten selger et kort som sto åpent ingenting', [b2, b3])
    await pg.evaluate("PHONE.show(false); PHONE.open('trim')"); await pg.wait_for_timeout(400)
    r = json.loads(await J(HERO)); n = await pg.evaluate("document.querySelectorAll('.kbs-hero').length")
    check(not r['on'] and n == 1, name + ': etter slutten er kortet borte, og Sjøværspakken står igjen', {'bw': r['on'], 'n': n})
    # (Kaiboden opens where it was last: the store, for one who came from «Bruk haill» and has haill)
    await pg.evaluate("PHONE.show(false); PHONE.open('haill'); PHONE.show(false); PHONE.open('kaiboden')"); await pg.wait_for_timeout(400)
    tab = await pg.evaluate("(document.querySelector('.kb-shop-tabs button.on') || {}).textContent || ''")
    check(tab.startswith('Mine boostere'), name + ': etter slutten åpner Kaiboden lageret igjen for den som har haill', tab)
    await pg.evaluate("PHONE.show(false); PHONE.open('trim')"); await pg.wait_for_timeout(400)
    await pg.screenshot(path=os.path.join(OUT, 'bw-etter-%s.png' % name))   # (Kaiboden as it was before the pack, and is again after it)
    await pg.evaluate("PHONE.show(false); shopThanks(%s)" % GIFT); await pg.wait_for_timeout(900)
    check(not await pg.evaluate("!!document.querySelector('#modal .shoprc-bw, #modal [data-bw]')"), name + ': etter slutten har kvitteringen ikke linja')
    check(not errs, name + ': ingen sidefeil', errs)
    await pg.close()


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        await one(br, 'staaende', 800, 1280)
        await one(br, 'liggende', 1280, 800)
        await br.close()

asyncio.run(main())
