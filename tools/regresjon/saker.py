#!/usr/bin/env python3
"""The regression's results as GitHub issues, with no model (live-drift fase 5, 19.11.2026; .github/workflows/regresjon.yml).

Jonas 19.11.2026: «flytt nattlig og ukentlig regresjon over til GitHub Actions (regresjon.yml) slik at testkjøringene går uten
Claude-tokens og eventuelle nye røde tester plukkes opp automatisk av triagen i «Driften»», and on where the red goes: «Saker»: one
issue per red test, labelled `regresjon`, which tools/triage/klynge.py reads as a technical cluster.

    python3 tools/regresjon/saker.py igjen --fra N --out FILE [--del NAVN] [--logg DEL.LOG]
        In each part of the workflow, after `tests/run.py smoke <part>`: the lines tests/historikk.tsv got after line N are this
        part's results. Each red test is run once more, alone (run.py runs the tests without 3D two at a time), and FILE gets
        [{test, status, sjekk, igjen, lite, del}]: igjen is the second run's status (None when the first was not red). The unit
        tests write no history line: their result is read from the part's own output (--logg).
    python3 tools/regresjon/saker.py saker --dir DIR --modus natt|uke [--kjoring URL] [--dry]
        Once, after the parts: every resultat*.json under DIR. A test red twice (with the same seed, so not a bad roll) opens or
        updates its issue `regresjon` (the check, the nights in a row, the files the test covers and the commits that touched them
        since it was green, the run); three nights in a row adds `kronisk`; a test green tonight closes its issue; red then green
        alone is «ustabil» (named in the summary, no issue). Tests not run tonight (3D and the timed ones on the nights between
        Mondays) are left as they are. Prints the summary in Markdown (the job's summary) and as the last line `REGRESJON {json}`.
    python3 tools/regresjon/saker.py balanse --dir DIR [--kjoring URL] [--dry]
        The balance check (simday, progweek, fiskeplay): DIR/balanse-*.txt are tonight's outputs. They are kept in the one issue
        `balanse`, and each line is compared with last night's there (the same words with the numbers taken out are the same line):
        a number that moved more than 15 % is put on top. Never fixed by a routine; it is Jonas' (klynge.py does not read it).
    python3 tools/regresjon/saker.py --selftest
        The checks of this file, on made-up data, with nothing fetched.

GitHub is reached with `gh api` and the workflow's GH_TOKEN (issues: write). --dry prints what it would do and writes nothing.
"""
import argparse, datetime, hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO = 'Grubleriet-AS/FishyBusiness-'
LABEL, KRONISK, BALANSE = 'regresjon', 'kronisk', 'balanse'
KRONISK_N = 3          # nights in a row on the same test (CLAUDE.md, «Kronisk røde tester», 15.11.2026)
BAL_LIMIT = 0.15       # a balance number that moves more than this from last night goes on top (tools/regresjon/RUTINE.md before fase 5)
MARK = re.compile(r'<!-- regresjon (\{.*?\}) -->')
BAL_MARK = '<!-- balanse -->'
HIST = os.path.join(ROOT, 'tests', 'historikk.tsv')
LABELS = {LABEL: ('d93f0b', 'En test som er rød i regresjonen (regresjon.yml); klynge.py leser den som en teknisk klynge'),
          KRONISK: ('b60205', 'Rød tre netter på rad på samme test'),
          BALANSE: ('fbca04', 'Balansesjekken fra regresjonen: tallene natt for natt, rettes aldri av en rutine')}


def cluster_id(test):
    """The id of a test's cluster, the same each night (klynge.py and the PRs name it `klynge:<id>`)."""
    return hashlib.sha1(('regresjon:' + test).encode()).hexdigest()[:8]


def covered(test):
    """The files tests/run.py's COVER says the test covers: what a fix may touch, and how risky it is."""
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    import run as R
    return sorted(f for f, ts in R.COVER.items() if test in ts and not f.startswith('tests/'))


# ---------- igjen: in each part ----------
def hist_rows(start):
    try: lines = open(HIST, encoding='utf-8').read().splitlines()
    except OSError: return []
    rows = []
    for l in lines[start:]:
        r = l.split('\t')
        if len(r) >= 5: rows.append({'test': r[3], 'status': r[4], 'lite': len(r) > 6 and r[6] == 'lite', 'sjekk': r[8] if len(r) > 8 else ''})
    return rows


UNIT_LINE = re.compile(r'^(OK|FEIL)\s+unit\s')


