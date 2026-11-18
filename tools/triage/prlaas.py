#!/usr/bin/env python3
"""The PR lock of the fix routine (live-drift fase 2, 18.11.2026; tools/feilretting/RUTINE.md).

Jonas 18.11.2026: «PR-låsen skal kun blokkere nye middels/høyrisiko-PR-er hvis en tidligere middels/høyrisiko-PR har ventet mindre enn
24 timer på meg – lavrisiko-rettinger skal passere fritt uten å bli blokkert.»

The routine's PRs are the open ones against the working branch from its branches (fiks/…, and fb/… from before 18.11.2026). One waits
for Jonas when the gate gave it the label `venter-pa-jonas`, or when its description says `risiko: middels` or `risiko: hoy` (the routine
writes that line, so a PR still in the gate counts too). Then:

- a lav fix may always get a new PR;
- a middels or hoy fix may get a new PR only when no such PR has waited less than FRIST_T hours;
- a PR that has waited FRIST_T hours or more stops blocking, and with --lukk it is closed with a comment (the branch is kept: Jonas can
  reopen it, and the gate runs again), so it stands in the report's list, not in his way. That is the plan's valg B with 24 hours.

    python3 tools/triage/prlaas.py [--lukk] [--json]     the decision for the open PRs now (gh api), and closing the old ones
    python3 tools/triage/prlaas.py --selftest            the checks of this file

Prints `PR-LÅS {json}` last: {"lav": true, "middels_hoy": bool, "blokkert_av": [n…], "lukk": [n…]}. Exits 0.
"""
import argparse, datetime, json, re, subprocess, sys

REPO = 'average01101010/FishyBusiness-'
WORK = 'ccr-5e1ba2f4-pusvyd'
PREFIX = ('fiks/', 'fb/')
FRIST_T = 24
WAIT_LABEL = 'venter-pa-jonas'
RISK_LINE = re.compile(r'^\s*risiko:\s*(lav|middels|hoy)\b', re.I | re.M)


def _ts(v):
    try: return datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))
    except Exception: return None


def klasse(p):
    """'middels/hoy' when the PR waits for Jonas' click, 'lav' when it may go by itself, None when it says nothing."""
    labels = {(l.get('name') if isinstance(l, dict) else l) for l in p.get('labels') or []}
    m = RISK_LINE.search(p.get('body') or '')
    if WAIT_LABEL in labels or (m and m.group(1).lower() in ('middels', 'hoy')): return 'middels/hoy'
    if m and m.group(1).lower() == 'lav': return 'lav'
    return None


def ours(p):
    head = p.get('head') or {}; base = p.get('base') or {}
    ref = head.get('ref') if isinstance(head, dict) else head
    bref = base.get('ref') if isinstance(base, dict) else base
    return p.get('state') == 'open' and bref == WORK and str(ref or '').startswith(PREFIX)


def decide(prs, now, frist_t=FRIST_T):
    waiting = [p for p in prs if ours(p) and klasse(p) == 'middels/hoy']
    age = lambda p: (now - (_ts(p.get('created_at')) or now)).total_seconds() / 3600
    young = [p for p in waiting if age(p) < frist_t]
    old = [p for p in waiting if age(p) >= frist_t]
    return {'lav': True, 'middels_hoy': not young, 'blokkert_av': young, 'lukk': old}


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
    eq('middels venter 3 t: stenger middels/høy, ikke lav', (d['lav'], d['middels_hoy'], [p['number'] for p in d['blokkert_av']]), (True, False, [1]))
    d = decide([pr(2, 25, ['autofix', WAIT_LABEL])], now)
    eq('venter 25 t: stenger ikke, lukkes', (d['middels_hoy'], [p['number'] for p in d['lukk']]), (True, [2]))
    d = decide([pr(3, 23.9, [], 'Retter klynge:abcd1234\nrisiko: hoy\n')], now)
    eq('høy i porten (linja i beskrivelsen) stenger', d['middels_hoy'], False)
    d = decide([pr(4, 1, ['autofix'], 'risiko: lav')], now)
    eq('lav i flyten stenger ikke', (d['middels_hoy'], d['blokkert_av']), (True, []))
    d = decide([pr(5, 2, [WAIT_LABEL], ref='ccr-abc')], now)
    eq('Jonas sin egen PR teller ikke', d['middels_hoy'], True)
    d = decide([pr(6, 2, [WAIT_LABEL], base='main')], now)
    eq('PR mot main teller ikke', d['middels_hoy'], True)
    d = decide([pr(7, 2, [WAIT_LABEL], state='closed')], now)
    eq('lukket teller ikke', d['middels_hoy'], True)
    d = decide([pr(8, 2, [WAIT_LABEL], ref='fb/auto-2026-11-17-x')], now)
    eq('gammel gren fb/ teller', d['middels_hoy'], False)
    d = decide([pr(9, 30, [WAIT_LABEL]), pr(10, 5, [], 'risiko: middels')], now)
    eq('én gammel og én ung', (d['middels_hoy'], [p['number'] for p in d['blokkert_av']], [p['number'] for p in d['lukk']]), (False, [10], [9]))
    eq('akkurat 24 t er gammel', decide([pr(11, 24, [WAIT_LABEL])], now)['middels_hoy'], True)
    eq('etiketter som strenger', klasse({'labels': [WAIT_LABEL]}), 'middels/hoy')
    for b in bad: print('FEIL ' + b)
    print('OK prlaas selftest' if not bad else 'FEIL prlaas selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lukk', action='store_true'); ap.add_argument('--json', action='store_true'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    now = datetime.datetime.now(datetime.timezone.utc)
    prs = gh('repos/%s/pulls?state=open&base=%s&per_page=100' % (REPO, WORK)) or []
    d = decide(prs, now)
    closed = []
    if a.lukk:
        for p in d['lukk']:
            try: close(p); closed.append(p['number'])
            except Exception as e: print('FEIL: kunne ikke lukke #%d: %s' % (p['number'], e))
    for p in d['blokkert_av']: print('venter på Jonas (under %d t): #%d %s' % (FRIST_T, p['number'], p.get('title', '')))
    for p in d['lukk']: print('%s etter %d t: #%d %s' % ('lukket' if p['number'] in closed else 'skal lukkes', FRIST_T, p['number'], p.get('title', '')))
    print('lav: fri. middels/høy: ' + ('fri' if d['middels_hoy'] else 'stengt av #' + ', #'.join(str(p['number']) for p in d['blokkert_av'])))
    print('PR-LÅS ' + json.dumps({'lav': True, 'middels_hoy': d['middels_hoy'], 'blokkert_av': [p['number'] for p in d['blokkert_av']],
                                  'lukk': [p['number'] for p in d['lukk']], 'lukket': closed}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
