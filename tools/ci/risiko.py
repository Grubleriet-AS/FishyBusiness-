#!/usr/bin/env python3
"""The risk of a change: lav, middels or hoy (18.11.2026, phase 1 of docs/planer/live-drift.md).

Jonas 18.11.2026: «Alt som rører betaling, brukerkontoer og lagret spillerdata (kystfiske_v2 / save_put4) skal ferdigstilles og
testkjøres automatisk, men alltid kreve ett godkjenningsklikk på PR fra meg», and «Lavrisiko UI- og feilrettinger går automatisk til
produksjon; mellomrisiko kjernemekanikk og høyrisiko betaling/DB stoppes som klare 1-klikks PR-er til meg».

This file is the one place the classes are defined. tools/autofix/gate.py (only `lav` goes out by itself), tools/release/slipp.py
(a release with `hoy` in it waits for Jonas) and .github/workflows/slipp.yml read it, so the lists can never drift apart again (before
this, slipp.py knew two of the five files of real money).

- hoy: real money (the shop, the buy moment, the jump, the paint, Stripe, shop_*), accounts and saved player data (the cloud, the
  save format, kystfiske_v2, save_put*), the database (supabase/), the legal and admin pages, the app's worker, the error trap and
  the feedback, the workflows, the routines, the gates and the server. Goes out only after Jonas' click.
- middels: the core mechanics (src/js/core/), the 3D engine (view3d, vessel3d, the crew), the page template, the build, the data,
  the vendored libraries and anything not named here. Ready as a PR; Jonas' click.
- lav: the UI (src/js/ui/ apart from the files above), the stylesheet, tests that are only added to, and docs. May go out by itself
  through the gate when it is also small (MAX_LINES, MAX_FILES).

`css_tekst` is true when the change is only the stylesheet, the text tables (i18n, patch notes) or docs: such a change is verified by
the build and a look at the screenshots, not by a red test first (Jonas 18.11.2026: «rene CSS- og tekstjusteringer skal kunne
verifiseres med bygg og visuell sjekk uten å strande på syntetisk testskriving»). Everything else that is a fix needs a test that is
red before it and green after (CLAUDE.md, «Se testen feile før den stoles på»).

    python3 tools/ci/risiko.py [--base REF] [--head REF] [--json]   the class of the diff base...head (merge base to head)
    python3 tools/ci/risiko.py --files a.js b.css                   the class of these files, by name only
    python3 tools/ci/risiko.py --selftest                           the checks of this file

Exits 0 and prints the class; 2 on a fault of its own.
"""
import argparse, json, os, re, subprocess, sys

LAV, MIDDELS, HOY = 'lav', 'middels', 'hoy'
ORDER = {LAV: 0, MIDDELS: 1, HOY: 2}
MAX_LINES, MAX_FILES = 150, 6          # the most a `lav` change may be and still go out by itself (was 400 and 15 until 18.11.2026)

# real money: the files, and the names on a changed line anywhere in src/js/ or supabase/
MONEY = re.compile(r'^(src/js/ui/10i-shop\.js|src/js/ui/10q-buymoment\.js|src/js/ui/10u-hopp\.js|src/js/core/06j-hopp\.js|'
                   r'src/js/ui/10j-paint\.js|supabase/functions/(shop-|stripe-)[^/]*/)')
MONEY_TEXT = re.compile(r'\bshop_[a-z0-9_]+|\bStripe\b|\bstripe[-_.(]|\bSTRIPE_')   # (not «striper»)
LEGAL = re.compile(r'^src/legal/')
# accounts and saved player data: the files, and the names on a changed line
SAVES = re.compile(r'^(src/js/ui/10f-cloud\.js|src/js/ui/02-format-state\.js|supabase/functions/account-delete/)')
SAVES_TEXT = re.compile(r'kystfiske_v2|kystfiske_proto_v1|\bsave_(put|get)\d*\b|\bKEY_(PREV|OWN|V1)\b')
# the rest of what only Jonas lets out: the database, the admin page, the app's worker, the telemetry and the feedback (what the
# routines read), the shared test harness (a fix must not make itself green by changing it), the workflows, the hooks, the routines,
# the gates themselves and the server
HOY_PATH = re.compile(r'^(supabase/|src/admin/|src/pwa/|src/data/cloud\.json$|src/js/errtrap\.js$|src/js/lib/|'
                      r'src/js/ui/10g-push\.js$|src/js/ui/06e-feedback\.js$|tests/_env\.py$|tests/run\.py$|tests/unit/run\.mjs$|'
                      r'\.github/|\.claude/|CLAUDE\.md$|tools/(ci|autofix|release|feedback|plan|regresjon|server|saves)/|'
                      r'docs/systemer/tilbakemelding-og-admin\.md$)')
