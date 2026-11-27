"""A hop paid for is made when the page comes back from the payment, whatever the save to the account was doing as the page went
(ui/10f-cloud.js cloudSync, ui/10i-shop.js srvApply 5b, ui/10u-hopp.js hopDeliver; Jonas 27.11.2026: ten of 276 paid hops marked «The
boat was no longer lying still on the route when the payment came» and refunded by hand). The boat is held for the hop in the game on
the device (b.hopHold, with pay once «Kjøp» is tapped). The page that comes back from Stripe is a new one: it reads the game on the
device and asks the account which game goes on. One device against a stand-in for the database, as synctest.py:
  1. the ordinary way: the save sent as the page goes to Stripe reaches the account, and its answer is never read (the page is gone).
     Back, the grant comes, and the hop is made
  2. the half-minute save (or the one 20 s after a departure) is on its way when «Kjøp» is tapped: it reaches the account with the
     game from before the tap, its answer is never read, and the save as the page goes is not sent (one save at a time). Back, the
     account's game is this device's own and older than the game here: the one here goes on, the boat still held, and the hop is made.
     Before, the start took the account's game for «the newer one from elsewhere», the hold was gone, and the hop was marked for a refund
  3. the page lives on: a save reaches the account and its answer is lost (the network), and the server's clock is ahead of the
     device's. The next save is refused (the account has moved on), and the game here goes on and is saved over the account's own
     older copy. Before, the server's time of that copy was held against the device's clock, and the older game was taken back
     (3b: but a game here that is behind the one this device last had answered, a page left open that wrote its game back, never
     goes on over the device's own later save on the account: the account's game is taken, as before)
  4. the boat off the route's line with land between her and the next point (leaving her berth, on the route's first leg, and
     rounding a point on a later one: the manoeuvring model's track, not the line), held for a hop: the page that comes back keeps her on her route, and the hop is made. Before, the
     start (ui/11-boot.js) took the line from where she lay to the next point for a leg of the route «over land», put her back in
     the nearest harbour and took the route away, so the hop was marked for a refund (5 of 41 harbours along the coast for 1 to 28 s
     after the cast-off, measured 27.11.2026; most of the refunded hops were bought 5 to 26 s after a departure)
  5. the start's own job is still done: a route with a leg over land ahead of her (the chart or a quay changed since it was laid;
     under way the legs after the one she is on, moored the first leg from the harbour's point too) puts the boat in the nearest
     harbour with the route gone, and the log says so. (Before, the route came back with the vessel's own copy, and she lay moored
     with the route over land still on her: what a player whose hop was refunded then met, and «Sitter båten fast?» was pressed)
  6. no page errors
KYST_LITE=1 python3 tests/hoppskytest.py. Prints OK or FEIL lines."""
import asyncio, json, time
from datetime import datetime, timezone
from _env import GAME, boot
from playwright.async_api import async_playwright

CFG = {'hosts': ['127.0.0.1', 'localhost'], 'supabaseUrl': 'https://sb.test', 'supabaseAnon': 'anon_test', 'workosClientId': 'client_test'}
STUB = """window.DSB_CLOUD = %s;
window.DSB_AUTHKIT = {createClient: async () => ({getUser: () => ({id:'user_hopp', email:'hopp@test.no'}), getAccessToken: async () => 'tok_hopp',
  signIn: () => {}, signUp: () => {}, signOut: () => {}})};""" % json.dumps(CFG)
READY = "typeof SIMREADY !== 'undefined' && SIMREADY && !document.getElementById('cloudGate')"
FAIL = []
def check(ok, what, info=None):
    print(('OK ' if ok else 'FEIL ') + what + ('' if info is None else ' ' + json.dumps(info, ensure_ascii=False, default=str)[:600]))
    if not ok: FAIL.append(what)

