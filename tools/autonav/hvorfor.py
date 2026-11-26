#!/usr/bin/env python3
"""Hvorfor: why the new planner has no bane where the reference has a way (Autonav 2.0 F2, steg 142, punkt 2).

For each stretch and boat given, the bench's own page (benk.js) plans with planBane and finds the reference (BK.fasit). Where the
planner has no bane and the reference has a way, the reference's way is walked 2 m at a time, and at each place two things are asked:
  - the field (the cells the search goes on, 2 m): open to her, or shut by what (grunt, bru, trangt, land);
  - the geometry (farbPose, the check): free with the planner's margins, or what her hull touches, and whether it touches with no
    margin at all.
The runs of places that are shut in either are printed with the least water, distance and deck there, the chart's own depth
(depthNav) beside the map's (farbDepth: the foreshore too), and how far from the ends they are. So each place falls in a class:
the field shuts what the geometry has free (the planner's or the field's fault), the reference goes where the map has too little
water (a channel to dredge, or the reference's own depth that is wrong), or a thing stands there (which, and whose).

    python3 tools/autonav/hvorfor.py --strek id,id [--bat skiff,sjark,kyst21,størst] [--ut FILE.jsonl] [--alle] [--bilde DIR [--radius 80,300]]
(--alle: the walk also where the planner has a bane.) Needs what benk.py needs (dist-vec/ with the whole coast).
"""
import argparse, asyncio, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import benk

WRAP = r"""() => { if (!BK.pb0){ BK.pb0 = planBane; planBane = async (...a) => { const R = await BK.pb0(...a); BK.lastPlan = R; return R; }; } BK.ny = true; }"""
LAST = r"""() => { const R = BK.lastPlan || {}; return {cause:R.cause, at:R.at, tries:R.tries, shut:R.shut, hit:R.hit, decks:R.decks, refined:R.refined, fineN:R.fineN, exp:R.exp, nm:R.nm, path:R.path || (R.bane ? R.bane.Q.map(q => [q[0], q[1]]) : null)}; }"""
# the walk along the reference's way (pts: km). The boat as the planner asks the map for her, the needs of its last search (PLAN.J)
WALK = r"""async (pts) => { const ty = S.boat.type, a = BK.from, boat = planBoat(ty, a.x * 1000, a.y * 1000), J = PLAN.J, F = FARB.F, H = S.t / 60, side = FARB.side, own = BANE.own * boat.L;
  const P = pts.map(p => [p[0] * 1000, p[1] * 1000]), xs = P.map(p => p[0]), zs = P.map(p => p[1]);
  await farbNeed(pts.map(p => ({x:p[0], y:p[1]})), 0.4);
  await farbFieldNeed(Math.min(...xs) - 30, Math.min(...zs) - 30, Math.max(...xs) + 30, Math.max(...zs) + 30, 2);
  const e0 = P[0], e1 = P[P.length - 1], runs = []; let cur = null, s = 0, n = 0;
  const optM = {m:side, keel:FARB.keel, squat:0, boats:true}, opt0 = {m:0, keel:0, squat:0, boats:true};
  for (let i = 0; i + 1 < P.length; i++){ const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], L = Math.hypot(dx, dz), psi = Math.atan2(dx, -dz), st = Math.max(1, Math.ceil(L / 2));
    for (let k = 0; k < st; k++){ const x = P[i][0] + dx * k / st, z = P[i][1] + dz * k / st, sAt = s + L * k / st, f = farbFieldAt(x, z, 2), end = Math.min(Math.hypot(x - e0[0], z - e0[1]), Math.hypot(x - e1[0], z - e1[1]));
      const fs = !f ? 'ingen flis' : f.z !== f.z ? 'ukjent' : f.z * 10 < J.needZ ? (f.d > 0 ? 'grunt' : 'land') : f.u * 4 < J.needU ? 'bru' : f.d / F.q < J.needD2 ? (f.d === 0 ? 'land' : 'trangt') : 'ok';
      let g = null, g0 = null; try { g = farbPose(x, z, psi, boat, H, optM); if (g) g0 = farbPose(x, z, psi, boat, H, opt0); } catch (e){ g = {what:'feil', id:String(e).slice(0, 40)}; }
      const gs = g ? g.what + ':' + g.id + (g0 ? ' (rører)' : ' (margin)') : 'fri', key = fs + ' | ' + gs; n++;
      if (fs === 'ok' && !g){ cur = null; continue; }
      let raw = NaN, dep = NaN; try { raw = farbDepthRaw(x, z); dep = farbDepth(x, z); } catch (e){}
      if (!cur || cur.key !== key || sAt - cur.s1 > 4.1){ cur = {key, s0:Math.round(sAt), s1:sAt, at:[Math.round(x), Math.round(z)], end:Math.round(end), fd:Infinity, fz:Infinity, fu:Infinity, raw:Infinity, dep:Infinity, n:0}; runs.push(cur); }
      cur.s1 = sAt; cur.n++; cur.end = Math.min(cur.end, Math.round(end)); if (f){ if (f.d < cur.fd) cur.fd = f.d; if (f.z < cur.fz) cur.fz = f.z; if (f.u < cur.fu) cur.fu = f.u; } if (raw < cur.raw) cur.raw = raw; if (dep < cur.dep) cur.dep = dep; if (g && g.keel != null) cur.keel = Math.min(cur.keel == null ? 9 : cur.keel, g.keel); }
    s += L; }
  const fx = v => v === Infinity ? null : +v.toFixed(2);
  return {len:Math.round(s), n, boat:{L:boat.L, B:boat.B, T:boat.T, air:+boat.air.toFixed(2)}, need:{clr:+J.clr.toFixed(2), d2:+(J.needD2 * F.q).toFixed(2), z:J.needZ / 10, zf:J.needZf / 10, u:J.needU * 0.25, endR:+J.endR.toFixed(1), own:+own.toFixed(1)},
    runs:runs.map(r => ({key:r.key, s0:r.s0, s1:Math.round(r.s1), at:r.at, end:r.end, fd:fx(r.fd), fz:fx(r.fz), fu:fx(r.fu), raw:fx(r.raw), dep:fx(r.dep), keel:r.keel == null ? null : +r.keel.toFixed(2)}))}; }"""

