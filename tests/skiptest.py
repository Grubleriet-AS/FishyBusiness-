"""Skippertak and Kaiboden (Jonas 12.10.2026): the energy drink for real money only, for you and the crews of the whole fleet, and the
one app with a tab each for haill, trim and Skippertak. Checks:
1. The energy model is locked: ENERGY, RORBU and the crews' fatigue rates as they were before Skippertak (docs/engasjement.md: never
   made harder to sell more). A change here must make rest easier, never harder, and the numbers below are then changed with it.
2. giveSkip: full energy, awake, every crew of the fleet at 0 fatigue, the time in game hours; a second one is added to what is left.
3. While it works the energy is held at 100 % and the crew's fatigue at 0 after hours at sea; the operations plan does not wait for
   the crew to rest; when it runs out the log says so and the energy falls again.
4. «Mest for pengene» is true: the biggest of haill, trim and Skippertak gives the most per krone, and the game's prices agree with
   the migration's.
5. Kaiboden in one window (16.11.2026): in the grid, Haill and Trim not, three tabs, the season pack first and a row a kind, the badge on
   the largest of each kind, a test purchase gives Skippertak, PHONE.open('haill') opens Kaiboden. Pictures upright and on its side.
Prints OK or FEIL per check."""
from _env import GAME, boot
import asyncio, json, os, re
from playwright.async_api import async_playwright

def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)) if extra != '' else ''))

LOCK = {'sea': 100 / 24 / 60, 'quay': 100 / 8 / 60, 'warn': 25, 'sleep': 480, 'wake': 60, 'rorbu': 100 / 6 / 60}
MIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'supabase', 'migrations', '20261116180000_prisstige.sql')