LAV_PATH = re.compile(r'^(src/js/ui/|src/styles\.css$|tests/|docs/)')
# text only: verified by the build and the screenshots, no red test first
CSS_TEKST = re.compile(r'^(src/styles\.css|src/js/ui/01-i18n\.js|src/js/ui/phone/07-patch\.js|docs/.*)$')
SCAN = ('src/js/', 'supabase/')        # where changed lines are read for the names


def file_class(f):
    """(class, why) of a file by its path alone."""
    if MONEY.match(f): return HOY, 'ekte penger'
    if LEGAL.match(f): return HOY, 'src/legal/'
    if SAVES.match(f): return HOY, 'kontoer og lagret spillerdata'
    if HOY_PATH.match(f): return HOY, 'database, sikkerhet eller rutinene'
    if LAV_PATH.match(f): return LAV, 'UI, stil, tester eller dokumenter'
    return MIDDELS, 'kjernemekanikk, 3D-motoren, bygget eller noe som ikke er klassifisert'


def line_class(line):
    """(class, why) of one changed line (without its +/-), or None."""
    if MONEY_TEXT.search(line): return HOY, 'ekte penger nevnt (shop_*, Stripe)'
    if SAVES_TEXT.search(line): return HOY, 'lagringen nevnt (kystfiske_v2, save_put*)'
    return None


def classify(files, changed=None, lines=None, tests_cut=()):
    """The class of a change: files is the paths, changed {path: [changed lines]} (optional), lines the size (added + removed,
    screenshots apart), tests_cut the tests that had lines removed. Returns {klasse, grunner, css_tekst, liten}."""
    why = []
    for f in files:
        k, w = file_class(f)
        why.append({'fil': f, 'klasse': k, 'hvorfor': w})
    for f, ls in (changed or {}).items():
        if not f.startswith(SCAN): continue
        for l in ls:
            r = line_class(l)
            if r: why.append({'fil': f, 'klasse': r[0], 'hvorfor': r[1], 'linje': l.strip()[:120]}); break
    for f in tests_cut:
        why.append({'fil': f, 'klasse': MIDDELS, 'hvorfor': 'en test har fått linjer fjernet'})
    k = max([w['klasse'] for w in why] or [LAV], key=ORDER.get)
    small = len(files) <= MAX_FILES and (lines is None or lines <= MAX_LINES)
    return {'klasse': k, 'grunner': [w for w in why if w['klasse'] == k], 'css_tekst': bool(files) and all(CSS_TEKST.match(f) for f in files),
            'liten': small, 'filer': len(files), 'linjer': lines}


def max_class(*ks):
    return max(ks, key=ORDER.get)


def _git(root, *a):
    return subprocess.run(['git'] + list(a), cwd=root, capture_output=True, text=True, check=True).stdout


