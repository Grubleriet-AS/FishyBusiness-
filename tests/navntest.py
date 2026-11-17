"""The names in the Rederi app (Jonas 17.11.2026: «Noen spillere ønsker å kunne bytte navn på rederiet», and «mange spillere ikke har
døpt båtene sine, så kanskje vi må gi de en liten "heads-up"»): the company is renamed from its card (an AS keeps « AS»); a boat that goes
by her mark has «Døp båten» up front, and naming her there paints the name on (S.unnamed gone; before, the name was set and she stayed
unnamed); a registered player whose boat is unnamed is asked after a landing, once a session and at most three times, a guest is not.
Prints OK or FEIL per check, the page errors last."""
import asyncio, json
from playwright.async_api import async_playwright
from _env import *

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:300]) if extra != '' else ''))

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + ',ro0')
        if True:
            r = await pg.evaluate("""() => { S.company = 'Havbris Fiskeri'; S.form = 'ENK'; window.prompt = () => '  Nordlys   Rederi '; PHONE.open('rederi'); const b = document.querySelector('[data-pa="coname"]'); const had = !!b; b && b.click();
              const enk = S.company; S.company = 'Havbris Fiskeri AS'; S.form = 'AS'; window.prompt = () => 'Kvitbjørn'; PHONE.render(); document.querySelector('[data-pa="coname"]').click(); const as = S.company;
              window.prompt = () => 'x'; PHONE.render(); document.querySelector('[data-pa="coname"]').click(); const short = S.company;
              window.prompt = () => '<b>Ond</b>'; PHONE.render(); document.querySelector('[data-pa="coname"]').click();
              return {had, enk, as, short, esc:S.company, shown:document.querySelector('[data-pa="coname"]').closest('.ph-card').querySelector('h4').textContent}; }""")
            check(r['had'] and r['enk'] == 'Nordlys Rederi' and r['as'] == 'Kvitbjørn AS' and r['short'] == 'Kvitbjørn AS' and '<' not in r['esc'] and r['shown'] == r['esc'], 'rederiet får nytt navn fra kortet; et AS beholder « AS», for kort går ikke, < og > tas bort', r)
            n = await pg.evaluate("""() => { S.company = null; PHONE.render(); return !!document.querySelector('[data-pa="coname"]'); }""")
            check(not n, 'uten rederi er det ingen knapp', n)
        for W, H, tag in [(1280, 800, 'liggende'), (800, 1280, 'staaende')]:
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(300)
            u = await pg.evaluate("""() => { S.company = 'Nordlys Rederi'; boatUnnamed(); PHONE.open('rederi'); const b = [...document.querySelectorAll('[data-pa="vname"]')].find(x => x.offsetParent), q = b && b.getBoundingClientRect();
              return {btn:b && b.textContent, primary:!!b && b.classList.contains('p'), h:q && Math.round(q.height), inside:!!q && q.right <= innerWidth && q.bottom <= innerHeight + 2000, mark:S.boatName}; }""")
            await pg.screenshot(path=os.path.join(OUT, 'navn-%s.png' % tag))
            check(u['btn'] == 'Døp båten' and u['primary'], tag + ': en navnløs båt har «Døp båten» fremme i rederi-appen', u)
        c = await pg.evaluate("""() => { window.prompt = () => 'Havørn'; document.querySelector('[data-pa="vname"]').click(); return {name:S.boatName, unnamed:!!S.unnamed}; }""")
        check(c['name'] == 'Havørn' and not c['unnamed'], 'å døpe henne der maler navnet på (ikke lenger navnløs)', c)
        # the heads-up after a landing for a registered player
        nd = await pg.evaluate("""async () => { const keep = {on:CLOUD.on, user:CLOUD.user, guest:CLOUD.guest}; document.getElementById('modal').hidden = true;
          const tryIt = async (guest, n) => { boatUnnamed(); S.landN = 3; S.nameNudgeN = n; NAME_ASKED = false; CLOUD.on = true; CLOUD.user = {id:'t'}; CLOUD.guest = guest; document.getElementById('modal').hidden = true;
            nameNudge(true); await new Promise(r => setTimeout(r, 3200)); const shown = !document.getElementById('modal').hidden && !!document.getElementById('nmGo'); document.getElementById('modal').hidden = true; return {shown, n:S.nameNudgeN}; };
          const reg = await tryIt(false, 0), again = (() => { const was = NAME_ASKED; nameNudge(true); return was; })(), guest = await tryIt(true, 0), max = await tryIt(false, 3);
          Object.assign(CLOUD, keep); return {reg, again, guest, max}; }""")
        check(nd['reg']['shown'] and nd['reg']['n'] == 1 and nd['again'] and not nd['guest']['shown'] and not nd['max']['shown'], 'registrert spiller med navnløs båt får spørsmålet etter en levering, én gang per økt og høyst tre ganger; en gjest får det ikke', nd)
        print('sidefeil', errs)
        await br.close()
asyncio.run(main())
