#!/usr/bin/env python3
"""What the nightly regression found red, for Driften and the release (18.11.2026). Jonas: «jeg sier ja» to letting Driften fix what
the regression finds red (after the players' errors, with the same Opus cap), and to a release that waits when the night's regression
has something newly red in a test that covers what is released.

The regression routines (tools/regresjon/RUTINE.md) write one line per test per run in tests/historikk.tsv on the branch
regresjon/<date>, and merge it into the working branch: date, branch, commit, test, OK|FEIL|LES, seconds, lane, mode. That is read
here, not the backlog's prose. A run is one regresjon/<date>; a test run twice in it (the routine runs a red one again, alone, to
tell flaky from real) counts as flaky that night when the two differ.

For each test red in the newest run (every line FEIL), by its runs in the last WINDOW regressions:
  ustabil   it flipped that night, or changed between OK and FEIL two times or more: skipped (a fix would be a guess)
  kronisk   red in the last KRONISK runs it was in (CLAUDE.md, 15.11.2026: three nights on the same check)
  ny        green (or not run) in the run before
  rodt      red two nights, not yet chronic
Candidates for a fix, in this order: kronisk, ny, rodt.

    python3 tools/triage/regrod.py [--json]     the newest run and its red
    python3 tools/triage/regrod.py --selftest
"""
import argparse, datetime, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRANCH = re.compile(r'^regresjon/(\d{4}-\d{2}-\d{2})$')
WINDOW = 7         # the regressions looked at for flakiness
KRONISK = 3        # red this many runs in a row: chronic
REF = re.compile(r'regresjon:([A-Za-z0-9_-]+)')   # how a PR, a commit or an issue names a red test
FRESH_DAYS = 2     # a newest run older than this is not tonight's: nothing is new, and the release is not held by it


def parse(text):
    """{date: {test: [status, …]}} from historikk.tsv, the regression runs only (OK and FEIL; LES is a number to read)."""
    runs = {}
    for line in (text or '').splitlines():
        f = line.split('\t')
        if len(f) < 5: continue
        m = BRANCH.match(f[1].strip())
        if not m or f[4] not in ('OK', 'FEIL'): continue
        runs.setdefault(m.group(1), {}).setdefault(f[3].strip(), []).append(f[4])
    return runs


def outcome(sts):
    return 'U' if len(set(sts)) > 1 else ('F' if sts[0] == 'FEIL' else 'O')


def classify(runs, today=None):
    """The newest run and its red, sorted. today (a date) makes a run older than FRESH_DAYS stale."""
    dates = sorted(runs)
    if not dates: return {'dato': None, 'fersk': False, 'ok': 0, 'feil': 0, 'kronisk': [], 'ny': [], 'rodt': [], 'ustabil': [], 'kandidater': []}
    last = dates[-1]; win = dates[-WINDOW:]
    cur = runs[last]
    out = {'dato': last, 'ok': sum(outcome(s) == 'O' for s in cur.values()), 'feil': sum(outcome(s) != 'O' for s in cur.values()),
           'kronisk': [], 'ny': [], 'rodt': [], 'ustabil': []}
    fresh = True
    if today is not None:
        fresh = (today - datetime.date.fromisoformat(last)).days <= FRESH_DAYS
    out['fersk'] = fresh
    for t in sorted(cur):
        o = outcome(cur[t])
        if o == 'O': continue
        seq = [outcome(runs[d][t]) for d in win if t in runs[d]]   # oldest first, ends with tonight's
        flips = sum(1 for a, b in zip(seq, seq[1:]) if a != b)
        if o == 'U' or 'U' in seq or flips >= 2: out['ustabil'].append(t)
        elif len(seq) >= KRONISK and all(x == 'F' for x in seq[-KRONISK:]): out['kronisk'].append(t)
        elif len(seq) < 2 or seq[-2] == 'O': out['ny'].append(t)
        else: out['rodt'].append(t)
    out['kandidater'] = (out['kronisk'] + out['ny'] + out['rodt']) if fresh else []
    return out


def covers():
    """{test: [the files it covers]} from COVER in tests/run.py (the inverse of what run.py changed reads)."""
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    import run as R
    inv = {}
    for f, tests in R.COVER.items():
        for t in tests: inv.setdefault(t, []).append(f)
    return inv


def held(rep, files, cov=None):
    """The newly red tests of tonight's run that cover one of the files released: [(test, [files])]. Only ny: a test red before the
    release is not made worse by it, and flaky ones are skipped."""
    if not rep.get('fersk') or not rep.get('ny'): return []
    cov = covers() if cov is None else cov
    fs = set(files or [])
    out = []
    for t in rep['ny']:
        hit = sorted(fs & set(cov.get(t, []) + ['tests/%s.py' % t]))
        if hit: out.append((t, hit))
    return out


