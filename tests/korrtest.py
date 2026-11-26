"""An admin's correction delivered to the game (26.11.2026, supabase/migrations/20261126120000_fixes.sql, ui/10w-fix.js): the game asks
for its open corrections, undoes a vessel purchase in its own state (core undoBuyApply), saves and tells the server only once the save
reached the account; with too much fish aboard it waits and says so once; a row done is never done twice; a page that has passed the
game on asks nothing. The cloud is stood in for: cloudRpc and cloudSaveSoon record what they are asked."""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _env import boot
from playwright.async_api import async_playwright

def ok(c): return 'OK  ' if c else 'FEIL'

STUB = """((rows) => { window.__calls = []; window.__rows = rows; CLOUD.on = true; CLOUD.user = {id:'user_x'}; CLOUD.guest = false;
  cloudRpc = async (fn, a) => { __calls.push([fn, JSON.parse(JSON.stringify(a || {}))]); if (fn === 'fix_pending') return __rows; return null; };
  window.__saveOk = true; window.__bump = false; cloudSaveSoon = async () => { __calls.push(['save', {type:S.boat.type}]); S.lastReal = Date.now(); if (__saveOk) CLOUD.lastSave = S.lastReal; if (__bump) S.lastReal += 5; };
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
        # a page that has passed the game on asks nothing
        rh = await pg.evaluate("""(async () => { __calls.length = 0; TAB.held = true; await fixClaim(); TAB.held = false; return {calls:__calls.length, type:S.boat.type}; })()""")
        print(ok(rh['calls'] == 0 and rh['type'] == 'kyst21'), 'a page without the game sends nothing', rh)
        # in port, the save not reaching the account: done in the game, the row left open
        r2 = await pg.evaluate("""(async () => { __calls.length = 0; __saveOk = false; S.cash = -4268; const d0 = debt();
          await fixClaim(); const order = __calls.map(c => c[0]), d = __calls.find(c => c[0] === 'fix_done');
          return {type:S.boat.type, len:BOAT.len, cash:Math.round(S.cash), debt:Math.round(debt()), d0:Math.round(d0), order, done:!!d,
            kept:S.fixDone && S.fixDone[7], log:S.log[S.log.length - 1].no, msg:S.msgs[S.msgs.length - 1].no}; })()""")
        exp = 9000000 - 595000
        print(ok(r2['type'] == 'plastsjark' and abs(r2['len'] - 9.45) < 0.01), 'the plastsjark is back', {k: r2[k] for k in ('type', 'len')})
        print(ok(r2['kept'] and r2['kept']['kr'] == exp and r2['cash'] - r2['debt'] == -4268 - r2['d0'] + exp), 'the refund pays the loans and the rest to the account', {k: r2[k] for k in ('cash', 'debt', 'd0', 'kept')})
        print(ok(r2['order'] == ['fix_pending', 'save'] and not r2['done']), 'the save did not reach the account: the server is not told', r2['order'])
        print(ok('angret' in r2['log'] and 'plastsjark' in r2['msg'].lower()), 'the log and the message say so', r2['msg'])
        # the next round, the save going through while the game's own autosave moves S.lastReal on (Julian 26.11.2026: the save reached
        # the account, but the game compared S.lastReal after the wait and never told the server): nothing done again, saved and told
        r3 = await pg.evaluate("""(async () => { __calls.length = 0; __saveOk = true; __bump = true; const c0 = S.cash; await fixClaim(); __bump = false;
          const d = __calls.find(c => c[0] === 'fix_done'); return {cash:S.cash - c0, order:__calls.map(c => c[0]), done:d && d[1].done, kr:d && d[1].res.kr}; })()""")
        print(ok(r3['cash'] == 0 and r3['order'] == ['fix_pending', 'save', 'fix_done'] and r3['done'] is True and r3['kr'] == exp), 'next round: saved, then told done, nothing twice', r3)
        # a kyst21 bought again later, the server not told yet: still never twice
        r4 = await pg.evaluate("""(async () => { __calls.length = 0; S.boat.type = 'kyst21'; applyVessel(); const c0 = S.cash; await fixClaim();
          const t = S.boat.type; S.boat.type = 'plastsjark'; applyVessel(); return {cash:S.cash - c0, type:t}; })()""")
        print(ok(r4['cash'] == 0 and r4['type'] == 'kyst21'), 'a kyst21 bought again is not taken back by the same row', r4)
        print(ok(not errs), 'no page errors', errs[:3])
        await br.close()
asyncio.run(main())
