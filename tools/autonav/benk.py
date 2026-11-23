#!/usr/bin/env python3
"""Benken: Autonav through a fixed list of hard stretches, measured (Autonav 2.0 F0, steg 140; docs/planer/autonav-2-0.md, «Benken»;
Jonas 23.11.2026: «en automatisert test- og benchmarksjekk som kjører både dagens autonav og Autonav 2.0 gjennom krevende teststrekninger
(trange havneinnløp, moloer, brupasseringer, trange sund og sjømerker) for både minste og største båt»).

The stretches are tools/autonav/strekninger.json: each a start and an end (a harbour's id, a rorbu, Father's naust by a plant, or a
point at sea). Each is taken with the smallest boat (skiff), the commonest (sjark), kyst21 and the biggest the two places take (up to
pelagisk, 75 m), where the game lets the boat lie there. For each stretch and boat:
  - the route as a tap in the chart plotter finds it (draftWay), first with the CPU slowed four times (a phone): the time, and the
    longest the page's own thread was held; then once more at full speed, and that one is sailed;
  - the first steps of the boat model from the berth with the CPU slowed, each timed;
  - sailed with the boat model (the game's loop when it is looked at) and as time away (the minute step alone), from the same route,
    at full speed (the players' default), the tide at chart datum, and the bench's observer (benkobs.js, benk.js) sweeping her whole
    hull along both against everything the 3D view draws in the sea;
  - the reference: the shortest way there is for her with the hard minimums only, to measure the route's length against.
One line per stretch and boat goes to --ut/turer.jsonl (simulation only, no player data); --rapport prints the tables from it.

Needs the whole coast and the vec packs in dist-vec/ (tools/map/release.py, tools/map/game.py, KYST_VEC=1 KYST_DIST=dist-vec node
build.mjs) and playwright. No 3D, one browser; --del i/n takes every n-th stretch, so several can run side by side.
    python3 tools/autonav/benk.py --ut DIR [--strek id,id] [--bat skiff,sjark] [--motor modell,bakgrunn] [--vind 3] [--del 1/3]
                                  [--uten-cpu] [--uten-fasit] [--bare-rute] [--bare-cpu] [--bilde DIR] [--liste]
    python3 tools/autonav/benk.py --rapport DIR [DIR ...]
    python3 tools/autonav/benk.py --sammenlign DIR_A DIR_B      (the old Autonav against the new, or one run against itself)
"""
import argparse, asyncio, collections, json, math, os, statistics, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
BOATS = ['skiff', 'sjark', 'kyst21', 'størst']
CPU_RATE, CPU_TICKS = 4, 120

# the page side of one stretch and boat: the ends found and she put at the start (BK.A, BK.Z, BK.from), the biggest boat both take
PREP = r"""async ([fra, til, type, w, d]) => { let big = null;
  const A = await BK.end(fra); if (A.skip) return {skip:A.skip}; const Z = await BK.end(til); if (Z.skip) return {skip:Z.skip};
  if (type === 'størst'){ type = Object.keys(VESSELS).filter(t => !BK.takes(A, t) && !BK.takes(Z, t)).sort((a, c) => VESSELS[c].len - VESSELS[a].len)[0]; big = type; if (!type) return {skip:'no boat fits both ends'}; }
  const wa = BK.takes(A, type), wz = BK.takes(Z, type); if (wa || wz) return {skip:'stedet tar ikke båten: ' + (wa || wz), type};
  BK.cond([type, w, d, 0]); BK.A = A; BK.Z = Z; BK.from = BK.put(A); BK.R = null; const la = natLL(BK.from), lz = natLL(Z.p);
  return {type, big, a:A.name, z:Z.name, fra:[+la.lat.toFixed(5), +la.lon.toFixed(5)], til:[+lz.lat.toFixed(5), +lz.lon.toFixed(5)], L:BOAT.len, B:BOAT.beam, T:BOAT.draft, air:+obsAir().toFixed(1)}; }"""
