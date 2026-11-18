#!/usr/bin/env python3
"""The PR lock of the fix routine (live-drift fase 2, 18.11.2026; tools/feilretting/RUTINE.md).

Jonas 18.11.2026: «PR-låsen skal kun blokkere nye middels/høyrisiko-PR-er hvis en tidligere middels/høyrisiko-PR har ventet mindre enn
24 timer på meg – lavrisiko-rettinger skal passere fritt uten å bli blokkert.»

The routine's PRs are the open ones against the working branch from its branches (fiks/…, and fb/… from before 18.11.2026). One waits
for Jonas when the gate gave it the label `venter-pa-jonas`, or when its description says `risiko: middels` or `risiko: hoy` (the routine
writes that line, so a PR still in the gate counts too). Then:

- a lav fix may always get a new PR;
- a hoy fix may get a new PR only when no hoy PR has waited less than FRIST_T hours (one at a time: payments, the cloud, the save
  format, the database);
- a middels fix may get a new PR while fewer than MIDDELS_MAX middels PRs have waited less than FRIST_T hours, and only when it touches
  none of the files those waiting PRs touch (18.11.2026, a review Jonas passed on: «åpne for at «Driften» kan ha opptil tre
  ferdigtestede middels-risiko-PR-er liggende klare samtidig, så lenge risikoskriptet bekrefter at de ikke rører de samme filene»;
  before, one middels or hoy PR held back all the others). A waiting PR with no risk line counts as hoy;
- a PR that has waited FRIST_T hours or more stops blocking, and with --lukk it is closed with a comment (the branch is kept: Jonas can
  reopen it, and the gate runs again), so it stands in the report's list, not in his way. That is the plan's valg B with 24 hours.

    python3 tools/triage/prlaas.py [--lukk] [--json]     the decision for the open PRs now (gh api), and closing the old ones
    python3 tools/triage/prlaas.py --filer F…            may a middels or hoy fix that touches these files get a PR now? Exits 1 if not
    python3 tools/triage/prlaas.py --selftest            the checks of this file

Prints `PR-LÅS {json}` last: {"lav": true, "middels": bool, "hoy": bool, "filer": […], "blokkert_av": [n…], "lukk": [n…]}. Exits 0.
"""
import argparse, datetime, json, re, subprocess, sys

REPO = 'average01101010/FishyBusiness-'
WORK = 'ccr-5e1ba2f4-pusvyd'
PREFIX = ('fiks/', 'fb/')
FRIST_T = 24
MIDDELS_MAX = 3
WAIT_LABEL = 'venter-pa-jonas'
RISK_LINE = re.compile(r'^\s*risiko:\s*(lav|middels|hoy)\b', re.I | re.M)


def _ts(v):
    try: return datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))
    except Exception: return None


def klasse(p):
    """'hoy' or 'middels' when the PR waits for Jonas' click (the risk line in its description; the label alone counts as hoy), 'lav'
    when it may go by itself, None when it says nothing."""
    labels = {(l.get('name') if isinstance(l, dict) else l) for l in p.get('labels') or []}
    m = RISK_LINE.search(p.get('body') or '')
    k = m.group(1).lower() if m else None
    if k in ('middels', 'hoy'): return k
    if WAIT_LABEL in labels: return 'hoy'
    return k


def ours(p):
    head = p.get('head') or {}; base = p.get('base') or {}
    ref = head.get('ref') if isinstance(head, dict) else head
    bref = base.get('ref') if isinstance(base, dict) else base
    return p.get('state') == 'open' and bref == WORK and str(ref or '').startswith(PREFIX)


def decide(prs, now, frist_t=FRIST_T):
    """The lock from the open PRs. A PR may carry 'files' (the paths it touches; main() fetches them for the waiting ones)."""
    waiting = [p for p in prs if ours(p) and klasse(p) in ('middels', 'hoy')]
    age = lambda p: (now - (_ts(p.get('created_at')) or now)).total_seconds() / 3600
    young = [p for p in waiting if age(p) < frist_t]
    old = [p for p in waiting if age(p) >= frist_t]
    hoy = [p for p in young if klasse(p) == 'hoy']; mid = [p for p in young if klasse(p) == 'middels']
    files = sorted({f for p in young for f in p.get('files') or []})
    return {'lav': True, 'hoy': not hoy, 'middels': len(mid) < MIDDELS_MAX, 'middels_ledig': max(0, MIDDELS_MAX - len(mid)),
            'middels_hoy': not hoy and len(mid) < MIDDELS_MAX, 'filer': files, 'blokkert_av': young, 'lukk': old}


