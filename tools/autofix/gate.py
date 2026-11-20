#!/usr/bin/env python3
"""The gate for a fix that goes out by itself (02.11.2026; Jonas: «jeg vil ha prosessen så helautomatisert som overhodet mulig»).

The fix routine (tools/feilretting/RUTINE.md; before 18.11.2026 tools/feedback/RUTINE.md) opens a PR against the working branch with the label `autofix` when a fix is small and
plain; .github/workflows/autofix.yml runs this on it, and merges and deploys when it passes. It passes only when:

1. Its risk is `lav` (tools/ci/risiko.py, 18.11.2026): only the UI, the stylesheet, tests that are only added to, and docs. Real
   money, accounts and saved player data, the database, the core mechanics, the 3D engine and the rest are `middels` or `hoy`, and
   wait for Jonas' click (Jonas 18.11.2026; the exception for fixes in real money from 17.11.2026 is gone). The files must also be
   ones a fix may touch (ALLOW) and none of DENY, kept for the copies of this file that read them (slipp.yml before 18.11.2026).
2. It is small: at most MAX_LINES lines added and removed together, MAX_FILES files (risiko.MAX_LINES and MAX_FILES). The fix's own new screenshots in docs/pr/<branch>/
   (JPEG or PNG, each under SHOT_MAX, at most SHOT_N) are not counted as lines (04.11.2026).
3. No added code line does what a fix to the game never needs and an attack would: talk to another host (an address that is not
   detstorebla.no), run text as code (eval, new Function, import()), read cookies, beacons, sockets, new workers, write the document.
   The error list and the feedback that the routine reads come from anyone; this is the guard against a «fix» written by them.
4. No test goes red that is green on the working branch, and the fix's own tests are green: the tests that cover the changed files
   (COVER in tests/run.py, as `run.py changed` picks them) and the unit tests, on the PR's build. Only a test red there is run on the
   working branch's build too, to see whether it was red before the fix (20.11.2026: before, every test ran on both builds, one after
   the other, and a fix in the 3D view took close to the job's three hours). A test red with the fix and green without is run again
   alone, up to RETRY times; red every time is a fault of the fix, and the gate stops at the first such fault without trying the
   rest (Jonas 20.11.2026: «stoppe og avvise PR-en så snart den første testen er bekreftet som en ny feil»). The cheapest red test
   is tried first.
5. Red test first (18.11.2026): a test the fix wrote or changed (its own files under tests/) is red on the working branch's build,
   with the fix's test files copied in, and green with the fix. Since 20.11.2026 only the fix's own test counts as that proof, not any
   test that covers it (Jonas: «beviset for "rød test først" nå må komme fra den nye eller endrede testen selv»): an old test that is
   red at random on the working branch cannot prove a fix. Without that proof only a pure CSS or text change (risiko.css_tekst) goes
   out by itself; any other fix waits for Jonas' click like a middels one. A test of the fix's own that is red with the fix is a fault.

The gate runs as one command (the default: the step «Slipper rettingen til spillerne» against main, and by hand), or in parts on
several of GitHub's machines (.github/workflows/autofix.yml, 20.11.2026):

    gate.py --lag-plan --out plan.json      1-3 above, the tests to run and how they are split (tools/regresjon/deler.py fordel)
    gate.py --kjor --tester "a b" --out f   one part: builds the PR and runs those tests (tests/run.py smoke)
    gate.py --kjor-base --plan plan.json --out f
                                            the fix's own tests on the working branch's build (the proof in 5)
    gate.py --avgjor --plan plan.json --dir art --out gate.json
                                            puts the parts together, runs the unit tests, a red test again and on the working
                                            branch, and decides as the one command does
    gate.py --selftest                      the decision (decide) on made-up results

--repo is the tree under test (default: this file's own). The workflow runs the gate from the working branch's tree and points
--repo at the PR's: a fix cannot change the gate that judges it (20.11.2026; before, the PR's own gate.py and risiko.py ran).

Prints what it found, writes it as JSON (--out) and exits 0 when the fix may go out by itself, 3 when it is tested and ready but its
risk waits for Jonas' click (18.11.2026), 1 when it is stopped for a fault, 2 on a fault of its own.
"""
import argparse, glob, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'ci'))
import risiko   # the one place the classes are (tools/ci/risiko.py)
ALLOW = re.compile(r'^(src/js/|src/styles\.css$|tests/|docs/)')
# real money is denied again from 18.11.2026 (Jonas: «Fjern unntaket som lar automatiske rettinger i ekte penger, Stripe og butikk
# slippes uten godkjenning»; it was let through from 17.11.2026), and so are the save format and the cloud. risiko.py decides; DENY
# holds the same files so a copy of this file that reads only ALLOW and DENY (slipp.yml before 18.11.2026) stops them too
DENY = re.compile(r'^(src/js/errtrap\.js|src/js/ui/10f-cloud\.js|src/js/ui/10g-push\.js|src/js/ui/02-format-state\.js|'
                  r'src/js/ui/10i-shop\.js|src/js/ui/10q-buymoment\.js|src/js/ui/10u-hopp\.js|src/js/core/06j-hopp\.js|src/js/ui/10j-paint\.js|'
                  r'src/js/ui/06e-feedback\.js|src/js/lib/|tests/_env\.py|tests/run\.py|tests/unit/run\.mjs|docs/systemer/tilbakemelding-og-admin\.md)')
