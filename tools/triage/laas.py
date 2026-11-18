#!/usr/bin/env python3
"""One lock for everything that writes code: the branch auto/kjorer (live-drift fase 2, 18.11.2026).

Jonas 18.11.2026: «Bytt ut gamle låser med én felles lås (auto/kjorer) slik at ingenting skriver kode parallelt.» Before, the feedback
routine had fb/kjorer and the work routine plan/kjorer, so the two could work on the working branch at the same time.

The lock is a branch on GitHub that is never deleted: each take and give lays a commit on top of the last one (an empty tree change,
`git commit-tree`), and the newest message says «kjører <time UTC> <who> <what>» or «ledig <time UTC>». A push that is not a fast-forward
means someone else took it in the same moment. A lock that has not been renewed for STALE_H hours counts as left (the run stopped).

    python3 tools/triage/laas.py ta <hvem> <hva>      takes it: exits 0 when taken, 1 when another run holds it (prints who)
    python3 tools/triage/laas.py forny <hvem> <hva>   renews it (on each commit, and at least every other hour)
    python3 tools/triage/laas.py gi                   gives it back (the last thing a run does, also when it fails)
    python3 tools/triage/laas.py status               prints who holds it, or «ledig»
    python3 tools/triage/laas.py --selftest           the checks of this file, on a repository of its own in a temporary folder

`--remote` names another remote than origin (the self-test uses that).
"""
import argparse, datetime, os, shutil, subprocess, sys, tempfile, time

BRANCH = 'auto/kjorer'
WORK = 'ccr-5e1ba2f4-pusvyd'
STALE_H = 3


def git(cwd, *a, check=False):
    p = subprocess.run(['git'] + list(a), cwd=cwd, capture_output=True, text=True)
    if check and p.returncode: raise RuntimeError('git %s: %s' % (' '.join(a[:3]), p.stderr.strip()[:300]))
    return p


def head(cwd, remote):
    """(sha, unix time, message) of the lock's newest commit, or None when the branch does not exist yet."""
    if git(cwd, 'fetch', '-q', remote, '+refs/heads/%s:refs/laas/%s' % (BRANCH, BRANCH)).returncode: return None
    out = git(cwd, 'log', '-1', '--format=%H %ct %s', 'refs/laas/' + BRANCH).stdout.strip()
    if not out: return None
    sha, t, msg = out.split(' ', 2)
    return sha, int(t), msg


def busy(h, now=None):
    """The holder's message when the lock is held and fresh, else ''."""
    if not h: return ''
    now = now or time.time()
    return h[2] if h[2].startswith('kjører') and now - h[1] < STALE_H * 3600 else ''


def put(cwd, remote, parent, msg):
    if parent is None:
        if git(cwd, 'fetch', '-q', remote, '+refs/heads/%s:refs/laas/base' % WORK).returncode: raise RuntimeError('fant ikke %s på %s' % (WORK, remote))
        parent = git(cwd, 'rev-parse', 'refs/laas/base', check=True).stdout.strip()
    tree = git(cwd, 'rev-parse', parent + '^{tree}', check=True).stdout.strip()
    sha = git(cwd, '-c', 'user.name=auto-laas', '-c', 'user.email=auto-laas@detstorebla.no', 'commit-tree', tree, '-p', parent, '-m', msg, check=True).stdout.strip()
    return git(cwd, 'push', '-q', remote, '%s:refs/heads/%s' % (sha, BRANCH)).returncode == 0   # never forced: a race fails here


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def take(cwd, remote, who, what, renew=False):
    h = head(cwd, remote)
    b = busy(h)
    if b and not (renew and who in b.split()):
        return False, b
    took_over = bool(h and h[2].startswith('kjører') and not b)
    ok = put(cwd, remote, h[0] if h else None, 'kjører %s %s %s' % (stamp(), who, what))
    if not ok: return False, 'en annen tok låsen samtidig'
    return True, ('tok over etter en kjøring som stoppet: ' + h[2]) if took_over else ''


