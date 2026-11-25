"""The card «Dette endrer seg» promises what the purchase does (steg 151, K3 of docs/planer/regler-i-klartekst.md). For each way to buy,
rmBuy (core/03l-room.js) is read first, then the purchase is made through the game's own actions (buy and buylic in ui/phone/14-act.js,
kmApply for a right from the quota market, mbUnpack for the broker's boat), and the group, the cod limit and the cod counted as fished
are compared with what the card said. And on the yard's sheets: the card stands over the button with the seller's share of the year's
quota, a boat without a right has the red card, a purchase that takes access asks first, and a grey button says why. Prints OK or FEIL."""
from _env import GAME, boot
import asyncio, json, os
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'k3')


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:420]) if extra != '' else ''))


# a fresh company at a yard: the wooden boat in the open group with 900 kg of cod landed this year, blad B, money and three landing notes
BASE = """(() => { window.ASK = []; window.confirm = q => { ASK.push(String(q)); return true; }; const s0 = S.qseed; S.tut = 0; S.cash = 5e7; S.loan = null; S.loanIN = null; S.inUsed = false; S.order = null; S.company = '';
  S.fm = {n:20, last:-1, kr:5e5, b:true}; S.sales = [{t:0, total:1}, {t:1, total:1}, {t:2, total:1}]; S.fleet.length = 1; bindVessel(S.fleet[0]); S.me = S.cur; S.openUsed = null; S.licFree = [];
  const b = S.boat, Y = PORTS.find(q => q.sted === 'verft'); b.status = 'port'; b.port = Y.id; b.pos = {...Y.p}; b.type = 'trebat'; b.sale = null; applyVessel(); S.lic = null; S.hold = []; S.crew = []; S.tripOwner = true; S.plan = null;
  const q = freshQuota(); q.torsk = 900; return 1; })()"""