def unit_row(text):
    """The unit tests' result from run.py's output (they write no line in tests/historikk.tsv): status and the first red check."""
    lines = text.splitlines()
    for i, l in enumerate(lines):
        m = UNIT_LINE.match(l)
        if m:
            red = next((x.strip() for x in lines[i + 1:i + 40] if x.strip().startswith('FEIL')), '')
            return {'test': 'unit', 'status': m.group(1), 'lite': True, 'sjekk': red[:160]}
    return None


def igjen(a):
    first = hist_rows(a.fra)
    u = unit_row(open(a.logg, encoding='utf-8', errors='replace').read()) if a.logg and os.path.exists(a.logg) else None
    if u: first = [u] + first
    out = []
    for r in first:
        r['del'] = a.del_ or ''; r['igjen'] = None
        if r['status'] == 'FEIL' and r['test'] == 'unit':
            p = subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'run.py'), 'smoke', 'unit'], cwd=ROOT, capture_output=True, text=True)
            u2 = unit_row(p.stdout); r['igjen'] = u2['status'] if u2 else 'FEIL'
        elif r['status'] == 'FEIL':
            # alone this time: python3 tests/run.py smoke <test> runs a single test alone (no other test beside it)
            n = len(open(HIST, encoding='utf-8').read().splitlines())
            subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'run.py'), 'smoke', r['test']], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            again = [x for x in hist_rows(n) if x['test'] == r['test']]
            r['igjen'] = again[0]['status'] if again else 'FEIL'
            if again and again[0]['status'] == 'FEIL' and again[0]['sjekk']: r['sjekk'] = again[0]['sjekk']
        out.append(r)
    json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('%d tester, %d røde første gang, %d røde alene' % (len(out), sum(r['status'] == 'FEIL' for r in out), sum(r['igjen'] == 'FEIL' for r in out)))
    return 0


# ---------- saker: once, after the parts ----------
def merge(results):
    """test -> the last result for it (a test is in one part only; the unit tests are «unit»)."""
    by = {}
    for r in results: by[r['test']] = r
    return by


def verdict(r):
    if r['status'] == 'FEIL' and r.get('igjen') == 'OK': return 'ustabil'
    if r['status'] == 'FEIL': return 'rod'
    if r['status'] == 'OK': return 'gronn'
    return 'les'   # LES: numbers to read, never an issue


def parse_issue(i):
    m = MARK.search(i.get('body') or '')
    if not m: return None
    try: d = json.loads(m.group(1))
    except ValueError: return None
    d['number'] = i['number']; d['labels'] = [l['name'] if isinstance(l, dict) else l for l in i.get('labels') or []]
    return d


def plan(by, issues, today, modus):
    """What to do with the issues, without doing it: [(action, test, data)]. action: open, update, close."""
    open_ = {}
    for i in issues:
        d = parse_issue(i)
        if d and d.get('test'): open_[d['test']] = d
    acts = []
    for t, r in sorted(by.items()):
        v = verdict(r); d = open_.get(t)
        if v == 'rod':
            if d:
                nights = int(d.get('netter') or 1) + (0 if d.get('sist') == today else 1)
                acts.append(('update', t, {'netter': nights, 'forst': d.get('forst') or today, 'sist': today, 'sjekk': r.get('sjekk') or d.get('sjekk', ''),
                                          'number': d['number'], 'kronisk': nights >= KRONISK_N, 'hadde_kronisk': KRONISK in d['labels']}))
            else:
                acts.append(('open', t, {'netter': 1, 'forst': today, 'sist': today, 'sjekk': r.get('sjekk', ''), 'kronisk': False}))
        elif v == 'gronn' and d:
            acts.append(('close', t, {'number': d['number']}))
    return acts


