"""The time away played without a hang (klynge:38184905, 19.11.2026). The error list had «Heng: spillet sto stille i 5–30 s · kart»:
a page back on the screen after the phone or the tab had slept played the whole time away (catchUp, up to two weeks of game minutes)
in one stretch on the main thread. Measured in the chart view with the CPU slowed four times (a usual phone): 10 h away held the page
2.2 s, 48 h 14.5 s, two weeks 18 s. Now the tick plays the time away in bits of 250 ms (ui/08-actions.js tick, catchUp, CATCH_LEFT), so the page
answers between them, and all of it is still played: the clock is at the world's minute when it is done.
Checks, in the chart view, CPU 4x, the world's clock on (#world), for a tab that slept 48 h:
  1. the longest stall of a 50 ms timer while the time away is played is under 2 s (the hang message starts at 5 s)
  2. all the time away is played (S.t at the world's minute, CATCH_LEFT 0) within 90 s
  3. no page errors
KYST_LITE=1 python3 tests/hengkart.py. Prints OK or FEIL."""
import sys, os, asyncio, json
from _env import GAME, boot
from playwright.async_api import async_playwright

SLEPT_H = float(os.environ.get('HENG_H', '48'))

PLAY = """(m => new Promise(res => {
  let last = performance.now(), maxGap = 0; const iv = setInterval(() => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; }, 50);
  const t0 = performance.now(); S.t = worldT() - m;
  const done = () => {
    const over = performance.now() - t0 > 90000;
    if ((CATCH_LEFT === 0 && worldT() - S.t <= 2) || over){ clearInterval(iv); res({m, maxGap:Math.round(maxGap), wall:Math.round(performance.now() - t0), behind:worldT() - S.t, left:CATCH_LEFT, over}); }
    else setTimeout(done, 100); };
  setTimeout(done, 300);
}))(%d)"""


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)) if extra != '' else ''), flush=True)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 800, 'height': 1280}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME + '#world'); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('modal').hidden = true; G3.show(false)")
        await pg.wait_for_timeout(500)
        kart = await pg.evaluate("!G3.isActive()")
        cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        r = await pg.evaluate(PLAY % int(SLEPT_H * 60 * 6))
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        check(kart and r['maxGap'] < 2000, f'kartet, fanen sov {SLEPT_H:g} t: siden står aldri stille i 2 s eller mer mens borte-tida spilles', {'lengste_ms': r['maxGap'], 'kart': kart})
        check(not r['over'] and r['left'] == 0 and r['behind'] <= 2, f'all borte-tida ({r["m"]} spillminutter) er spilt innen 90 s', {'ms': r['wall'], 'bak': r['behind'], 'igjen': r['left']})
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
