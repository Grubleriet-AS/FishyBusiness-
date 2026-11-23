#!/usr/bin/env python3
"""Farsjekken: the map of what a boat can sail over and under (src/js/core/17-farbar.js) held against the bench's observer (Autonav 2.0
F1, steg 141; docs/planer/autonav-2-0.md). The observer (benkobs.js, benk.js) reads the raw data itself and is what counts the old
Autonav's touches on the bench; the map is what Autonav 2.0's planner and steering are to ask. If the map says «free» where the
observer sees a touch, the new Autonav would be sent there with a clear conscience, so that must never happen.

For each stretch and boat of a bench run (its turer.jsonl: the route that was sailed and the reference's way), hull poses are taken
along the lines, in a strip of 150 m to each side with any heading, and at the edge of what the observer touches (found by halving
between a free pose and a touching one, to a centimetre, and then a few centimetres to each side); and the hull swept between two poses.
Both are asked about the same boat at the same hour, with the vessels lying still. Counted:
  - bare observatøren (the observer touches, the map says free): MUST be 0, and each is printed with where and what;
  - klaring (the observer's hull is on a thing, and the map's distance at her middle says nothing is within her reach): MUST be 0;
  - bare kartet (the map touches, the observer does not): the map being careful, by what it was careful of;
  - ukjent (the map does not know): should be 0 when the packs are in.
And the map's own copies of the game's rules for what the 3D view builds of a tile, against the game's, for every tile decoded.

Needs the whole coast and the vec packs in dist-vec/ and playwright, as the bench does. No 3D, one browser.
    python3 tools/autonav/farsjekk.py [--turer DIR] [--strek id,id] [--bat skiff,sjark] [--n 90] [--sveip 12] [--del 1/3] [--ut FIL]
    python3 tools/autonav/farsjekk.py --rapport FIL [FIL ...]
The exit code is 1 when a pose is found where the observer touches and the map says free.
"""
import argparse, asyncio, collections, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))

# the stretch's two ends found (the naust's and the rorbu's quays are things only when the place is found), and she put at its start
PREP = r"""async ([fra, til, type]) => {
  const A = await BK.end(fra); if (A.skip) return {skip:A.skip}; const Z = await BK.end(til); if (Z.skip) return {skip:Z.skip};
  BK.cond([type, 3, 225, 0]); BK.A = A; BK.Z = Z; BK.from = BK.put(A);
  // (the game keeps the vessels lying still near her for the game minute, 11b-obstacles.js fixBoats; the bench puts the clock back to its
  // hour at every start, so the list of the last place is thrown away here)
  FIX.boats = null; return {type, from:[BK.from.x, BK.from.y], to:[Z.p.x, Z.p.y]}; }"""


def rapport(rows, out=sys.stdout):
    T = collections.Counter(); kart = collections.Counter(); obs = collections.Counter(); av = collections.Counter(); per = collections.defaultdict(collections.Counter); bad = []; skip = 0
    for r in rows:
        if r.get('skip') or r.get('feil'): skip += 1; continue
        for k in ('n', 'fri', 'begge', 'bareKart', 'bareObs', 'ukjent', 'klaring', 'sveip', 'sveipObs', 'sveipKart', 'sveipBegge'): T[k] += r.get(k, 0); per[r['type']][k] += r.get(k, 0)
        T['msKart'] += r.get('msKart', 0); T['msObs'] += r.get('msObs', 0); T['rader'] += 1
        kart.update(r.get('kart', {})); obs.update(r.get('obs', {})); av.update(r.get('av', {}))
        for b in r.get('bad', []): bad.append((r['strek'], r['type'], b))
    p = lambda *a: print(*a, file=out)
    p('farsjekken: %d strekninger og båter (%d hoppet over), %d skrogstillinger og %d sveip' % (T['rader'], skip, T['n'], T['sveip']))
    p('  stillingene: langs linjene %d, i stripa %d, i kanten av en berøring %d' % (av['rute'], av['stripe'], av['kant']))
    p('  begge fri %d, begge berøring %d, bare kartet %d, ukjent for kartet %d' % (T['fri'], T['begge'], T['bareKart'], T['ukjent']))
    p('  sveipene: begge berøring %d, bare kartet %d' % (T['sveipBegge'], T['sveipKart']))
    p('  observatøren så: ' + ', '.join('%s %d' % kv for kv in obs.most_common()))
    p('  kartet alene (forsiktig): ' + (', '.join('%s %d' % kv for kv in kart.most_common()) or 'ingenting'))
    p('  per båt: ' + '; '.join('%s %d stillinger, %d berøringer hos begge, %d bare kartet' % (k, v['n'], v['begge'], v['bareKart']) for k, v in sorted(per.items(), key=lambda kv: -kv[1]['n'])))
    if T['n']: p('  tid per stilling: kartet %.3f ms, observatøren %.3f ms' % (T['msKart'] / T['n'], T['msObs'] / T['n']))
    wrong = T['bareObs'] + T['klaring'] + T['sveipObs']
    p('%s farsjekken: observatøren ser en berøring og kartet sier fritt: %d stillinger, %d sveip; klaringen for stor: %d' % ('OK' if not wrong else 'FEIL', T['bareObs'], T['sveipObs'], T['klaring']))
    for s, t, b in bad[:40]: p('   ', s, t, json.dumps(b, ensure_ascii=False))
    return wrong


