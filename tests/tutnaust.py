"""«Første tur» where the start's own plant is the home harbour (tilbakemelding #439, 28.11.2026): Father's naust lies in the same harbour
as the plant, and a tap on the chart by the naust on the way in ended the route at the naust's berth (ui/03-map.js, ui/03b-route.js
naustTarget). The guide then said to tap the plant's button in the dock, but the naust has no plant (10c-dock.js), and the chart and
«Kast loss» were shut on that step: nothing to tap, and no way on. Checks: on the way in the route ends at the plant's quay, also when the
tap is on the naust, by hand and with Autonav; and a boat that already lies at the naust with the catch is led to a route over to the
plant's quay, with the chart and «Kast loss» let through. Senja (Botnhamn as the start). LITE. Prints OK or FEIL per check."""
from _env import GAME, boot
import asyncio, json
from playwright.async_api import async_playwright


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:400]) if extra != '' else ''))


# a new game at Botnhamn (the plant is the home harbour), the first trip done up to the step given, the catch aboard
SETUP = """(async upto => { const pt = portById('botnhamn'); S.home = pt.id; S.naust = null;
  for (let i = 0; i < 120 && !quayFace(pt.id, 'naust'); i++){ naustSite(); await new Promise(r => setTimeout(r, 100)); }
  const ids = TSTEPS.map(s => s.id), m = {}; for (const id of ids.slice(0, ids.indexOf(upto) + 1)) m[id] = 1;
  S.tut = {v:2, m, catch:false, pAt:Date.now(), land:pt.id}; const b = S.boat;
  b.land = null; b.landQ = null; b.tutWait = 0; b.v = 0; b.shift = null; b.fueling = null; S.plan = null; S.draft = []; draftForget(true);
  S.hold = [{sp:'torsk', kg:300, cls:'m', t:S.t}];
  const nb = berthPose(pt.id, b.type, 'naust'); return {naust:!!quayFace(pt.id, 'naust'), nb:nb ? {x:nb.x, y:nb.y} : null}; })"""


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--disable-gpu-compositing'])
        ctx = await br.new_context(viewport={'width': 1100, 'height': 800}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg, GAME); await pg.wait_for_timeout(600)
        # 1. on the way in, lying at sea on the first trip's grounds: a tap on the naust's berth ends the route at the plant's quay
        s = await pg.evaluate(SETUP + "('full')")
        check(s['naust'] and s['nb'], 'Father\'s naust is found in Botnhamn', s)
        if not s['nb']:
            print('errors:', errs[:3]); await br.close(); return
        a = await pg.evaluate("""(async () => { const b = S.boat, q = portById('botnhamn').p; b.status = 'idle'; b.port = null; b.berth = null; const g = tutField().p; b.pos = {x:g.x, y:g.y};
          // the chart zoomed out so far that the tap's reach takes in the harbour point too (as in the guide's ring round the plant):
          // the tap is on the naust's berth, nearer it than the harbour point
          const nb = berthPose('botnhamn', b.type, 'naust'), dq = dist(nb, q); setTab('route'); view.px = 22 / Math.max(0.05, dq * 1.5); LEIA_ARM = false; tutUpdate();
          const step = (tutStep() || {}).id, nt = naustTarget({x:nb.x, y:nb.y}, 22 / view.px);
          addWaypoint({x:nb.x, y:nb.y}); const e = S.draft[S.draft.length - 1] || {};
          return {step, nt:!!nt, dq:Math.round(dq * 1000), n:S.draft.length, port:e.port || null, berth:e.berth || null}; })()""")
        check(a['step'] == 'route2' and a['nt'] and a['port'] == 'botnhamn' and a['berth'] != 'naust',
              'on the way in, a tap by hand on the naust ends the route at the plant\'s quay', a)
        b = await pg.evaluate("""(async () => { S.draft = []; draftForget(true); const b = S.boat, nb = berthPose('botnhamn', b.type, 'naust');
          const ts = [], T0 = toast; toast = m => { ts.push(String(m)); };
          try { await leiaTo({x:nb.x, y:nb.y}); } catch (e){ toast = T0; return {err:String(e && e.message)}; } toast = T0;
          const e = S.draft[S.draft.length - 1] || {}; return {n:S.draft.length, port:e.port || null, berth:e.berth || null, toasts:ts}; })()""")
        check(b.get('port') == 'botnhamn' and b.get('berth') != 'naust', 'on the way in, Autonav to the naust ends the route at the plant\'s quay', b)
        # 2. already at the naust with the catch (a game from before the fix): the guide leads over to the plant's quay
        await pg.evaluate(SETUP + "('cast2')")
        c = await pg.evaluate("""(() => { const b = S.boat, pt = portById('botnhamn'); b.status = 'port'; b.port = pt.id; b.berth = 'naust'; b.pos = {x:pt.p.x, y:pt.p.y};
          if (DOCK.page) DOCK.close(); PHONE.show(false); DOCK.render(); tutUpdate(); const st = tutStep(), T = st && tutTip(st);
          return {step:st && st.id, kind:berthKind(b), dock:DOCK.items().map(x => x.id), el:T && T.el ? (T.el.id || T.el.className) : null, tip:T && T.no,
            wp:tutAllow('waypoint')}; })()""")
        check(c['step'] == 'land' and c['kind'] == 'naust' and c['el'] and c['wp'],
              'at the naust with the catch: the guide points at something there, and the chart may be used for the way to the plant', c)
        d = await pg.evaluate("""(async () => { S.draft = []; draftForget(true); const q = portById('botnhamn').p, ts = [], T0 = toast; toast = m => { ts.push(String(m)); };
          try { await leiaTo({x:q.x, y:q.y}); } catch (e){ ts.push(String(e && e.message)); } toast = T0; const e = S.draft[S.draft.length - 1] || {};
          return {n:S.draft.length, port:e.port || null, berth:e.berth || null, toasts:ts, start:tutAllow('start')}; })()""")
        check(d['port'] == 'botnhamn' and d['berth'] != 'naust' and d['start'], 'from the naust, Autonav to the plant makes the route over to its quay, and «Kast loss» is let through', d)
        print('errors:', errs[:3]); await br.close()

asyncio.run(main())
