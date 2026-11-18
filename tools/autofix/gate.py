#!/usr/bin/env python3
"""The gate for a fix that goes out by itself (02.11.2026; Jonas: «jeg vil ha prosessen så helautomatisert som overhodet mulig»).

The feedback routine (tools/feedback/RUTINE.md) opens a PR against the working branch with the label `autofix` when a fix is small and
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
4. No test goes red that is green on the working branch, and a new test is green: the tests that cover the changed files (COVER in
   tests/run.py, as `run.py changed` picks them), run on the PR's build and on the working branch's, side by side, plus the unit tests.

Prints what it found, writes it as JSON (--out) and exits 0 when the fix may go out by itself, 3 when it is tested and ready but its
risk waits for Jonas' click (18.11.2026), 1 when it is stopped for a fault, 2 on a fault of its own.
"""
import argparse, json, os, re, subprocess, sys, tempfile

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
BAD = [(re.compile(r'https?://(?!(www\.)?detstorebla\.no\b)', re.I), 'en adresse til en annen vert'),
       (re.compile(r'\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(\s*[\'"`]|\bimport\s*\('), 'tekst som kjøres som kode'),
       (re.compile(r'document\.cookie|sendBeacon|\bWebSocket\b|new\s+(Shared)?Worker\b|document\.write\b|\bsetTimeout\s*\(\s*[\'"`]'), 'noe en retting av spillet ikke trenger'),
       (re.compile(r'DSB_CLOUD|supabase|cloudRpc|localStorage\.clear|FEEDBACK_AGENT|service_role', re.I), 'skyen, lagringen eller nøklene')]
SKY = BAD[-1][1]   # the cloud, the save and the keys: not an attack by itself in a fix Jonas will look at, so a risk, not a fault (18.11.2026)


def git(*a):
    return subprocess.run(['git'] + list(a), cwd=ROOT, capture_output=True, text=True, check=True).stdout