MAX_LINES, MAX_FILES = risiko.MAX_LINES, risiko.MAX_FILES   # 150 and 6 from 18.11.2026 (400 and 15 before)
# the fix's own screenshots (tools/feedback/RUTINE.md, D4 26.10.2026: docs/pr/<branch>/staaende.jpg and liggende.jpg) are not lines of code:
# Jonas 04.11.2026 «porten for automatiske rettinger skal slippe gjennom skjermbilder». Only new pictures there, each a real JPEG or PNG
# under SHOT_MAX bytes and at most SHOT_N of them; any other binary file still counts as 1998 lines
SHOT = re.compile(r'^docs/pr/[^/]+/[^/]+\.(jpe?g|png)$', re.I)
SHOT_MAX, SHOT_N = 200 * 1024, 4
RETRY = 2   # how many times a test red with the fix, green without, is run again alone before it stops the fix
DELER = 3   # at most this many of GitHub's machines for the PR's tests (one more runs the fix's own tests on the working branch)
GREEN = ('OK', 'LES')
BAD = [(re.compile(r'https?://(?!(www\.)?detstorebla\.no\b)', re.I), 'en adresse til en annen vert'),
       (re.compile(r'\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(\s*[\'"`]|\bimport\s*\('), 'tekst som kjøres som kode'),
       (re.compile(r'document\.cookie|sendBeacon|\bWebSocket\b|new\s+(Shared)?Worker\b|document\.write\b|\bsetTimeout\s*\(\s*[\'"`]'), 'noe en retting av spillet ikke trenger'),
       (re.compile(r'DSB_CLOUD|supabase|cloudRpc|localStorage\.clear|FEEDBACK_AGENT|service_role', re.I), 'skyen, lagringen eller nøklene')]
SKY = BAD[-1][1]   # the cloud, the save and the keys: not an attack by itself in a fix Jonas will look at, so a risk, not a fault (18.11.2026)
REPO = ROOT        # the tree under test (--repo)


def git(*a):
    return subprocess.run(['git'] + list(a), cwd=REPO, capture_output=True, text=True, check=True).stdout