async def run(a):
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')
    if not os.path.isdir(os.path.join(ROOT, 'tools', 'map', 'out', 'game')):
        sys.exit('the whole coast is not in the build (tools/map/release.py, tools/map/game.py, KYST_VEC=1 KYST_DIST=dist-vec node build.mjs)')
    src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
    ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}
    exec(compile(src, ns['__file__'], 'exec'), ns)
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    js = [open(os.path.join(HERE, f), encoding='utf-8').read() for f in ('benkobs.js', 'benk.js', 'farsjekk.js')]
    ST = {s['id']: s for s in json.load(open(os.path.join(HERE, 'strekninger.json'), encoding='utf-8'))['strekninger']}
    rows = [json.loads(l) for l in open(os.path.join(a.turer, 'turer.jsonl'), encoding='utf-8')]
    rows = [r for r in rows if r.get('type') and not r.get('skip') and r['strek'] in ST and (r.get('rute', {}).get('wps') or (r.get('fasit') or {}).get('pts'))]
    if a.strek: rows = [r for r in rows if r['strek'] in a.strek.split(',')]
    if a.bat: rows = [r for r in rows if r['type'] in a.bat.split(',')]
    if a.dele: i, n = (int(v) for v in a.dele.split('/')); ids = sorted({r['strek'] for r in rows}); keep = {s for k, s in enumerate(ids) if k % n == i - 1}; rows = [r for r in rows if r['strek'] in keep]
    out = []; errs = []
    async with async_playwright() as p:
        br = await p.chromium.launch(); st = {'pg': None}

        async def fresh():
            if st['pg']:
                try: await st['pg'].context.close()
                except Exception: pass
            pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
            await pg.evaluate(ns['SETUP'], ['kyst21', 0, True])
            for s in js: await pg.evaluate(s)
            st['pg'] = pg

        async def ev(code, arg=None, secs=600): return await asyncio.wait_for(st['pg'].evaluate(code, arg), secs)

        await fresh(); T0 = time.time()
        print('farsjekken: %d strekninger og båter fra %s' % (len(rows), a.turer), flush=True)
        for k, r in enumerate(rows):
            s = ST[r['strek']]; R = {'strek': r['strek'], 'type': r['type']}; t = time.time()
            try:
                pr = await ev(PREP, [s['fra'], s['til'], r['type']])
                if pr.get('skip'): R['skip'] = pr['skip']
                else:
                    lines = [[pr['from']] + (r.get('rute', {}).get('wps') or [pr['to']])]
                    if (r.get('fasit') or {}).get('pts'): lines.append(r['fasit']['pts'])
                    R.update(await ev("o => FARSJ.run(o)", {'lines': lines, 'n': a.n, 'sweeps': a.sveip, 'seed': 1000 + k, 'strip': a.stripe}))
            except Exception as e:
                R['feil'] = str(e)[:300]
                try: await fresh()
                except Exception as e2: R['feil'] += ' | new page: ' + str(e2)[:100]
            R['s'] = round(time.time() - t, 1); out.append(R)
            if a.ut:
                with open(a.ut, 'a', encoding='utf-8') as f: f.write(json.dumps(R, ensure_ascii=False) + '\n')
            print('%-28s %-11s %s' % (R['strek'], R['type'], R.get('skip') or R.get('feil') or 'n %d: fri %d, begge %d, bare kartet %d, BARE OBS %d, klaring %d, ukjent %d | sveip %d: bare obs %d | %.0f s' % (
                R['n'], R['fri'], R['begge'], R['bareKart'], R['bareObs'], R['klaring'], R['ukjent'], R['sveip'], R['sveipObs'], R['s'])), flush=True)
        try:
            d = await ev("() => FARSJ.drawn()")
            print('%s farsjekken: kartets regler for hva 3D bygger av en flis, er spillets egne i %d fliser (sonene %s)%s' % ('OK' if not d['bad'] and d['zones'] is not False else 'FEIL', d['tiles'], d['zones'], ': ' + '; '.join(d['bad'][:6]) if d['bad'] else ''), flush=True)
            if d['bad'] or d['zones'] is False: out.append({'strek': 'regler', 'type': '-', 'n': 0, 'bareObs': len(d['bad']) + (d['zones'] is False), 'bad': [{'hva': 'regler', 'fliser': d['bad'][:6], 'soner': d['zones']}]})
        except Exception as e: print('FEIL farsjekken: reglene ble ikke sammenlignet: ' + str(e)[:200], flush=True)
        await br.close()
    print('ferdig på %.0f min, sidefeil %s' % ((time.time() - T0) / 60, errs[:3]), flush=True)
    return rapport(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--turer', default=os.path.join(ROOT, 'docs', 'planer', 'autonav-benk', 'grunnlinje'), help='a bench run (its turer.jsonl): the routes and the reference\'s ways are the lines')
    ap.add_argument('--strek', default=''); ap.add_argument('--bat', default=''); ap.add_argument('--del', dest='dele', default='')
    ap.add_argument('--n', type=int, default=90, help='poses per stretch and boat'); ap.add_argument('--sveip', type=int, default=12, help='sweeps per stretch and boat')
    ap.add_argument('--stripe', type=float, default=150); ap.add_argument('--ut', default='', help='one line per stretch and boat is added to this file')
    ap.add_argument('--rapport', nargs='+')
    a = ap.parse_args()
    if a.rapport:
        rows = [json.loads(l) for f in a.rapport for l in open(f, encoding='utf-8')]; sys.exit(1 if rapport(rows) else 0)
    sys.exit(1 if asyncio.run(run(a)) else 0)


if __name__ == '__main__': main()
