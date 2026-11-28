"""The boat purchase confirmed (28.11.2026, docs/systemer/handel-og-steder.md «Båtkjøpet bekreftes»; ui/phone/10-fartoy.js boatBtn): the
first tap on a boat's buy button buys nothing and shows «Før du kjøper» with the loans, the monthly payment and «cannot be undone»; the
second tap buys. The card says where a 21 m boat may not fish (lenArea), «too little equity» is explained in figures, and a loan that
gets nothing new keeps its own monthly payment in the sum. Prints OK or FEIL per check."""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _env import boot
from playwright.async_api import async_playwright

def ok(c): return 'OK  ' if c else 'FEIL'

# the lic tab of the boat market on the boat at the yard in Finnsnes, the offer with the right `o` on the boat `k`
SHEET = """(([cash, k, o, inUsed]) => { S.cash = cash; S.sales = S.sales.length >= 3 ? S.sales : [{}, {}, {}]; S.fm = {n:99, kr:9e6, b:true}; if (inUsed) S.inUsed = true; else delete S.inUsed;
  renderActs(); DOCK.open('fartoy'); const dr = document.getElementById('drawerBody'), tap = s => { const e = dr.querySelector(s); if (e) e.click(); return !!e; };
  tap('[data-pa=mksel]:not([data-k])'); tap('[data-pa=mktab][data-s=lic]'); return tap('[data-pa=mksel][data-k=' + o + ']') || tap('[data-pa=mksel][data-k=' + k + '][data-o=' + o + ']'); })"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        # 1. the first tap asks and buys nothing, the second buys
        await pg.evaluate(SHEET, [3e6, 'kyst15', 'h14', False])
        r1 = await pg.evaluate("""(() => { const dr = document.getElementById('drawerBody'), q = () => dr.querySelector('[data-pa=buylic][data-ti="1"]'), t0 = S.boat.type, c0 = S.cash;
          const before = {box:!!dr.querySelector('[data-boatconfirm]'), label:q().textContent}; q().click();
          const box = dr.querySelector('[data-boatconfirm]'), after = {type:S.boat.type, paid:c0 - S.cash, box:!!box, txt:box ? box.textContent : '', label:q().textContent};
          q().click(); return {before, after, bought:S.boat.type !== t0, type:S.boat.type}; })()""")
        print(ok(not r1['before']['box'] and 'Bekreft' not in r1['before']['label']), 'before a tap: no box, the button says buy', r1['before'])
        print(ok(r1['after']['type'] != 'kyst15' and r1['after']['paid'] == 0 and r1['after']['box'] and r1['after']['label'].startswith('Bekreft kjøp')
                 and 'Lån:' in r1['after']['txt'] and 'i måneden' in r1['after']['txt'] and 'Kjøpet kan ikke angres' in r1['after']['txt'] and 'Kystfondet' in r1['after']['txt']),
              'the first tap buys nothing: the box with the loans, the monthly payment, Kystfondet and «cannot be undone», the button «Bekreft kjøp»', r1['after'])
        print(ok(r1['bought'] and r1['type'] == 'kyst15'), 'the second tap buys', {'type': r1['type']})
        # 2. where a 21 m boat may not fish, now and after; too little equity in figures, with the top-up used
        await pg.evaluate("(() => { S.boat.type = 'skiff'; applyVessel(); S.lic = null; S.loan = null; S.loanIN = null; S.fleet.forEach(v => { if (v.id !== S.cur) v.lic = null; }); })()")
        await pg.evaluate(SHEET, [200000, 'kyst21', 'h20', True])
        r2 = await pg.evaluate("""(() => { const dr = document.getElementById('drawerBody'), a = [...dr.querySelectorAll('[data-area]')].map(e => e.textContent), e = dr.querySelector('[data-eqdetail]');
          return {area:a, eq:e ? e.textContent : null}; })()""")
        print(ok(r2['area'] and all('fjordlinjene' in t and 'grunnlinjen' in t for t in r2['area'])), 'the card says where the 21 m boat may not fish', r2['area'][:1])
        print(ok(r2['eq'] and 'Slik er det regnet' in r2['eq'] and '20 %' in r2['eq'] and 'Du trenger' in r2['eq'] and 'brukt' in r2['eq']), 'too little equity in figures, and the top-up is used', r2['eq'])
        # 3. a loan that gets nothing new keeps its payment (the kontroll 28.11.2026): Kystfondet's loan, no new top-up (it is used), the
        # bank lends the rest over 15 years; the sum is that annuity plus the old loan's own 7 777 kr, not the old balance over ten years
        await pg.evaluate("(() => { S.loanIN = {bal:500000, rate:0.089, pay:7777, next:S.t + 9999}; S.loan = null; })()"); await pg.evaluate(SHEET, [8e6, 'kyst21', 'h20', True])
        r3 = await pg.evaluate("""(() => {
          const O = LIC_OFFERS.find(o => o.k === 'h20'), price = VESSELS[O.ves].price + licValue(O), x = deal(price, mbValue(curVessel()), innOK());
          const r = LOANS.loan.rate / 12, ann = Math.round(x.bankL * r / (1 - Math.pow(1 + r, -180))), want = kr(ann + 7777), wrong = kr(ann + Math.round(500000 * 0.089 / 12 / (1 - Math.pow(1 + 0.089 / 12, -120))));
          const dr = document.getElementById('drawerBody'), q = () => dr.querySelector('[data-pa=buylic][data-ti="1"]'); if (!q() || q().disabled) return {why:x.why, ok:x.ok};
          q().click(); const box = dr.querySelector('[data-boatconfirm]'), t = box ? box.textContent : ''; return {ok:x.ok, inL:x.inL, bankL:x.bankL, want, wrong, has:t.includes(want), hasWrong:t.includes(wrong)}; })()""")
        print(ok(r3.get('has') and not r3.get('hasWrong')), 'the monthly payment: the new bank loan plus the old Kystfondet loan\'s own payment', r3)
        print(ok(not errs), 'no page errors', errs[:3])
        await br.close()
asyncio.run(main())
