"""The save to the account when the cloud fails (klynge:471787f3, 18.11.2026): cloudRpc and cloudSaveSoon (ui/10f-cloud.js) with a
stand-in for Supabase. A 401 gets a fresh token and one more go also when the token could not be had the first time (the call went
without one); a save that fails on the server or the network (504, 503, a time-out, a 401 that a fresh token did not mend) is kept on
the device and goes with the next round, and is not reported to the error log as a fault of the game; a save the server refuses for
another reason (400) still is. Prints OK or FEIL."""
from _env import GAME3D_MIN, boot
import asyncio, json, os
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:400]) if extra != '' else ''))


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        ctx = await br.new_context(viewport={'width': 1100, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        calls, mode = [], {}

        async def handle(route):
            fn = route.request.url.rsplit('/', 1)[-1]; m = mode.get(fn, 200)
            auth = (await route.request.all_headers()).get('authorization', '')
            calls.append((fn, auth))
            if os.environ.get('LAGRE_DBG'): print('rpc', fn, m, auth[:20], flush=True)
            if m == 'hang': return   # never answered
            if m == 'auth': m = 200 if auth == 'Bearer tok_test' else 401   # a call that needs the player's token
            if m == 200:
                body = json.dumps({'ok': True, 'rev': 7, 'saved_at': '2026-11-18T12:00:00Z'}) if fn == 'save_put4' else 'null'
                return await route.fulfill(status=200, content_type='application/json', body=body)
            await route.fulfill(status=m, content_type='application/json', body='{}')
        await pg.route('**/rest/v1/rpc/**', handle)   # (the game's own cloud.json; the cloud itself is off on the test server)
        await boot(pg, GAME3D_MIN); await pg.wait_for_timeout(1500)
        # a signed-in account whose token could not be had for a moment (the phone just woke, the refresh failed): the next ask, forced, gets it
        await pg.evaluate("""window.__miss = 1; window.__force = 0; CLOUD.guest = false; CLOUD.forceAt = 0;
          CLOUD.ak = {getAccessToken: async (o) => { if (o && o.forceRefresh){ window.__force++; return 'tok_test'; } if (window.__miss > 0){ window.__miss--; throw new Error('refresh failed'); } return 'tok_test'; }};
          window.__ce = []; const ce = console.error; console.error = function(){ try { window.__ce.push([].map.call(arguments, a => String(a && a.message || a)).join(' ')); } catch (e){} return ce.apply(console, arguments); };""")

        def n(fn): return sum(1 for c in calls if c[0] == fn)
        # 1. a 401 on a call sent without a token (the token could not be had): a fresh token and one more go
        mode['save_put4'] = 'auth'; c0 = n('save_put4')
        a = await pg.evaluate("(async () => { try { await cloudRpc('save_put4', {}, {now:true}); return 'ok'; } catch (e){ return e.message; } })()")
        f = await pg.evaluate("window.__force")
        check(a == 'ok' and n('save_put4') - c0 == 2 and f == 1, 'a 401 without a token asks for a fresh one and tries once more', {'svar': a, 'sendt': n('save_put4') - c0, 'fornyet': f, 'auth': [c[1][:16] for c in calls[-2:]]})

        # 2. the save to the account: what fails on the server or the network stays on the device, is not reported, and goes next round
        await pg.evaluate("""CLOUD.on = true; CLOUD.user = {id:'user_test'}; CLOUD.noPut3 = CLOUD.noPut4 = false; CLOUD.forceNext = false; TAB.held = TAB.lost = false; TAB.rv = 5;
          if (!S.lastReal) S.lastReal = Date.now(); window.__ok = () => CLOUD.lastSave > 0;   // (the game saves on meanwhile: S.lastReal moves)""")

        async def save_round(m, fast=False):
            mode['save_put4'] = m
            return await pg.evaluate("""(async (fast) => { RPCB.clear(); CLOUD.lastSave = 0; CLOUD.saving = false; CLOUD.forceAt = Date.now(); window.__ce.length = 0;
              const st = window.setTimeout; if (fast) window.setTimeout = (f, ms, ...r) => st(f, ms >= 60000 ? 300 : ms, ...r);   // the 60 s limit, shortened
              try { await Promise.race([cloudSaveSoon(), new Promise(r => st(r, 45000))]); } finally { window.setTimeout = st; }
              return {logged:window.__ce.filter(s => /save_put4/.test(s)), saved:__ok(), stat:CLOUD.stat}; })(%s)""" % ('true' if fast else 'false'))
        for m, fast, what in ((504, False, '504'), (503, False, '503'), ('hang', True, 'a time-out'), (401, False, 'a 401 a fresh token did not mend')):
            a = await save_round(m, fast)
            check(a['logged'] == [] and not a['saved'] and a['stat'] == 'error', 'a save that meets %s stays on the device and is not reported as a fault' % what, a)
        a = await save_round(400)
        check(a['logged'] != [] and not a['saved'], 'a save the server refuses for another reason (400) is still reported', a)
        a = await save_round(200)
        check(a['logged'] == [] and a['saved'] and a['stat'] == 'ok', 'the next round takes the save to the account', a)
        print('errors:', errs[:3]); await br.close()

asyncio.run(main())
