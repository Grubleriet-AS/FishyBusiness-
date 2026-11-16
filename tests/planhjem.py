"""A standing plan whose home is gone at start-up (a rorbu taken away, steg 126; ui/11-boot.js planHomeGone, steg 133): a Driftsplan 3
plan stops and says it finds a new home when started again; an old v4 plan that was running with gear in the sea is left to plan3Retire,
which hauls, lands at its plant and lies there (before steg 133 the start-up switched it off first, and the gear stayed in the sea).
Seen red against the build before the fix: the v4 plan was dropped with «Båten blir liggende der den er». Prints OK or FEIL per check."""
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:400]) if extra != '' else ''))


# 'rb1' is one of the rorbuer taken away (tests/unit/sitegone.test.mjs)
SETUP = r"""(v) => { const sea = {x:S.boat.pos.x + 1.5, y:S.boat.pos.y}, M = (plantsNear(S.boat.pos, 1)[0] || {}).pt;
  S.sets = [{id:'sx', vid:S.cur, kind:'line', n:2, lk:'hyse', hooks:1200, a:{...sea}, b:{x:sea.x + 1, y:sea.y}, tSet:S.t - 600, fid:null}];
  let o; if (v === 4){ o = plan2New({home:'rb1', rig:'line', places:[]}); o.on = true; o.M = M && M.id; }
  else { o = PLAN2UI.fresh(); o.ring = {x:sea.x, y:sea.y, r:plan3RingKm(o.rig)}; o.home = 'rb1'; o.on = false; }
  S.ops = o; S.msgs = []; S.log = []; save(); return {v:o.v, M:o.M || null}; }"""
READ = "(() => { const o = S.ops; return {ops:o ? {v:o.v, on:o.on, home:o.home, retire:!!o.retire, fetch:!!o.fetch, M:o.M} : null, log:S.msgs.concat(S.log).map(m => m.no || '').join(' | ').slice(0, 300)}; })()"


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg); await pg.wait_for_timeout(500)
        # 1. an old v4 plan, running, with gear in the sea and you aboard: wound up by plan3Retire, not switched off at start-up
        s = await pg.evaluate(SETUP, 4); await pg.reload(); await pg.wait_for_timeout(4000)
        r = await pg.evaluate(READ); o = r['ops'] or {}
        check(o.get('retire') and o.get('fetch') and o.get('on') and o.get('home') == s['M'] and 'trekker redskapet' in r['log'], 'a running v4 plan whose home is gone hauls, lands at its plant and lies there', r)
        # 2. a Driftsplan 3 plan with that home: stopped, no home, and the log says Start finds a new one
        await pg.evaluate(SETUP, 5); await pg.reload(); await pg.wait_for_timeout(4000)
        r = await pg.evaluate(READ); o = r['ops'] or {}
        check(o.get('v') == 5 and not o.get('on') and o.get('home') is None and 'start den igjen, så finner den et nytt hjem' in r['log'], 'a Driftsplan 3 plan whose home is gone stops, and the log says Start finds a new home', r)
        print('errors:', errs)
        await br.close()

asyncio.run(main())