def allows(lock, k, files=()):
    """May a fix of class k that touches these files get a PR now?"""
    if k == 'lav': return True
    if set(files or ()) & set(lock.get('filer') or ()): return False
    if k == 'middels': return bool(lock.get('middels', lock.get('middels_hoy')))
    return bool(lock.get('hoy', lock.get('middels_hoy')))


def gh(*a, data=None):
    p = subprocess.run(['gh', 'api'] + list(a), capture_output=True, text=True, input=data)
    if p.returncode: raise RuntimeError('gh api %s: %s' % (' '.join(a[:2]), (p.stderr or p.stdout).strip()[:200]))
    return json.loads(p.stdout) if p.stdout.strip() else None


def close(p):
    body = ('Lukket av feilrettingen etter %d timer uten klikk, så den ikke stenger for nye rettinger (`tools/triage/prlaas.py`). Grenen står: '
            'gjenåpne PR-en for å flette den, så kjører porten på nytt. Den står i rapporten i /admin.\n\n---\n_Feilrettingen_') % FRIST_T
    gh('repos/%s/issues/%d/comments' % (REPO, p['number']), '-f', 'body=' + body)
    gh('-X', 'PATCH', 'repos/%s/pulls/%d' % (REPO, p['number']), '-f', 'state=closed')


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    now = datetime.datetime(2026, 11, 18, 18, 0, tzinfo=datetime.timezone.utc)
    pr = lambda n, h, labels=(), body='', ref='fiks/2026-11-18-x', base=WORK, state='open': {
        'number': n, 'state': state, 'created_at': (now - datetime.timedelta(hours=h)).isoformat(), 'labels': [{'name': l} for l in labels],
        'body': body, 'head': {'ref': ref}, 'base': {'ref': base}}
    d = decide([], now)
    eq('ingen PR-er', (d['lav'], d['middels_hoy'], d['blokkert_av'], d['lukk']), (True, True, [], []))
    d = decide([pr(1, 3, ['autofix', WAIT_LABEL])], now)
    eq('merkelapp uten linje regnes som høy: stenger høy, ikke lav', (d['lav'], d['hoy'], d['middels'], [p['number'] for p in d['blokkert_av']]), (True, False, True, [1]))
    # (18.11.2026) up to three middels at once, one hoy, and never two on the same file
    m = lambda n, h, files: dict(pr(n, h, [WAIT_LABEL], 'risiko: middels'), files=files)
    d = decide([m(20, 1, ['src/js/core/03-simulation.js']), m(21, 2, ['src/js/view3d/18-setup.js'])], now)
    eq('to middels venter: én plass til', (d['middels'], d['middels_ledig'], d['hoy']), (True, 1, True))
    eq('ny middels på en annen fil går', allows(d, 'middels', ['src/js/core/10-gear.js']), True)
    eq('ny middels på samme fil stenges', allows(d, 'middels', ['src/js/core/03-simulation.js']), False)
    eq('høy går når ingen høy venter', allows(d, 'hoy', ['src/js/ui/10f-cloud.js']), True)
    d = decide([m(20, 1, ['a.js']), m(21, 2, ['b.js']), m(22, 3, ['c.js'])], now)
    eq('tre middels venter: full', (d['middels'], allows(d, 'middels', ['d.js']), allows(d, 'lav', ['a.js'])), (False, False, True))
    d = decide([dict(pr(30, 2, [WAIT_LABEL], 'risiko: hoy'), files=['src/js/ui/10f-cloud.js'])], now)
    eq('én høy venter: ny høy stenges, middels går', (allows(d, 'hoy', ['supabase/x.sql']), allows(d, 'middels', ['src/js/core/x.js'])), (False, True))
    d = decide([pr(2, 25, ['autofix', WAIT_LABEL])], now)
    eq('venter 25 t: stenger ikke, lukkes', (d['hoy'], [p['number'] for p in d['lukk']]), (True, [2]))
    d = decide([pr(3, 23.9, [], 'Retter klynge:abcd1234\nrisiko: hoy\n')], now)
    eq('høy i porten (linja i beskrivelsen) stenger høy', d['hoy'], False)
    d = decide([pr(4, 1, ['autofix'], 'risiko: lav')], now)
    eq('lav i flyten stenger ikke', (d['middels_hoy'], d['blokkert_av']), (True, []))
    d = decide([pr(5, 2, [WAIT_LABEL], ref='ccr-abc')], now)
    eq('Jonas sin egen PR teller ikke', d['hoy'], True)
    d = decide([pr(6, 2, [WAIT_LABEL], base='main')], now)
    eq('PR mot main teller ikke', d['hoy'], True)
    d = decide([pr(7, 2, [WAIT_LABEL], state='closed')], now)
    eq('lukket teller ikke', d['hoy'], True)
    d = decide([pr(8, 2, [WAIT_LABEL], ref='fb/auto-2026-11-17-x')], now)
    eq('gammel gren fb/ teller', d['hoy'], False)
    d = decide([pr(9, 30, [WAIT_LABEL]), pr(10, 5, [], 'risiko: middels')], now)
    eq('én gammel og én ung', (d['middels'], d['middels_ledig'], [p['number'] for p in d['blokkert_av']], [p['number'] for p in d['lukk']]), (True, 2, [10], [9]))
    eq('akkurat 24 t er gammel', decide([pr(11, 24, [WAIT_LABEL])], now)['hoy'], True)
    eq('etiketter som strenger', klasse({'labels': [WAIT_LABEL]}), 'hoy')
    for b in bad: print('FEIL ' + b)
    print('OK prlaas selftest' if not bad else 'FEIL prlaas selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lukk', action='store_true'); ap.add_argument('--json', action='store_true'); ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--filer', nargs='+'); ap.add_argument('--klasse', default=None)
    a = ap.parse_args()
    if a.selftest: return selftest()
    now = datetime.datetime.now(datetime.timezone.utc)
    prs = gh('repos/%s/pulls?state=open&base=%s&per_page=100' % (REPO, WORK)) or []
    for p in prs:
        if ours(p) and klasse(p) in ('middels', 'hoy'):
            p['files'] = [f['filename'] for f in gh('repos/%s/pulls/%d/files?per_page=100' % (REPO, p['number'])) or []]
    d = decide(prs, now)
    if a.filer:
        sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'ci'))
        import risiko
        k = a.klasse or risiko.classify(a.filer)['klasse']
        ok = allows(d, k, a.filer)
        overlap = sorted(set(a.filer) & set(d['filer']))
        print(('PR TILLATT' if ok else 'PR STENGT') + ' (risiko %s%s)' % (k, ('; rører filer som venter i en åpen PR: ' + ', '.join(overlap)) if overlap else ''))
        return 0 if ok else 1
    closed = []
    if a.lukk:
        for p in d['lukk']:
            try: close(p); closed.append(p['number'])
            except Exception as e: print('FEIL: kunne ikke lukke #%d: %s' % (p['number'], e))
    for p in d['blokkert_av']: print('venter på Jonas (under %d t, %s): #%d %s' % (FRIST_T, klasse(p), p['number'], p.get('title', '')))
    for p in d['lukk']: print('%s etter %d t: #%d %s' % ('lukket' if p['number'] in closed else 'skal lukkes', FRIST_T, p['number'], p.get('title', '')))
    print('lav: fri. høy: %s. middels: %s (%d ledige av %d).' % ('fri' if d['hoy'] else 'stengt', 'fri' if d['middels'] else 'full', d['middels_ledig'], MIDDELS_MAX))
    print('PR-LÅS ' + json.dumps({'lav': True, 'hoy': d['hoy'], 'middels': d['middels'], 'middels_ledig': d['middels_ledig'], 'filer': d['filer'],
                                  'blokkert_av': [p['number'] for p in d['blokkert_av']], 'lukk': [p['number'] for p in d['lukk']], 'lukket': closed}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
