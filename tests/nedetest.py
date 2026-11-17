"""The game when the database is down (docs/planer/drift-billig-og-stabil.md D1–D2, 17.11.2026; Supabase hung for half an hour that
day): cloudRpc (ui/10f-cloud.js) with a stand-in for Supabase that answers 503, 401 or not at all. A call the game makes by itself on a
timer backs off after a failure (5 s, then twice as long) and sends nothing while it waits; the first answer that goes through clears it;
what the player does and the last save as the page closes are never held back; a call that hangs is cut off; a 401 gets a fresh token and
one more go, and no more. And the fewer calls (D1): save_beat every 15 s, and pos_put and pos_world once a minute while the relay is open
(at once when the boat changes what she does). Prints OK or FEIL."""
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
            fn = route.request.url.rsplit('/', 1)[-1]; calls.append(fn); m = mode.get(fn, 200)
            if os.environ.get('NEDE_DBG'): print('rpc', fn, m, flush=True)
            if m == 'hang': return   # never answered
            if m == 200: return await route.fulfill(status=200, content_type='application/json', body='null')
            await route.fulfill(status=m, content_type='application/json', body='{}')
        await pg.route('**/rest/v1/rpc/**', handle)   # (the game's own cloud.json; the cloud itself is off on the test server)
        await boot(pg, GAME3D_MIN); await pg.wait_for_timeout(1500)
        # a signed-in account's token, counting the times it is forced fresh (cloudToken)
        await pg.evaluate("window.__force = 0; CLOUD.guest = false; CLOUD.ak = {getAccessToken: async (o) => { if (o && o.forceRefresh) window.__force++; return 'tok_test'; }}; window.__rb = fn => (typeof RPCB !== 'undefined' && RPCB.get(fn)) || {n:0, until:0}; window.__rh = fn => typeof RPCB !== 'undefined' && RPCB.has(fn)")

        async def rpc(fn, opt='undefined'):
            # (a call that is never cut off answers «hung» after 25 s, so the test ends also against code without the time limit)
            return await pg.evaluate("(async () => { try { return await Promise.race([cloudRpc(%s, {}, %s).then(() => 'ok'), new Promise(r => setTimeout(() => r('hung'), 25000))]); } catch (e){ return e.message; } })()" % (json.dumps(fn), opt))

        def n(fn): return calls.count(fn)
        # 1. a 503 on a timed call: it waits 5 s and sends nothing meanwhile, then 10 s after the next failure, never past 2 minutes
        # (timed inside the page: the software GPU makes each round trip from the test slow)
        mode['pos_put'] = 503; c0 = n('pos_put')
        a = await pg.evaluate("""(async () => { const r = async () => { try { await cloudRpc('pos_put', {}); return 'ok'; } catch (e){ return e.message; } };
          const s = [await r()], w1 = __rb('pos_put').until - Date.now(); s.push(await r(), await r());
          __rb('pos_put').until = 0; s.push(await r()); const w2 = __rb('pos_put').until - Date.now(), n2 = __rb('pos_put').n;
          __rb('pos_put').n = 30; __rb('pos_put').until = 0; await r(); const w3 = __rb('pos_put').until - Date.now();
          return {s, w1, w2, n2, w3}; })()""")
        check(a['s'][:3] == ['pos_put 503', 'pos_put wait', 'pos_put wait'] and 3500 <= a['w1'] <= 5000, 'after a 503 a timed call waits 5 s and sends nothing meanwhile', a)
        check(a['s'][3] == 'pos_put 503' and a['n2'] == 2 and 8500 <= a['w2'] <= 10000, 'the next failure doubles the wait (10 s)', a)
        check(115000 <= a['w3'] <= 120000, 'the wait never goes past 2 minutes', a['w3'])
        check(n('pos_put') - c0 == 3, 'only the calls past a wait went out (3 of 5)', n('pos_put') - c0)
        # 2. the first answer that goes through clears it
        mode['pos_put'] = 200; await pg.evaluate("__rb('pos_put').until = 0")
        a = [await rpc('pos_put'), await rpc('pos_put')]
        check(a == ['ok', 'ok'] and not await pg.evaluate("__rh('pos_put')"), 'an answer that goes through clears the wait', a)
        # 3. what the player does is never held back; nor the last save as the page closes (keepalive)
        mode['broker_buy'] = 503; c0 = n('broker_buy')
        a = [await rpc('broker_buy'), await rpc('broker_buy')]
        check(a == ['broker_buy 503', 'broker_buy 503'] and n('broker_buy') - c0 == 2, 'a call the player makes goes every time, also after a 503', a)
        mode['save_put4'] = 503; await rpc('save_put4'); c0 = n('save_put4')
        a = await rpc('save_put4', '{keep:true}')
        check(a == 'save_put4 503' and n('save_put4') - c0 == 1, 'the last save as the page closes goes although the saves wait', a)
        # 4. a 401: a fresh token and one more go, then it waits like a 5xx (no loop)
        mode['hails_get'] = 401; c0 = n('hails_get'); f0 = await pg.evaluate("window.__force")
        a = [await rpc('hails_get'), await rpc('hails_get')]
        f1 = await pg.evaluate("window.__force")
        check(a == ['hails_get 401', 'hails_get wait'] and n('hails_get') - c0 == 2 and f1 - f0 == 1,
              'a 401 asks for a fresh token and tries once more, then waits', {'svar': a, 'sendt': n('hails_get') - c0, 'fornyet': f1 - f0})
        await pg.evaluate("__rb('hails_get').until = 0"); c0 = n('hails_get'); await rpc('hails_get')
        f2 = await pg.evaluate("window.__force")
        check(f2 == f1 and n('hails_get') - c0 == 2, 'a token is forced fresh at most once a minute', {'fornyet': f2 - f1})
        # 5. a call that hangs is cut off after 15 s
        mode['news_get'] = 'hang'
        a = await pg.evaluate("""(async () => { const t0 = performance.now(); let m = 'ok';
          try { await Promise.race([cloudRpc('news_get', {}), new Promise((_, j) => setTimeout(() => j(new Error('hung')), 25000))]); } catch (e){ m = e.message; }
          return {m, s:Math.round((performance.now() - t0) / 100) / 10, wait:__rh('news_get')}; })()""")
        check(a['m'] == 'news_get timeout' and 14.5 <= a['s'] <= 25 and a['wait'], 'a call that hangs is cut off after 15 s and waits', a)
        # 6. fewer calls: save_beat every 15 s; pos_put once a minute while the relay is open, at once when she changes
        check(await pg.evaluate("typeof BEAT_MS !== 'undefined' ? BEAT_MS : 5000") == 15000, 'save_beat every 15 s (BEAT_MS)')
        await pg.evaluate("CLOUD.on = true; CLOUD.user = {id:'user_test'}; (typeof RPCB !== 'undefined' && RPCB.clear()); WORLDP.off = false; WORLDP.busy = false; TAB.held = TAB.lost = TAB.wait = false")
        mode['pos_put'] = 200; mode['pos_world'] = 200; c0 = n('pos_put')
        a = await pg.evaluate("""(async () => { const out = [], cnt = () => out.length;
          const tick = async (open, ago, timed) => { RT.st = open ? 'open' : 'off'; WORLDP.busy = false; TAB.wait = false; WORLDP.last = Date.now() - ago; const p0 = WORLDP.put || 0;
            await Promise.race([worldTick(timed), new Promise(r => setTimeout(r, 20000))]); return (WORLDP.put || 0) !== p0 ? 1 : 0; };
          const r = {s20:await tick(true, 20000, true), s61:await tick(true, 61000, true), change:await tick(true, 1000, undefined), norelay:await tick(false, 16000, true)};
          r.why = {on:CLOUD.on, user:!!CLOUD.user, off:WORLDP.off, err:WORLDP.err, held:TAB.held, lost:TAB.lost, wait:TAB.wait, hidden:document.hidden};
          RT.st = 'off'; return r; })()""")
        check({k: a[k] for k in ('s20', 's61', 'change', 'norelay')} == {'s20': 0, 's61': 1, 'change': 1, 'norelay': 1} and n('pos_put') - c0 == 3,
              'relay open: the 15 s tick sends after a minute, not before; a change goes at once; without the relay every 15 s', {**a, 'sendt': n('pos_put') - c0})
        print('errors:', errs[:3]); await br.close()

asyncio.run(main())
