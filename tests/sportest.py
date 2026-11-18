"""The trace before a crash or a hang (steg 139, DIAG1; js/errtrap.js DSB_ERRTRAP.spor and ui/10f-cloud.js), with stand-ins for WorkOS
and Supabase, on GAME3D_MIN (the context event needs the 3D, not the full scene):
- the buffer keeps at most ten entries and the oldest goes out first; an unknown code is «?», the same button again counts;
- nothing the player wrote and nowhere the boat is: a text field filled and a button with words on it, the boat moved, and none of it
  is in the buffer;
- a crash found at the start (a dead pulse with its session and its trace) is sent with that session (meta.sid) and that trace;
- the pulse keeps this page's session and trace; the watchdog's sign of life carries the trace;
- a hang is sent with the trace and what the 3D was doing (G3.hangInfo); a severe 3D fault has the trace, an ordinary error not;
- the view, the phone's pages and the WebGL context lost go in the trace.
Prints OK or FEIL."""
from _env import GAME3D_MIN, boot
import asyncio, json, time
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:600]) if extra != '' else ''))


CFG = {'hosts': ['127.0.0.1', 'localhost'], 'supabaseUrl': 'https://sb.test', 'supabaseAnon': 'anon_test', 'workosClientId': 'client_test'}
NOW = int(time.time() * 1000)
SID = '11111111-2222-4333-8444-555555555555'
DEAD_SPOR = [[1.2, 'start'], [30.5, '3d'], [50, 'k:sell', 3], [61, 'catchup', 840, 95]]
STUB = """window.DSB_CLOUD = %s;
window.DSB_AUTHKIT = {createClient: async () => ({getUser: () => ({id:'user_test', email:'jonas@test.no'}), getAccessToken: async () => 'tok_test',
  signIn: () => {}, signUp: () => {}, signOut: () => {}})};
if (!sessionStorage.getItem('sportest_once')){ sessionStorage.setItem('sportest_once', '1');
  localStorage.setItem('dsb_alive', JSON.stringify({pdead:{t:%d - 60000, vis:true, up:300, view:'3d', lvl:2, mem:400, ready:true, v:'oldver', sid:'%s', spor:%s}}));
}""" % (json.dumps(CFG), NOW, SID, json.dumps(DEAD_SPOR))
SECRET = 'Hemmelig Blåskjell'


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 1100, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)) if 'sportest' not in str(e) else None)
        await pg.add_init_script(STUB)
        calls = []
        replies = {'tm_hello': {'consent': True, 'owned': []}, 'save_get': 'null', 'save_put2': {'ok': True, 'saved_at': '2026-11-02T10:00:00+00:00'}}

        async def handle(route):
            req = route.request; fn = req.url.rsplit('/', 1)[-1]
            try: body = json.loads(req.post_data or '{}')
            except Exception: body = {}
            calls.append((fn, body))
            r = replies.get(fn, 404 if fn in ('save_put3', 'save_head', 'save_put4', 'save_claim', 'save_beat') else '')
            if r == 404: return await route.fulfill(status=404, content_type='application/json', body='{"code":"PGRST202"}')
            await route.fulfill(status=200, content_type='application/json', body=r if isinstance(r, str) else json.dumps(r))
        await pg.route('https://sb.test/**', handle)
        await boot(pg, GAME3D_MIN)
        await pg.wait_for_function("ERR.ready", timeout=60000); await pg.wait_for_timeout(1500)
        has = await pg.evaluate("!!(window.DSB_ERRTRAP && DSB_ERRTRAP.spor)")
        check(has, 'the trace is there (DSB_ERRTRAP.spor)')
        if not has:
            print('errors:', errs[:3]); await br.close(); return
        errc = lambda: [c[1] for c in calls if c[0] == 'tm_error']

        # (5) the crash found at the start: its session and its trace, not this page's
        crash = [e for e in errc() if e.get('src') == 'crash']
        cj = json.loads(crash[0]['stack']) if crash else {}
        check(len(crash) == 1 and crash[0]['meta'].get('sid') == SID and cj.get('spor') == DEAD_SPOR and cj.get('version') == 'oldver',
              'the crash goes with the dead page\'s session (meta.sid) and its trace from the pulse', crash)

        # (1) the buffer: at most ten, the oldest out first, unknown codes «?», the same button counts
        r = await pg.evaluate("""() => { const T = DSB_ERRTRAP;
          for (let i = 0; i < 15; i++) T.spor('k:t' + String.fromCharCode(97 + i), i + 0.4);
          const a = T.spor();
          T.spor('Finnsnes 69.23 17.98'); T.spor('k:Ola Nordmann'); T.spor('telefon:1abc'); T.spor('k:rep'); T.spor('k:rep'); T.spor('k:rep');
          const b = T.spor(); b[0].push('x'); return {a, b, c:T.spor()}; }""")
        a, b = r['a'], r['b']
        check(len(a) == 10 and a[0][1] == 'k:tf' and a[-1][1] == 'k:to' and a[0][2] == 5 and all(len(r['c'][i]) < 5 for i in range(len(r['c']))),
              'the buffer keeps ten, the oldest goes first; numbers rounded; what is read is a copy', a)
        check(len(b) == 10 and [e[1] for e in b[-4:]] == ['?', 'k:?', 'telefon:?', 'k:rep'] and b[-1][2] == 3,
              'an unknown code is kept as «?» («k:?», «telefon:?»), the same button again is one entry that counts', b[-4:])

        # (2) nothing the player wrote, nowhere the boat is
        await pg.evaluate("""(s) => { const d = document.createElement('div'); d.id = 'sporBox';
          d.innerHTML = '<input id="sporIn" type="text"><button type="button" class="ph-btn">' + s + '</button><button type="button" data-pa="sportestgo">' + s + '</button>';
          d.style.cssText = 'position:fixed;left:10px;top:10px;z-index:99999;background:#fff'; document.body.appendChild(d); }""", SECRET)
        await pg.click('#sporIn'); await pg.fill('#sporIn', SECRET); await pg.keyboard.type(' og mer')
        await pg.click('#sporBox button.ph-btn'); await pg.click('#sporBox [data-pa=sportestgo]')
        pos = await pg.evaluate("""() => { const p = S.boat.pos; p.x += 0.731; p.y -= 0.417; S.boatName = 'Sportest ' + 'Skarven';
          return {x:p.x, y:p.y, port:S.boat.port || '', home:(S.boat && S.boat.port) || ''}; }""")
        await pg.wait_for_timeout(1500)
        tr = await pg.evaluate("DSB_ERRTRAP.spor()"); js = json.dumps(tr, ensure_ascii=False)
        bad = [w for w in [SECRET, 'Hemmelig', 'Blåskjell', 'mer', 'Skarven', 'Sportest'] + ([pos['port']] if pos['port'] else []) if w and w in js]
        bad += [n for n in ('%.3f' % pos['x'], '%.2f' % pos['x'], '%.3f' % pos['y'], '%.2f' % pos['y']) if n in js]
        codes = [e[1] for e in tr]
        check(not bad and 'k:?' in codes and 'k:sportestgo' in codes and 'k:sporIn' not in codes,
              'a text field filled, a button with words on it and the boat moved: only codes in the trace (the button without a code is «k:?»), no text, no place', {'bad': bad, 'tr': tr})

        # the phone's pages and the 3D view
        await pg.evaluate("PHONE.show(true); PHONE.open('innst')"); await pg.wait_for_timeout(400)
        await pg.evaluate("PHONE.show(false)"); await pg.wait_for_timeout(400)
        codes = [e[1] for e in await pg.evaluate("DSB_ERRTRAP.spor()")]
        check('telefon:innst' in codes and codes[-1] == 'telefon-lukk', 'the phone\'s page (Innstillinger) and closing the phone go in the trace', codes)
        # (the game starts in 3D: to the map and back is a change of view each way)
        await pg.wait_for_function("G3.isActive()", timeout=120000)
        await pg.evaluate("G3.show(false)"); await pg.wait_for_timeout(500); await pg.evaluate("G3.show(true)")
        await pg.wait_for_function("G3.isActive()", timeout=120000); await pg.wait_for_timeout(3000)
        codes = [e[1] for e in await pg.evaluate("DSB_ERRTRAP.spor()")]
        check(codes[-2:] == ['kart', '3d'], 'the map and the 3D view shown go in the trace', codes)

        # the pulse: this page's session and trace; the watchdog's sign of life carries the trace
        await pg.evaluate("""() => { window.__wdm = null; if (WD.w){ const pm = WD.w.postMessage.bind(WD.w); WD.w.postMessage = m => { if (m && 'on' in m) window.__wdm = m; pm(m); }; } aliveBeat(); wdBeat(); }""")
        await pg.wait_for_timeout(500)   # (wdBeat by hand: its timer each second can wait for seconds under SwiftShader's frames)
        pl = await pg.evaluate("(() => { const a = JSON.parse(localStorage.getItem('dsb_alive') || '{}')[ALIVE.id] || {}; return {sid:a.sid, spor:a.spor, csid:CLOUD.sid, wd:window.__wdm && window.__wdm.spor}; })()")
        check(pl['sid'] and pl['sid'] == pl['csid'] and isinstance(pl['spor'], list) and 0 < len(pl['spor']) <= 10 and isinstance(pl['wd'], list) and len(pl['wd']) > 0,
              'the pulse keeps this page\'s session and its trace, and the watchdog gets the trace with each sign of life', pl)

        # (3) a hang in 3D: the trace and what the 3D was doing
        n0 = len(calls)
        await pg.evaluate("for (const k of Object.keys(CLOUD.errSeen)) if (k.startsWith('Heng')) delete CLOUD.errSeen[k]")
        await pg.evaluate("setTimeout(() => { const t = performance.now(); while (performance.now() - t < 6000); }, 0); 0"); await pg.wait_for_timeout(8000)
        hang = [c[1] for c in calls[n0:] if c[0] == 'tm_error' and c[1].get('src') == 'hang']
        hj = json.loads(hang[0]['stack']) if hang else {}
        g3 = hj.get('g3') or {}
        check(len(hang) == 1 and isinstance(hj.get('spor'), list) and 0 < len(hj['spor']) <= 10 and '3d' in [e[1] for e in hj['spor']]
              and g3.get('on') is True and isinstance(g3.get('up_s'), int) and g3.get('up_s') >= 3 and isinstance(g3.get('max_ms'), int) and g3.get('max_ms') > 0
              and isinstance(g3.get('f1'), bool) and g3.get('n', 0) > 0 and len(hang[0]['stack']) <= 2000,
              'a hang in 3D is sent with the trace and the 3D (shown, how long up, frames, the longest frame, whether it was the first)', hj)

        # a severe 3D fault has the trace; an ordinary error has not
        n0 = len(calls)
        await pg.evaluate("""() => { cloudErr('3D svart skjerm på dagtid · sportest', 'view3d gfx', JSON.stringify({rgb:[0, 0, 0]}), 'gfx');
          cloudErr('3D GL-feil sportest', 'view3d gfx', JSON.stringify({code:1}), 'gfx'); cloudErr('sportest vanlig', 'x', 'a\\nb', 'throw'); }""")
        await pg.wait_for_timeout(800)
        sent = {c[1]['msg']: c[1]['stack'] for c in calls[n0:] if c[0] == 'tm_error'}
        sv = next((v for k, v in sent.items() if k.startswith('3D svart skjerm')), '')
        gl_ = next((v for k, v in sent.items() if k.startswith('3D GL-feil')), None)
        ok_sv = False
        try: ok_sv = isinstance(json.loads(sv).get('spor'), list) and json.loads(sv).get('rgb') == [0, 0, 0]
        except Exception: pass
        check(ok_sv and gl_ is not None and 'spor' not in gl_ and sent.get('sportest vanlig') == 'a\nb',
              'the black screen in 3D has the trace in its stack; another 3D error and an ordinary error have not', sent)

        # (1) the WebGL context lost in play goes in the trace (and the view to the map)
        await pg.evaluate("""() => { const c = document.getElementById('gl'); const g = c.getContext('webgl2') || c.getContext('webgl');
          window.__lose = g && g.getExtension('WEBGL_lose_context'); if (window.__lose) window.__lose.loseContext(); }""")
        await pg.wait_for_timeout(800)
        tr = await pg.evaluate("DSB_ERRTRAP.spor()"); codes = [e[1] for e in tr]
        gm = next((e for e in tr if e[1] == 'gl-mistet'), None)
        check(gm is not None and gm[2] == 1 and codes.index('gl-mistet') < len(codes) - 1 and 'kart' in codes[codes.index('gl-mistet'):],
              'the WebGL context lost in play goes in the trace (1: the view was ready), and the view to the map after it', tr)
        print('errors:', [e for e in errs if 'konteksten' not in e][:3])
        await br.close()

asyncio.run(main())
