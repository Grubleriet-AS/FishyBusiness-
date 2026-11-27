#!/usr/bin/env python3
"""Rennene: the channels dredged along the coast for the boats a place takes (Autonav 2.0 F2, steg 142; Jonas' choice 5, 23.11.2026:
«Tilpass havna»; docs/planer/autonav-2-0.md, «Rennene»).

Where the reference has a way and the planner none because the water is too shallow as the 3D view draws it (the foreshore across
a narrow mouth, a yard's basin in water shallower than the boats it takes draw), the harbour is dredged. Where to dig is the
planner's own answer (17c-plan.js planDig): its search with the water left out goes where the least is to be dug, the check takes
the land and the things as ever, and the pieces of that way where her hull has too little water are the channel. It is dug for the
biggest boat the two places take, so every smaller one has it too.

The places are tools/autonav/renner-steder.json: [{"id": the channel's key, "strek": a stretch of the bench's list
(strekninger.json)}]. For each, on the bench's own page: the channels that are there are taken away, and the bench's boats are
taken in turn, the biggest the two places take first. Where a boat has no bane with what is dug so far, planDig finds her
channel, it is dug (farbDig), and the planner must then find her a bane, or the channel is not kept. So the first channel is
the biggest boat's, and a smaller one gets her own (key id/type) only where she goes another way: a yard's basin may have one
mouth for the small boats and another way out for the big. What comes out is src/data/renner.json, which 17-farbar.js digs
into the map as it is read.

    python3 tools/autonav/renner.py [--bare id,id] [--dry]       (the places in the list, or some of them; the others are kept)
    python3 tools/autonav/renner.py --tom                          (an empty file, for a first build)
Needs what benk.py needs (dist-vec/ with the whole coast). After it: KYST_VEC=1 KYST_DIST=dist-vec node build.mjs, and the bench.
The 3D view does not dig these yet: docs/spill-dette/142.md.
"""
import argparse, asyncio, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'src', 'data', 'renner.json'); LIST = os.path.join(HERE, 'renner-steder.json')
sys.path.insert(0, HERE)
import benk

# the page side: where she is to go (the naust's own target, as BK.route has it), the channel, and the bane with it dug
DIG = r"""async (key) => { const Z = BK.Z, b = S.boat; let nt = null; if (Z.kind === 'naust'){ nt = naustTarget(berthPose(Z.id, b.type, 'naust') || Z.p, 0.5); if (!nt) return {why:'the naust is not a place to go for her'}; }
  const to = nt ? {x:nt.x, y:nt.y} : Z.p; BK.to2 = to; farbDig('renne:' + key, null);
  const R = await planDig(BK.from, to, null, {kn:BOAT.vmax}); if (!R.segs) return {why:String(R.why ? R.why[0] : 'none'), cause:R.cause, at:R.at};
  if (R.segs.length) farbDig('renne:' + key, R.segs.map(q => ({ax:q[0], az:q[1], bx:q[2], bz:q[3], r:q[4], d:q[5]})));
  const V = await planBane(BK.from, to, null, {kn:BOAT.vmax});
  return {segs:R.segs, dug:R.dug, digNm:+R.nm.toFixed(3), nm:V.bane ? +V.nm.toFixed(3) : null, why:V.bane ? null : String(V.why ? V.why[0] : 'none'), cause:V.cause, at:V.at, type:b.type}; }"""
TRY = r"""async () => { const Z = BK.Z, b = S.boat; let nt = null; if (Z.kind === 'naust'){ nt = naustTarget(berthPose(Z.id, b.type, 'naust') || Z.p, 0.5); if (!nt) return {why:'naustTarget'}; }
  const V = await planBane(BK.from, nt ? {x:nt.x, y:nt.y} : Z.p, null, {kn:BOAT.vmax}); return {nm:V.bane ? +V.nm.toFixed(3) : null, why:V.bane ? null : String(V.why ? V.why[0] : 'none')}; }"""


