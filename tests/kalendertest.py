"""The calendar moved to 2026 on the shared clock (16.11.2026, docs/planer/kalender-2026.md; core/01-world.js calEpoch and calMigrate;
Jonas: «jeg vil at spillet starter fra 1.januar fra nå», «Sørg for at det ikke blir tull i regnskapet til spillere»). A save from before
the move (the fixture's fleet along the coast, tests/saves-fixture/flate.json, with income and costs booked in its year) is opened on the
shared clock (#world), where the calendar is the new one: its years follow once, nothing it owns moves, and when the game is played past
the new year (1 January 2026 06:00 at 17.11.2026 03:00 UTC) the financial year 2025 closes once, with the profit the books had, and the
quota year is new. A local build without #world keeps the old calendar and the save as it was. Prints OK or FEIL; sidefeil last."""
import asyncio, json, os
from _env import GAME, boot
from playwright.async_api import async_playwright
ok = lambda c: 'OK  ' if c else 'FEIL'
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(HERE, 'saves-fixture', 'flate.json'), encoding='utf-8'))
# income and costs in the old year, as a save that has been played has (the fixture's books are empty)
RAW.setdefault('stats', {}); RAW['stats'].update({'revenue': RAW['stats'].get('revenue', 0) + 800000, 'costs': RAW['stats'].get('costs', 0) + 300000})
RAW['stats']['y'] = {'2027': {'fangst': 800000, 'drivstoff': -300000}}
RAW['tx'] = dict(RAW.get('tx') or {}, y=2027, rev0=RAW['stats']['revenue'] - 800000, cost0=RAW['stats']['costs'] - 300000, paid=0, adv=0, days=RAW.get('tx', {}).get('days', []))
RAW['quota'] = {'y': 2027, 'torsk': 4321, 'hyse': 0, 'sei': 0, 'snokrabbe': 0, 'snoTq': 0, 'ffW': -1, 'ffTot': 0, 'ffCod': 0, 'conf': 0, 'confKr': 0, 'byCod': 0}
RAW.pop('cal', None)
READ = """(() => { const H = S.t / 60, Y = S.stats.y || {}; return {cal:S.cal, year:yearH(H), date:gDate(H).toISOString().slice(0, 16), t:S.t, cash:Math.round(S.cash), fleet:(S.fleet || []).length,
  boats:(S.fleet || []).map(v => v.boat && v.boat.type).join(','), tx:S.tx && S.tx.y, txY:Object.keys(S.txY || {}), books:Object.keys(Y), b25:Y[2025] || null, quota:S.quota && S.quota.y, qcod:S.quota && S.quota.torsk,
  qy:Object.keys(S.qy || {}), rev:Math.round(S.stats.revenue), costs:Math.round(S.stats.costs),
  told:(S.msgs || []).filter(m => /Kalenderen i spillet er stilt/.test(m.no || '')).length, closed:(S.msgs || []).filter(m => /Regnskapsåret 2025 er avsluttet/.test(m.no || '')).length,
  closed27:(S.msgs || []).filter(m => /Regnskapsåret 2027/.test(m.no || '')).length, P:S.txY && S.txY[2025] ? (S.txY[2025].enk || S.txY[2025].as || {}).P : null}; })()"""

async def one(br, url, errs):
    ctx = await br.new_context(viewport={'width': 1000, 'height': 760})
    await ctx.add_init_script("if (!sessionStorage.getItem('st_put')){ sessionStorage.setItem('st_put', '1'); localStorage.clear(); localStorage.setItem('kystfiske_v2', " + json.dumps(json.dumps(RAW)) + "); }")
    pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await pg.goto(url); await pg.wait_for_function("typeof SIMREADY !== 'undefined' && SIMREADY", timeout=240000)
    return ctx, pg