def load(ref=None):
    """The report from tests/historikk.tsv in the working tree, or at a commit (ref)."""
    if ref:
        p = subprocess.run(['git', 'show', '%s:tests/historikk.tsv' % ref], cwd=ROOT, capture_output=True, text=True)
        text = p.stdout if p.returncode == 0 else ''
    else:
        try: text = open(os.path.join(ROOT, 'tests', 'historikk.tsv'), encoding='utf-8').read()
        except OSError: text = ''
    return classify(parse(text), datetime.date.today())


def line(rep):
    """One line for a message or a report."""
    if not rep.get('dato'): return 'Regresjonen: ingen kjøring i tests/historikk.tsv.'
    s = 'Regresjonen %s: %d OK, %d FEIL' % (rep['dato'], rep['ok'], rep['feil'])
    for k, w in (('ny', 'nytt rødt'), ('kronisk', 'kronisk'), ('rodt', 'rødt to netter'), ('ustabil', 'ustabil, hoppes over')):
        if rep[k]: s += '; %s: %s' % (w, ', '.join(rep[k]))
    if not rep.get('fersk'): s += ' (gammel: ikke i natt, så ingenting tas fra den)'
    return s + '.'


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    def rows(date, res):
        return '\n'.join('%s 01:00\tregresjon/%s\tabc\t%s\t%s\t5\tlite\t' % (date, date, t, s) for t, ss in res.items() for s in (ss if isinstance(ss, list) else [ss]))
    text = '\n'.join([
        rows('2026-11-14', {'a': 'OK', 'k': 'FEIL', 'u': 'OK', 'r': 'OK'}),
        rows('2026-11-15', {'a': 'OK', 'k': 'FEIL', 'u': 'FEIL', 'r': 'OK'}),
        rows('2026-11-17', {'a': 'OK', 'k': 'FEIL', 'u': 'OK', 'r': 'FEIL', 'z': ['FEIL', 'OK']}),
        rows('2026-11-18', {'a': 'FEIL', 'k': 'FEIL', 'u': 'FEIL', 'r': 'FEIL', 'z': 'FEIL', 'n': 'FEIL', 'g': 'OK'}),
        '2026-11-18 14:00\tclaude/x\tabc\ta\tOK\t5\tlite\t',          # a session's run, not the regression: not read
        '2026-11-18 02:00\tregresjon/2026-11-18\tabc\tsimday\tLES\t5\tlite\t'])
    rep = classify(parse(text), datetime.date(2026, 11, 18))
    eq('dato og tall', (rep['dato'], rep['ok'], rep['feil']), ('2026-11-18', 1, 6))
    eq('ny: grønn i forrige kjøring, eller ikke kjørt', rep['ny'], ['a', 'n'])
    eq('kronisk: rød tre kjøringer på rad', rep['kronisk'], ['k'])
    eq('rødt to netter', rep['rodt'], ['r'])
    eq('ustabil: vekslet to ganger, eller begge deler samme natt', rep['ustabil'], ['u', 'z'])
    eq('kandidatene: kronisk, ny, rødt', rep['kandidater'], ['k', 'a', 'n', 'r'])
    old = classify(parse(text), datetime.date(2026, 11, 25))
    eq('en gammel kjøring gir ingen kandidater', (old['fersk'], old['kandidater']), (False, []))
    cov = {'a': ['src/js/ui/x.js'], 'n': ['src/js/core/y.js']}
    eq('slippet holdes av nytt rødt som dekker en fil', held(rep, ['src/js/ui/x.js', 'docs/z.md'], cov), [('a', ['src/js/ui/x.js'])])
    eq('testen selv teller som dekket', held(rep, ['tests/n.py'], cov), [('n', ['tests/n.py'])])
    eq('kronisk holder ikke slippet', held(rep, ['tests/k.py'], cov), [])
    eq('gammel kjøring holder ikke', held(old, ['src/js/ui/x.js'], cov), [])
    eq('tomt', classify({}, datetime.date(2026, 11, 18))['kandidater'], [])
    eq('linja', line(rep).startswith('Regresjonen 2026-11-18: 1 OK, 6 FEIL; nytt rødt: a, n; kronisk: k'), True)
    try: inv = covers(); eq('COVER leses', 'lagrefeiltest' in inv and 'src/js/ui/10f-cloud.js' in inv['lagrefeiltest'], True)
    except Exception as e: bad.append('COVER: %s' % e)
    for b in bad: print('FEIL ' + b)
    print('OK regrod selftest' if not bad else 'FEIL regrod selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--json', action='store_true'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    rep = load()
    print(json.dumps(rep, ensure_ascii=False) if a.json else line(rep))
    return 0


if __name__ == '__main__':
    sys.exit(main())