# (keep: the route that is sailed, found with the coast's packs along it decoded, and found again when more of them came in with it;
# without keep: as a player's tap finds it, the packs decoded as the search itself waits for them, four seconds at most)
ROUTE = r"""async (keep) => { BK.from = BK.put(BK.A); let q, again = 0;
  if (keep) await BK.vecReady([BK.from, BK.Z.p]);
  for (;;){ const v0 = VEC.ver; q = await BK.route(BK.A, BK.Z, BK.from); if (!keep || !q.r) break; await BK.vecReady([BK.from].concat(q.r.wps)); if (VEC.ver === v0 || ++again >= 3) break; BK.from = BK.put(BK.A); }
  if (!q.r){ if (keep) BK.R = null; return q; } if (keep) BK.R = q;
  return {nm:+q.r.nm.toFixed(3), ms:q.ms, gap:q.gap, st:q.st, again, shape:BK.shape(BK.from, q.r.wps), wps:q.r.wps.map(w => [+w.x.toFixed(4), +w.y.toFixed(4)])}; }"""
CPU = r"""(n) => { BK.from = BK.put(BK.A); BK.plan(BK.R.r, BK.Z, BK.R.nt, true); return BK.cpu(n); }"""
SAIL = r"""async (eng) => { BK.from = BK.put(BK.A); const to = BK.plan(BK.R.r, BK.Z, BK.R.nt, true); return eng === 'modell' ? BK.sailModel(BK.R.r, to, BK.from) : BK.sailBg(BK.R.r, to, BK.from); }"""
FASIT = r"""async () => { BK.put(BK.A); const z = BK.R && BK.R.nt ? {x:BK.R.nt.x, y:BK.R.nt.y} : BK.Z.p, pts = [BK.from, z].concat(BK.R ? BK.R.r.wps : []), G = BK.G;
  if (!G || BK.Gid !== BK.strek || pts.some(p => p.x < G.x0 + 0.05 || p.x > G.x1 - 0.05 || p.y < G.y0 + 0.05 || p.y > G.y1 - 0.05)){ BK.Gpts = (BK.Gid === BK.strek && BK.Gpts ? BK.Gpts : []).concat(pts); BK.Gid = BK.strek; await BK.landGrid(BK.Gpts); }
  // (no way inside the window: the way there is may go round an island the window does not hold, so the window is widened, twice at most)
  let f = BK.fasit(BK.from, z); for (const w of [3, 8]){ if (!(f.why && /^no way/.test(f.why)) || BK.G.widen >= w) continue; await BK.landGrid(BK.Gpts, w); f = BK.fasit(BK.from, z); }
  f.grid = BK.G.ms; f.widen = BK.G.widen; return f; }"""


def load_list():
    return json.load(open(os.path.join(HERE, 'strekninger.json'), encoding='utf-8'))['strekninger']