STATE = "(v => withVessel(v, () => ({acc:access(), limit:Math.round(codLimitNow(S.t / 60)), used:Math.round(quotaState().torsk || 0), type:S.boat.type})))"
PRED = "(R => R && R.after ? {acc:R.after.acc, limit:Math.round(R.after.limit), used:Math.round(R.after.used), loses:R.loses, seller:R.seller, lost:!!R.lost, now:R.now && R.now.acc} : R)"
CASES = {
    'verftet, hjemmel med innbytte': "(() => { const P = %s(rmBuy({kind:'lic', id:'u7', type:'trebat', ti:true})); PHONE.dact('rederi', 'buylic', {id:'u7', ti:'1'}); return {P, G:%s(curVessel())}; })()",
    'verftet, hjemmel til flåten': "(() => { const ov0 = openVesselId(), P = %s(rmBuy({kind:'lic', id:'h7', type:'snekke', ti:false})); PHONE.dact('rederi', 'buylic', {id:'h7', ti:'0'}); const v = S.fleet[S.fleet.length - 1]; return {P, G:%s(v), ov:openVesselId(), ov0, n:S.fleet.length}; })()",
    'verftet, kystbåt uten hjemmel i bytte': "(() => { const P = %s(rmBuy({kind:'hull', type:'kyst15', ti:true})); PHONE.dact('rederi', 'buy', {k:'kyst15', ti:'1'}); return {P, G:%s(curVessel()), ask:ASK.length}; })()",
    'verftet, større båt i åpen gruppe i bytte': "(() => { const P = %s(rmBuy({kind:'hull', type:'plastsjark', ti:true})); PHONE.dact('rederi', 'buy', {k:'plastsjark', ti:'1'}); return {P, G:%s(curVessel()), ask:ASK.length}; })()",
    'verftet, kystbåt uten hjemmel til flåten': "(() => { const P = %s(rmBuy({kind:'hull', type:'kyst15', ti:false})); PHONE.dact('rederi', 'buy', {k:'kyst15', ti:'0'}); const v = S.fleet[S.fleet.length - 1]; return {P, G:%s(v), ov:openVesselId(), n:S.fleet.length}; })()",
    'Kvotemarkedet, hjemmel med strukturkvote satt på': "(() => { const v = newVesselObj('kyst15', S.boat.port), y = yearH(S.t / 60), it = {kind:'right', id:'h14', flen:14.9, st:[{id:'h14', kf:4.7, from:y, until:y + 20}], used:{torsk:7000, hyse:0, sei:0}, y}; const P = %s(rmBuy({kind:'right', id:it.id, st:it.st, used:it.used, y, v})); kmApply(it, {v, how:'put'}); return {P, G:%s(v), ov:openVesselId()}; })()",
    'megleren, båt med hjemmel': "(() => { const lic = {id:'h9', hl:HJ.h9.hl, since:2026, st:[]}; licExtra(lic); const pk = {type:'sjark', lic, quota:{y:yearH(S.t / 60), torsk:4000, hyse:0, sei:0}}; const P = %s(rmBuy({kind:'boat', type:pk.type, lic:pk.lic, quota:pk.quota})); const v = mbUnpack(pk, S.boat.port); return {P, G:%s(v), ov:openVesselId()}; })()",
}
SHEET = """((tab, sel) => { const tap = q => { const e = document.querySelector('#drawerBody ' + q); if (e) e.click(); return !!e; }; DOCK.open('fartoy'); tap('[data-pa=mksel]:not([data-k])'); tap('[data-pa=mktab][data-s=' + tab + ']'); tap(sel);
  const cs = [...document.querySelectorAll('#drawerBody .ph-card.chg')], bt = document.querySelector('#drawerBody [data-ti="1"]'), wb = document.querySelector('#drawerBody .whybox');
  const c0 = cs[0], pos = c0 && bt ? c0.compareDocumentPosition(bt) & 4 : 0;
  return {n:cs.length, txt:c0 ? c0.textContent : '', bad:cs.map(c => c.classList.contains('bad')), over:!!pos, grey:bt ? bt.disabled : null, why:wb ? wb.dataset.why + ': ' + wb.textContent : null, loses:cs.map(c => (c.querySelector('[data-loses]') || {}).textContent || '')}; })"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        errs = []
        pg = await br.new_page(viewport={'width': 800, 'height': 1280}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); await boot(pg, GAME)
        for name, js in CASES.items():
            await pg.evaluate(BASE)
            r = await pg.evaluate(js % (PRED, STATE)); P, G = r['P'], r['G']
            same = P and G and P['acc'] == G['acc'] and (P['acc'] == 'none' or (abs(P['limit'] - G['limit']) <= 1 and abs(P['used'] - G['used']) <= 1))
            check(same, name + ': the card and the purchase agree on the group, the limit and the cod fished', r)
            if 'ov' in r:
                check((P['loses'] is None and r['ov'] is not None) or (P['loses'] is not None and r['ov'] is None), name + ': and on whether the open-group boat loses her place', {'loses': P['loses'], 'ov': r['ov']})
            if name.startswith('verftet, kystbåt uten hjemmel i bytte'):
                check(r['ask'] == 1 and P['now'] == 'open', name + ': the purchase asked first (it takes access)', r['ask'])
            if 'større båt' in name:
                check(r['ask'] == 0, name + ': no question when nothing is taken', r['ask'])
        # the sheets, in both formats
        for nm, (w, h) in {'staaende': (800, 1280), 'liggende': (1280, 800)}.items():
            await pg.close(); pg = await br.new_page(viewport={'width': w, 'height': h}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); await boot(pg, GAME); await pg.evaluate(BASE)   # (a fresh page: no purchase moment over the sheet)
            s = await pg.evaluate(SHEET + "('lic', '[data-pa=mksel][data-k=trebat][data-o=u7]')")
            check(s['n'] == 2 and s['over'] and 'selgeren har fisket' in s['txt'] and 'egen kvote (lukket gruppe)' in s['txt'] and 'felleskvoten for småbåter (åpen gruppe)' in s['txt'], nm + ': the yard, a boat with a right: the card over the button, with the seller\'s share and the plain words', s['txt'][:260])
            check(s['loses'][1] != '' and s['loses'][0] == '', nm + ': for the fleet the card says the open-group boat loses her place; traded in it does not', s['loses'])
            await pg.evaluate("(() => { const e = document.querySelector('#drawerBody .ph-card.chg'); if (e) e.scrollIntoView({block:'start'}); })()"); await pg.wait_for_timeout(250); await pg.screenshot(path=os.path.join(OUT, 'verft-hjemmel-%s.png' % nm))
            s = await pg.evaluate(SHEET + "('kyst', '[data-pa=mksel][data-k=kyst15]:not([data-o])')")
            check(s['n'] == 2 and all(s['bad']) and 'bare ta torsk, hyse og sei som bifangst' in s['txt'], nm + ': the yard, a coastal vessel without a right: the red card says bycatch only', [s['bad'], s['txt'][:160]])
            await pg.evaluate("(() => { const e = document.querySelector('#drawerBody .ph-card.chg'); if (e) e.scrollIntoView({block:'start'}); })()"); await pg.wait_for_timeout(250); await pg.screenshot(path=os.path.join(OUT, 'verft-uten-%s.png' % nm))
            await pg.evaluate("(() => { S.sales = [{t:0, total:1}]; S.cash = 1000; })()")
            s = await pg.evaluate(SHEET + "('open', '[data-pa=mksel][data-k=snekke]:not([data-o])')")
            check(s['grey'] is True and s['why'] is not None and s['why'].startswith('notes') and 'Du har 1' in s['why'] and '2 ganger' in s['why'], nm + ': a grey button says why, with the figures and what to do', s['why'])
            await pg.evaluate("(() => { const e = document.querySelector('#drawerBody .whybox'); if (e) e.scrollIntoView({block:'center'}); })()"); await pg.wait_for_timeout(250); await pg.screenshot(path=os.path.join(OUT, 'verft-hvorfor-%s.png' % nm))
            await pg.evaluate("DOCK.close()")
        # the fleet app says each boat's group
        await pg.evaluate(BASE); fl = await pg.evaluate("(() => { newVesselObj('kyst15', S.boat.port); PHONE.open('rederi'); const t = document.getElementById('phone').textContent; PHONE.show(false); return t; })()")
        check('felleskvoten for småbåter (åpen gruppe)' in fl and 'ingen kvote: bare bifangst' in fl, 'Rederi says each boat\'s group', fl[:0])
        print('errors:', errs[:5]); await br.close()

asyncio.run(main())
