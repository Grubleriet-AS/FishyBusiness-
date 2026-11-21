"""The account's copy after starts that locked (ui/11-boot.js BOOTG, bootgRescue and bootgReport; klynge:ff994e70, 21.11.2026). The
error list had the lock told again by the start that came after the take of the account's copy (fails 3, act cloud, no save, 0 min
ago: the page that took the copy and loaded itself again, not a page that locked), and the take could come twice in one row of locks:
at the second lock and again at the third. The second take put the game it had just taken in «Tidligere lagringer» (KEY_PREV, one
place), over the device's own newest game that the first take had kept there, so the player lost what was played on the device since
the last save that went up.

With a stand-in for the cloud (as bootgtest): the account has the game from before, the device has it played further and not sent.
The records of the starts before are written as the locked pages left them (setrec), so no page needs crashing here:
  1. two locks in a row: this start tells it once, takes the account's copy, and the device's game is kept as the save before;
  2. the start after the take does not tell the lock again (it was told by the start that took the copy);
  3. that game locks too (the third): the safe start, no second take, and the device's own game is still the save before.
Prints OK or FEIL."""
from _env import GAME, BASE, boot
import asyncio, json, time
from datetime import datetime, timezone
from playwright.async_api import async_playwright

bad = []
def check(c, msg, d=None):
    print(('OK   ' if c else 'FEIL ') + msg, '' if c else json.dumps(d, ensure_ascii=False, default=str)[:600])
    if not c: bad.append(msg)

READY = "typeof SIMREADY !== 'undefined' && SIMREADY === true"
REC = "JSON.parse(localStorage.getItem('dsb_bootg') || 'null')"
CFG = {'hosts': ['127.0.0.1', 'localhost'], 'supabaseUrl': 'https://sb.test', 'supabaseAnon': 'anon_test', 'workosClientId': 'client_test'}
STUB = """window.DSB_CLOUD = %s;
window.DSB_AUTHKIT = {createClient: async () => ({getUser: () => ({id:'user_bootr', email:'bootr@test.no'}), getAccessToken: async () => 'tok_bootr',
  signIn: () => {}, signUp: () => {}, signOut: () => {}})};""" % json.dumps(CFG)
CREADY = READY + " && !document.getElementById('cloudGate')"
STATE = """(() => { const o = JSON.parse(localStorage.getItem(KEY_PREV) || 'null');
  return {fails:BOOTG.fails, safe:BOOTG.safe, cash:Math.round(S.cash), prev:o ? Math.round(o.cash) : null, rec:""" + REC + """}; })()"""
DB = {'row': None, 'errs': [], 'noput': False}
iso = lambda t=None: datetime.fromtimestamp(t or time.time(), timezone.utc).isoformat()
HEAD = ('rev', 'saved_at', 'game_t', 'summary', 'device', 'device_name', 'updated_at', 'active_dev', 'active_name', 'active_since')
def head(): return dict({k: DB['row'][k] for k in HEAD}, now=iso(), active_age=0) if DB['row'] else None
def put4(b):
    if DB['noput']: return None
    cur = DB['row']
    if cur and not b.get('force') and cur['rev'] != b.get('base_rev'): return {'ok': False, 'moved': False, 'taken': False, 'cloud': {k: cur[k] for k in HEAD}}
    rev = (cur['rev'] if cur else 0) + 1
    DB['row'] = {'data': b['data'], 'saved_at': b['saved_at'], 'game_t': b['game_t'], 'summary': b['summary'], 'rev': rev, 'device': b['device'],
                 'device_name': b['device_name'], 'updated_at': iso(), 'active_dev': b['device'], 'active_name': b['device_name'], 'active_since': iso()}
    return {'ok': True, 'rev': rev, 'saved_at': b['saved_at'], 'updated_at': DB['row']['updated_at']}
reports = lambda: [x for x in DB['errs'] if x.get('msg', '').startswith('Oppstarten står fast: siden låste seg')]


async def ready_on(pg, cond):
    for _ in range(3):
        try: await pg.wait_for_function(cond, timeout=60000); return True
        except Exception: await pg.wait_for_timeout(1000)
    return False


async def start(ctx, ready=CREADY):
    pg = await ctx.new_page(); pg.set_default_timeout(120000); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(GAME)
    if ready: await ready_on(pg, ready)
    return pg, errs


async def leave(pg):
    try: await pg.goto('about:blank'); await pg.close()
    except Exception: pass