async def run(a):
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    os.environ['KYST_DIST'] = os.environ.get('KYST_DIST') or os.path.join(ROOT, 'dist-vec')
    if not os.path.isdir(os.path.join(ROOT, 'tools', 'map', 'out', 'game')):
        sys.exit('the whole coast is not in the build (tools/map/release.py, tools/map/game.py, KYST_VEC=1 KYST_DIST=dist-vec node build.mjs)')
    # allesteder's own setup and sailing (ALS), as the hunt takes it: its source up to main()
    src = open(os.path.join(ROOT, 'tests', 'allesteder.py'), encoding='utf-8').read().split('\nasync def main():')[0]
    ns = {'__file__': os.path.join(ROOT, 'tests', 'allesteder.py'), '__name__': 'allesteder_js'}
    exec(compile(src, ns['__file__'], 'exec'), ns)
    from _env import GAME, boot
    from playwright.async_api import async_playwright
    obs_js = open(os.path.join(HERE, 'benkobs.js'), encoding='utf-8').read(); bk_js = open(os.path.join(HERE, 'benk.js'), encoding='utf-8').read()
    S = load_list()
    if a.strek: S = [s for s in S if s['id'] in a.strek.split(',')]
    if a.dele: i, n = (int(v) for v in a.dele.split('/')); S = [s for k, s in enumerate(S) if k % n == i - 1]
    boats = a.bat.split(',') if a.bat else BOATS; engines = [] if (a.bare_rute or a.bare_cpu) else a.motor.split(',')
    if a.bare_cpu: a.uten_fasit = True
    if a.bilde: os.makedirs(a.bilde, exist_ok=True)
    os.makedirs(a.ut, exist_ok=True); out = os.path.join(a.ut, 'turer.jsonl')
    ver = None
    try: ver = json.load(open(os.path.join(os.environ['KYST_DIST'], 'version.json')))['v']
    except Exception: pass
    async with async_playwright() as p:
        br = await p.chromium.launch(); st = {'pg': None, 'cdp': None, 'errs': []}

        async def fresh():
            if st['pg']:
                try: await st['pg'].context.close()
                except Exception: pass
            pg = await (await br.new_context(viewport={'width': 1280, 'height': 800})).new_page()
            pg.on('pageerror', lambda e: st['errs'].append(str(e)[:200]))
            await boot(pg, GAME + ('' if 'no3d' in GAME else ',no3d'))
            await pg.evaluate(ns['SETUP'], ['kyst21', 0, True]); await pg.evaluate(obs_js); await pg.evaluate(bk_js)
            st['pg'] = pg; st['cdp'] = await pg.context.new_cdp_session(pg)

        async def ev(js, arg=None, secs=900): return await asyncio.wait_for(st['pg'].evaluate(js, arg), secs)
        async def slow(on): await st['cdp'].send('Emulation.setCPUThrottlingRate', {'rate': CPU_RATE if on else 1})

        await fresh(); T0 = time.time(); n_trip = 0
        print('benken: %d strekninger, båter %s, motorer %s, bygg %s' % (len(S), boats, engines, ver), flush=True)
        for s in S:
            seen = set()
            for bt in boats:
                t = time.time(); R = {'strek': s['id'], 'navn': s['navn'], 'kat': s['kat'], 'landsdel': s['landsdel'], 'bat': bt, 'vind': a.vind, 'ver': ver, 'autonav': a.autonav}
                try:
                    await ev("id => { BK.strek = id; }", s['id'])
                    pr = await ev(PREP, [s['fra'], s['til'], bt, a.vind, a.retning]); R.update(pr)
                    if pr.get('skip') or pr['type'] in seen:
                        if not pr.get('skip'): R['skip'] = 'samme båt som en annen i lista'
                    else:
                        seen.add(pr['type'])
                        if not a.uten_cpu:
                            await slow(True); R['rute4'] = await ev(ROUTE, False); await slow(False)
                            for k in ('wps',): R['rute4'].pop(k, None)
                        R['rute'] = await ev(ROUTE, True)
                        if R['rute'].get('why'): R['ingen_rute'] = R['rute']['why']
                        else:
                            if not a.uten_cpu:
                                await slow(True); R['cpu'] = await ev(CPU, CPU_TICKS); await slow(False)
                            for e in engines: R[e] = await ev(SAIL, e); n_trip += 1
                        if not a.uten_fasit: R['fasit'] = await ev(FASIT, None)
                        if a.bilde and R.get('fasit') is not None:
                            f = R['fasit']; ratio = (' (x%.2f)' % (R['rute']['nm'] / f['nm'])) if R.get('rute', {}).get('nm') and f.get('nm') else ''
                            under = '%s %.1f × %.1f m, dypgang %.1f m | ruta %s | fasiten %s%s | treff: båtmodellen %s, bakgrunn %s' % (R['type'], R['L'], R['B'], R['T'], ('%.2f nm' % R['rute']['nm']) if R['rute'].get('nm') else 'ingen', ('%.2f nm' % f['nm']) if f.get('nm') else 'ingen', ratio,
                                    len(count(R['modell'])) if R.get('modell') else '–', len(count(R['bakgrunn'])) if R.get('bakgrunn') else '–')
                            url = await ev("o => BK.bilde(o)", {'tittel': s['navn'], 'under': under, 'rute': R['rute'].get('wps'), 'fasit': f.get('pts'), 'til': {'x': 0, 'y': 0}, 'modell': count(R.get('modell')), 'bakgrunn': count(R.get('bakgrunn'))} | {'til': await ev("() => (BK.R && BK.R.nt ? {x:BK.R.nt.x, y:BK.R.nt.y} : {x:BK.Z.p.x, y:BK.Z.p.y})")})
                            import base64
                            with open(os.path.join(a.bilde, '%s_%s.png' % (s['id'], R['type'])), 'wb') as fb: fb.write(base64.b64decode(url.split(',', 1)[1]))
                except Exception as e:
                    R['feil'] = str(e)[:300]
                    try: await slow(False)
                    except Exception: pass
                    try: await fresh()   # (a page that hangs or dies: a new one for the next boat)
                    except Exception as e2: R['feil'] += ' | new page: ' + str(e2)[:100]
                R['s'] = round(time.time() - t, 1)
                with open(out, 'a', encoding='utf-8') as f: f.write(json.dumps(R, ensure_ascii=False) + '\n')
                print(line(R), flush=True)
        print('ferdig: %d turer på %.0f min, sidefeil %s' % (n_trip, (time.time() - T0) / 60, st['errs'][:3]), flush=True)
        await br.close()


