"""The operations plan's page (ui/05d-plan2.js), Driftsplan 3 since DP3-3 (docs/planer/driftsplan-3.md, 16.11.2026): two choices, Sted (a
ring on the chart) and Redskap (only what is aboard, with the bait, the line's kind or the jig's tackle under it), then Start from anywhere
(plan3Make), «Nå», what the plan chose, the day with the search, the statistics and Slett. Without 3D. The checks: the intro, a new plan with
only the two rows, the gear aboard and nothing else, the bait and the line's kind, a ring on land refused and one in the sea set, Start from
port and from the sea, the place and the gear locked while the plan runs and changed after a pause (what the plan found goes), an old v4
plan switched off when the page is opened, and Slett. Screenshots in 800×1280 and 1280×800 go to tests/out/."""
from _env import GAME, boot
import asyncio, json, os
from playwright.async_api import async_playwright
ok = lambda c: 'OK  ' if c else 'FEIL'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

JS = r"""(async () => { TAB.held = true;
  const R = {}; S.tut = 0; S.settings.lang = 'no'; S.lang = 'no'; window.confirm = () => true;
  const b = S.boat, HP = portById('husoy'); b.type = 'sjark'; applyVessel(); b.status = 'port'; b.port = 'husoy'; b.pos = {...HP.p}; S.plan = null; S.ops = null; S.draft = []; S.me = S.cur; S.cash = 500000; S.sets = [];
  S.crew = [Object.assign(genCrew(), {bi:false, off:false, name:'Ole Mikalsen', known:[true, true]}), Object.assign(genCrew(), {bi:false, off:false, name:'Per Hansen', known:[true, true]})];
  S.equip.linehaler = true; S.pgear.kits.n = 6; const LN = S.pgear.lines.hyse; LN.n = 8; LN.baited = 8; LN.bt = {makrell:8}; S.pgear.nets = []; S.pgear.pots.big = 0;
  await mapNeed(HP.p, 14);
  const page = () => PHONE.page('drift'), act = (a, d) => PHONE.dact('drift', a, d || {}), text = () => { const d = document.createElement('div'); d.innerHTML = page(); return d.innerText.replace(/\s+/g, ' '); };
  const put = p => new Promise(res => PLAN2UI.ringPut(S.ops, p, res));
  R.intro = page().includes('p2-new') && /to ting/.test(text()) && /stedet, en ring i kartet, og redskapet/.test(text());
  // a new plan: v5, no ring, the two rows only, and the reason it is not ready
  act('p2-new'); const o = S.ops; const t1 = text();
  R.fresh = {v:o.v, ring:o.ring, rows:['Sted', 'Redskap'].every(k => page().includes('<span class="dr-rl">' + k + '</span>')), old:['Hjem', 'Plasser', 'Levering', 'Vær', 'Rytme', 'Mannskap'].filter(k => page().includes('<span class="dr-rl">' + k + '</span>')), notReady:/Ikke klar ennå/.test(t1) && /Velg et sted/.test(t1), rest:/Resten finner planen selv/.test(t1)};
  // the gear: only what is aboard (the jig and the line, no nets, no pots), the bait and the line's kind under the line
  act('p2-row', {k:'gear'}); const g1 = page(); R.gearAboard = {juksa:g1.includes('data-g="juksa"'), line:g1.includes('data-g="line"'), garn:g1.includes('data-g="garn"'), teiner:g1.includes('data-g="teiner"')};
  act('p2-g3', {g:'line'}); act('p2-bait3', {v:'sild'}); const g2 = page(); R.line = {rig:o.rig, bait:o.bait, lk:o.lk, baitRow:g2.includes('data-pa="p2-bait3"'), lkRow:g2.includes('data-pa="p2-lk3"'), val:/Line · agn: sild og lodde/.test(text())};
  const BK = S.pgear.lines.bank; BK.n = 6; BK.baited = 6; BK.bt = {makrell:6}; act('p2-lk3', {v:'bank'}); R.lk2 = {lk:o.lk, row:page().includes('data-pa="p2-lk3"')}; act('p2-lk3', {v:'hyse'}); BK.n = 0; BK.baited = 0; BK.bt = {};
  // the ring: on land refused with the reason, in the sea set (its size the line's, 2 nm)
  let land = null; for (let r = 1; r < 25 && !land; r += 0.5) for (let a = 0; a < 36 && !land; a++){ const q = {x:HP.p.x + r * Math.sin(a * 0.1745), y:HP.p.y - r * Math.cos(a * 0.1745)}; try { await mapNeed(q, 3); let all = isLand(q); for (let k = 0; k < 12 && all; k++) all = isLand({x:q.x + 2.1 * Math.sin(k * 0.5236), y:q.y - 2.1 * Math.cos(k * 0.5236)}) && isLand({x:q.x + 1.1 * Math.sin(k * 0.5236), y:q.y - 1.1 * Math.cos(k * 0.5236)}); if (all) land = q; } catch (e){} }
  R.landWhy = land ? await put(land) : 'ingen landpunkt'; R.landRing = o.ring;
  let sea = null; for (let r = 4; r < 12 && !sea; r += 0.5) for (let a = 0; a < 24 && !sea; a++){ const q = {x:HP.p.x + r * Math.sin(a * 0.26), y:HP.p.y - r * Math.cos(a * 0.26)}; try { if (!isLand(q) && depthF(q) > 40 && coastDist(q) > 0.8) sea = q; } catch (e){} }
  R.seaWhy = await put(sea); const t2 = text(); R.ring = o.ring && {r:+o.ring.r.toFixed(3), want:+(DRP3.ring.line * NM / 2).toFixed(3)}; R.sted = /Sted\s*Ved [^·]+· 2,0 nm ring · [\d,]+ nm unna/.test(t2); R.ready = /Start planen/.test(t2) && !/Ikke klar ennå/.test(t2);
  // Start from port: made with plan3Make, on; what the plan chose, the day with the search, and «Nå»
  act('p2-start'); for (let k = 0; k < 400 && !o.on; k++) await new Promise(r => setTimeout(r, 100)); R.on = {on:o.on, made:plan2Made(o), err:o.err, home:o.home, M:o.M, places:o.places.length};
  for (let i = 0; i < 30; i++){ DYN.on = false; step(); }
  const t3 = text(); R.chosen = ['Planen valgte', 'Hjem', 'Levering', 'Rytme', 'Vær', 'Fører båten', 'Søket'].every(k => t3.includes(k)); R.day = /I dag/.test(t3) && /Søker etter fisken i ringen/.test(t3); R.now = (t3.match(/Nå: [^.]*?(?=Sted|$)/) || [''])[0].slice(0, 160);
  R.noEstimate = !/forventet|ventet fangst/i.test(t3);
  // locked while she runs: the gear row says so and a change is refused
  if (!/Ett redskap|Sett planen på pause for å bytte/.test(text())) act('p2-row', {k:'gear'}); R.locked = {said:/Sett planen på pause for å bytte redskap/.test(text()), refused:PLAN2UI.act('p2-g3', {g:'juksa'}) === false && o.rig === 'line'};
  // after a pause the gear changes, and what the plan found goes (found again at the next Start)
  act('p2-pause'); act('p2-g3', {g:'juksa'}); R.changed = {rig:o.rig, places:o.places.length, made:!!o.made, r:+(o.ring ? o.ring.r : 0).toFixed(3), want:+(DRP3.ring.juksa * NM / 2).toFixed(3)};
  act('p2-g3', {g:'line'}); act('p2-bait3', {v:'sild'});
  // Start from the sea: the boat lies at sea, out of port
  { b.status = 'idle'; b.port = null; b.pos = {x:sea.x + 1.5, y:sea.y}; S.plan = null; await mapNeed(b.pos, 6); act('p2-start'); for (let k = 0; k < 400 && !o.on; k++) await new Promise(r => setTimeout(r, 100)); R.sea = {on:o.on, err:o.err, places:o.places.length}; }
  // the statistics, then Slett from the game's own dialog
  o.stats.days.push({d:gDate(S.t / 60).toISOString().slice(0, 10), trips:1, kg:312, kr:5400, lott:1800, cost:600, conf:0, sp:{torsk:280, hyse:32}, port:{[o.M]:312}}); R.stats = page().includes('p2-stat') && /Torsk \d+ %/.test(text());
  act('p2-pause'); act('p2-reset'); await new Promise(r => setTimeout(r, 200)); const del = document.getElementById('p2Del'); R.delDialog = !!del && /Stedet, redskapet og statistikken/.test(document.getElementById('modal').innerText); if (del) del.click(); R.deleted = S.ops === null;
  // an old v4 plan when the page opens: switched off with a word (plan3Retire), and the intro is shown
  { b.status = 'port'; b.port = 'husoy'; b.pos = {...HP.p}; S.plan = null; S.sets = []; const v4 = plan2New({home:'husoy', rig:'line', places:[]}); v4.on = false; S.ops = v4; const n0 = S.msgs.length; const p = page();
    R.v4 = {gone:S.ops === null, intro:p.includes('p2-new'), msg:(S.msgs.slice(n0).map(m => m.no).join(' ') || '').slice(0, 160)}; }
  // a page ready for the screenshots: the plan again, started, a few minutes on
  act('p2-new'); act('p2-g3', {g:'line'}); await put(sea); act('p2-start'); for (let k = 0; k < 400 && !S.ops.on; k++) await new Promise(r => setTimeout(r, 100)); for (let i = 0; i < 30; i++){ DYN.on = false; step(); }
  TAB.held = false; lastWall = Date.now(); return R; })()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 900, 'height': 900}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await boot(pg)
        r = await pg.evaluate(JS)
        print(json.dumps(r, ensure_ascii=False)[:2500])
        f = r['fresh']
        print(ok(r['intro']), 'with no plan: the intro says the two choices and the button makes one')
        print(ok(f['v'] == 5 and f['ring'] is None and f['rows'] and not f['old'] and f['notReady'] and f['rest']), 'a new plan: v5 with only Sted and Redskap, not ready until a place is chosen, and the rest the plan finds itself', f)
        g = r['gearAboard']; print(ok(g['juksa'] and g['line'] and not g['garn'] and not g['teiner']), 'Redskap offers only what is aboard (the jig and the line here)', g)
        L = r['line']; print(ok(L['rig'] == 'line' and L['bait'] == 'sild' and L['lk'] == 'hyse' and L['baitRow'] and not L['lkRow'] and L['val']), 'the line with its bait; no choice of the line\'s kind with one kind aboard', L)
        print(ok(r['lk2']['row'] and r['lk2']['lk'] == 'bank'), 'with both kinds of line aboard, the kind is chosen under the line', r['lk2'])
        print(ok(isinstance(r['landWhy'], str) and 'Flytt ringen' in r['landWhy'] and r['landRing'] is None), 'a ring on land is refused with the reason', r['landWhy'])
        print(ok(r['seaWhy'] is None and r['ring'] and abs(r['ring']['r'] - r['ring']['want']) < 1e-3 and r['sted'] and r['ready']), 'a ring in the sea is set, 2 nm across for the line, named by the place and its distance; the plan is ready', [r['seaWhy'], r['ring'], r['sted'], r['ready']])
        o = r['on']; print(ok(o['on'] and o['made'] and o['home'] and o['M'] and o['places'] >= 1), 'Start from port makes the plan (plan3Make) and switches it on', o)
        print(ok(r['chosen'] and r['day'] and 'Nå:' in r['now'] and r['noEstimate']), 'the page says what the plan chose and the day with the search, «Nå», and no expected catch', [r['chosen'], r['day'], r['now']])
        print(ok(r['locked']['said'] and r['locked']['refused']), 'while the plan runs, the gear cannot be changed and the page says why', r['locked'])
        c = r['changed']; print(ok(c['rig'] == 'juksa' and c['places'] == 0 and not c['made'] and abs(c['r'] - c['want']) < 1e-3), 'after a pause the gear changes: what the plan found goes, and the ring takes the jig\'s size', c)
        print(ok(r['sea']['on'] and r['sea']['places'] >= 1), 'Start from the sea, out of port', r['sea'])
        print(ok(r['stats'] and r['delDialog'] and r['deleted']), 'the statistics, and Slett through the game\'s dialog', [r['stats'], r['delDialog'], r['deleted']])
        v = r['v4']; print(ok(v['gone'] and v['intro'] and 'Lag en ny driftsplan' in v['msg']), 'an old v4 plan is switched off with a word when the page opens, and the intro is shown', v)
        # the page in both formats: no sideways overflow, the buttons at least 44 px high
        for w, h in [(800, 1280), (1280, 800)]:
            await pg.set_viewport_size({'width': w, 'height': h})
            await pg.evaluate("DOCK.open('drift')"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=os.path.join(OUT, 'driftsplan2ui-%dx%d.png' % (w, h)))
            await pg.evaluate("PHONE.dact('drift', 'p2-row', {k:'gear'}); DOCK.open('drift')"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=os.path.join(OUT, 'driftsplan2ui-%dx%d-redskap.png' % (w, h)))
            ov = await pg.evaluate("(() => { const d = document.getElementById('drawerBody'), small = [...d.querySelectorAll('button')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 43.5).map(e => e.textContent.trim().slice(0, 30)); return {w:d.scrollWidth, cw:d.clientWidth, small}; })()")
            print(ok(ov['cw'] > 0 and ov['w'] <= ov['cw'] + 1 and not ov['small']), 'no sideways overflow and no button under 44 px at %d×%d' % (w, h), ov)
            await pg.evaluate("PHONE.dact('drift', 'p2-row', {k:'gear'}); DOCK.close()")
        print('sidefeil:', errs[:4]); await b.close()
asyncio.run(main())