def shot_ok(f):
    """'' when f in HEAD is a JPEG or PNG under SHOT_MAX bytes, else why not."""
    size = int(git('cat-file', '-s', 'HEAD:' + f).strip())
    if size > SHOT_MAX: return '%d kB, grensen er %d kB' % (size // 1024, SHOT_MAX // 1024)
    head = subprocess.run(['git', 'cat-file', 'blob', 'HEAD:' + f], cwd=REPO, capture_output=True, check=True).stdout[:8]
    if not (head[:3] == b'\xff\xd8\xff' or head == b'\x89PNG\r\n\x1a\n'): return 'ikke et JPEG- eller PNG-bilde'
    return ''


def unit_own_any(files):
    return any(f.startswith('tests/unit/') and f != 'tests/unit/run.mjs' for f in files)


def results(text):
    """OK/FEIL/LES per test from run.py's summary lines."""
    out = {}
    for l in text.splitlines():
        m = re.match(r'^(OK|FEIL|LES)\s+(\S+)\s+\d+ s', l)
        if m: out[m.group(2)] = m.group(1)
    return out


def run_tests(root, names, env=None):
    if not names: return {}, ''
    p = subprocess.run([sys.executable, os.path.join(root, 'tests', 'run.py'), 'smoke'] + names, cwd=root, capture_output=True, text=True,
                       env=dict(os.environ, **(env or {})))
    return results(p.stdout), p.stdout[-6000:]


def build(root):
    """'' when node build.mjs in root holds, else the end of its errors."""
    b = subprocess.run(['node', 'build.mjs'], cwd=root, capture_output=True, text=True)
    return '' if b.returncode == 0 else (b.stderr or b.stdout)[-300:]


def unit(root):
    """(green, the last line) of the unit tests in root."""
    u = subprocess.run(['node', os.path.join(root, 'tests', 'unit', 'run.mjs')], cwd=root, capture_output=True, text=True)
    return u.returncode == 0, (u.stdout.strip().splitlines() or [''])[-1][:200]


def check(base):
    """1-3: the risk, the files, the size and the added code, and which tests cover the change. R as the gate writes it."""
    # why: faults (the fix is wrong or not a fix); risk: what only Jonas lets out (18.11.2026). The tests run when there are no faults,
    # also when the risk stops it, so a `middels` or `hoy` fix comes to Jonas tested, ready for his one click
    R = {'ok': False, 'why': [], 'risk': [], 'files': [], 'lines': 0, 'bad': [], 'tests': {}}
    mb = git('merge-base', 'HEAD', base).strip()
    files = [f for f in git('diff', '--name-only', mb, 'HEAD').split('\n') if f]
    R['files'] = files
    # 0. the risk (tools/ci/risiko.py): only `lav` goes out by itself; `middels` and `hoy` wait for Jonas' click
    rk = risiko.from_git(base, 'HEAD', REPO, SHOT); R['risiko'] = rk
    if rk['klasse'] != risiko.LAV:
        R['risk'].append('risiko %s (%s)' % (rk['klasse'], '; '.join(sorted({'%s: %s' % (w['fil'], w['hvorfor']) for w in rk['grunner']}))[:400]))
    # 1. the files
    for f in files:
        if not ALLOW.match(f) or DENY.match(f): R['risk'].append('filen %s er ikke en automatisk retting får endre' % f)
    if not files: R['why'].append('ingen endringer')
    # 2. the size (the screenshots apart, shot_ok)
    added = set(f for f in git('diff', '--name-only', '--diff-filter=A', mb, 'HEAD').split('\n') if f)
    R['shots'] = []
    for l in git('diff', '--numstat', mb, 'HEAD').split('\n'):
        p = l.split('\t')
        if len(p) != 3: continue
        if p[0] == '-' and p[1] == '-' and p[2] in added and SHOT.match(p[2]):
            why = shot_ok(p[2])
            if why: R['why'].append('skjermbildet %s: %s' % (p[2], why))
            else: R['shots'].append(p[2])
            continue
        R['lines'] += (int(p[0]) if p[0].isdigit() else 999) + (int(p[1]) if p[1].isdigit() else 999)
    if len(R['shots']) > SHOT_N: R['why'].append('%d skjermbilder, grensen er %d' % (len(R['shots']), SHOT_N))
    # (a test may be added to, never cut: a fix that makes a test green by taking a check out is not a fix)
    for l in git('diff', '--numstat', '--diff-filter=M', mb, 'HEAD', '--', 'tests/').split('\n'):
        p = l.split('\t')
        if len(p) == 3 and p[1] != '0': R['why'].append('testen %s har fått linjer fjernet (%s)' % (p[2], p[1]))
    if R['lines'] > MAX_LINES: R['risk'].append('%d linjer endret, grensen er %d' % (R['lines'], MAX_LINES))
    if len(files) > MAX_FILES: R['risk'].append('%d filer endret, grensen er %d' % (len(files), MAX_FILES))
    # 3. what the added code does (comments and docs are left out: a source may be named there)
    for f in files:
        if not f.startswith('src/'): continue
        for l in git('diff', '-U0', mb, 'HEAD', '--', f).split('\n'):
            if not l.startswith('+') or l.startswith('+++'): continue
            code = re.sub(r'//.*$', '', l[1:]).strip()
            if code.startswith('*') or code.startswith('/*'): continue
            for rx, what in BAD:
                if rx.search(code): (R['risk'] if what == SKY else R['bad']).append('%s: %s: %s' % (f, what, code[:140]))
    if R['bad']: R['why'].append('kode som ikke hører hjemme i en automatisk retting (%d linjer)' % len(R['bad']))
    # the tests that cover the change (the gate's own copy of COVER; the fix cannot change tests/run.py, DENY), and the fix's own
    sys.path.insert(0, os.path.join(ROOT, 'tests')); import run as RUN
    names = []
    for f in files:
        if f in RUN.COVER: names += RUN.COVER[f]
        elif f.startswith('tests/') and f.count('/') == 1 and f.endswith('.py') and not os.path.basename(f).startswith('_') and f != 'tests/run.py':
            names.append(os.path.basename(f)[:-3])   # a test the fix wrote or changed, also one not in run.py's lists yet (18.11.2026)
        elif f.startswith('src/'): names.append('trip2')
    names = list(dict.fromkeys(n for n in names if os.path.exists(os.path.join(REPO, 'tests', n + '.py'))))
    own = [f for f in files if f.startswith('tests/') and (f.endswith('.py') or f.startswith('tests/unit/'))
           and not os.path.basename(f).startswith('_') and f not in ('tests/run.py', 'tests/unit/run.mjs') and os.path.isfile(os.path.join(REPO, f))]
    R['tests'] = {'names': names, 'own': own, 'own_names': [n for n in names if 'tests/%s.py' % n in own], 'unit_own': unit_own_any(files)}
    return R


def split(R):
    """The machines for the PR's tests (tools/regresjon/deler.py fordel), and one for the fix's own on the working branch."""
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'regresjon')); import deler
    t = R['tests']; parts = []
    for i, p in enumerate(deler.fordel(t['names'], DELER)): parts.append({'navn': 'pr-%d' % (i + 1), 'tester': ' '.join(p), 'base': 'nei'})
    if t['own_names'] or t['unit_own']: parts.append({'navn': 'base', 'tester': ' '.join(t['own_names']), 'base': 'ja'})
    return parts