async def main():
    sql = open(MIG).read()
    mig = {m.group(1): int(m.group(2)) for m in re.finditer(r"\('(skip_\d+)', 'booster', '[^']*', '[^']*', (\d+)", sql)}
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing']); errs = []
        for tag, W, H in [('staaende', 800, 1280), ('liggende', 1280, 800)]:
            ctx = await br.new_context(viewport={'width': W, 'height': H}, has_touch=True)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await boot(pg)
            if tag == 'staaende':
                r = await pg.evaluate("""(() => ({sea:ENERGY.sea, quay:ENERGY.quay, warn:ENERGY.warn, sleep:ENERGY.sleep, wake:ENERGY.wake, rorbu:RORBU.rate, kr:RORBU.kr,
                  skip:Object.fromEntries(Object.entries(SKIP).filter(([, X]) => !X.old).map(([k, X]) => [k, [X.h, X.nok]]))}))()""")
                ok = all(abs(r[k] - v) < 1e-9 for k, v in LOCK.items()) and r['kr'] <= 150
                check(ok, '1. energimodellen er låst (ENERGY, RORBU), rorbua koster ikke mer enn 150 kr', r)
                check(r['skip'] == {'s2': [12, 29], 's8': [48, 79], 's24': [144, 149], 's72': [432, 299]} and mig == {'skip_2': 29, 'skip_8': 79, 'skip_24': 149, 'skip_72': 299}, '4a. prisstigen i spillet og i migreringen er lik: 2, 8, 24 og 72 timer for 29, 79, 149 og 299 kr', {'game': r['skip'], 'db': mig})
                r = await pg.evaluate("""(() => { const R = {}; S.energy = 12; S.sleep = {t0:S.t, until:S.t + 480, v:S.cur}; S.drowsy = true;
                  const v2 = {id:'tstv', crew:[{id:'x', fatigue:80}]}; S.fleet = (S.fleet || []).concat([v2]); for (const c of S.crew) c.fatigue = 70;
                  giveSkip('light'); R.e = S.energy; R.sleep = !!S.sleep; R.dr = S.drowsy; R.crew = S.crew.map(c => c.fatigue); R.other = v2.crew[0].fatigue; R.left = Math.round(skipLeft());
                  giveSkip('std'); R.left2 = Math.round(skipLeft()); S.fleet = S.fleet.filter(v => v.id !== 'tstv'); return R; })()""")
                check(r['e'] == 100 and not r['sleep'] and not r['dr'] and all(f == 0 for f in r['crew']) and r['other'] == 0 and r['left'] == 24 and r['left2'] == 72, '2. Skippertak: full energi, vekket, mannskapet på hele flåten uthvilt, 24 t, og neste legges til (72 t)', r)
                r = await pg.evaluate("""(() => { const R = {}, b = S.boat, g = GROUNDS[0].p; b.status = 'idle'; b.port = null; b.pos = {x:g.x, y:g.y}; S.crew = S.crew.length ? S.crew : [genCrew()];
                  for (let i = 0; i < 6 * 60; i++) energyMinute(); for (const c of S.crew) c.fatigue = 40; b.status = 'fishing'; crewTick(S.t / 60); b.status = 'idle'; R.e = S.energy; R.fat = S.crew.map(c => c.fatigue);
                  // the operations plan does not wait for the crew to rest (06d-plan-felles.js drRested), however tired they were
                  { const f0 = S.crew.map(c => c.fatigue); for (const c of S.crew) c.fatigue = 90; R.adv = drRested() && !drTired(); S.crew.forEach((c, i) => c.fatigue = f0[i]); }
                  // it runs out: said once, and the energy falls at sea
                  S.skip.until = S.t; const l0 = S.log.length; energyMinute(); R.told = S.log.slice(l0).some(l => /gått ut/.test(l.no)); for (let i = 0; i < 60; i++) energyMinute(); R.after = +S.energy.toFixed(1);
                  return R; })()""")
                check(r['e'] == 100 and all(f == 0 for f in r['fat']) and r['adv'] and r['told'] and 95 < r['after'] < 100, '3. energien holdes på 100 % til sjøs, driftsplanen venter ikke på hvile, utløpet står i loggen og energien faller igjen', r)
                r = await pg.evaluate("""(() => { const per = steps => steps.reduce((a, s, i) => a + (s[0] - (i ? steps[i - 1][0] : 0)) * s[1], 0);
                  const h = Object.values(HAILL_PACKS).map(X => X.n / X.nok), t = Object.values(BOOSTS).filter(B => !B.old).map(B => (B.x - 1) * B.h / B.nok), s = Object.values(SKIP).filter(X => !X.old).map(X => X.h / X.nok);
                  const top = a => a.indexOf(Math.max(...a)) === a.length - 1; return {h, t, s, ok:top(h) && top(t) && top(s)}; })()""")
                check(r['ok'], '4b. «Mest for pengene» stemmer: den største pakken av haill, trim og Skippertak gir mest per krone', r)
                # the receipt (kontrollen 16.11.2026): a pack is one purchase, one line with its price once, not once per grant it gave
                r = await pg.evaluate("""(async () => { const g = (id, product, data) => ({g:{id, product, data}, no:'levert', en:'delivered'}); const m0 = S.msgs.length;
                  shopThanks([...Array(8)].map((_, i) => g(100 + i, 'haill_8', {give:'haill', type:'haill'})).concat([g(200, 'pakke_sesong', {give:'haill', type:'haill'}), g(201, 'pakke_sesong', {give:'haill', type:'haill'}), g(202, 'pakke_sesong', {give:'haill', type:'haill'}), g(203, 'pakke_sesong', {give:'haill', type:'haill'}), g(204, 'pakke_sesong', {give:'trim', k:'t24'}), g(205, 'pakke_sesong', {give:'skip', k:'s24'})]));
                  await new Promise(r => setTimeout(r, 600)); const its = [...document.querySelectorAll('.shoprc .shoprc-it')].map(p => p.textContent); document.getElementById('modal').hidden = true;
                  return {its, msg:(S.msgs[S.msgs.length - 1] || {}).no || ''}; })()""")
                check(len(r['its']) == 2 and r['its'][0].count('229 kr') == 1 and r['its'][1].count('249 kr') == 1 and r['msg'].count('229 kr') == 1 and r['msg'].count('249 kr') == 1,
                      '4c. kvitteringen: en pakke er ett kjøp, én linje med prisen én gang (Haill × 8 for 229 kr, Sesongpakken for 249 kr)', r)
            # Kaiboden: one window (Jonas 16.11.2026), the season pack first, a row a kind, the largest marked, a test purchase
            r = await pg.evaluate("""(async () => { S.tut = 0; PHONE.show(true, 'home'); await new Promise(r => setTimeout(r, 300)); const R = {};
              R.grid = ['kaiboden', 'haill', 'trim'].map(a => !!document.querySelector('#phone .ph-app[data-a=' + a + ']'));
              document.querySelector('#phone .ph-app[data-a=kaiboden]').click(); await new Promise(r => setTimeout(r, 300)); R.app1 = PHONE.app;
              R.tabs = [...document.querySelectorAll('#phone .kb-shop-tabs button')].map(b => b.dataset.s); R.title = (document.querySelector('#phone .ph-top') || {}).textContent;
              R.hero = !!document.querySelector('#phone .kbs-hero [data-k=pk_sesong]'); R.rows = document.querySelectorAll('#phone .kbs-sec').length;
              R.best = [...document.querySelectorAll('#phone .kbs-card.best [data-pa=kbbuy]')].map(b => b.dataset.k);
              const until0 = S.skip ? S.skip.until : 0; document.querySelector('#phone [data-pa=kbbuy][data-k=sk_s72]').click(); await new Promise(r => setTimeout(r, 300)); R.bought = skipOn() && S.skip.until > until0;
              PHONE.show(false); PHONE.open('haill'); await new Promise(r => setTimeout(r, 300)); R.app3 = PHONE.app; R.title3 = (document.querySelector('#phone .ph-top') || {}).textContent;
              R.tab3 = ((document.querySelector('#phone .kb-shop-tabs button.on') || {}).dataset || {}).s;
              const bx = [...document.querySelectorAll('#phone .kb-shop-tabs button')].map(b => b.getBoundingClientRect()); R.tabH = Math.round(Math.min(...bx.map(b => b.height))); R.tabRight = Math.round(Math.max(...bx.map(b => b.right))); R.W = innerWidth;
              const cx = [...document.querySelectorAll('#phone .kbs-card')].map(c => c.getBoundingClientRect()); R.cardRight = cx.length ? Math.round(Math.max(...cx.map(c => c.right))) : 0;
              return R; })()""")
            await pg.evaluate("(async () => { const b = document.querySelector('#phone .kb-shop-tabs button[data-s=boost]'); if (b) b.click(); })()"); await pg.wait_for_timeout(400); await pg.screenshot(path='kaiboden_boost_%s.png' % tag)
            await pg.evaluate("(async () => { const b = document.querySelector('#phone .kb-shop-tabs button[data-s=mine]'); if (b) b.click(); })()"); await pg.wait_for_timeout(400); await pg.screenshot(path='kaiboden_mine_%s.png' % tag)
            ok = r['grid'] == [True, False, False] and r['tabs'] == ['boost', 'utseende', 'mine'] and 'Kaiboden' in (r['title'] or '') and r['hero'] and r['rows'] == 3
            check(ok, '5a. %s: Kaiboden i rutenettet (ikke Haill og Trim), tre faner, Sesongpakken øverst og én rad per slag' % tag, r)
            check(sorted(r['best']) == ['hp_h8', 'sk_s72', 't72'] and r['bought'] and 'Kaiboden' in (r['title3'] or '') and r['tab3'] in ('boost', 'mine'), '5b. %s: «Mest for pengene» på den største av hvert slag; testkjøp gir Skippertak; PHONE.open(\'haill\') åpner Kaiboden' % tag, r)
            check(r['tabH'] >= 36 and r['tabRight'] <= r['W'] and r['cardRight'] <= r['W'], '5c. %s: fanene er store nok for en finger, fanene og kortene er innenfor skjermen' % tag, {k: r[k] for k in ('tabH', 'tabRight', 'cardRight', 'W')})
            await ctx.close()
        print('sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
