#!/usr/bin/env python3
"""The weekly report of the fix flow (18.11.2026). Jonas, passing on a review: «Si ja til den ukentlige oppsummeringen … be den legge til
andel feilfrie økter uke for uke som hovedtall øverst i rapporten», and «Vis både andel feilfrie økter (blant brukere med samtykke) og
totalt antall krasj/heng uavhengig av samtykke øverst i rapporten, slik at vi ikke får en blindsone på brukere uten samtykke».

No model. Driften runs it on Monday in the hour 07 (tools/drift/RUTINE.md point 7b); the report goes to /admin (agent.py run), and the
top lines are Driften's message, which is the push to Jonas' phone.

Top: the share of sessions without a crash, a hang or a severe 3D fault (players with consent: only they have sessions) this week and
the week before, and beside it the crashes, hangs and severe 3D faults counted from the error list itself, which also has those without
consent (supabase/migrations/20261118220000_agent_uke.sql). Then: the fixes merged (PRs naming klynge:), what waits for Jonas (PRs with
venter-pa-jonas, issues trenger-jonas), the error clusters that are new this week (tools/triage/klynge.py), and the Opus runs used.

    python3 tools/triage/ukesrapport.py --out DIR [--send] [--bare-mandag]   --bare-mandag: nothing outside Monday 07–08 Oslo time
    python3 tools/triage/ukesrapport.py --selftest
"""
import argparse, datetime, importlib.util, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REPO = 'Grubleriet-AS/FishyBusiness-'
WORK = 'ccr-5e1ba2f4-pusvyd'


def pct(x): return '–' if x is None else ('%.1f %%' % (float(x) * 100)).replace('.', ',')


def render(uke, fixed, waiting, issues, new_clusters, opus, week_no):
    """The report in Markdown, and its top lines (for the push)."""
    d, f = uke.get('denne') or {}, uke.get('forrige') or {}
    top = ['**Feilfrie økter: %s** (forrige uke %s), blant spillere med samtykke: %s økter, %s med krasj, heng eller alvorlig 3D-feil.' % (
               pct(d.get('feilfrie')), pct(f.get('feilfrie')), d.get('okter', 0), d.get('okter_med_feil', 0)),
           '**Krasj %s, heng %s, alvorlige 3D-feil %s** totalt, også uten samtykke (forrige uke %s, %s, %s; %s av dem uten økt).' % (
               d.get('krasj', 0), d.get('heng', 0), d.get('alvorlig3d', 0), f.get('krasj', 0), f.get('heng', 0), f.get('alvorlig3d', 0), d.get('uten_okt', 0))]
    L = ['# Ukesrapport uke %s: feilrettingen' % week_no, ''] + top + ['']
    L += ['## Rettet denne uka (%d)' % len(fixed), '']
    L += ['- #%s %s' % (p['number'], p['title'][:110]) for p in fixed] or ['Ingen.']
    L += ['', '## Venter på Jonas (%d)' % (len(waiting) + len(issues)), '']
    L += ['- PR #%s %s' % (p['number'], p['title'][:110]) for p in waiting]
    L += ['- Sak #%s %s' % (i['number'], i['title'][:110]) for i in issues]
    if not waiting and not issues: L.append('Ingenting.')
    L += ['', '## Nye feilklynger denne uka (%d)' % len(new_clusters), '']
    L += ['- `klynge:%s` %s, %d økter, alvor %d, risiko %s' % (c['id'], c['msg'][:90], c['sessions'], c['alvor'], c['risiko']) for c in new_clusters[:15]] or ['Ingen.']
    L += ['', '## Opus', '', '%d kjøringer siste sju døgn (taket er 6 i døgnet).' % opus, '', '---', '_Driften (`tools/triage/ukesrapport.py`)_']
    return '\n'.join(L) + '\n', top


def gh(path):
    p = subprocess.run(['gh', 'api', path], capture_output=True, text=True)
    if p.returncode: raise RuntimeError('gh api %s: %s' % (path, (p.stderr or p.stdout).strip()[:200]))
    return json.loads(p.stdout)