async def setrec(ctx, rec):
    """The record as a locked page left it, written from a page of the same site that is not the game."""
    pg = await ctx.new_page(); await pg.goto(BASE + 'ingen-side.html')
    await pg.evaluate("r => localStorage.setItem('dsb_bootg', JSON.stringify(r))", rec); await pg.close()


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 1100, 'height': 800})
        await ctx.add_init_script(STUB)
        async def handle(route):
            req = route.request; fn = req.url.rsplit('/', 1)[-1]
            try: b = json.loads(req.post_data or '{}')
            except Exception: b = {}
            if fn == 'tm_hello': r = {'consent': False, 'owned': []}
            elif fn == 'tm_error': DB['errs'].append(b); r = ''
            elif fn == 'save_get': r = DB['row']
            elif fn == 'save_head': r = head()
            elif fn in ('save_put4', 'save_put3'):
                r = put4(b)
                if r is None: await route.fulfill(status=503, content_type='application/json', body='{}'); return
            elif fn == 'save_claim': r = {'ok': True, 'rev': DB['row']['rev'], 'now': iso(), 'prev_dev': None} if DB['row'] else {'ok': False, 'now': iso()}
            elif fn == 'save_beat': r = head()
            else: r = ''
            await route.fulfill(status=200, content_type='application/json', body=r if isinstance(r, str) else json.dumps(r))
        await ctx.route('https://sb.test/**', handle)
        pg = await ctx.new_page(); e0 = []; pg.on('pageerror', lambda e: e0.append(str(e)))
        await boot(pg); await pg.wait_for_function(CREADY, timeout=120000)
        # the account has the game (the last save that went up); the device plays on, and nothing more reaches the account
        r = await pg.evaluate("""async () => { S.intro = true; S.tut = 0; S.t = Math.max(S.t || 0, 900); S.boatName = S.boatName || 'Prøve'; S.cash = 111111; save(); await cloudSaveSoon(false, true); return {rv:TAB.rv}; }""")
        DB['noput'] = True; await pg.wait_for_timeout(1500)
        await pg.evaluate("S.cash = 123456; save()")
        check(r['rv'] >= 1 and DB['row'], 'the account has the game from before, the device has it played further', r)
        await leave(pg)
        now = lambda: int(time.time() * 1000)
        # 1. two locks in a row (the record of the second): the account's copy, the device's game kept as the save before
        await setrec(ctx, {'fails': 1, 'in': True, 'ok': False, 'vis': True, 'at': now(), 'v': 'dev'})
        pg, e1 = await start(ctx, ready=None)
        await ready_on(pg, CREADY + " && sessionStorage.getItem('dsb_pulled')")   # (the take loads the page again)
        s1 = await pg.evaluate(STATE); n1 = len(reports())
        check(s1['cash'] == 111111 and s1['prev'] == 123456 and s1['rec']['act'] == 'cloud',
              'after two locks the account\'s copy goes on, and the device\'s own game is the save before', s1)
        # 2. the start after the take tells nothing new: the lock was told once, by the start that took the copy
        check(n1 == 1, 'the lock is told once, not again by the start after the take of the account\'s copy',
              {'n': n1, 'stacks': [x.get('stack') for x in reports()]})
        await pg.wait_for_timeout(1500); await pg.evaluate("S.cash = 111112; save()")   # (it plays a little, and nothing reaches the account)
        await leave(pg)
        # 3. that game locks too: the third in a row is the safe start, not a second take over the save before
        # (the record that start wrote as it built the game, as it stood when the page died on the screen)
        await setrec(ctx, dict(s1['rec'] or {}, ok=False, vis=True, at=now()))
        pg, e2 = await start(ctx, ready=None)
        await pg.wait_for_timeout(2000); await ready_on(pg, CREADY)
        s2 = await pg.evaluate(STATE); pulled = await pg.evaluate("sessionStorage.getItem('dsb_pulled')")
        check(s2['fails'] == 3 and s2['safe'] and not pulled and s2['prev'] == 123456,
              'the third lock in a row: the safe start, no second take, and the device\'s own game is still the save before', dict(s2, pulled=pulled))
        await leave(pg)
        allerr = e0 + e1 + e2
        check(not allerr, 'no page errors', allerr[:4])
        await ctx.close(); await br.close()
    print('røde:', bad if bad else 'ingen')

asyncio.run(main())