def hits_of(e): return [h for h in (e or {}).get('hits', [])]
HEAD = ('land', 'kai', 'brygge', 'flytebrygge', 'molo', 'naustkai', 'rorbukai', 'merke', 'vindturbin', 'brupilar', 'brudekke', 'skjær', 'grunn', 'grunnstøting', 'båt')


def events(hits):
    """Touches as events: the same kind of touch on the same trip less than 60 m from the one before is one (land, shallow water and the
    foreshore are logged per 50 m cell she is over, so a boat that scrapes along a shore would count many times; tools/autonav/rapport.py
    counts the hunt's the same way)."""
    out, last = [], {}
    for h in hits:
        p = last.get(h['what'])
        if p is not None and math.hypot((h['lat'] - p['lat']) * 111195, (h['lon'] - p['lon']) * 111195 * math.cos(math.radians(h['lat']))) < 60: last[h['what']] = h; continue
        last[h['what']] = h; out.append(h)
    return out


def count(e):
    """The touches of one trip that count, as events: everything but the foreshore (its own column) and the vessels under way."""
    return events([h for h in hits_of(e) if h['what'] != 'fjære' and not (h['what'] == 'båt' and not h.get('lying'))])


def line(R):
    if R.get('feil'): return '%-26s %-10s FEIL %s' % (R['strek'][:26], R['bat'], R['feil'][:120])
    if R.get('skip'): return '%-26s %-10s – %s' % (R['strek'][:26], R.get('type') or R['bat'], R['skip'][:90])
    if R.get('ingen_rute'): return '%-26s %-10s INGEN RUTE: %s (%s ms)%s' % (R['strek'][:26], R['type'], R['ingen_rute'][:70], R['rute'].get('ms'), fas(R))
    r = R['rute']; o = '%-26s %-10s %5.2f nm %2d pkt, %d knekk' % (R['strek'][:26], R['type'], r['nm'], r['shape']['n'], r['shape']['kinks'])
    if R.get('rute4'): o += ' | plan %d ms (blokk %.0f)' % (R['rute4'].get('ms') or 0, R['rute4'].get('gap') or 0)
    if R.get('cpu'): o += ', tyngste tikk %.0f ms' % R['cpu']['max']
    for e in ('modell', 'bakgrunn'):
        if e in R: x = R[e]; c = count(x); o += ' | %s: %s%d treff%s' % (e[:3], '' if x.get('at') else 'IKKE FRAM, ', len(c), (' [' + ', '.join('%s %s' % (h['what'], h['phase']) for h in c[:4]) + ']') if c else '')
    return o + fas(R) + ' %ds' % R['s']