def shot_ok(f):
    """'' when f in HEAD is a JPEG or PNG under SHOT_MAX bytes, else why not."""
    size = int(git('cat-file', '-s', 'HEAD:' + f).strip())
    if size > SHOT_MAX: return '%d kB, grensen er %d kB' % (size // 1024, SHOT_MAX // 1024)
    head = subprocess.run(['git', 'cat-file', 'blob', 'HEAD:' + f], cwd=ROOT, capture_output=True, check=True).stdout[:8]
    if not (head[:3] == b'\xff\xd8\xff' or head == b'\x89PNG\r\n\x1a\n'): return 'ikke et JPEG- eller PNG-bilde'
    return ''


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


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='origin/ccr-5e1ba2f4-pusvyd'); ap.add_argument('--out'); ap.add_argument('--no-tests', action='store_true')
    a = ap.parse_args()
    # why: faults (the fix is wrong or not a fix); risk: what only Jonas lets out (18.11.2026). The tests run when there are no faults,
    # also when the risk stops it, so a `middels` or `hoy` fix comes to Jonas tested, ready for his one click
    R = {'ok': False, 'why': [], 'risk': [], 'files': [], 'lines': 0, 'bad': [], 'tests': {}}
    mb = git('merge-base', 'HEAD', a.base).strip()
    files = [f for f in git('diff', '--name-only', mb, 'HEAD').split('\n') if f]
    R['files'] = files
    # 0. the risk (tools/ci/risiko.py): only `lav` goes out by itself; `middels` and `hoy` wait for Jonas' click
    rk = risiko.from_git(a.base, 'HEAD', ROOT, SHOT); R['risiko'] = rk
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
    # 4. the tests, only when the rest holds (they take long)
    if not R['why'] and not a.no_tests:
        sys.path.insert(0, os.path.join(ROOT, 'tests')); import run as RUN
        names = []
        for f in files:
            if f in RUN.COVER: names += RUN.COVER[f]
            elif f.startswith('tests/') and f.endswith('.py') and os.path.basename(f)[:-3] in RUN.D3 + RUN.LITE: names.append(os.path.basename(f)[:-3])
            elif f.startswith('src/'): names.append('trip2')
        names = list(dict.fromkeys(n for n in names if os.path.exists(os.path.join(ROOT, 'tests', n + '.py'))))
        R['tests']['names'] = names
        u = subprocess.run(['node', os.path.join(ROOT, 'tests', 'unit', 'run.mjs')], cwd=ROOT, capture_output=True, text=True)
        R['tests']['unit'] = u.returncode == 0
        if u.returncode: R['why'].append('enhetstestene er røde: ' + (u.stdout.strip().splitlines() or [''])[-1][:200])
        b = subprocess.run(['node', 'build.mjs'], cwd=ROOT, capture_output=True, text=True)
        if b.returncode: R['why'].append('bygget feiler: ' + b.stderr[-300:])
        else:
            mine, log = run_tests(ROOT, names); R['tests']['pr'] = mine
            base_dir = tempfile.mkdtemp(prefix='autofix-base-')
            git('worktree', 'add', '--detach', base_dir, a.base)
            try:
                subprocess.run(['node', 'build.mjs'], cwd=base_dir, capture_output=True, text=True)
                on_base = [n for n in names if os.path.exists(os.path.join(base_dir, 'tests', n + '.py'))]
                base, _ = run_tests(base_dir, on_base); R['tests']['base'] = base
            finally:
                subprocess.run(['git', 'worktree', 'remove', '--force', base_dir], cwd=ROOT, capture_output=True)
            # a test red with the fix and green without is run again, alone, up to RETRY times (03.11.2026: tabtest went red at random
            # on the working branch too, 3 of 5 runs, and stopped PR #39, a right fix): green once is a test that is not steady, and the
            # fix goes on; red every time is the fix. The runs are in the result (tests.retry).
            R['tests']['retry'] = {}
            for n in names:
                if mine.get(n) == 'FEIL' and (n not in base or base.get(n) != 'FEIL'):
                    again = []
                    for _ in range(RETRY):
                        r, _l = run_tests(ROOT, [n]); again.append(r.get(n)); 
                        if r.get(n) in ('OK', 'LES'): break
                    R['tests']['retry'][n] = again
                    if again and again[-1] in ('OK', 'LES'): R['tests'].setdefault('flaky', []).append(n); continue
                    R['why'].append('testen %s er rød med rettingen%s, også %d ganger til alene' % (n, '' if n not in base else ', grønn uten', len(again)))
                if n not in mine: R['why'].append('testen %s ga ikke noe svar' % n)
            R['tests']['log'] = log
    R['ok'] = not R['why'] and not R['risk']
    R['klar'] = not R['why'] and bool(R['risk'])        # ready for Jonas' click: no fault, only the risk
    if R['ok']: print('SLIPPES UT: risikoen, filene, størrelsen, koden og testene holder')
    elif R['klar']: print('KLAR, VENTER PÅ JONAS: %s (%s)' % ('; '.join(R['risk']), 'testene ikke kjørt' if a.no_tests else 'filene, koden og testene holder'))
    else: print('STOPPET: ' + '; '.join(R['why'] + R['risk']))
    print('risiko: %s' % R['risiko']['klasse'])
    for l in R['bad'][:20]: print('  ' + l)
    if R['tests'].get('flaky'): print('ustabile (røde én gang, grønne alene etterpå):', ', '.join(R['tests']['flaky']))
    if 'pr' in R['tests']: print('tester:', json.dumps({n: [R['tests']['pr'].get(n), R['tests'].get('base', {}).get(n)] for n in R['tests']['names']}, ensure_ascii=False))
    if a.out: json.dump(R, open(a.out, 'w'), ensure_ascii=False, indent=1)
    sys.exit(0 if R['ok'] else 3 if R['klar'] else 1)


if __name__ == '__main__':
    try: main()
    except subprocess.CalledProcessError as e: print('FEIL i porten:', e, e.stderr); sys.exit(2)
