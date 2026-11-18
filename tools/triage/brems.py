#!/usr/bin/env python3
"""After the emergency brake: the revert PR (live-drift fase 4, 18.11.2026; Jonas: «… og lar neste kjøring av «Driften» åpne en
reverserings-PR»).

The brake on the game's server (tools/server/vakt/brems.py) swaps detstorebla.no back to the edition before and leaves its lock at
https://detstorebla.no/nodbrems.json: {"aktiv", "fra" (the edition pulled), "til", "commit_fra" (the commit main was released at),
"commit_til" (the release before), "grunn", "tall"}. main still holds the bad release, so this, run by Driften each hour (tools/drift/
RUTINE.md, no Opus: the revert is mechanical):

- nothing when the lock does not answer, or a PR or an issue already names `nodbrems:<fra>`;
- when the release was one automatic fix alone (one commit between the two releases, «… (#N)»): `git revert` of that fix as it stands
  on the working branch, on a branch `tilbake/<date>-<fra>`, and a PR against the working branch with the label `autofix`, the lines
  `nodbrems:<fra>` and `risiko: <class>`, and the brake's numbers (counts only). The gate tests it like any fix;
- otherwise (a whole release of the working branch, many commits): an issue `trenger-jonas` with the commits and the numbers, since
  which of them did it is a choice for Jonas.

The lock stays until Jonas releases himself (slipp.yml «tross_nodbrems: ja»).

    python3 tools/triage/brems.py          what it would do (nothing is changed)
    python3 tools/triage/brems.py --pr     do it (Driften takes the lock auto/kjorer first: laas.py ta driften nodbrems)
    python3 tools/triage/brems.py --selftest
"""
import argparse, datetime, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO = 'average01101010/FishyBusiness-'
WORK = 'ccr-5e1ba2f4-pusvyd'
URL = 'https://detstorebla.no/nodbrems.json'
PR_NUM = re.compile(r'\(#(\d+)\)\s*$')


def git(*a, check=True):
    p = subprocess.run(['git'] + list(a), cwd=ROOT, capture_output=True, text=True)
    if check and p.returncode: raise RuntimeError('git %s: %s' % (' '.join(a[:3]), p.stderr.strip()[:300]))
    return p.stdout.strip()


def gh(*a):
    p = subprocess.run(['gh', 'api'] + list(a), capture_output=True, text=True)
    if p.returncode: raise RuntimeError('gh api %s: %s' % (a[0], (p.stderr or p.stdout).strip()[:200]))
    return json.loads(p.stdout) if p.stdout.strip() else None


def lock():
    try:
        with urllib.request.urlopen(urllib.request.Request(URL + '?t=%d' % datetime.datetime.now().timestamp(), headers={'User-Agent': 'brems.py'}), timeout=20) as r:
            d = json.load(r)
            return d if d.get('aktiv') else None
    except Exception: return None


def plan(nb, commits, handled):
    """What to do: ('ingenting', why) | ('pr', subject) | ('sak', why). commits: [(sha, subject)] between the two releases, newest first."""
    if not nb: return 'ingenting', 'nødbremsen står ikke'
    if handled: return 'ingenting', 'en PR eller sak nevner alt nodbrems:%s' % nb.get('fra')
    if not nb.get('commit_fra') or not nb.get('commit_til'): return 'sak', 'slippets commits er ukjente (commit_fra/commit_til mangler)'
    if len(commits) == 1 and PR_NUM.search(commits[0][1]): return 'pr', commits[0][1]
    return 'sak', '%d commits mellom slippene' % len(commits)


def body_numbers(nb):
    t = nb.get('tall') or {}; ny, gml = t.get('ny') or {}, t.get('gml') or {}
    L = ['- Nødbremsen trakk %s: %s' % (nb.get('at', '?'), nb.get('grunn', '')),
         '- Utgaven %s: %s økter, %s med alvorlig feil' % (nb.get('fra'), ny.get('okter'), ny.get('alvorlige')),
         '- Utgaven før (%s): %s økter, %s med alvorlig feil' % (nb.get('til'), gml.get('okter'), gml.get('alvorlige'))]
    for x in (ny.get('signaturer') or [])[:5]: L.append('  - `%s` i %s økter' % (str(x.get('melding'))[:100].replace('`', "'"), x.get('okter')))
    return L