async def main():
    errs = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # 1. a local build: the old calendar, the save as it was
        ctx, pg = await one(br, GAME, errs); loc = await pg.evaluate(READ); await ctx.close()
        print(ok(loc['cal'] is None and loc['tx'] == 2027 and loc['books'] == ['2027'] and loc['year'] in (2027, 2028) and loc['told'] == 0),
              'a local build keeps the old calendar, and the save its years', json.dumps(loc))
        # 2. the shared clock: the years follow once, and nothing owned moves
        ctx, pg = await one(br, GAME + ',world', errs)
        w0 = await pg.evaluate(READ)
        print(ok(w0['cal'] == 2026 and w0['told'] == 1 and w0['fleet'] == loc['fleet'] and w0['boats'] == loc['boats'] and '2027' not in w0['books'] and '2025' in w0['books'] and '2027' not in w0['qy']
                 and w0['b25'] and w0['b25'].get('fangst') == 800000 and w0['b25'].get('drivstoff') == -300000 and w0['closed27'] == 0 and w0['year'] in (2025, 2026)),
              'on the shared clock the save is moved once and told once: the same boats, the books of 2027 stand as 2025 with the same postings', json.dumps(w0))
        # 3. past the new year: the minute of 1 January 2026 06:00 plus two days, played as the game plays time away
        target = await pg.evaluate("Math.round((Date.UTC(2026, 0, 3, 6) - EPOCH) / 60000)")
        for _ in range(400):
            a = await pg.evaluate("(T => { try { const left = T - S.t; if (left > 0 && !CATCH_LEFT && simAreaReady()) playMinutes(Math.min(left, 720), true); } catch (e){ return {err:String(e && e.message || e)}; } return {t:S.t}; })(%d)" % target)
            if a.get('err') or a.get('t', 0) >= target: break
            await asyncio.sleep(0.2)
        w1 = await pg.evaluate(READ); q = await pg.evaluate("(() => { const q = quotaState(); return {y:q.y, torsk:q.torsk}; })()")
        print(ok(not a.get('err') and w1['year'] == 2026 and w1['tx'] == 2026 and w1['txY'] == ['2025'] and w1['closed'] == 1 and w1['closed27'] == 0 and q == {'y': 2026, 'torsk': 0}
                 and '2025' in w1['books'] and '2027' not in w1['books'] and w1['fleet'] == loc['fleet']),
              'played past the new year: the financial year 2025 is closed once, the tax year and the quota year are 2026 with the cod quota unused, the fleet is whole', json.dumps({'a': a, 'w1': w1, 'q': q}))
        # the profit closed is what the books had: the income and costs of the year, less the depreciation, whatever the days added
        dep = await pg.evaluate("Math.round((S.stats.y[2025] || {})._dep || 0)")
        inn = w1['rev'] - RAW['tx']['rev0']; ut = w1['costs'] - RAW['tx']['cost0']
        y26 = await pg.evaluate("(() => { const Y = S.stats.y[2026] || {}; let inn = 0, ut = 0; for (const k in Y){ if (k[0] === '_') continue; if (Y[k] > 0) inn += Y[k]; else ut -= Y[k]; } return {inn:Math.round(inn), ut:Math.round(ut)}; })()")
        print(ok(w1['P'] is not None and abs(w1['P'] - (500000 - dep)) <= max(60000, 0.15 * abs(500000 - dep))),
              "the profit of 2025 at the closing is the year's income less its costs and the depreciation (within what the days up to the new year added)", json.dumps({'P': w1['P'], 'dep': dep, 'inn': inn, 'ut': ut, 'y26': y26}))
        # 4. started again: not moved a second time
        await pg.evaluate("save()"); await pg.reload(); await pg.wait_for_function("typeof SIMREADY !== 'undefined' && SIMREADY", timeout=240000)
        w2 = await pg.evaluate(READ)
        print(ok(w2['cal'] == 2026 and w2['tx'] == 2026 and w2['txY'] == ['2025'] and w2['told'] == 1 and w2['closed'] == 1), 'started again, nothing is moved twice', json.dumps(w2))
        await ctx.close(); await br.close()
    print('sidefeil:', json.dumps(errs))
asyncio.run(main())
