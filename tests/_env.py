# Shared paths for the Playwright scripts. They test the built game (run `node build.mjs` first),
# and screenshots and other output land in tests/out/.
import os, threading, functools, http.server

HERE = os.path.dirname(os.path.abspath(__file__))
# the game is served over HTTP from dist/ (it fetches its map data from dist/map/, which a file:// page cannot), by a server of
# this test's own on a free port; each test gets its own origin, so its own localStorage
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
# (KYST_DIST is made absolute here: the handler resolves its directory on every request, and this module chdirs to tests/out below, so
# a relative KYST_DIST=dist-pwa served nothing and the game never started, 29.10.2026)
class _Srv(http.server.ThreadingHTTPServer):
    # the page reloads or closes while a map pack is still on its way: the browser drops the connection, and the server's own
    # traceback (BrokenPipeError, ConnectionResetError) made run.py count a Python error in a test whose checks were all green
    # (crewwalk, boottest, fleet2test, streaktest, tabtest; Ø2 05.11.2026). Those are the browser's to drop; anything else is printed
    def handle_error(self, request, client_address):
        import sys
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)): return
        super().handle_error(request, client_address)


_SRV = _Srv(('127.0.0.1', 0), functools.partial(_Quiet, directory=os.path.abspath(os.environ.get('KYST_DIST') or os.path.join(os.path.dirname(HERE), 'dist'))))
threading.Thread(target=_SRV.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % _SRV.server_port
# «#qfix»: the 3D view keeps its high quality (view3d.js QUAL), so SwiftShader's few frames a second do not step it down.
# «#seed=N» (29.10.2026): the game swaps Math.random for a seeded generator (core/01-world.js), so the weather, the catch and the crew
# repeat from run to run and a red test is a bug, not a bad roll. KYST_SEED=0 turns it off, another number gives another run.
SEED = os.environ.get('KYST_SEED', '1')
# «ro0» (UI 2, U2-4, 07.11.2026): the calm is off. In the game the buttons slide out when the screen has not been touched for eight
# seconds (ui/10c-dock.js CALM), and most tests wait longer than that between their clicks: Playwright would wait for a button the
# calm has hidden until its time-out. So every test plays with the calm off, but the two that are about it: tut.py (the calm must
# never come in the first trip; the port for U2-4) and roetest.py, which open GAME_RO, the game as a player has it
# «bw0» (27.11.2026): the Black Week pack, sold till 30.11.2026, is off in the tests' games (core/03-simulation.js), so no test says one
# thing before that day and another after; bwtest.py turns it on round its own «now»
GAME_RO = BASE + 'index.html#qfix,bw0' + (',seed=' + SEED if SEED != '0' else '')
GAME_TUT = GAME_RO + ',ro0'
# the tests play without the first-trip tutorial; tut.py uses GAME_TUT
# vis1: «Vis alt» (steg 152, ui/phone/04-kvote.js stAll): the pages show everything at once, as before the stages, so a test finds every tab
# and card where it was. The tests of the stages themselves set S.settings.rmAll = false; tut.py plays the game as a new player has it
GAME = GAME_TUT + ',vis1#notut'
# KYST_LITE=1 (tests/run.py sets it for the tests that do not look at 3D): the game runs as before, but no 3D frame is drawn,
# which is most of the time a test takes with SwiftShader
if os.environ.get('KYST_LITE') == '1':
    GAME = GAME_TUT + ',vis1#notut,no3d'
# KYST_MERKE=folk2 (steg 125): one more flag in the address of every test that opens GAME, so a test written without the new
# people can be run with them (crewclip, workshot); several with a comma
if os.environ.get('KYST_MERKE'):
    GAME = GAME + ',' + os.environ['KYST_MERKE']
# GAME3D_MIN (15.11.2026, testeffektiviseringen): the game as GAME, but without the parts of the 3D scene a test of logic does not look
# at: the trees, the wildlife and the hull's life, the wind turbines and lines, the shore's band, the rocks and breakers, the marinas and
# the near objects (#trees0, #life0, #vind0, #shore0, #rocks0, #marina0, #near0). Measured in SwiftShader 15.11.2026: 10-20 % less a
# frame. The sea (FFT and all) stays: it moves the boat. For the 3D tests that check motion, mooring, landing and the like, never for the
# tests of the graphics or a picture someone looks at (CLAUDE.md, «3D-tester tegner bare det de ser på»)
GAME3D_MIN = GAME + ',trees0,life0,vind0,shore0,rocks0,marina0,near0'
# the hand-drawn routes, in the national frame (km, UTM 33: x = (E + 250 km) / 1000, y = (8050 km - N) / 1000)
ROUTES = os.path.join(HERE, 'routes.json')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
os.chdir(OUT)


# wait_for_function under the game's Content-Security-Policy (L1e, 11.11.2026, build.mjs CSP_OF): Playwright checks the condition
# with eval inside the page, between its polls, and the policy has no 'unsafe-eval' (rightly), so every wait that did not hold at once
# ended in «EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive» (boottest, the first
# run under the policy). evaluate goes through the debugger and is let through, so the wait is done here, with evaluate every 100 ms
# (or `polling` ms). As Playwright's own: it returns the handle of the value, an error in the condition stops it, a page that is on its
# way to another document is waited for, and the time-out is the page's default (30 s, or what set_default_timeout said).
def _csp_wait():
    import asyncio, time
    from playwright.async_api import Page, Error, TimeoutError
    if getattr(Page.wait_for_function, '_dsb', False): return
    async def wait_for_function(self, expression, *, arg=None, timeout=None, polling=None):
        if timeout is None:
            try: timeout = self._impl_obj._timeout_settings.timeout()
            except Exception: timeout = 30000
        end = time.monotonic() + timeout / 1000 if timeout else None
        step = polling / 1000 if isinstance(polling, (int, float)) else 0.1
        while True:
            try:
                h = await self.evaluate_handle(expression, arg)
                if await h.evaluate('v => !!v'): return h
                await h.dispose()
            except Error as e:
                if isinstance(e, TimeoutError) or not any(w in str(e) for w in ('context was destroyed', 'navigation', 'Cannot find context', 'Target page, context or browser has been closed')) or 'has been closed' in str(e): raise
            if end and time.monotonic() > end: raise TimeoutError('Page.wait_for_function: Timeout %dms exceeded.' % timeout)
            await asyncio.sleep(step)
    wait_for_function._dsb = True
    Page.wait_for_function = wait_for_function
try: _csp_wait()
except ImportError: pass


# No test talks to the live servers (15.11.2026): at start the game asks the production Supabase for the server's minute (rpc/sp_now),
# and its error list and events go there too, so a test depended on the network and could leave its errors in the real list. Every
# request to a *.supabase.co host is aborted, in every context a test opens, before its first page load; the game plays on as it does
# offline. The tests that play the cloud stub their own fake host (https://sb.test), which this leaves alone. KYST_NETT=1 lets them through.
def _no_live():
    import re
    from playwright.async_api import Page, BrowserContext
    if getattr(Page.goto, '_dsb', False) or os.environ.get('KYST_NETT') == '1': return
    LIVE = re.compile(r'^https?://[^/]*\.supabase\.co(/|$)')
    async def guard(ctx):
        if not getattr(ctx, '_dsb_live', False):
            ctx._dsb_live = True
            await ctx.route(LIVE, lambda route: route.abort())
    goto0, reload0 = Page.goto, Page.reload
    async def goto(self, url, **kw):
        await guard(self.context); return await goto0(self, url, **kw)
    async def reload(self, **kw):
        await guard(self.context); return await reload0(self, **kw)
    goto._dsb = True
    Page.goto, Page.reload = goto, reload
try: _no_live()
except ImportError: pass


# A screenshot gets at least SHOT_MIN, times KYST_TIDSFAKTOR (27.11.2026). In the regression on GitHub's machines (regresjon.yml, the
# night to Monday 23.11.2026) nine tests ended the same way, twice each, «Page.screenshot: Timeout … exceeded», the call log ending in
# «fonts loaded»: aurorashot, skoddeshot, deckshot, workshot, brotest, h2dshot and camtest on the page's default of 120 s (boot),
# vessel3d on its own default of 120 s and ultratest on the 120 s it gives each picture. The tests that give their pictures 300 s
# themselves (sunshot, kaishot, wetshot, havnshot and more) were green on the same machines that night. SwiftShader draws on the CPU, a
# picture waits for a frame, and those machines draw slower than the sessions' (KYST_TIDSFAKTOR, which until now only tests/run.py read,
# for the limit of a whole test). A picture's limit is no check: a limit a test sets higher stands, 0 (no limit) stays 0, and a picture
# that hangs is still stopped, by this limit and by run.py's for the whole test.
SHOT_MIN = 300000
TIDSFAKTOR = float(os.environ.get('KYST_TIDSFAKTOR') or 1)
def shot_limit(given, default, factor=TIDSFAKTOR):
    """The time-out in ms of a screenshot: what the test gave (None: the page's default), but at least SHOT_MIN × factor."""
    t = default if given is None else given
    return 0 if t == 0 else max(t, SHOT_MIN * factor)
def _shot_time():
    from playwright.async_api import Page
    if getattr(Page.screenshot, '_dsb', False): return
    shot0 = Page.screenshot
    async def screenshot(self, **kw):
        try: d = self._impl_obj._timeout_settings.timeout()
        except Exception: d = 30000
        kw['timeout'] = shot_limit(kw.get('timeout'), d)
        return await shot0(self, **kw)
    screenshot._dsb = True
    Page.screenshot = screenshot
try: _shot_time()
except ImportError: pass


async def boot(pg, url=None):
    """Open the game and press «Start» on the first screen. It waits for the page and the start, not for fixed pauses."""
    # the software GPU of the test machine draws only a few 3D frames a second (05.10.2026): a screenshot or a wait without its own
    # limit gets 120 s instead of Playwright's 30
    pg.set_default_timeout(120000)
    await pg.goto(url or GAME)
    await pg.wait_for_selector('#obGo', state='visible', timeout=90000)
    await pg.click('#obGo')
    await pg.wait_for_function("S.intro === true && document.getElementById('modal').hidden", timeout=30000)