def body(t, d, files, commits, run_url, modus):
    cid = cluster_id(t)
    meta = {'test': t, 'id': cid, 'netter': d['netter'], 'forst': d['forst'], 'sist': d['sist'], 'sjekk': (d.get('sjekk') or '')[:300]}
    L = ['<!-- regresjon %s -->' % json.dumps(meta, ensure_ascii=False),
         '**`%s` er rød i regresjonen** (`klynge:%s`): %d %s på rad, først %s, sist %s (%s).' % (
             t, cid, d['netter'], 'natt' if d['netter'] == 1 else 'netter', d['forst'], d['sist'], 'natt til mandag, med 3D' if modus == 'uke' else 'natt'),
         '', 'Rød to ganger med samme frø (`seed=1`), andre gang alene: ikke et dårlig kast.', '', 'Sjekken:', '', '```', (d.get('sjekk') or '(ingen sjekklinje: se loggen)')[:300], '```', '']
    if files: L += ['Filene testen dekker (`COVER` i `tests/run.py`): ' + ', '.join('`%s`' % f for f in files[:20]) + (' …' if len(files) > 20 else ''), '']
    if commits:
        L += ['Commitene fra regresjonen før den første røde natta som rører dem:', ''] + ['- %s' % c for c in commits[:12]] + ['']
    if run_url: L += ['Kjøringen og loggene (artefaktene `logg-…`): ' + run_url, '']
    L += ['---', 'Driften (`tools/triage/klynge.py`) leser saken som en teknisk klynge og retter den innenfor Opus-taket, etter spillernes feil. '
          'En PR som retter den, nevner `klynge:%s`. Koden rettes, ikke testen: å endre eller slå av en sjekk krever Jonas (`CLAUDE.md`). '
          'Saken lukkes av regresjonen når testen er grønn igjen.' % cid]
    return '\n'.join(L)


def gh(args, data=None):
    p = subprocess.run(['gh', 'api'] + args + (['--input', '-'] if data is not None else []), input=json.dumps(data) if data is not None else None,
                       capture_output=True, text=True, cwd=ROOT)
    if p.returncode: raise RuntimeError('gh api %s: %s' % (' '.join(args[:3]), (p.stderr or p.stdout).strip()[:300]))
    return json.loads(p.stdout) if p.stdout.strip() else None


def ensure_labels():
    have = {l['name'] for l in gh(['repos/%s/labels?per_page=100' % REPO]) or []}
    for n, (c, d) in LABELS.items():
        if n not in have: gh(['-X', 'POST', 'repos/%s/labels' % REPO], {'name': n, 'color': c, 'description': d})


def since_for(forst, modus):
    """From when the commits are looked at: the regression before the first red night (two days back at night, eight on Mondays)."""
    d = datetime.date.fromisoformat(forst) - datetime.timedelta(days=8 if modus == 'uke' else 2)
    return d.isoformat()


def commits_for(files, since):
    if not files: return []
    p = subprocess.run(['git', 'log', '--since=' + since, '--no-merges', '--format=%h %ad %s', '--date=short', 'origin/ccr-5e1ba2f4-pusvyd', '--'] + files,
                       capture_output=True, text=True, cwd=ROOT)
    return [l[:140] for l in p.stdout.splitlines() if l.strip()]


def summary_md(by, acts, modus, run_url):
    v = {t: verdict(r) for t, r in by.items()}
    red = sorted(t for t, x in v.items() if x == 'rod'); flaky = sorted(t for t, x in v.items() if x == 'ustabil')
    ok = sum(x == 'gronn' for x in v.values())
    L = ['# Regresjonen %s: %d OK, %d røde, %d ustabile' % ('natt til mandag (med 3D)' if modus == 'uke' else 'i natt', ok, len(red), len(flaky)), '']
    new = [t for a, t, d in acts if a == 'open']
    if new: L += ['**Nytt rødt:** ' + ', '.join('`%s`' % t for t in new), '']
    kr = [t for a, t, d in acts if a == 'update' and d['kronisk'] and not d['hadde_kronisk']]
    if kr: L += ['**Kronisk nå (tre netter på rad):** ' + ', '.join('`%s`' % t for t in kr), '']
    if red: L += ['Røde (to ganger, andre gang alene): ' + ', '.join('`%s`' % t for t in red), '']
    if flaky: L += ['Ustabile (røde, så grønne alene; ingen sak): ' + ', '.join('`%s`' % t for t in flaky), '']
    closed = [t for a, t, d in acts if a == 'close']
    if closed: L += ['Grønne igjen (saken lukket): ' + ', '.join('`%s`' % t for t in closed), '']
    if run_url: L += [run_url]
    return '\n'.join(L), {'ok': ok, 'rode': red, 'ustabile': flaky, 'nye': new, 'kronisk': kr, 'lukket': closed}


def load_results(d):
    out = []
    for root, _, files in os.walk(d):
        for f in sorted(files):
            if f.startswith('resultat') and f.endswith('.json'):
                try: out += json.load(open(os.path.join(root, f), encoding='utf-8'))
                except ValueError: print('::warning::%s kunne ikke leses' % f)
    return out