def write(D):
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('{"v":1,"renner":{' + ','.join('\n%s:%s' % (json.dumps(k, ensure_ascii=False), json.dumps(D[k], ensure_ascii=False, separators=(',', ':'))) for k in sorted(D)) + '\n}}\n')


async def run(a):
    if a.tom: write({}); print('renner: tom fil skrevet'); return
    jobs = json.load(open(LIST, encoding='utf-8'))
    if a.bare: jobs = [j for j in jobs if j['id'] in a.bare.split(',')]
    D = json.load(open(OUT, encoding='utf-8'))['renner'] if os.path.exists(OUT) else {}
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')
    src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
    ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}
    exec(compile(src, ns['__file__'], 'exec'), ns)
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    S = {s['id']: s for s in benk.load_list()}
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
        await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
        await pg.evaluate(ns['SETUP'], ['kyst21', 0, True]); await pg.evaluate(open(os.path.join(HERE, 'benkobs.js'), encoding='utf-8').read()); await pg.evaluate(open(os.path.join(HERE, 'benk.js'), encoding='utf-8').read())
        await pg.evaluate("() => { BK.ny = true; }")
        for j in jobs:
            s = S[j['strek']]; key = j['id']
            try:
                await pg.evaluate("id => { BK.strek = id; }", s['id'])
                # each of the bench's boats, the biggest first: a channel of her own only where the ones dug so far give her no bane
                # (a yard's basin may have one mouth for the small boats and another way out for the big)
                for kk in [x for x in D if x == key or x.startswith(key + '/')]: D.pop(kk)
                await pg.evaluate("key => { for (const k of [...FARB.dug.keys()]) if (k === 'renne:' + key || k.startsWith('renne:' + key + '/')) farbDig(k, null); }", key)
                seen = set(); line = []
                for bt in (j.get('bater') or ['størst', 'kyst21', 'sjark', 'skiff']):
                    pr = await pg.evaluate(benk.PREP, [s['fra'], s['til'], bt, 3, 225])
                    if pr.get('skip') or pr['type'] in seen: continue
                    seen.add(pr['type']); v = await asyncio.wait_for(pg.evaluate(TRY), 900)
                    if v.get('nm'): line.append('%s %.2f nm' % (pr['type'], v['nm'])); continue
                    k2 = key if not any(x == key for x in D) else key + '/' + pr['type']
                    r = await asyncio.wait_for(pg.evaluate(DIG, k2), 900)
                    if not r.get('segs'): line.append('%s INGEN VEI Å GRAVE (%s)' % (pr['type'], r.get('why'))); continue
                    if not r.get('nm'):
                        line.append('%s gravd %d m, FORTSATT INGEN BANE (%s)' % (pr['type'], r['dug'], r.get('why'))); await pg.evaluate("k => farbDig('renne:' + k, null)", k2); continue
                    D[k2] = {'for': pr['type'], 'navn': s['navn'], 'strek': s['id'], 'segs': r['segs']}
                    line.append('%s GRAVD %d m i %d stykker, %.1f m bred, %.2f m dyp: %.2f nm' % (pr['type'], r['dug'], len(r['segs']), 2 * r['segs'][0][4], r['segs'][0][5], r['nm']))
                print('%s: %s' % (key, '; '.join(line)), flush=True)
            except Exception as e:
                print('%s: feil: %s' % (key, str(e)[:300]), flush=True)
        await br.close()
    if a.dry: print('renner: --dry, ingenting skrevet'); return
    write(D); print('renner: %d renner, %d stykker i %s' % (len(D), sum(len(v['segs']) for v in D.values()), os.path.relpath(OUT, ROOT)))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--bare', default=''); ap.add_argument('--dry', action='store_true'); ap.add_argument('--tom', action='store_true')
    asyncio.run(run(ap.parse_args()))