# a picture of the field round a place ([X, Z] m, R m to each side) as the planner's last search saw it for her: each 2 m cell open
# (blue; pale where her squat makes her go slowly), shut by the water (yellow where the chart alone has enough: the foreshore or a
# breakwater's slope; brown where the chart is too shallow too), by a deck (purple), by the distance (orange), land or a thing
# (dark), not known (red). The reference's way green, the planner's last way dark blue, the ends and their own-berth circles white, the vessels lying still magenta,
# what the check shut red dots, the place itself a red cross. A PNG as a data URL
PIC = r"""async ([at, R, pts, shut, path]) => { const J = PLAN.J, F = FARB.F, c = 2, n = Math.ceil(2 * R / c), px = Math.max(2, Math.floor(900 / n)), x0 = Math.floor((at[0] - R) / c) * c, z0 = Math.floor((at[1] - R) / c) * c;
  await farbNeed([{x:at[0] / 1000, y:at[1] / 1000}], R / 1000 + 0.2); await farbFieldNeed(x0, z0, x0 + n * c, z0 + n * c, 2);
  const cv = document.createElement('canvas'); cv.width = cv.height = n * px; const g = cv.getContext('2d');
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++){ const x = x0 + (i + 0.5) * c, z = z0 + (j + 0.5) * c, f = farbFieldAt(x, z, 2); let col = '#f00';
    if (f && f.z === f.z){ if (f.d === 0) col = '#333'; else if (f.z * 10 < J.needZ){ let raw = 0; try { raw = farbDepthRaw(x, z); } catch (e){} col = raw * 10 >= J.needZ ? '#e8d44d' : '#9a6a2f'; } else if (f.u * 4 < J.needU) col = '#a050d0'; else if (f.d / F.q < J.needD2) col = '#f09030'; else col = f.z * 10 < J.needZf ? '#bfe3f5' : '#6ab7e6'; }
    g.fillStyle = col; g.fillRect(i * px, j * px, px, px); }
  const X = x => (x - x0) / c * px, Z = z => (z - z0) / c * px;
  if (pts){ g.strokeStyle = '#0a0'; g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0] * 1000), Z(p[1] * 1000)) : g.moveTo(X(p[0] * 1000), Z(p[1] * 1000))); g.stroke(); }
  if (path){ g.strokeStyle = '#102a9c'; g.lineWidth = 2; g.beginPath(); path.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke(); }
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; for (const e of [J.a, J.b]){ g.beginPath(); g.arc(X(e[0]), Z(e[1]), J.endR / c * px, 0, 7); g.stroke(); g.beginPath(); g.arc(X(e[0]), Z(e[1]), 3, 0, 7); g.stroke(); }
  try { g.strokeStyle = '#f0f'; for (const o of fixBoats(at[0], at[1])){ g.beginPath(); g.arc(X(o.x), Z(o.z), Math.max(2, (o.r || Math.hypot(o.l || 3, o.w || 1)) / c * px), 0, 7); g.stroke(); } } catch (e){}
  g.fillStyle = '#f00'; for (const s of shut || []){ const m = /@(-?\d+),(-?\d+)/.exec(s); if (m){ g.beginPath(); g.arc(X(+m[1]), Z(+m[2]), 3, 0, 7); g.fill(); } }
  g.strokeStyle = '#f00'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(at[0]) - 8, Z(at[1]) - 8); g.lineTo(X(at[0]) + 8, Z(at[1]) + 8); g.moveTo(X(at[0]) + 8, Z(at[1]) - 8); g.lineTo(X(at[0]) - 8, Z(at[1]) + 8); g.stroke();
  g.fillStyle = '#000'; g.font = '13px sans-serif'; g.fillText(S.boat.type + '  ' + (2 * R) + ' m  trenger z ' + J.needZ / 10 + ' d ' + (J.needD2 * F.q) + ' u ' + J.needU * 0.25, 6, 14);
  return cv.toDataURL('image/png'); }"""


