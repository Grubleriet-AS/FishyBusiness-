"""An admin's correction delivered to the game (26.11.2026, supabase/migrations/20261126120000_fixes.sql, ui/10w-fix.js): the game asks
for its open corrections, undoes a vessel purchase in its own state (core undoBuyApply), saves and tells the server; at sea it waits and
says so once; a row already done is closed. The cloud is stood in for: cloudRpc and cloudSaveSoon record what they are asked."""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _env import boot
from playwright.async_api import async_playwright

def ok(c): return 'OK  ' if c else 'FEIL'

STUB = """((rows) => { window.__calls = []; window.__rows = rows; CLOUD.on = true; CLOUD.user = {id:'user_x'}; CLOUD.guest = false;
  cloudRpc = async (fn, a) => { __calls.push([fn, JSON.parse(JSON.stringify(a || {}))]); if (fn === 'fix_pending') return __rows; return null; };
  cloudSaveSoon = async () => { __calls.push(['save', {type:S.boat.type}]); };
  S.boat.type = 'kyst21'; applyVessel(); S.cargo = []; return {type:S.boat.type, port:S.boat.port}; })"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1100, 'height': 800}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e) + ' @ ' + (e.stack or '')[:600]))
        await boot(pg)
        row = {'id': 7, 'kind': 'undo_buy', 'data': {'from': 'plastsjark', 'to': 'kyst21'}, 'note': None}
        r0 = await pg.evaluate(STUB, [row])
        print(ok(r0['type'] == 'kyst21' and r0['port']), 'the game is on a kyst21 in port', r0)
        # more fish aboard than the old hold takes: it waits, says so once, and the row stays open (at sea is the unit test's,
        # angrekjop.test.mjs: a port taken from a boat at the quay here would trouble the frame, not the correction)
        r1 = await pg.evaluate("""(async () => { const c = S.cargo; S.cargo = [{kg:5000}]; const n0 = S.msgs.length;
          await fixClaim(); await fixClaim(); await new Promise(r => setTimeout(r, 50)); S.cargo = c;
          const d = __calls.filter(c => c[0] === 'fix_done'); return {type:S.boat.type, msgs:S.msgs.length - n0, done:d.map(c => c[1].done), why:d.map(c => c[1].res.why)}; })()""")
        print(ok(r1['type'] == 'kyst21' and r1['msgs'] == 1 and r1['done'] == [False, False] and r1['why'] == ['hold', 'hold']), 'with too much fish aboard it waits and says so once', r1)
        # in port: undone, saved before the server is told
        r2 = await pg.evaluate("""(async () => { __calls.length = 0; S.cash = -4268; const c0 = S.cash, d0 = debt();
          await fixClaim(); const order = __calls.map(c => c[0]), d = __calls.find(c => c[0] === 'fix_done');
          return {type:S.boat.type, len:BOAT.len, cash:Math.round(S.cash), debt:Math.round(debt()), d0:Math.round(d0), order, res:d && d[1].res, done:d && d[1].done,
            log:S.log[S.log.length - 1].no, msg:S.msgs[S.msgs.length - 1].no}; })()""")
        exp = 9000000 - 595000
        print(ok(r2['type'] == 'plastsjark' and abs(r2['len'] - 9.45) < 0.01), 'the plastsjark is back', {k: r2[k] for k in ('type', 'len')})
        print(ok(r2['res'] and r2['res']['kr'] == exp and r2['cash'] - r2['debt'] == -4268 - r2['d0'] + exp), 'the refund pays the loans and the rest to the account', {k: r2[k] for k in ('cash', 'debt', 'd0', 'res')})
        print(ok(r2['order'][:3] == ['fix_pending', 'save', 'fix_done'] and r2['done'] is True), 'saved before the server is told done', r2['order'])
        print(ok('angret' in r2['log'] and 'plastsjark' in r2['msg'].lower()), 'the log and the message say so', r2['msg'])
        # the same row again (saved, the server not told): closed, nothing done twice
        r3 = await pg.evaluate("""(async () => { __calls.length = 0; const c0 = S.cash; await fixClaim(); await new Promise(r => setTimeout(r, 50));
          const d = __calls.find(c => c[0] === 'fix_done'); return {cash:S.cash - c0, done:d && d[1].done, why:d && d[1].res.why}; })()""")
        print(ok(r3['cash'] == 0 and r3['done'] is True and r3['why'] == 'type'), 'a row already done is closed, nothing twice', r3)
        print(ok(not errs), 'no page errors', errs[:3])
        await br.close()
asyncio.run(main())