def saker(a):
    today = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    by = merge(load_results(a.dir))
    issues = [] if a.dry and os.environ.get('SAKER_UTEN_GH') else gh(['repos/%s/issues?state=open&labels=%s&per_page=100' % (REPO, LABEL)]) or []
    acts = plan(by, issues, today, a.modus)
    if not a.dry: ensure_labels()
    for act, t, d in acts:
        if act == 'close':
            print('lukker #%d (%s er grønn)' % (d['number'], t))
            if not a.dry:
                gh(['-X', 'POST', 'repos/%s/issues/%d/comments' % (REPO, d['number'])], {'body': 'Grønn i regresjonen %s%s. Lukket av `regresjon.yml`.' % (today, (': ' + a.kjoring) if a.kjoring else '')})
                gh(['-X', 'PATCH', 'repos/%s/issues/%d' % (REPO, d['number'])], {'state': 'closed', 'state_reason': 'completed'})
            continue
        files = covered(t)
        since = since_for(d['forst'], a.modus)
        b = body(t, d, files, commits_for(files, since), a.kjoring, a.modus)
        title = 'Regresjon: %s er rød%s' % (t, (' (%s)' % d['sjekk'][:70]) if d.get('sjekk') else '')
        labels = [LABEL] + ([KRONISK] if d['kronisk'] else [])
        if act == 'open':
            print('åpner sak: %s' % title)
            if not a.dry: gh(['-X', 'POST', 'repos/%s/issues' % REPO], {'title': title, 'body': b, 'labels': labels})
        else:
            print('oppdaterer #%d: %s, %d netter%s' % (d['number'], t, d['netter'], ', kronisk' if d['kronisk'] else ''))
            if not a.dry:
                gh(['-X', 'PATCH', 'repos/%s/issues/%d' % (REPO, d['number'])], {'title': title, 'body': b})
                if d['kronisk'] and not d['hadde_kronisk']: gh(['-X', 'POST', 'repos/%s/issues/%d/labels' % (REPO, d['number'])], {'labels': [KRONISK]})
    md, s = summary_md(by, acts, a.modus, a.kjoring)
    print(md)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write(md + '\n')
    print('REGRESJON ' + json.dumps(s, ensure_ascii=False))
    return 0


# ---------- balanse: the balance check ----------
NUMS = re.compile(r'-?\d+(?:[.,]\d+)?')


def bal_lines(text):
    """{key: [numbers]} for each line with a number; the key is the line with its numbers taken out (and the n-th such line)."""
    out, seen = {}, {}
    for l in text.splitlines():
        l = l.strip()
        nums = NUMS.findall(l)
        if not nums or len(l) > 400: continue
        k = NUMS.sub('#', l)
        seen[k] = seen.get(k, 0) + 1
        if seen[k] > 1: k = '%s [%d]' % (k, seen[k])
        out[k] = [float(n.replace(',', '.')) for n in nums]
    return out


def bal_compare(prev, now):
    """[(key, old, new, share)] for the numbers that moved more than BAL_LIMIT; a line missing on either side is left out."""
    out = []
    for k, ns in now.items():
        ps = prev.get(k)
        if not ps or len(ps) != len(ns): continue
        for o, n in zip(ps, ns):
            if o == n: continue
            share = abs(n - o) / abs(o) if o else 1.0
            if share > BAL_LIMIT and abs(n - o) >= 1: out.append((k, o, n, share))
    return out


def bal_body(outputs, moved, today, run_url):
    L = [BAL_MARK, '**Balansesjekken %s** (`simday`, `progweek`, `fiskeplay`, hele kysten, frø 1; `regresjon.yml`).' % today, '']
    if moved:
        L += ['**Over 15 % fra natta før:**', ''] + ['- `%s`: %g → %g (%+.0f %%)' % (k[:160], o, n, (n - o) / o * 100 if o else 100) for k, o, n, s in moved[:40]] + ['']
    else: L += ['Ingen tall flyttet seg mer enn 15 % fra natta før.', '']
    if run_url: L += ['Kjøringen: ' + run_url, '']
    L += ['Rettes aldri av en rutine (Driften leser ikke denne saken): det er Jonas som avgjør balansen. Utskriften fra i natt under er det neste natt sammenlignes med.', '']
    for name, text in sorted(outputs.items()):
        keep = '\n'.join(l for l in text.splitlines() if NUMS.search(l))[-12000:]
        L += ['<details><summary>%s</summary>' % name, '', '```text', keep, '```', '</details>', '']
    return '\n'.join(L)