def real(a):
    sp = importlib.util.spec_from_file_location('agent', os.path.join(ROOT, 'tools', 'feedback', 'agent.py')); agent = importlib.util.module_from_spec(sp); sp.loader.exec_module(agent)
    import klynge, laas
    now = datetime.datetime.now(datetime.timezone.utc)
    from zoneinfo import ZoneInfo
    oslo = now.astimezone(ZoneInfo('Europe/Oslo'))
    if a.bare_mandag and not (oslo.weekday() == 0 and oslo.hour == 7): print('IKKE MANDAG MORGEN'); return 0
    try: uke = agent.call('uke') or {}
    except SystemExit as e: uke = {}; print('FEIL: ukens tall: %s' % e)   # (the report goes all the same, with «–» for the share)
    since = now - datetime.timedelta(days=7)
    prs = gh('repos/%s/pulls?state=all&sort=updated&direction=desc&per_page=100&base=%s' % (REPO, WORK))
    fixed = [p for p in prs if p.get('merged_at') and klynge.ts(p['merged_at']) >= since and 'klynge:' in (p.get('body') or '')]
    waiting = [p for p in prs if p.get('state') == 'open' and any(l['name'] == 'venter-pa-jonas' for l in p.get('labels') or [])]
    issues = gh('repos/%s/issues?state=open&labels=trenger-jonas&per_page=100' % REPO)
    tech = agent.call('tech', days=14) or {}   # (two weeks back, so «new» is a cluster first seen this week, not just in the window)
    new_clusters = [c for c in klynge.clusters(tech.get('errors')) if klynge.ts(c['first']) and klynge.ts(c['first']) >= since and c['score'] >= klynge.MIN_FIX]
    opus = laas.takes(ROOT, 'origin', 168)
    body, top = render(uke, fixed, waiting, issues, new_clusters, opus, oslo.isocalendar()[1])
    os.makedirs(a.out, exist_ok=True); path = os.path.join(a.out, 'ukesrapport.md'); open(path, 'w', encoding='utf-8').write(body)
    if a.send: print('rapport', agent.call('run', report=body, prs=[], n=0))
    print('\n'.join(top)); print('UKESRAPPORT ' + path)
    return 0


def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    uke = {'denne': {'okter': 400, 'okter_med_feil': 6, 'feilfrie': 0.985, 'krasj': 9, 'heng': 30, 'alvorlig3d': 2, 'uten_okt': 4},
           'forrige': {'okter': 300, 'okter_med_feil': 9, 'feilfrie': 0.97, 'krasj': 12, 'heng': 41, 'alvorlig3d': 1, 'uten_okt': 2}}
    body, top = render(uke, [{'number': 127, 'title': 'Skylagringen'}], [{'number': 140, 'title': 'Heng i kartet'}], [{'number': 124, 'title': 'Trenger Jonas: klynge:3d38e0da'}],
                       [{'id': 'abcd1234', 'msg': 'Krasj: x', 'sessions': 5, 'alvor': 5, 'risiko': 'middels'}], 2, 47)
    eq('øverst: feilfrie', top[0].startswith('**Feilfrie økter: 98,5 %** (forrige uke 97,0 %)'), True)
    eq('øverst: krasj totalt, også uten samtykke', 'Krasj 9, heng 30, alvorlige 3D-feil 2** totalt, også uten samtykke' in top[1] and '4 av dem uten økt' in top[1], True)
    eq('hovedtallet står først i rapporten', body.split('\n')[2] == top[0], True)
    eq('rettet, venter, nye', ('#127 Skylagringen' in body, 'PR #140' in body, 'Sak #124' in body, 'klynge:abcd1234' in body), (True, True, True, True))
    _, top = render({}, [], [], [], [], 0, 1)
    eq('uten tall', top[0].startswith('**Feilfrie økter: –**'), True)
    for b in bad: print('FEIL ' + b)
    print('OK ukesrapport selftest' if not bad else 'FEIL ukesrapport selftest: %d' % len(bad))
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out'); ap.add_argument('--send', action='store_true'); ap.add_argument('--bare-mandag', action='store_true')
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest: return selftest()
    if not a.out: ap.error('--out er påkrevd')
    return real(a)


if __name__ == '__main__':
    sys.exit(main())