class Base:
    """The working branch's tree in a worktree, with the fix's own test files copied in, built once when first asked for."""
    def __init__(self, base, own):
        self.base, self.own, self.dir, self.err = base, own, None, ''

    def ready(self):
        if self.dir is None:
            self.dir = tempfile.mkdtemp(prefix='autofix-base-')
            git('worktree', 'add', '--detach', self.dir, self.base)
            # «rød test først» (18.11.2026): the fix's own test files are copied into the working branch's tree, so the gate sees them red there
            for f in self.own:
                os.makedirs(os.path.dirname(os.path.join(self.dir, f)), exist_ok=True)
                with open(os.path.join(REPO, f), 'rb') as src, open(os.path.join(self.dir, f), 'wb') as dst: dst.write(src.read())
            self.err = build(self.dir)
        return not self.err

    def run(self, names):
        if not self.ready(): return {}
        return run_tests(self.dir, [n for n in names if os.path.exists(os.path.join(self.dir, 'tests', n + '.py'))])[0]

    def unit(self):
        return unit(self.dir)[0] if self.ready() else None

    def close(self):
        if self.dir: subprocess.run(['git', 'worktree', 'remove', '--force', self.dir], cwd=REPO, capture_output=True)


def decide(R, mine, base, run_pr, run_base, unit_ok, unit_base=None, cost=None):
    """4 and 5 on the results. mine: the PR's build, {test: OK|FEIL|LES}; base: what is known of the working branch's (the fix's own
    tests); run_pr(names) and run_base(names) run more and return the same; unit_ok: (green, last line) of the unit tests on the PR;
    unit_base: the unit tests on the working branch with the fix's own copied in (None when not run); cost(name): seconds expected.
    Fills R['tests'] and R['why'] / R['risk']."""
    t = R['tests']; names, own = t['names'], set(t['own_names']); base = dict(base); cost = cost or (lambda n: 0)
    t['pr'] = dict(mine); t['unit'] = unit_ok[0]; t['retry'] = {}; t['rod_fra_for'] = []; t['ikke_sjekket'] = []
    if not unit_ok[0]: R['why'].append('enhetstestene er røde: ' + unit_ok[1])
    for n in names:
        if n not in mine: R['why'].append('testen %s ga ikke noe svar' % n)
    reds = sorted((n for n in names if mine.get(n) == 'FEIL'), key=lambda n: (cost(n), names.index(n)))
    for i, n in enumerate(reds):
        if R['why']:   # one fault is enough: the rest are not tried (20.11.2026)
            t['ikke_sjekket'] = reds[i:]; break
        if n not in own:
            # an old test: red on the working branch too is not the fix's doing
            if n not in base: base.update(run_base([n]))
            if base.get(n) == 'FEIL': t['rod_fra_for'].append(n); continue
        again = []
        for _ in range(RETRY):
            r = run_pr([n]).get(n); again.append(r)
            if r in GREEN: break
        t['retry'][n] = again
        if again and again[-1] in GREEN: t.setdefault('flaky', []).append(n); continue
        if n in own: R['why'].append('testen %s som rettingen skrev, er rød med rettingen, også %d ganger til alene' % (n, len(again)))
        else: R['why'].append('testen %s er rød med rettingen%s, også %d ganger til alene' % (n, ', grønn uten' if n in base else '', len(again)))
    t['base'] = base
    if unit_base is not None: t['unit_base'] = unit_base
    # the proof: the fix's own test red without it and green with it (CLAUDE.md «Se testen feile før den stoles på»). Only a pure CSS or
    # text change is let through without one (risiko.css_tekst; Jonas 18.11.2026: «rene CSS- og tekstjusteringer skal kunne
    # verifiseres med bygg og visuell sjekk»). Without it a lav fix does not go out by itself: it waits for Jonas
    proof = [n for n in names if n in own and base.get(n) == 'FEIL' and mine.get(n) in GREEN]
    if t.get('unit_own') and unit_ok[0] and unit_base is False: proof.append('unit')
    t['bevis'] = proof
    if not R['why'] and not proof and not R['risiko'].get('css_tekst'):
        R['risk'].append('ingen test rettingen skrev, er rød uten rettingen og grønn med den («rød test først»; bare ren CSS og tekst slipper)')