def bal_prev(b):
    """The outputs kept in the issue's body: {name: text}."""
    out = {}
    for m in re.finditer(r'<details><summary>([^<]+)</summary>\s*```text\n(.*?)\n```', b or '', re.S): out[m.group(1)] = m.group(2)
    return out


def balanse(a):
    today = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    outputs = {}
    for f in sorted(os.listdir(a.dir)) if os.path.isdir(a.dir) else []:
        if f.startswith('balanse-') and f.endswith('.txt'): outputs[f[8:-4]] = open(os.path.join(a.dir, f), encoding='utf-8', errors='replace').read()
    if not outputs: print('Ingen utskrift fra balansesjekken'); return 1
    issues = [] if a.dry and os.environ.get('SAKER_UTEN_GH') else gh(['repos/%s/issues?state=open&labels=%s&per_page=10' % (REPO, BALANSE)]) or []
    issue = next((i for i in issues if BAL_MARK in (i.get('body') or '')), None)
    prev = bal_prev(issue.get('body') if issue else '')
    moved = []
    for name, text in outputs.items(): moved += [('%s: %s' % (name, k), o, n, s) for k, o, n, s in bal_compare(bal_lines(prev.get(name, '')), bal_lines(text))]
    b = bal_body(outputs, moved, today, a.kjoring)
    print('%d tall over 15 %% fra natta før' % len(moved))
    for k, o, n, s in moved[:20]: print('  %s: %g -> %g' % (k[:120], o, n))
    if not a.dry:
        ensure_labels()
        if issue: gh(['-X', 'PATCH', 'repos/%s/issues/%d' % (REPO, issue['number'])], {'body': b})
        else: gh(['-X', 'POST', 'repos/%s/issues' % REPO], {'title': 'Balansesjekken natt for natt', 'body': b, 'labels': [BALANSE]})
        if moved and issue: gh(['-X', 'POST', 'repos/%s/issues/%d/comments' % (REPO, issue['number'])], {'body': '%s: %d tall over 15 %% fra natta før (øverst i saken).' % (today, len(moved))})
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n## Balansen\n\n%d tall over 15 %% fra natta før.\n' % len(moved))
    return 0