# the stand-in for the account: one save row with its revision (save_put4 as the SQL counts it), the grants, and the calls made.
# mute: the next save is taken and never answered, as when the page is gone before the answer comes
# drop: the next save is taken and its answer lost on the way, with the server's clock ten minutes ahead of the device's
DB = {'row': None, 'calls': [], 'grants': [], 'mute': False, 'muted': 0, 'drop': False}
iso = lambda: datetime.fromtimestamp(time.time(), timezone.utc).isoformat()
HEAD = ('rev', 'saved_at', 'game_t', 'summary', 'device', 'device_name', 'updated_at', 'active_dev', 'active_name', 'active_since')
def head(): return dict({k: DB['row'][k] for k in HEAD}, now=iso(), active_age=0) if DB['row'] else None
def put4(b):
    cur = DB['row']
    if cur and not b.get('force') and cur['rev'] != b.get('base_rev'): return {'ok': False, 'moved': False, 'taken': False, 'cloud': {k: cur[k] for k in HEAD}}
    rev = (cur['rev'] if cur else 0) + 1
    DB['row'] = {'data': b['data'], 'saved_at': b['saved_at'], 'game_t': b['game_t'], 'summary': b['summary'], 'rev': rev, 'device': b['device'],
                 'device_name': b['device_name'], 'updated_at': iso(), 'active_dev': b['device'], 'active_name': b['device_name'], 'active_since': iso()}
    return {'ok': True, 'rev': rev, 'saved_at': b['saved_at'], 'updated_at': DB['row']['updated_at']}
def state(game_t):
    out = []
    for g in DB['grants']:
        if g.get('used') or g.get('void'): continue
        o = {'id': g['id'], 'product': 'hopp', 'data': g['data'], 'held': True, 'done_at': g.setdefault('done_at', iso())}
        if not g.get('told'): o['new'] = True; g['told'] = True
        out.append(o)
    return {'v': 4, 't': game_t, 'list': out, 'on': None, 'imp': True, 'owned': [], 'pub': None}

async def handle(route):
    req = route.request; fn = req.url.split('?')[0].rsplit('/', 1)[-1]
    try: b = json.loads(req.post_data or '{}')
    except Exception: b = {}
    DB['calls'].append(fn)
    if fn == 'tm_hello': r = {'consent': False, 'owned': []}
    elif fn == 'save_get': r = DB['row']
    elif fn in ('save_head', 'save_beat'): r = head()
    elif fn == 'save_claim': r = {'ok': bool(DB['row']), 'rev': DB['row'] and DB['row']['rev'], 'now': iso(), 'prev_dev': DB['row'] and DB['row']['device'], 'prev_age': 0}
    elif fn in ('save_put4', 'save_put3'):
        r = put4(b)
        if DB['mute']: DB['mute'] = False; DB['muted'] += 1; return   # taken, and never answered
        if DB['drop'] and r.get('ok'):
            DB['drop'] = False; DB['row']['updated_at'] = datetime.fromtimestamp(time.time() + 600, timezone.utc).isoformat(); return await route.abort()
    elif fn == 'shop_state': r = state(DB.get('game_t', 0))
    elif fn == 'hop_use':
        for g in DB['grants']:
            if g['id'] == b.get('id'): g['used'] = True
        r = True
    elif fn == 'hop_void':
        for g in DB['grants']:
            if g['id'] == b.get('id'): g['void'] = b.get('why')
        r = True
    else: r = ''
    await route.fulfill(status=200, content_type='application/json', body=r if isinstance(r, str) else json.dumps(r))

