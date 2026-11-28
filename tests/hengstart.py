"""«Hvor står fars naust?» without a hang (klynge:38184905, 28.11.2026). The error list has «Heng: spillet sto stille i 10–30 s · kart»
right after Father's letter is put down («Ta over», #ltGo, the last button pressed): showStart (ui/08c-start.js) worked out the next
six hours' sea at every plant along the coast (startWx: the wave fetch's rays at eight points round each harbour, cold the first time)
in one stretch on the main thread before it drew the list. Measured with the CPU slowed four times: 3.1 s on this machine, and many
times that on a slow phone. Now the coast is worked out in bits between which the page answers, behind a box that says so, and the
list is the same when it comes.
Checks, a new game in the chart view, CPU 4x, from «Ta over» until «Start her» is on the screen:
  1. the longest stall of a 50 ms timer is under 1.5 s (the hang message starts at 5 s)
  2. the list comes, with the places of the whole coast, the best ones marked, and «Start her» on the first
  3. the 3D view is not built behind the box while the coast is worked out (it waits for the start picker, ui/11-boot.js go3d)
  4. no page errors
python3 tests/hengstart.py. Prints OK or FEIL."""
import asyncio, json
from _env import GAME_TUT
from playwright.async_api import async_playwright

GAPS = """(() => { const G = window.__hg = {max:0, on:true}; let last = performance.now();
  setInterval(() => { const n = performance.now(); if (G.on) G.max = Math.max(G.max, n - last); last = n; }, 50); })()"""


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False)) if extra != '' else ''), flush=True)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 800, 'height': 1280}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.set_default_timeout(120000)
        await pg.goto(GAME_TUT)
        await pg.wait_for_selector('#ltEnv', state='visible', timeout=90000); await pg.click('#ltEnv')
        await pg.wait_for_selector('#ltGo.on', timeout=60000); await pg.wait_for_timeout(500)
        cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        await pg.evaluate(GAPS)
        await pg.click('#ltGo')
        await pg.wait_for_selector('#stGo', state='visible', timeout=120000)
        r = await pg.evaluate("""(() => { window.__hg.on = false; return {max:Math.round(window.__hg.max), n:document.querySelectorAll('#stAll .st-it').length,
          rec:document.querySelectorAll('#stAll > .st-it.rec').length, on:!!document.querySelector('#stAll > .st-it.rec.on'), g3:typeof G3 !== 'undefined' && G3.isActive()}; })()""")
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        check(r['max'] < 1500, 'fra «Ta over» til listen står siden aldri stille i 1,5 s eller mer', {'lengste_ms': r['max']})
        check(r['n'] > 100 and r['rec'] >= 6 and r['on'], 'listen kommer, med hele kysten, de beste merket og den første valgt', {'n': r['n'], 'rec': r['rec'], 'valgt': r['on']})
        check(not r['g3'], '3D-visningen bygges ikke bak startvalget', {'g3': r['g3']})
        check(not errs, 'ingen sidefeil', errs[:3])
        await br.close()

asyncio.run(main())