def fas(R):
    f = R.get('fasit')
    if not f: return ''
    if f.get('why'): return ' | fasit: ingen'
    return ' | fasit %.2f nm%s' % (f['nm'], (' (x%.2f)' % (R['rute']['nm'] / f['nm'])) if R.get('rute') and R['rute'].get('nm') and f['nm'] > 0.02 else '')


def rapport(dirs):
    rows = []
    for d in dirs: rows += [json.loads(l) for l in open(os.path.join(d, 'turer.jsonl'), encoding='utf-8') if l.strip()]
    # one line per stretch, boat and wind: a later line is laid over the earlier (a stretch run again; a run of the CPU times alone,
    # --bare-cpu, over a full run), but a line that failed never over one that did not
    last = {}
    for r in rows:
        k = (r['strek'], r.get('type') or r['bat'], r.get('vind'))
        if k in last and r.get('feil'): continue
        last[k] = dict(last[k], **r) if k in last and not last[k].get('feil') else r
    rows = list(last.values()); done = [r for r in rows if not r.get('skip') and not r.get('feil')]; routed = [r for r in done if r.get('rute') and not r.get('ingen_rute')]
    med = lambda v: statistics.median(v) if v else float('nan')
    pct = lambda v, q: sorted(v)[min(len(v) - 1, int(len(v) * q))] if v else float('nan')
    print('# Benken: %d strekninger, %d strekning × båt (%d hoppet over: stedet tar ikke båten; %d feil), bygg %s\n' % (len(set(r['strek'] for r in rows)), len(done), sum(1 for r in rows if r.get('skip')), sum(1 for r in rows if r.get('feil')), sorted(set(str(r.get('ver')) for r in rows))))
    print('Uten rute: %d av %d (%s)\n' % (len(done) - len(routed), len(done), ', '.join('%s %s' % (r['strek'], r['type']) for r in done if r.get('ingen_rute'))[:600]))
    print('## Treff\n\n| Motor | turer | kom fram | turer med treff | treff | per 1000 turer | over den tegnede fjæra (turer) | fartøy i fart (treff) |\n|---|---|---|---|---|---|---|---|')
    for e in ('modell', 'bakgrunn'):
        T = [r[e] for r in routed if e in r]
        if not T: continue
        c = [count(x) for x in T]
        print('| %s | %d | %d | %d (%.0f %%) | %d | %.0f | %d | %d |' % (e, len(T), sum(1 for x in T if x.get('at')), sum(1 for h in c if h), 100 * sum(1 for h in c if h) / len(T), sum(len(h) for h in c), 1000 * sum(len(h) for h in c) / len(T),
              sum(1 for x in T if any(h['what'] == 'fjære' for h in hits_of(x))), sum(1 for x in T for h in hits_of(x) if h['what'] == 'båt' and not h.get('lying'))))
    for title, key in (('Hva', lambda r, h: h['what'] + (' (ligger stille)' if h['what'] == 'båt' else '')), ('Fase', lambda r, h: h['phase']), ('Båt', lambda r, h: r['type']), ('Slags strekning', lambda r, h: r['kat']), ('Landsdel', lambda r, h: r['landsdel'])):
        print('\n| %s | modell | bakgrunn |\n|---|---|---|' % title)
        C = {e: collections.Counter(key(r, h) for r in routed if e in r for h in count(r[e])) for e in ('modell', 'bakgrunn')}
        N = {e: collections.Counter(key(r, {'what': '', 'phase': ''}) for r in routed if e in r) for e in ('modell', 'bakgrunn')} if title in ('Båt', 'Slags strekning', 'Landsdel') else None
        for k in sorted(set(C['modell']) | set(C['bakgrunn']) | (set(N['modell']) if N else set()), key=lambda k: -(C['modell'][k] + C['bakgrunn'][k])):
            print('| %s | %d%s | %d%s |' % (k, C['modell'][k], (' på %d turer' % N['modell'][k]) if N else '', C['bakgrunn'][k], (' på %d turer' % N['bakgrunn'][k]) if N else ''))
    # the route's quality
    ratio = [(r['rute']['nm'] / r['fasit']['nm'], r) for r in routed if r.get('fasit') and r['fasit'].get('nm', 0) > 0.05]
    v = [x for x, _ in ratio]
    print('\n## Rutene\n')
    print('- Lengde mot fasiten (%d ruter): median %.2f, 90-prosentilen %.2f, lengst %.2f. Over 1,15: %d. Over 1,5: %d.' % (len(v), med(v), pct(v, 0.9), max(v) if v else float('nan'), sum(1 for x in v if x > 1.15), sum(1 for x in v if x > 1.5)))
    print('- Fasiten fant ingen vei med minstemålene for %d (%s).' % (sum(1 for r in done if r.get('fasit') and r['fasit'].get('why')), ', '.join('%s %s' % (r['strek'], r['type']) for r in done if r.get('fasit') and r['fasit'].get('why'))[:500]))
    print('- Knekk over 30° per nm: median %.2f, 90-prosentilen %.2f. Ruter med legger kortere enn to båtlengder utenfor havn: %d av %d.' % (med([r['rute']['shape']['kinksNm'] for r in routed]), pct([r['rute']['shape']['kinksNm'] for r in routed], 0.9), sum(1 for r in routed if r['rute']['shape']['short']), len(routed)))
    print('\n| De lengste omveiene | båt | rute nm | fasit nm | forhold | knekk |\n|---|---|---|---|---|---|')
    for x, r in sorted(ratio, key=lambda q: -q[0])[:12]: print('| %s | %s | %.2f | %.2f | %.2f | %d |' % (r['navn'], r['type'], r['rute']['nm'], r['fasit']['nm'], x, r['rute']['shape']['kinks']))
    # the CPU
    r4 = [r['rute4'] for r in done if r.get('rute4')]; ms = [x['ms'] for x in r4 if x.get('ms') is not None]; gap = [x['gap'] for x in r4 if x.get('gap') is not None]; cpu = [r['cpu'] for r in routed if r.get('cpu')]
    print('\n## CPU (strupet %d ganger)\n' % CPU_RATE)
    if ms: print('- Rutesøket: median %d ms, 90-prosentilen %d ms, lengst %d ms. Lengste blokkering av hovedtråden under søket: median %.0f ms, 90-prosentilen %.0f ms, lengst %.0f ms. Over 4 ms: %d av %d. Over 50 ms: %d.' % (med(ms), pct(ms, 0.9), max(ms), med(gap), pct(gap, 0.9), max(gap), sum(1 for g in gap if g > 4), len(gap), sum(1 for g in gap if g > 50)))
    if cpu: print('- Tyngste tikk av båtmodellen de første %d tikkene fra kai (linja hun styrer etter, bygges): median %.0f ms, 90-prosentilen %.0f ms, lengst %.0f ms. Over 4 ms: %d av %d. Over 50 ms: %d. Et vanlig tikk: median %.1f ms.' % (CPU_TICKS, med([c['max'] for c in cpu]), pct([c['max'] for c in cpu], 0.9), max(c['max'] for c in cpu), sum(1 for c in cpu if c['max'] > 4), len(cpu), sum(1 for c in cpu if c['max'] > 50), med([c['mean'] for c in cpu])))
    # the two engines against each other
    both = [r for r in routed if r.get('modell') and r.get('bakgrunn') and r['modell'].get('at') and r['bakgrunn'].get('at') and r['modell'].get('min')]
    if both:
        dt = [abs(r['bakgrunn']['min'] - r['modell']['min']) / max(1, r['modell']['min']) for r in both]; df = [abs(r['bakgrunn']['fuel'] - r['modell']['fuel']) / max(0.1, r['modell']['fuel']) for r in both if r['modell'].get('fuel', 0) > 0.1]
        dn = [abs(r['bakgrunn']['nmSailed'] - r['modell']['nmSailed']) / max(0.05, r['modell']['nmSailed']) for r in both]
        print('\n## Sanntid mot bakgrunn (%d turer der begge kom fram)\n' % len(both))
        print('- Tid: median %.0f %% avvik, 90-prosentilen %.0f %%, størst %.0f %%. Over 2 %%: %d av %d.' % (100 * med(dt), 100 * pct(dt, 0.9), 100 * max(dt), sum(1 for x in dt if x > 0.02), len(dt)))
        if df: print('- Diesel: median %.0f %% avvik, 90-prosentilen %.0f %%, størst %.0f %%.' % (100 * med(df), 100 * pct(df, 0.9), 100 * max(df)))
        print('- Seilt vei: median %.0f %% avvik, størst %.0f %%.' % (100 * med(dn), 100 * max(dn)))
    hands = [r['modell'] for r in routed if r.get('modell')]
    if hands: print('- «Hendene» tok båten på %d av %d turer med båtmodellen.' % (sum(1 for x in hands if x.get('hands')), len(hands)))
    # per stretch
    print('\n## Per strekning (treff med båtmodellen / som bakgrunnstur; – stedet tar ikke båten; ✕ ingen rute)\n')
    types = []
    for r in rows:
        k = r['bat'] if r['bat'] != 'størst' else 'størst'
        if k not in types: types.append(k)
    print('| Strekning | slag | ' + ' | '.join(types) + ' | rute/fasit (sjark) |\n|---|---|' + '---|' * (len(types) + 1))
    by = collections.defaultdict(dict)
    for r in rows: by[r['strek']][r['bat']] = r
    for sid, B in by.items():
        any_r = next(iter(B.values())); cells = []
        for k in types:
            r = B.get(k)
            if not r: cells.append(''); continue
            if r.get('feil'): cells.append('feil'); continue
            if r.get('skip'): cells.append('–'); continue
            if r.get('ingen_rute'): cells.append('✕' + (' (%s)' % r['type'] if k == 'størst' else '')); continue
            m, b = r.get('modell'), r.get('bakgrunn'); f = lambda x: ('?' if x is None else ('%d' % len(count(x))) + ('' if x.get('at') else '!'))
            cells.append('%s / %s%s' % (f(m), f(b), (' (%s)' % r['type']) if k == 'størst' else ''))
        sj = B.get('sjark'); q = '%.2f' % (sj['rute']['nm'] / sj['fasit']['nm']) if sj and sj.get('rute') and sj['rute'].get('nm') and sj.get('fasit') and sj['fasit'].get('nm', 0) > 0.05 else ''
        print('| %s | %s | %s | %s |' % (any_r['navn'], any_r['kat'], ' | '.join(cells), q))
    print('\n(! etter tallet: båten kom ikke fram.)')