# a harbour 8-30 km away on an Autonav route, as hopptest.py
SETUP = """async () => {
  const b = S.boat, A = portById(b.port) || PORTS.find(p => dist(p.p, b.pos) < 1);
  const B = PORTS.filter(p => p.id !== A.id && !p.naust && dist(p.p, A.p) > 8 && dist(p.p, A.p) < 30).sort((p, q) => dist(p.p, A.p) - dist(q.p, A.p))[0];
  const r = await leiaRoute({x:A.p.x, y:A.p.y}, {x:B.p.x, y:B.p.y}, A.id, B.id); if (r.why) return {err:r.why[0]};
  for (const w of r.wps) await mapNeed(w, 1);
  window.__H = {A:A.id, B:B.id, wps:r.wps.map(w => Object.assign({}, w))};
  try { sessionStorage.setItem('hoppsky', JSON.stringify(window.__H)); } catch (e){}
  return {A:A.name, B:B.name, n:r.wps.length};
}"""
# the route under way from the start harbour, and the game as it is on the account (the save answered)
START = """async (off) => {
  const H = window.__H || (window.__H = JSON.parse(sessionStorage.getItem('hoppsky'))), b = S.boat, A = portById(H.A);
  // (a game that has been played: one at minute 0 with no boat name is «nothing here yet» to the start, which takes the account's)
  S.t = Math.max(S.t || 0, 900); S.boatName = S.boatName || 'Havbris';
  S.intro = true; S.tut = 0; S.settings.autoOn = false; S.me = S.cur; S.sleep = null; S.energy = 90; WX_FORCE = {w:3, d:180};
  b.status = 'sailing'; b.port = null; b.pos = {x:A.p.x, y:A.p.y}; b.v = 0; b.anch = null; b.hove = null; b.hopHold = null; b.fuel = BOAT.fuelCap;
  S.plan = {wps:H.wps.map(w => Object.assign({}, w)), idx:0, speed:BOAT.vcruise || BOAT.vmax * 0.8, returning:false, depAt:null, unsafe:H.wps.map(() => false)};
  S.plan.wps[S.plan.wps.length - 1].port = H.B;
  for (let i = 0; i < 200 && CLOUD.saving; i++) await new Promise(r => setTimeout(r, 50));   // (a save still on its way from the step before)
  // off: she lies on the water beside the route, at the nearest spot from which the straight line to the next point crosses land,
  // while the route's own leg to that point is clear (as on her way out of a berth, or on her track round a point)
  let at = null;
  if (off){ const W = S.plan.wps;
    // ('first': on the route's first leg, out of the harbour, the route's index 0, as the hops refunded were; 'later': on a later leg)
    for (let i = off === 'first' ? 0 : 1; i < (off === 'first' ? 1 : Math.min(W.length, 8)); i++){ const P = i ? W[i - 1] : A.p; if (!legClear(P, W[i]) && !quayLandLeg(P, W[i])) continue;
      for (let f = 0.1; f < 0.95; f += 0.1){ const m = {x:P.x + (W[i].x - P.x) * f, y:P.y + (W[i].y - P.y) * f};
        for (let dx = -0.6; dx <= 0.6; dx += 0.03) for (let dy = -0.6; dy <= 0.6; dy += 0.03){ const q = {x:m.x + dx, y:m.y + dy}, d = Math.hypot(dx, dy);
          if ((!at || d < at.d) && !isLand(q) && coastDist(q) > 0.02 && !legClear(q, W[i])) at = {i, d, q}; } } }
    if (at){ b.pos = {x:at.q.x, y:at.q.y}; S.plan.idx = at.i; } }
  save(); CLOUD.headT = 0; await cloudSaveSoon(false, true);
  return {rv:TAB.rv, st:b.status, saving:CLOUD.saving, at:at && {i:at.i, m:Math.round(at.d * 1000)}};
}"""
# the fast-forward button: the boat held, and the card's price for where she stands
PRESS = """() => { const hd = hopHoldOn(), q = hopQuote(false);
  return {held:!!hd, why:q.why || null, min:q.realMin, kr:q.kr, to:{x:q.w.x, y:q.w.y, port:q.w.port || null}, boat:S.cur, t:Math.round(S.t)}; }"""
# «Kjøp» as hopCard and shopGo do it: the hold kept for the payment, the game saved here and sent to the account as the page goes
BUY = """() => { const hd = S.boat.hopHold; hd.pay = true; hd.until = S.t + HOP.holdReal * GAME_RATE; save(); cloudSaveSoon(true);
  return {pay:hd.pay, seq:S.seq, saving:CLOUD.saving}; }"""