def finish(R, out, no_tests=False):
    R['ok'] = not R['why'] and not R['risk']
    R['klar'] = not R['why'] and bool(R['risk'])        # ready for Jonas' click: no fault, only the risk
    if R['ok']: print('SLIPPES UT: risikoen, filene, størrelsen, koden og testene holder')
    elif R['klar']: print('KLAR, VENTER PÅ JONAS: %s (%s)' % ('; '.join(R['risk']), 'testene ikke kjørt' if no_tests else 'filene, koden og testene holder'))
    else: print('STOPPET: ' + '; '.join(R['why'] + R['risk']))
    print('risiko: %s' % R['risiko']['klasse'])
    for l in R['bad'][:20]: print('  ' + l)
    t = R['tests']
    if t.get('flaky'): print('ustabile (røde én gang, grønne alene etterpå):', ', '.join(t['flaky']))
    if t.get('rod_fra_for'): print('røde også uten rettingen (ikke rettingens feil):', ', '.join(t['rod_fra_for']))
    if t.get('ikke_sjekket'): print('ikke prøvd igjen etter den første feilen:', ', '.join(t['ikke_sjekket']))
    if 'pr' in t: print('tester:', json.dumps({n: [t['pr'].get(n), t.get('base', {}).get(n)] for n in t['names']}, ensure_ascii=False))
    if t.get('bevis'): print('bevis (rød uten rettingen, grønn med):', ', '.join(t['bevis']))
    if out: json.dump(R, open(out, 'w'), ensure_ascii=False, indent=1)
    sys.exit(0 if R['ok'] else 3 if R['klar'] else 1)


def cost_fn():
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'regresjon')); import deler
    tt = deler.tider()
    return lambda n: deler.tid(n, tt)