def give(cwd, remote):
    for _ in range(3):
        h = head(cwd, remote)
        if put(cwd, remote, h[0] if h else None, 'ledig %s' % stamp()): return True
        time.sleep(2)
    return False


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    tmp = tempfile.mkdtemp(prefix='laas-')
    try:
        bare, a, b = os.path.join(tmp, 'origin.git'), os.path.join(tmp, 'a'), os.path.join(tmp, 'b')
        git(tmp, 'init', '-q', '--bare', bare, check=True)
        for d in (a, b):
            git(tmp, 'init', '-q', d, check=True); git(d, 'remote', 'add', 'o', bare, check=True)
        open(os.path.join(a, 'f'), 'w').write('x')
        git(a, 'add', 'f'); git(a, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base', check=True)
        git(a, 'push', '-q', 'o', 'HEAD:refs/heads/' + WORK, check=True)
        eq('ledig før første', busy(head(a, 'o')), '')
        ok, why = take(a, 'o', 'feilretting', 'klynge:abcd1234'); eq('a tar', ok, True)
        ok, why = take(b, 'o', 'arbeidsrutinen', 'steg 12'); eq('b nektes', (ok, why.startswith('kjører') and 'feilretting' in why), (False, True))
        ok, _ = take(a, 'o', 'feilretting', 'klynge:abcd1234', renew=True); eq('a fornyer', ok, True)
        ok, _ = take(b, 'o', 'arbeidsrutinen', 'steg 12', renew=True); eq('b kan ikke fornye andres', ok, False)
        eq('a gir', give(a, 'o'), True)
        ok, _ = take(b, 'o', 'arbeidsrutinen', 'steg 12'); eq('b tar etter at a ga', ok, True)
        h = head(a, 'o')
        eq('gammel lås er forlatt', busy(h, now=h[1] + STALE_H * 3600 + 1), '')
        eq('fersk lås holder', bool(busy(h, now=h[1] + 60)), True)
        # a race: a pushes on top of an old head, which is not a fast-forward
        old = h[0]; give(b, 'o')
        eq('kappløp avvises', put(a, 'o', old, 'kjører x'), False)
        eq('grenen slettes aldri', bool(git(a, 'ls-remote', 'o', 'refs/heads/' + BRANCH).stdout.strip()), True)
        head(a, 'o')
        n = int(git(a, 'rev-list', '--count', 'refs/laas/' + BRANCH).stdout.strip() or 0)
        eq('fem låscommits oppå arbeidsgrenen', n, 6)
        eq('ingen fil endret', git(a, 'diff', '--name-only', 'refs/laas/' + BRANCH, 'refs/laas/base').stdout.strip(), '')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for x in bad: print('FEIL ' + x)
    print('OK laas selftest' if not bad else 'FEIL laas selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', nargs='?', choices=['ta', 'forny', 'gi', 'status']); ap.add_argument('rest', nargs='*')
    ap.add_argument('--remote', default='origin'); ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    cwd = os.getcwd()
    if a.cmd in ('ta', 'forny'):
        if len(a.rest) < 2: ap.error('%s <hvem> <hva>' % a.cmd)
        ok, why = take(cwd, a.remote, a.rest[0], ' '.join(a.rest[1:]), renew=a.cmd == 'forny')
        print(('LÅST' + (' (' + why + ')' if why else '')) if ok else 'OPPTATT: ' + why)
        return 0 if ok else 1
    if a.cmd == 'gi':
        ok = give(cwd, a.remote); print('LEDIG' if ok else 'FEIL: kunne ikke gi fra seg låsen'); return 0 if ok else 1
    h = head(cwd, a.remote); b = busy(h)
    print(('OPPTATT: ' + b) if b else 'LEDIG' + (' (siste: %s)' % h[2] if h else ' (grenen finnes ikke ennå)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