AFTER = """() => { const b = S.boat, H = window.__H || JSON.parse(sessionStorage.getItem('hoppsky')), B = portById(H.B);
  return {st:b.status, port:b.port, km:+dist(b.pos, B.p).toFixed(2), hold:b.hopHold ? {pay:!!b.hopHold.pay} : null, void:(S.hopVoid || []).length, done:(S.hopDone || []).length}; }"""

async def back(pg, gid):
    """the page comes back from the payment: a new page with ?kjop=…, and the hop is made or marked"""
    n0 = len(DB['calls'])
    await pg.goto(GAME.replace('index.html', 'index.html?kjop=cs_test_hopp%d' % gid))
    await pg.wait_for_function(READY, timeout=240000)
    for _ in range(360):
        g = next(x for x in DB['grants'] if x['id'] == gid)
        if g.get('used') or g.get('void'): break
        await asyncio.sleep(0.5)
    await pg.wait_for_function(READY + " && !HOPUI.busy && !HOPUI.pend.size", timeout=120000)
    return g, DB['calls'][n0:], await pg.evaluate(AFTER)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await br.new_context(viewport={'width': 1100, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(STUB); await pg.route('https://sb.test/**', handle)
        await boot(pg)
        s = await pg.evaluate(SETUP)
        if s.get('err'): check(False, 'the route is found', s); return
        # 1. the ordinary way: the save as the page goes reaches the account, its answer is never read
        st = await pg.evaluate(START, False); q = await pg.evaluate(PRESS)
        check(st['rv'] == DB['row']['rev'] and q['held'] and not q['why'] and q['min'] >= 1, 'under way on the route, the game on the account, and the button holds the boat', {'st': st, 'q': q})
        DB['game_t'] = q['t']; DB['mute'] = True; rev0 = DB['row']['rev']
        b1 = await pg.evaluate(BUY)
        for _ in range(100):
            if DB['row']['rev'] > rev0: break
            await asyncio.sleep(0.1)
        DB['grants'].append({'id': 501, 'data': {'give': 'hopp', 'boat': q['boat'], 'min': q['min'], 'kr': q['kr'], 'to': q['to']}})
        g, calls, a = await back(pg, 501)
        check(DB['muted'] == 1 and g.get('used') and not g.get('void') and a['km'] < 0.5 and not a['hold'] and not a['void'],
              '1. back from the payment the ordinary way (the save as the page went never answered): the hop is made, the boat at the stop', {'b1': b1, 'grant': g, 'a': a})
        # 2. another save on its way when «Kjøp» is tapped: the account has the game from before the tap, and the last save was never sent
        st = await pg.evaluate(START, False); q = await pg.evaluate(PRESS)
        check(st['rv'] == DB['row']['rev'] and not st['saving'] and q['held'] and not q['why'], 'under way again, the game on the account, the boat held', {'st': st, 'q': q})
        DB['game_t'] = q['t']; DB['mute'] = True; rev0 = DB['row']['rev']
        await pg.evaluate("() => { save(); cloudSaveSoon(); }")   # the half-minute save, with the card open: the hold with no payment yet
        for _ in range(100):
            if DB['row']['rev'] > rev0: break
            await asyncio.sleep(0.1)
        b2 = await pg.evaluate(BUY)   # (one save at a time: the one as the page goes is not sent)
        await pg.wait_for_timeout(300)
        check(DB['muted'] == 2 and DB['row']['rev'] == rev0 + 1 and b2['saving'], 'the earlier save reached the account unanswered, and the save as the page went was not sent', {'b2': b2, 'rev': DB['row']['rev'], 'rev0': rev0, 'muted': DB['muted']})
        DB['grants'].append({'id': 502, 'data': {'give': 'hopp', 'boat': q['boat'], 'min': q['min'], 'kr': q['kr'], 'to': q['to']}})
        g, calls, a = await back(pg, 502)
        check(g.get('used') and not g.get('void') and a['km'] < 0.5 and not a['void'],
              '2. back from the payment with an earlier save unanswered: the game here goes on, the boat still held, and the hop is made (never marked for a refund)', {'grant': g, 'a': a, 'calls': [c for c in calls if c.startswith(('hop_', 'save_get'))]})
        # the game here went on from the account's revision: its next save is taken, not refused
        r = await pg.evaluate("(async () => { save(); CLOUD.headT = 0; await cloudSaveSoon(false, true); return {rv:TAB.rv, text:cloudStatusText()}; })()")
        check(r['rv'] == DB['row']['rev'] and 'Lagret i skyen' in r['text'], 'the next save from the game here reaches the account', {'r': r, 'rev': DB['row']['rev']})
        # 3. the page lives on, a save's answer is lost, and the server's clock is ahead: the game here is never swapped for its older copy
        await pg.evaluate("window.__alive = 1")
        DB['drop'] = True; rev0 = DB['row']['rev']
        await pg.evaluate("(async () => { S.cash = 313131; save(); CLOUD.headT = 0; await cloudSaveSoon(false, true); })()")
        lost = DB['row']['rev'] == rev0 + 1 and (DB['row'].get('summary') or {}).get('cash') == 313131 and not DB['drop']
        await pg.evaluate("(async () => { S.cash = 424242; save(); CLOUD.headT = 0; await cloudSaveSoon(false, true); })()")
        s3 = {}
        for _ in range(120):
            try: s3 = await pg.evaluate("({alive:!!window.__alive, ready:typeof SIMREADY !== 'undefined' && !!SIMREADY, cash:typeof S !== 'undefined' && S ? S.cash : null, saving:typeof CLOUD !== 'undefined' && !!CLOUD.saving})")
            except Exception: s3 = {'loading': True}
            if (DB['row'].get('summary') or {}).get('cash') == 424242 or (s3.get('ready') and not s3.get('alive')): break
            await asyncio.sleep(0.25)
        check(lost and s3.get('alive') and s3.get('cash') == 424242 and (DB['row'].get('summary') or {}).get('cash') == 424242,
              '3. a save answered by nobody and a server clock ahead: the game here goes on and reaches the account, never its own older copy back', {'lost': lost, 's3': s3, 'row': DB['row'].get('summary'), 'rev': DB['row']['rev']})
        # 3b. the game here is behind the one this device last had answered (a page left open wrote its game back, the save's count
        # below the one in step), and the account has this device's later save unanswered: the account's game goes on, as before
        for _ in range(100):
            if await pg.evaluate("!CLOUD.saving && !CLOUD.forceNext && TAB.rv === %d" % DB['row']['rev']): break
            await pg.wait_for_timeout(100)
        DB['mute'] = True; rev0 = DB['row']['rev']
        await pg.evaluate("() => { S.cash = 555000; save(); cloudSaveSoon(); }")
        for _ in range(100):
            if DB['row']['rev'] > rev0: break
            await asyncio.sleep(0.1)
        b3 = await pg.evaluate("() => { SAVE_OFF = true; const o = JSON.parse(localStorage.getItem(KEY)), sy = syncGet(); o.seq = sy.sq - 1; o.cash = 111; o.lastReal = Date.now() + 5; localStorage.setItem(KEY, JSON.stringify(o)); return {sq:sy.sq, seq:o.seq}; }")
        await pg.reload(); await pg.wait_for_function(READY, timeout=240000)
        a3 = await pg.evaluate("({cash:S.cash})")
        check(DB['row']['rev'] == rev0 + 1 and a3['cash'] == 555000, '3b. a game here behind the one this device last had answered never goes on over its own later save on the account', {'b3': b3, 'a3': a3, 'rev': DB['row']['rev']})
        # 4. the boat beside the route's line, land between her and the next point: back from the payment she is still on her route
        for off, gid in (('first', 503), ('later', 504)):
            st = await pg.evaluate(START, off); q = await pg.evaluate(PRESS)
            check(bool(st['at']) and q['held'] and not q['why'], 'under way beside the line of the route (' + off + ' leg), land between her and the next point, the boat held', {'st': st, 'q': q})
            if not st['at']: continue
            DB['game_t'] = q['t']; DB['mute'] = True; rev0 = DB['row']['rev']
            await pg.evaluate(BUY)
            for _ in range(100):
                if DB['row']['rev'] > rev0: break
                await asyncio.sleep(0.1)
            DB['grants'].append({'id': gid, 'data': {'give': 'hopp', 'boat': q['boat'], 'min': q['min'], 'kr': q['kr'], 'to': q['to']}})
            g, calls, a = await back(pg, gid)
            check(g.get('used') and not g.get('void') and a['km'] < 0.5 and not a['void'],
                  '4. back from the payment with the boat beside the line of her route (' + off + ' leg): she is still on it, and the hop is made (never back in the nearest harbour with the route gone)', {'grant': g, 'a': a})
        # 5. a route with a leg over land ahead is still taken away at the start, the boat put in the nearest harbour: under way (a
        # leg ahead of the one she is on), and moored with a departure set (the route's first leg, from the harbour's point)
        FAR = """async (moored) => { const H = window.__H || JSON.parse(sessionStorage.getItem('hoppsky')), b = S.boat, W = H.wps, A = portById(H.A), P = moored ? A.p : W[1];
          let far = null;
          for (const p of PORTS.filter(p => !p.naust && dist(p.p, P) > 12 && dist(p.p, P) < 40).sort((p, q) => dist(p.p, P) - dist(q.p, P))){
            for (let f = 0; f <= 1; f += 0.05) await mapNeed({x:P.x + (p.p.x - P.x) * f, y:P.y + (p.p.y - P.y) * f}, 2);
            if (!legClear(P, p.p) && !quayLandLeg(P, p.p)){ far = p; break; } }
          if (!far || !legClear(W[0], W[1])) return {err:'no harbour behind land'};
          b.hopHold = null; b.v = 0;
          if (moored){ b.status = 'port'; b.port = A.id; b.pos = {x:A.p.x, y:A.p.y}; S.plan = {wps:[{x:far.p.x, y:far.p.y, port:far.id}], idx:0, speed:BOAT.vcruise || BOAT.vmax * 0.8, returning:false, depAt:S.t + 600, unsafe:[false]}; }
          else { b.status = 'sailing'; b.port = null; b.pos = {x:(W[0].x + W[1].x) / 2, y:(W[0].y + W[1].y) / 2};
            S.plan = {wps:[Object.assign({}, W[0]), Object.assign({}, W[1]), {x:far.p.x, y:far.p.y, port:far.id}], idx:1, speed:BOAT.vcruise || BOAT.vmax * 0.8, returning:false, depAt:null, unsafe:[false, false, false]}; }
          S.log = []; save(); return {far:far.name}; }"""
        for moored in (False, True):
            r5 = await pg.evaluate(FAR, moored)
            await pg.reload(); await pg.wait_for_function(READY, timeout=240000)
            a5 = await pg.evaluate("({st:S.boat.status, port:S.boat.port, plan:!!S.plan, trail:(S.trail || []).length, told:(S.log || []).some(l => /gikk over land/.test(l.no || ''))})")
            check(not r5.get('err') and a5['st'] == 'port' and a5['port'] and not a5['plan'] and a5['trail'] == 1 and a5['told'],
                  '5. a route with a leg over land ahead (' + ('moored, its first leg' if moored else 'under way, the leg after hers') + ') is still taken away at the start, in the copy the vessel keeps too, and said in the log', {'r5': r5, 'a5': a5})
        check(not errs, '6. no page errors', errs[:3])
        await br.close()
    print('FEIL: ' + ', '.join(FAIL) if FAIL else 'alt OK')
asyncio.run(main())
