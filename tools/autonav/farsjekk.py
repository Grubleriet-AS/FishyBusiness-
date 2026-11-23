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
    python3 tools/autonav/farsjekk.py --felt [--celle 2] [--del 1/4] [--ut FIL]     the field (the distance and the depth on a grid, built in
        a worker) round each stretch's start, with the CPU slowed four times: the longest the page's own thread was held by a slice
        of the field's work (must be 4 ms or less), the worker's time, the bytes a tile, and the field against the geometry
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


def felt_rapport(rows, out=sys.stdout):
    p = lambda *a: print(*a, file=out); R = [r for r in rows if r.get('tiles')]
    if not R: p('FEIL farsjekken: ingen felt ble bygget'); return 1
    T = collections.Counter()
    for r in R:
        for k, v in (r.get('cmp') or {}).items():
            if isinstance(v, (int, float)) and not k.startswith('max') and k != 'zMax': T[k] += v
    mx = lambda k: max((r.get(k) or 0) for r in R); med = lambda k: sorted((r.get(k) or 0) for r in R)[len(R) // 2]
    built = [r for r in R if r.get('built')]
    p('feltet: %d steder, %d fliser bygget (%d uten svar: åpent hav uten fin kyst eller kartet ikke inne), celle %s m' % (len(R), sum(r['built'] for r in R), sum(r['none'] for r in R), R[0]['cell']))
    p('  hovedtråden, CPU strupet 4 ganger: lengste skive av feltets arbeid %.2f ms (median %.2f); lagene under (bryggene, moloene sortert): %.2f ms' % (mx('slice'), med('slice'), mx('laySlice')))
    p('  lengste opphold mellom to runder i hendelsesløkka mens feltet ble bygget: %.1f ms (median %.1f); like lenge uten bygging: %.1f ms (median %.1f)' % (mx('gap'), med('gap'), mx('idle'), med('idle')))
    H = [sum((r.get('hist') or [0] * 9)[i] for r in R) for i in range(9)]; nH = sum(H) or 1
    p('  skivene (lagene og feltet, %d i alt): under 4 ms %.2f %%, 4 til 8 ms %d, 8 ms og over %d' % (nH, 100.0 * sum(H[:4]) / nH, sum(H[4:8]), H[8]))
    Cn = [sum((r.get('ctrl') or [0] * 9)[i] for r in R) for i in range(9)]; nC = sum(Cn) or 1
    p('  kontrollen (en jobb som bare teller, like lenge, %d skiver): under 4 ms %.2f %%, 4 til 8 ms %d, 8 ms og over %d, lengste %.1f ms' % (nC, 100.0 * sum(Cn[:4]) / nC, sum(Cn[4:8]), Cn[8], mx('ctrlMax')))
    C2 = [sum((r.get('ctrl2') or [0] * 9)[i] for r in R) for i in range(9)]; n2 = sum(C2) or 1
    p('  kontrollen som lager søppel (%d skiver): under 4 ms %.2f %%, 4 til 8 ms %d, 8 ms og over %d, lengste %.1f ms' % (n2, 100.0 * sum(C2[:4]) / n2, sum(C2[4:8]), C2[8], mx('ctrl2Max')))
    HL = [sum((r.get('hLay') or [0] * 9)[i] for r in R) for i in range(9)]; HF = [sum((r.get('hFelt') or [0] * 9)[i] for r in R) for i in range(9)]
    p('  hver for seg: lagene (én gang per flis på 50 km) %d av %d skiver over 4 ms; feltets fliser %d av %d' % (sum(HL[4:]), sum(HL), sum(HF[4:]), sum(HF)))
    if built: p('  per flis: workeren %.0f ms (median; lengste %.0f), samlingen på hovedtråden %.0f ms i skiver (median), %d byte' % (sorted(r['workerMs'] for r in built)[len(built) // 2], max(r['workerMs'] for r in built), sorted(r['jobMs'] for r in built)[len(built) // 2], R[0]['bytes']))
    p('  en lesing: %.3f µs' % med('readUs'))
    p('  mot geometrien i %d ruter: feltet lenger unna %d (størst %.2f m), mer enn ett trinn nærmere %d (størst %.2f m); dekke ulikt %d; ukjent %d' % (T['n'], T['over'], max((r.get('cmp') or {}).get('maxOver', 0) for r in R), T['under'], max((r.get('cmp') or {}).get('maxUnder', 0) for r in R), T['uDiff'], T['unk']))
    p('  vannet i de åpne rutene: feltet dypere enn geometrien med over 0,1 m i %d ruter (over 0,5 m: %d, størst %.2f m); av %d ruter med under 10 m vann er feltet over 0,5 m grunnere i %d (forsiktig); ukjent %d' % (T['zOver'], T['zOver05'], max((r.get('cmp') or {}).get('zMax', 0) for r in R), T['z10'], T['zLow'], T['zUnk']))
    wrong = (T['over'] > 0) + (T['uDiff'] > 0)
    p('%s farsjekken, feltet mot geometrien: lenger unna i %d ruter, dekke ulikt i %d (vannet er en tilnærming i feltet: over 0,5 m dypere i %d)' % ('OK' if not wrong else 'FEIL', T['over'], T['uDiff'], T['zOver05']))
    over4 = sum(H[4:]); c4 = sum(Cn[4:]); p('%s farsjekken, hovedtråden: %d av %d skiver over 4 ms (lengste %.1f ms; kravet er ingen); kontrollen %d av %d (lengste %.1f ms)' % ('OK' if not over4 else 'FEIL', over4, nH, max(mx('slice'), mx('laySlice')), c4, nC, mx('ctrlMax'))); wrong += over4 > 0
    for r in R:
        for b in r.get('bad', [])[:3]: p('   ', r['strek'], json.dumps(b, ensure_ascii=False))
    return wrong


def rapport(rows, out=sys.stdout):
    T = collections.Counter(); kart = collections.Counter(); obs = collections.Counter(); av = collections.Counter(); ting = collections.Counter(); per = collections.defaultdict(collections.Counter); bad = []; skip = 0
    for r in rows:
        if r.get('skip') or r.get('feil'): skip += 1; continue
        for k in ('n', 'fri', 'begge', 'bareKart', 'bareObs', 'ukjent', 'klaring', 'sveip', 'sveipObs', 'sveipKart', 'sveipBegge'): T[k] += r.get(k, 0); per[r['type']][k] += r.get(k, 0)
        T['msKart'] += r.get('msKart', 0); T['msObs'] += r.get('msObs', 0); T['rader'] += 1
        kart.update(r.get('kart', {})); obs.update(r.get('obs', {})); av.update(r.get('av', {})); ting.update(r.get('ting', {}))
        for b in r.get('bad', []): bad.append((r['strek'], r['type'], b))
    p = lambda *a: print(*a, file=out)
    p('farsjekken: %d strekninger og båter (%d hoppet over), %d skrogstillinger og %d sveip' % (T['rader'], skip, T['n'], T['sveip']))
    p('  stillingene: langs linjene %d, i stripa %d, i kanten av en berøring %d, rett på en ting %d (%s)' % (av['rute'], av['stripe'], av['kant'], av['ting'], ', '.join('%s %d' % kv for kv in ting.most_common())))
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
        if a.felt:
            seen = set(); rows = [r for r in rows if not (r['strek'] in seen or seen.add(r['strek']))]   # (one boat a stretch: the field is the same for all)
            print('farsjekken, feltet: %d steder, celle %s m, CPU strupet 4 ganger' % (len(rows), a.celle), flush=True)
            for r in rows:
                s = ST[r['strek']]; R = {'strek': r['strek'], 'type': r['type']}; t = time.time()
                try:
                    pr = await ev(PREP, [s['fra'], s['til'], r['type']])
                    if pr.get('skip'): R['skip'] = pr['skip']
                    else:
                        cdp = await st['pg'].context.new_cdp_session(st['pg']); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
                        try: R.update(await ev("o => FARSJ.field(o)", {'cell': a.celle, 'n': a.n * 30, 'half': 400, 'steps': a.skritt}))
                        finally: await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1}); await cdp.detach()
                except Exception as e:
                    R['feil'] = str(e)[:300]
                    try: await fresh()
                    except Exception as e2: R['feil'] += ' | new page: ' + str(e2)[:100]
                R['s'] = round(time.time() - t, 1); out.append(R)
                if a.ut:
                    with open(a.ut, 'a', encoding='utf-8') as f: f.write(json.dumps(R, ensure_ascii=False) + '\n')
                c = R.get('cmp') or {}
                print('%-28s %s' % (R['strek'], R.get('skip') or R.get('feil') or 'fliser %d (%d uten svar), skive %.2f ms, opphold %.1f ms (uten bygging %.1f), worker %s ms, | %d ruter: lenger unna %d, nærmere %d, vann dypere %d, dekke %d | %.0f s' % (
                    R['tiles'], R['none'], R['slice'], R['gap'], R['idle'], R.get('workerMs'), c.get('n', 0), c.get('over', 0), c.get('under', 0), c.get('zOver', 0), c.get('uDiff', 0), R['s'])), flush=True)
            await br.close(); print('ferdig på %.0f min, sidefeil %s' % ((time.time() - T0) / 60, errs[:3]), flush=True)
            return felt_rapport(out)
        print('farsjekken: %d strekninger og båter fra %s' % (len(rows), a.turer), flush=True)
        for k, r in enumerate(rows):
            s = ST[r['strek']]; R = {'strek': r['strek'], 'type': r['type']}; t = time.time()
            try:
                pr = await ev(PREP, [s['fra'], s['til'], r['type']])
                if pr.get('skip'): R['skip'] = pr['skip']
                else:
                    lines = [[pr['from']] + (r.get('rute', {}).get('wps') or [pr['to']])]
                    if (r.get('fasit') or {}).get('pts'): lines.append(r['fasit']['pts'])
                    R.update(await ev("o => FARSJ.run(o)", {'lines': lines, 'n': a.n, 'sweeps': a.sveip, 'things': a.ting, 'seed': 1000 + k, 'strip': a.stripe}))
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
    ap.add_argument('--ting', type=int, default=16, help='poses right on things, per stretch and boat'); ap.add_argument('--stripe', type=float, default=150); ap.add_argument('--ut', default='', help='one line per stretch and boat is added to this file')
    ap.add_argument('--felt', action='store_true', help='the field round each stretch\'s start, built with the CPU slowed four times'); ap.add_argument('--celle', type=int, default=2); ap.add_argument('--skritt', action='store_true', help='with --felt: each step of the gathering timed too (to find a step that is too long)')
    ap.add_argument('--rapport', nargs='+')
    a = ap.parse_args()
    if a.rapport:
        rows = [json.loads(l) for f in a.rapport for l in open(f, encoding='utf-8')]; sys.exit(1 if (felt_rapport(rows) if rows and 'tiles' in rows[0] else rapport(rows)) else 0)
    sys.exit(1 if asyncio.run(run(a)) else 0)


if __name__ == '__main__': main()