def run(do):
    nb = lock()
    if not nb: print('INGEN NØDBREMS'); return 0
    tag = 'nodbrems:%s' % nb.get('fra')
    handled = any((gh('search/issues?q=repo:%s+is:%s+%%22%s%%22' % (REPO, kind, tag)) or {}).get('total_count') for kind in ('issue', 'pr'))
    commits = []
    if nb.get('commit_fra') and nb.get('commit_til'):
        git('fetch', '-q', '--depth=300', 'origin', '+main:refs/remotes/origin/main', '+%s:refs/remotes/origin/%s' % (WORK, WORK))
        commits = [tuple(l.split('\x01', 1)) for l in git('log', '--no-merges', '--format=%H\x01%s', '%s..%s' % (nb['commit_til'], nb['commit_fra'])).splitlines() if l]
    what, why = plan(nb, commits, handled)
    print('%s: %s' % (what.upper(), why))
    if not do or what == 'ingenting': return 0
    if what == 'pr':
        n = PR_NUM.search(why).group(1)
        on_work = git('log', 'origin/' + WORK, '--format=%H', '-F', '--grep', '(#%s)' % n, '-n', '1')
        if not on_work: what, why = 'sak', 'fant ikke rettingen (#%s) på arbeidsgrenen' % n
    if what == 'pr':
        br = 'tilbake/%s-%s' % (datetime.date.today().isoformat(), nb.get('fra'))
        git('checkout', '-q', '-B', br, 'origin/' + WORK)
        git('-c', 'user.name=Driften', '-c', 'user.email=driften@detstorebla.no', 'revert', '--no-edit', on_work)
        sys.path.insert(0, os.path.join(ROOT, 'tools', 'ci')); import risiko
        k = risiko.from_git('origin/' + WORK, 'HEAD', ROOT)['klasse']
        git('push', '-q', '-u', 'origin', br)
        body = ['Nødbremsen rullet detstorebla.no tilbake etter slippet av denne rettingen (`tools/server/vakt/brems.py`), og denne PR-en tar den ut av arbeidsgrenen igjen, så `main` blir riktig ved neste slipp.', '',
                tag, 'risiko: %s' % k, ''] + body_numbers(nb) + ['', 'Sperren mot automatiske slipp står til Jonas slipper selv («Slipp» med «tross_nodbrems: ja»).', '', '---', '_Driften (`tools/triage/brems.py`)_']
        pr = gh('repos/%s/pulls' % REPO, '-f', 'title=Tilbake: %s' % why[:200], '-f', 'head=' + br, '-f', 'base=' + WORK, '-f', 'body=' + '\n'.join(body))
        gh('repos/%s/issues/%d/labels' % (REPO, pr['number']), '-f', 'labels[]=autofix')
        print('PR: %s' % pr['html_url']); return 0
    body = ['Nødbremsen rullet detstorebla.no tilbake fra %s til %s (`tools/server/vakt/brems.py`). Slippet hadde flere commits, så hvilken som gjorde det, er ditt valg; ingenting er reversert automatisk.' % (nb.get('fra'), nb.get('til')), '',
            tag, ''] + body_numbers(nb) + ['', '**Commitene i slippet:**'] + ['- `%s` %s' % (c[0][:8], c[1][:120]) for c in commits[:40]] + [
            '', 'Sperren mot automatiske slipp står til du slipper selv («Slipp» med «tross_nodbrems: ja»).', '', '---', '_Driften (`tools/triage/brems.py`)_']
    subprocess.run(['gh', 'api', 'repos/%s/labels' % REPO, '-f', 'name=trenger-jonas', '-f', 'color=D93F0B'], capture_output=True)
    iss = gh('repos/%s/issues' % REPO, '-f', 'title=Nødbremsen rullet tilbake slippet %s' % nb.get('fra'), '-f', 'body=' + '\n'.join(body), '-f', 'labels[]=trenger-jonas')
    print('SAK: %s' % iss['html_url']); return 0


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    nb = {'aktiv': True, 'fra': 'bbb', 'til': 'aaa', 'commit_fra': 'c2', 'commit_til': 'c1'}
    eq('ingen brems', plan(None, [], False)[0], 'ingenting')
    eq('alt tatt', plan(nb, [('c2', 'x (#12)')], True)[0], 'ingenting')
    eq('én automatisk retting', plan(nb, [('c2', 'Skylagringen: 401 (#127)')], False), ('pr', 'Skylagringen: 401 (#127)'))
    eq('et helt slipp', plan(nb, [('c2', 'a'), ('c1x', 'b (#3)')], False)[0], 'sak')
    eq('én commit uten PR', plan(nb, [('c2', 'en commit fra en økt')], False)[0], 'sak')
    eq('ukjente commits', plan(dict(nb, commit_til=''), [], False)[0], 'sak')
    eq('tall i teksten', body_numbers({'fra': 'b', 'til': 'a', 'tall': {'ny': {'okter': 40, 'alvorlige': 8, 'signaturer': [{'melding': 'Krasj `x`', 'okter': 8}]}, 'gml': {'okter': 300, 'alvorlige': 3}}})[3],
       "  - `Krasj 'x'` i 8 økter")
    for b in bad: print('FEIL ' + b)
    print('OK brems selftest' if not bad else 'FEIL brems selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--pr', action='store_true'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    return run(a.pr)


if __name__ == '__main__':
    sys.exit(main())
