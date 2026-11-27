"""A GL error made in every frame is sent with the step it came in (view3d/24-cinema.js gfxStart, glProbe, gfxEnd; klynge:477c8dd0,
26.11.2026). The driver is asked one frame each five seconds, so an error a step makes in every frame is already there when the asked
frame starts, from the frame before, and was sent as «mellom rammene», between the frames, with no step: nothing to go on. Now an error
found at the start of an asked frame has that frame asked after every step, and is sent with the step it came after when it comes
again; only one that does not come again in the frame is sent as «mellom rammene» (the check of that in gfxtest.py stands). With
stand-ins for WorkOS and Supabase, in 3D. Prints OK or FEIL."""
from _env import GAME_TUT, boot
import asyncio, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:600]) if extra != '' else ''))


CFG = {'hosts': ['127.0.0.1', 'localhost'], 'supabaseUrl': 'https://sb.test', 'supabaseAnon': 'anon_test', 'workosClientId': 'client_test'}
STUB = """window.DSB_CLOUD = %s;
window.DSB_AUTHKIT = {createClient: async () => ({getUser: () => ({id:'user_test', email:'jonas@test.no'}), getAccessToken: async () => 'tok_test',
  signIn: () => {}, signUp: () => {}, signOut: () => {}})};""" % json.dumps(CFG)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 749, 'height': 336}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(STUB)
        calls = []
        replies = {'tm_hello': {'consent': True, 'owned': []}, 'save_get': 'null', 'save_put2': {'ok': True, 'saved_at': '2026-11-26T10:00:00+00:00'}}
        async def handle(route):
            req = route.request; fn = req.url.rsplit('/', 1)[-1]
            try: body = json.loads(req.post_data or '{}')
            except Exception: body = {}
            calls.append((fn, body))
            r = replies.get(fn, 404 if fn in ('save_put3', 'save_head', 'save_put4', 'save_claim', 'save_beat') else '')
            if r == 404: return await route.fulfill(status=404, content_type='application/json', body='{"code":"PGRST202"}')
            await route.fulfill(status=200, content_type='application/json', body=r if isinstance(r, str) else json.dumps(r))
        await pg.route('https://sb.test/**', handle)
        await boot(pg, GAME_TUT + '#notut,trees0,life0,vind0,shore0,rocks0,marina0,near0')
        await pg.evaluate("if (!G3.isActive()) G3.show(true)")
        await pg.wait_for_function("G3.isActive() && ERR.ready && G3._debug.fps > 0", timeout=180000); await pg.wait_for_timeout(3000)
        gfx = lambda: [c[1] for c in calls if c[0] == 'tm_error' and c[1].get('src') == 'view3d gfx']
        # an INVALID_OPERATION made in every frame, in the middle of it (the fleet's states are worked out once a frame, while the frame
        # draws: an endQuery with no query running); the driver asked by the test as on a phone (SwiftShader is not asked by itself)
        made = await pg.evaluate("""(() => { const c = document.getElementById('gl'), g = c.getContext('webgl2'); if (!g) return 0;
          const f0 = window.__f0 = npcStates; window.__n = 0; npcStates = function(H, only){ window.__n++; g.endQuery(g.ANY_SAMPLES_PASSED); return f0(H, only); };
          g.getError(); g.endQuery(g.ANY_SAMPLES_PASSED); const e = g.getError(); const D = G3._debug.gfx; D.force = true; D.probeAt = 0; return e; })()""")
        check(made == 1282, 'the stand-in error is an INVALID_OPERATION (1282), as in the reports', made)
        for _ in range(240):
            if any(e['msg'].startswith('3D GL-feil INVALID_OPERATION mellom ') for e in gfx()): break
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1500)
        io = [e['msg'].split(' · ')[0] for e in gfx() if e['msg'].startswith('3D GL-feil INVALID_OPERATION')]
        step = [m for m in io if 'mellom rammene' not in m]
        print('sendt:', io, 'npcStates-kall:', await pg.evaluate("window.__n"))
        check(len(step) == 1 and not any('mellom rammene' in m for m in io), 'an error made in every frame is sent once, with the step it came after, not as «mellom rammene»', io)
        # and one made between two frames only, once, is still «mellom rammene» (the stand-in taken away first)
        await pg.evaluate("""(() => { npcStates = window.__f0; const g = document.getElementById('gl').getContext('webgl2'); g.bindTexture(0x1234, null); G3._debug.gfx.probeAt = 0; })()""")
        for _ in range(240):
            if any(e['msg'].startswith('3D GL-feil INVALID_ENUM') for e in gfx()): break
            await pg.wait_for_timeout(500)
        en = [e['msg'].split(' · ')[0] for e in gfx() if e['msg'].startswith('3D GL-feil INVALID_ENUM')]
        check(en == ['3D GL-feil INVALID_ENUM mellom rammene'], 'an error made once between two frames is still sent as «mellom rammene»', en)
        print('errors:', errs[:3]); await br.close()

asyncio.run(main())