# ---------- the checks ----------
def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    eq('id fast', cluster_id('errtest'), cluster_id('errtest')); eq('id 8 hex', bool(re.fullmatch(r'[0-9a-f]{8}', cluster_id('x'))), True)
    eq('rød', verdict({'status': 'FEIL', 'igjen': 'FEIL'}), 'rod'); eq('ustabil', verdict({'status': 'FEIL', 'igjen': 'OK'}), 'ustabil')
    eq('grønn', verdict({'status': 'OK'}), 'gronn'); eq('les', verdict({'status': 'LES'}), 'les')
    mk = lambda n, t, netter, sist, labels=(): {'number': n, 'labels': [{'name': l} for l in labels], 'body': '<!-- regresjon %s -->\ntekst' % json.dumps(
        {'test': t, 'netter': netter, 'forst': '2026-11-17', 'sist': sist, 'sjekk': 'gammel'})}
    issues = [mk(5, 'aaa', 2, '2026-11-18'), mk(6, 'bbb', 1, '2026-11-18'), mk(7, 'ccc', 3, '2026-11-19', ['regresjon', 'kronisk']), mk(8, 'ddd', 1, '2026-11-18')]
    by = merge([{'test': 'aaa', 'status': 'FEIL', 'igjen': 'FEIL', 'sjekk': 'FEIL ny'}, {'test': 'bbb', 'status': 'OK', 'igjen': None},
                {'test': 'ccc', 'status': 'FEIL', 'igjen': 'FEIL', 'sjekk': ''}, {'test': 'eee', 'status': 'FEIL', 'igjen': 'FEIL', 'sjekk': 'FEIL x'},
                {'test': 'fff', 'status': 'FEIL', 'igjen': 'OK', 'sjekk': 'FEIL y'}, {'test': 'ggg', 'status': 'OK', 'igjen': None}])
    acts = {(a, t): d for a, t, d in plan(by, issues, '2026-11-19', 'natt')}
    eq('rød igjen: tre netter, kronisk', (acts.get(('update', 'aaa')) or {}).get('netter'), 3)
    eq('kronisk satt ved tre', (acts.get(('update', 'aaa')) or {}).get('kronisk'), True)
    eq('ny sjekk', (acts.get(('update', 'aaa')) or {}).get('sjekk'), 'FEIL ny')
    eq('grønn lukker', ('close', 'bbb') in acts, True)
    eq('samme natt to ganger teller ikke', (acts.get(('update', 'ccc')) or {}).get('netter'), 3)
    eq('tom sjekk beholder den gamle', (acts.get(('update', 'ccc')) or {}).get('sjekk'), 'gammel')
    eq('ny rød åpner', ('open', 'eee') in acts, True)
    eq('ustabil åpner ingen sak', any(t == 'fff' for _, t in acts), False)
    eq('grønn uten sak: ingenting', any(t == 'ggg' for _, t in acts), False)
    eq('ikke kjørt i natt: urørt', any(t == 'ddd' for _, t in acts), False)
    eq('commitene fra natta før', since_for('2026-11-19', 'natt'), '2026-11-17'); eq('commitene fra uka før', since_for('2026-11-23', 'uke'), '2026-11-15')
    b = body('aaa', acts[('update', 'aaa')], ['src/js/x.js'], ['abc1234 2026-11-18 noe'], 'https://run', 'natt')
    d = parse_issue({'number': 5, 'labels': [], 'body': b})
    eq('saken leses tilbake', (d or {}).get('netter'), 3); eq('klynge i saken', ('klynge:' + cluster_id('aaa')) in b, True)
    md, s = summary_md(by, plan(by, issues, '2026-11-19', 'natt'), 'natt', '')
    eq('oppsummering: nye', s['nye'], ['eee']); eq('oppsummering: ustabile', s['ustabile'], ['fff']); eq('oppsummering: kronisk nå', s['kronisk'], ['aaa'])
    # the balance: the same line with other numbers, a line that moved little, and a line that is new
    prev = 'Husøy 500 kg på 3,1 t\nprogweek: 302 kg per tur\nlinje uten tall\nkassen 1000 kr'
    now = 'Husøy 500 kg på 3,2 t\nprogweek: 142 kg per tur\nlinje uten tall\nkassen 1100 kr\nny linje 7'
    mv = bal_compare(bal_lines(prev), bal_lines(now))
    eq('balanse: bare det som flyttet over 15 %', [(k, o, n) for k, o, n, s_ in mv], [('progweek: # kg per tur', 302.0, 142.0)])
    eq('balanse: komma som desimal', bal_lines('3,5 t')['# t'], [3.5])
    eq('balanse: like linjer nummereres', sorted(bal_lines('a 1\na 2')), ['a #', 'a # [2]'])
    eq('enhetstestene fra loggen', unit_row('Bygg først\nFEIL unit          12 s  Node      5 FEIL\n       FEIL vind: 3\nOK   x'),
       {'test': 'unit', 'status': 'FEIL', 'lite': True, 'sjekk': 'FEIL vind: 3'})
    eq('enhetstestene grønne', (unit_row('OK   unit           9 s  Node      5140 OK') or {}).get('status'), 'OK'); eq('ingen enhetstester', unit_row('OK   x'), None)
    eq('balanse: utskriften leses tilbake', bal_prev(bal_body({'simday': 'x 1\ny 2'}, [], '2026-11-19', '')), {'simday': 'x 1\ny 2'})
    # covered() reads tests/run.py's COVER: errtest covers the error trap, never a test file
    cv = covered('errtest')
    eq('COVER: errtest dekker errtrap.js', 'src/js/errtrap.js' in cv, True); eq('COVER: ingen testfiler', any(f.startswith('tests/') for f in cv), False)
    for b_ in bad: print('FEIL ' + b_)
    print('OK selvtest saker.py' if not bad else '%d FEIL' % len(bad))
    return 1 if bad else 0


def main():
    if '--selftest' in sys.argv: sys.exit(selftest())
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    g = sub.add_parser('igjen'); g.add_argument('--fra', type=int, required=True); g.add_argument('--out', required=True); g.add_argument('--del', dest='del_', default=''); g.add_argument('--logg', default='')
    s = sub.add_parser('saker'); s.add_argument('--dir', required=True); s.add_argument('--modus', choices=['natt', 'uke'], required=True); s.add_argument('--kjoring', default=''); s.add_argument('--dry', action='store_true')
    b = sub.add_parser('balanse'); b.add_argument('--dir', required=True); b.add_argument('--kjoring', default=''); b.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    sys.exit({'igjen': igjen, 'saker': saker, 'balanse': balanse}[a.cmd](a))


if __name__ == '__main__':
    main()