def selftest():
    bad, n = [], [0]
    def case(what, names, own, mine, base_known, pr_again, base_more, unit_ok=(True, ''), unit_base=None, unit_own=False, css=False,
             want_why=None, want_risk=None, want_proof=None, want_base_runs=None, want_pr_runs=None):
        R = {'why': [], 'risk': [], 'risiko': {'klasse': risiko.LAV, 'css_tekst': css},
             'tests': {'names': names, 'own_names': own, 'own': ['tests/%s.py' % n for n in own], 'unit_own': unit_own}}
        n[0] += 1; runs = {'pr': [], 'base': []}
        def rp(ns): runs['pr'] += ns; return {n: (pr_again[n].pop(0) if pr_again.get(n) else 'FEIL') for n in ns}
        def rb(ns): runs['base'] += ns; return {n: base_more.get(n, 'OK') for n in ns}
        decide(R, mine, base_known, rp, rb, unit_ok, unit_base, cost=lambda n: {'tung': 1500}.get(n, 10))
        got = {'why': len(R['why']), 'risk': len(R['risk']), 'proof': R['tests']['bevis'], 'base_runs': runs['base'], 'pr_runs': runs['pr']}
        for k, w in (('why', want_why), ('risk', want_risk), ('proof', want_proof), ('base_runs', want_base_runs), ('pr_runs', want_pr_runs)):
            if w is not None and got[k] != w: bad.append('%s: %s er %r, skal være %r (%s)' % (what, k, got[k], w, '; '.join(R['why'] + R['risk'])))
    # all green with the fix's own test red before: out, and the old tests never ran on the working branch
    case('alt grønt', ['a', 'b', 'ny'], ['ny'], {'a': 'OK', 'b': 'OK', 'ny': 'OK'}, {'ny': 'FEIL'}, {}, {},
         want_why=0, want_risk=0, want_proof=['ny'], want_base_runs=[], want_pr_runs=[])
    # an old test red on the PR and red on the working branch: not the fix's, and not run again on the PR
    case('rød fra før', ['a', 'ny'], ['ny'], {'a': 'FEIL', 'ny': 'OK'}, {'ny': 'FEIL'}, {}, {'a': 'FEIL'},
         want_why=0, want_risk=0, want_proof=['ny'], want_base_runs=['a'], want_pr_runs=[])
    # an old test red on the PR, green on the working branch, red twice more: a fault
    case('ny feil', ['a', 'ny'], ['ny'], {'a': 'FEIL', 'ny': 'OK'}, {'ny': 'FEIL'}, {'a': ['FEIL', 'FEIL']}, {'a': 'OK'},
         want_why=1, want_base_runs=['a'], want_pr_runs=['a', 'a'])
    # red once, green alone: a test that is not steady, the fix goes on
    case('ustabil', ['a', 'ny'], ['ny'], {'a': 'FEIL', 'ny': 'OK'}, {'ny': 'FEIL'}, {'a': ['OK']}, {'a': 'OK'},
         want_why=0, want_risk=0, want_proof=['ny'], want_pr_runs=['a'])
    # no own test red before: only proof from an old test that is red on the working branch does not count (20.11.2026)
    case('ingen egen rød test', ['a', 'ny'], ['ny'], {'a': 'OK', 'ny': 'OK'}, {'ny': 'OK'}, {}, {},
         want_why=0, want_risk=1, want_proof=[])
    case('bevis bare fra egen test', ['gammel'], [], {'gammel': 'OK'}, {'gammel': 'FEIL'}, {}, {},
         want_why=0, want_risk=1, want_proof=[])
    # ... but a pure CSS or text change goes out without one
    case('ren CSS', ['a'], [], {'a': 'OK'}, {}, {}, {}, css=True, want_why=0, want_risk=0, want_proof=[])
    # the fix's own test red with the fix: a fault (before 20.11.2026 it was «red on both» and only waited for Jonas)
    case('egen test rød', ['ny'], ['ny'], {'ny': 'FEIL'}, {'ny': 'FEIL'}, {'ny': ['FEIL', 'FEIL']}, {},
         want_why=1, want_base_runs=[], want_pr_runs=['ny', 'ny'])
    # two new faults: the cheapest is tried first, and the gate stops there without trying the heavy one
    case('stopper ved første', ['tung', 'lett', 'ny'], ['ny'], {'tung': 'FEIL', 'lett': 'FEIL', 'ny': 'OK'}, {'ny': 'FEIL'},
         {'lett': ['FEIL', 'FEIL']}, {'lett': 'OK', 'tung': 'OK'}, want_why=1, want_base_runs=['lett'], want_pr_runs=['lett', 'lett'])
    # the unit tests red: a fault, and the red tests are not tried again at all
    case('enhetstester røde', ['a'], [], {'a': 'FEIL'}, {}, {}, {}, unit_ok=(False, '1 FEIL'), want_why=1, want_base_runs=[], want_pr_runs=[])
    # a test that gave no answer (a part that did not finish): a fault
    case('uten svar', ['a', 'b'], [], {'a': 'OK'}, {}, {}, {}, want_why=1)
    # the fix's own unit test red on the working branch and green with it is the proof
    case('egen enhetstest', ['a'], [], {'a': 'OK'}, {}, {}, {}, unit_base=False, unit_own=True, want_why=0, want_risk=0, want_proof=['unit'])
    print('OK gate selftest (%d tilfeller)' % n[0] if not bad else '%d FEIL\n' % len(bad) + '\n'.join(bad))
    return 1 if bad else 0