def sammenlign(A, B):
    """Two runs side by side (the old Autonav against the new, or the same twice to see that a run repeats): the totals, and each
    stretch and boat where they differ."""
    def load(d):
        last = {}
        for l in open(os.path.join(d, 'turer.jsonl'), encoding='utf-8'):
            if l.strip(): r = json.loads(l); last[(r['strek'], r.get('type') or r['bat'])] = r
        return last
    a, b = load(A), load(B); keys = [k for k in a if k in b]
    def tot(R):
        o = collections.OrderedDict(); routed = [r for r in R if r.get('rute') and not r.get('ingen_rute')]
        o['strekning × båt'] = len([r for r in R if not r.get('skip')]); o['uten rute'] = sum(1 for r in R if r.get('ingen_rute'))
        for e in ('modell', 'bakgrunn'):
            T = [r[e] for r in routed if e in r]; o[e + ': turer'] = len(T); o[e + ': kom fram'] = sum(1 for x in T if x.get('at')); o[e + ': turer med treff'] = sum(1 for x in T if count(x)); o[e + ': treff'] = sum(len(count(x)) for x in T)
        v = [r['rute']['nm'] / r['fasit']['nm'] for r in routed if r.get('fasit') and r['fasit'].get('nm', 0) > 0.05]
        o['rute/fasit, median'] = round(statistics.median(v), 3) if v else None; o['rute/fasit, størst'] = round(max(v), 2) if v else None
        o['rutelengde, sum nm'] = round(sum(r['rute']['nm'] for r in routed), 2)
        ms = [r['rute4']['ms'] for r in R if r.get('rute4') and r['rute4'].get('ms') is not None]; gap = [r['rute4']['gap'] for r in R if r.get('rute4') and r['rute4'].get('gap') is not None]
        o['rutesøk strupet, median ms'] = round(statistics.median(ms)) if ms else None; o['lengste blokkering, ms'] = round(max(gap)) if gap else None
        return o
    ta, tb = tot([a[k] for k in keys]), tot([b[k] for k in keys])
    print('# %s mot %s (%d strekning × båt i begge)\n\n| | %s | %s |\n|---|---|---|' % (A, B, len(keys), os.path.basename(A.rstrip('/')), os.path.basename(B.rstrip('/'))))
    for k in ta: print('| %s | %s | %s |' % (k, ta[k], tb[k]))
    diff = 0; print()
    for k in keys:
        x, y = a[k], b[k]; d = []
        if bool(x.get('ingen_rute')) != bool(y.get('ingen_rute')): d.append('rute: %s → %s' % ('ingen' if x.get('ingen_rute') else 'ja', 'ingen' if y.get('ingen_rute') else 'ja'))
        elif x.get('rute') and y.get('rute') and x['rute'].get('nm') and y['rute'].get('nm') and abs(x['rute']['nm'] - y['rute']['nm']) > 0.005: d.append('nm %.2f → %.2f' % (x['rute']['nm'], y['rute']['nm']))
        for e in ('modell', 'bakgrunn'):
            if e in x and e in y:
                hx, hy = sorted(h['what'] + '|' + h['id'] for h in count(x[e])), sorted(h['what'] + '|' + h['id'] for h in count(y[e]))
                if hx != hy: d.append('%s: %d → %d treff' % (e, len(hx), len(hy)))
                if bool(x[e].get('at')) != bool(y[e].get('at')): d.append('%s: fram %s → %s' % (e, x[e].get('at'), y[e].get('at')))
                elif x[e].get('min') != y[e].get('min'): d.append('%s: %s → %s min' % (e, x[e].get('min'), y[e].get('min')))
        if d: diff += 1; print('%-28s %-10s %s' % (k[0][:28], k[1], '; '.join(d)))
    print('\n%d av %d er ulike.' % (diff, len(keys)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ut'); ap.add_argument('--strek', default=''); ap.add_argument('--bat', default=''); ap.add_argument('--motor', default='modell,bakgrunn')
    ap.add_argument('--vind', type=float, default=3); ap.add_argument('--retning', type=float, default=225); ap.add_argument('--del', dest='dele', default='')
    ap.add_argument('--uten-cpu', action='store_true'); ap.add_argument('--uten-fasit', action='store_true'); ap.add_argument('--bare-rute', action='store_true')
    ap.add_argument('--bare-cpu', action='store_true', help='the route and the first steps of the model with the CPU slowed, nothing sailed: run alone, so the times are the machine\'s own')
    ap.add_argument('--bilde', default='', help='a folder for a picture of each stretch and boat run: the route, the reference and the touches')
    ap.add_argument('--autonav', default='gammel', help='which Autonav is sailed (gammel: the game as it is; ny comes with F2)')
    ap.add_argument('--liste', action='store_true'); ap.add_argument('--rapport', nargs='+'); ap.add_argument('--sammenlign', nargs=2, metavar=('A', 'B'))
    a = ap.parse_args()
    if a.rapport: return rapport(a.rapport)
    if a.sammenlign: return sammenlign(*a.sammenlign)
    if a.liste:
        for s in load_list(): print('%-28s %-8s %-5s %s' % (s['id'], s['kat'], s['landsdel'], s['navn']))
        return
    if not a.ut: sys.exit('--ut DIR (a folder for turer.jsonl; the scratchpad, not the repo, for a trial run)')
    asyncio.run(run(a))


if __name__ == '__main__':
    main()