def from_git(base, head='HEAD', root=None, shots=None):
    """classify() of the diff merge-base(base, head)..head. shots: a regex of added files not counted as lines (the screenshots)."""
    root = root or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    mb = _git(root, 'merge-base', head, base).strip()
    files = [f for f in _git(root, 'diff', '--name-only', mb, head).split('\n') if f]
    changed, cur = {}, None
    for l in _git(root, 'diff', '--unified=0', '--no-renames', mb, head, '--', *SCAN).split('\n'):
        if l.startswith('diff --git '): cur = l.split(' b/', 1)[-1]; continue
        if cur and l[:1] in '+-' and not l.startswith(('+++', '---')): changed.setdefault(cur, []).append(l[1:])
    lines = 0
    for l in _git(root, 'diff', '--numstat', mb, head).split('\n'):
        p = l.split('\t')
        if len(p) != 3: continue
        if p[0] == '-' and shots is not None and shots.match(p[2]): continue
        lines += (int(p[0]) if p[0].isdigit() else 999) + (int(p[1]) if p[1].isdigit() else 999)
    cut = []
    for l in _git(root, 'diff', '--numstat', '--diff-filter=M', mb, head, '--', 'tests/').split('\n'):
        p = l.split('\t')
        if len(p) == 3 and p[1] not in ('0', '-'): cut.append(p[2])
    return classify(files, changed, lines, cut)


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    for f, want in [('src/js/ui/10i-shop.js', HOY), ('src/js/ui/10u-hopp.js', HOY), ('src/js/core/06j-hopp.js', HOY), ('src/js/ui/10j-paint.js', HOY),
                    ('src/js/ui/10q-buymoment.js', HOY), ('supabase/functions/stripe-webhook/index.ts', HOY), ('src/legal/vilkar.html', HOY),
                    ('src/js/ui/10f-cloud.js', HOY), ('src/js/ui/02-format-state.js', HOY), ('supabase/migrations/x.sql', HOY),
                    ('supabase/functions/account-delete/index.ts', HOY), ('.github/workflows/autofix.yml', HOY), ('tools/autofix/gate.py', HOY),
                    ('tools/ci/risiko.py', HOY), ('tests/run.py', HOY), ('src/pwa/sw.js', HOY), ('CLAUDE.md', HOY),
                    ('src/js/core/03-simulation.js', MIDDELS), ('src/js/view3d/18-setup.js', MIDDELS), ('src/js/vessel3d.js', MIDDELS),
                    ('src/index.html', MIDDELS), ('build.mjs', MIDDELS), ('tools/map/game.py', MIDDELS),
                    ('src/js/ui/08-actions.js', LAV), ('src/styles.css', LAV), ('tests/nytest.py', LAV), ('docs/BACKLOG.md', LAV)]:
        eq(f, file_class(f)[0], want)
    eq('ui med kystfiske_v2', classify(['src/js/ui/05f-turer.js'], {'src/js/ui/05f-turer.js': ["localStorage.getItem('kystfiske_v2')"]})['klasse'], HOY)
    eq('ui med save_put4', classify(['src/js/ui/08-actions.js'], {'src/js/ui/08-actions.js': ["cloudRpc('save_put4', a)"]})['klasse'], HOY)
    eq('ui med shop_', classify(['src/js/ui/08-actions.js'], {'src/js/ui/08-actions.js': ["rpc('shop_buy')"]})['klasse'], HOY)
    eq('ui med striper', classify(['src/js/ui/08-actions.js'], {'src/js/ui/08-actions.js': ['// striper på skroget']})['klasse'], LAV)
    eq('ui og kjerne', classify(['src/js/ui/08-actions.js', 'src/js/core/10-gear.js'])['klasse'], MIDDELS)
    eq('test kuttet', classify(['tests/tabtest.py'], tests_cut=['tests/tabtest.py'])['klasse'], MIDDELS)
    eq('css og tekst', classify(['src/styles.css', 'src/js/ui/01-i18n.js'])['css_tekst'], True)
    eq('ui-logikk er ikke tekst', classify(['src/styles.css', 'src/js/ui/08-actions.js'])['css_tekst'], False)
    eq('for stor', classify(['src/js/ui/08-actions.js'], lines=MAX_LINES + 1)['liten'], False)
    eq('for mange filer', classify(['docs/%d.md' % i for i in range(MAX_FILES + 1)])['liten'], False)
    eq('ingen filer', classify([])['klasse'], LAV)
    for b in bad: print('FEIL ' + b)
    print('OK risiko selftest' if not bad else 'FEIL risiko selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='origin/ccr-5e1ba2f4-pusvyd'); ap.add_argument('--head', default='HEAD')
    ap.add_argument('--files', nargs='*'); ap.add_argument('--json', action='store_true'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    r = classify(a.files) if a.files is not None else from_git(a.base, a.head)
    if a.json: print(json.dumps(r, ensure_ascii=False))
    else:
        print('risiko: %s%s%s' % (r['klasse'], ', bare stil og tekst' if r['css_tekst'] else '', '' if r['liten'] else ', for stor for en automatisk retting'))
        for w in r['grunner'][:20]: print('  %s: %s%s' % (w['fil'], w['hvorfor'], (' (%s)' % w['linje']) if w.get('linje') else ''))
    return 0


if __name__ == '__main__':
    try: sys.exit(main())
    except subprocess.CalledProcessError as e: print('FEIL i risiko.py:', e, e.stderr); sys.exit(2)