def main():
    global REPO
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='origin/ccr-5e1ba2f4-pusvyd'); ap.add_argument('--out'); ap.add_argument('--no-tests', action='store_true')
    ap.add_argument('--repo'); ap.add_argument('--lag-plan', action='store_true'); ap.add_argument('--plan'); ap.add_argument('--kjor', action='store_true'); ap.add_argument('--tester', default='')
    ap.add_argument('--kjor-base', action='store_true'); ap.add_argument('--avgjor', action='store_true'); ap.add_argument('--dir'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: sys.exit(selftest())
    if a.repo: REPO = os.path.abspath(a.repo)
    if a.kjor:   # one part on the PR's build
        err = build(REPO); res = {} if err else run_tests(REPO, a.tester.split())[0]
        json.dump({'pr': res, 'bygg': err}, open(a.out, 'w'), ensure_ascii=False); print(json.dumps(res, ensure_ascii=False), err); return
    if a.kjor_base:   # the fix's own tests on the working branch's build
        P = json.load(open(a.plan)); t = P['tests']; B = Base(a.base, t['own'])
        try:
            res = B.run(t['own_names']); ub = B.unit() if t['unit_own'] else None
        finally: B.close()
        json.dump({'base': res, 'unit_base': ub, 'bygg_base': B.err}, open(a.out, 'w'), ensure_ascii=False); print(json.dumps(res, ensure_ascii=False), ub, B.err); return
    if a.avgjor:
        R = json.load(open(a.plan))
        tested = not R['why'] and not a.no_tests
        if tested:
            mine, base, ub, errs = {}, {}, None, []
            for f in sorted(glob.glob(os.path.join(a.dir, '**', 'del-*.json'), recursive=True)):
                d = json.load(open(f))
                if d.get('bygg'): errs.append(d['bygg'])
                mine.update(d.get('pr') or {}); base.update(d.get('base') or {})
                if 'unit_base' in d: ub = d['unit_base']
            if errs: R['why'].append('bygget feiler: ' + errs[0])
            # (the working branch's build failing is not the fix's fault: its own tests then have no answer there, and no proof)
            B = Base(a.base, R['tests']['own']); built = {'pr': False}
            def run_pr(ns):
                if not built['pr']:
                    e = build(REPO); built['pr'] = True
                    if e: R['why'].append('bygget feiler: ' + e)
                return run_tests(REPO, ns)[0]
            try: decide(R, mine, base, run_pr, B.run, unit(REPO), ub, cost_fn())
            finally: B.close()
        finish(R, a.out, a.no_tests)
    R = check(a.base)
    if a.lag_plan:
        tested = not R['why'] and not a.no_tests
        R['deler'] = split(R) if tested else []
        R['test'] = bool(R['deler']) or tested
        print('Planen:', '; '.join('%s: %s' % (p['navn'], p['tester'] or '(enhetstestene)') for p in R['deler']) or 'ingen tester',
              '| feil så langt:', '; '.join(R['why']) or 'ingen', '| risiko:', '; '.join(R['risk']) or 'ingen')
        json.dump(R, open(a.out, 'w'), ensure_ascii=False, indent=1); return
    # the one command: everything here, one test after the other
    if not R['why'] and not a.no_tests:
        t = R['tests']
        err = build(REPO)
        if err: R['why'].append('bygget feiler: ' + err)
        else:
            mine, log = run_tests(REPO, t['names'])
            B = Base(a.base, t['own'])
            try:
                base = B.run(t['own_names']); ub = B.unit() if t['unit_own'] else None
                decide(R, mine, base, lambda ns: run_tests(REPO, ns)[0], B.run, unit(REPO), ub, cost_fn())
            finally: B.close()
            R['tests']['log'] = log
    finish(R, a.out, a.no_tests)


if __name__ == '__main__':
    try: main()
    except subprocess.CalledProcessError as e: print('FEIL i porten:', e, e.stderr); sys.exit(2)