async def run(a):
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')
    src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
    ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}
    exec(compile(src, ns['__file__'], 'exec'), ns)
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    obs_js = open(os.path.join(HERE, 'benkobs.js'), encoding='utf-8').read(); bk_js = open(os.path.join(HERE, 'benk.js'), encoding='utf-8').read()
    S = [s for s in benk.load_list() if s['id'] in a.strek.split(',')]
    boats = a.bat.split(',') if a.bat else benk.BOATS
    async with async_playwright() as p:
        br = await p.chromium.launch(); st = {}

        async def fresh():
            if st.get('pg'):
                try: await st['pg'].context.close()
                except Exception: pass
            pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
            await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
            await pg.evaluate(ns['SETUP'], ['kyst21', 0, True]); await pg.evaluate(obs_js); await pg.evaluate(bk_js); await pg.evaluate(WRAP)
            st['pg'] = pg

        async def ev(js, arg=None, secs=900): return await asyncio.wait_for(st['pg'].evaluate(js, arg), secs)
        await fresh()
        for s in S:
            seen = set()
            for bt in boats:
                R = {'strek': s['id'], 'bat': bt}
                try:
                    await ev("id => { BK.strek = id; BK.lastPlan = null; }", s['id'])
                    pr = await ev(benk.PREP, [s['fra'], s['til'], bt, 3, 225]); R['type'] = pr.get('type')
                    if pr.get('skip'): print('%s %s: %s' % (s['id'], bt, pr['skip']), flush=True); continue
                    if pr['type'] in seen: continue
                    seen.add(pr['type'])
                    ru = await ev(benk.ROUTE, True); R['plan'] = await ev(LAST); R['why'] = ru.get('why'); R['nm'] = ru.get('nm')
                    f = await ev(benk.FASIT, None); R['fasit'] = {k: v for k, v in f.items() if k != 'pts'}
                    if f.get('pts') and (a.alle or not ru.get('nm')):
                        R['walk'] = await ev(WALK, f['pts'])
                    if a.bilde and not ru.get('nm') and R['plan'].get('at'):
                        import base64
                        os.makedirs(a.bilde, exist_ok=True)
                        for rr in [int(v) for v in a.radius.split(',')]:
                            url = await ev(PIC, [R['plan']['at'], rr, f.get('pts'), R['plan'].get('shut'), R['plan'].get('path')])
                            with open(os.path.join(a.bilde, '%s_%s_%d.png' % (s['id'], R['type'], rr)), 'wb') as fb: fb.write(base64.b64decode(url.split(',', 1)[1]))
                except Exception as e:
                    R['feil'] = str(e)[:300]
                    try: await fresh()
                    except Exception: pass
                show(R)
                if a.ut:
                    with open(a.ut, 'a', encoding='utf-8') as fo: fo.write(json.dumps(R, ensure_ascii=False) + '\n')
        await br.close()


def show(R):
    pl = R.get('plan') or {}
    print('\n== %s %s (%s): %s | fasit %s' % (R['strek'], R['bat'], R.get('type'), ('bane %.3f nm' % R['nm']) if R.get('nm') else R.get('why') or R.get('feil'), (R.get('fasit') or {}).get('nm') or (R.get('fasit') or {}).get('why')), flush=True)
    if not R.get('nm'): print('   plan: cause %s, tries %s, hit %s, decks %s, refined %s, fineN %s, shut %s' % (pl.get('cause'), pl.get('tries'), pl.get('hit'), pl.get('decks'), pl.get('refined'), pl.get('fineN'), pl.get('shut')))
    w = R.get('walk')
    if not w: return
    print('   båt %s | trenger %s | fasiten %d m' % (w['boat'], w['need'], w['len']))
    for r in w['runs']:
        print('   %5d–%-5d m (%4d m fra en ende) %-46s felt d %s z %s u %s | kart %s, med fjære %s%s  @%s' % (r['s0'], r['s1'], r['end'], r['key'], r['fd'], r['fz'], r['fu'], r['raw'], r['dep'], (' kjøl %s' % r['keel']) if r.get('keel') is not None else '', r['at']))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--strek', required=True); ap.add_argument('--bat', default=''); ap.add_argument('--ut', default=''); ap.add_argument('--alle', action='store_true')
    ap.add_argument('--bilde', default='', help='a folder for a picture of the field round the place the planner names'); ap.add_argument('--radius', default='80', help='metres to each side of the place in the picture (several: 80,300)')
    asyncio.run(run(ap.parse_args()))
