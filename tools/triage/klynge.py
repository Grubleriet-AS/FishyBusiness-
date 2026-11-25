#!/usr/bin/env python3
"""The cheap, deterministic first step of the fix routine (live-drift fase 2, 18.11.2026; tools/feilretting/RUTINE.md).

Jonas 18.11.2026: «Lag tools/triage/klynge.py som henter nye feil og tilbakemeldinger fra Supabase, normaliserer feilmeldinger (stripper
linjenumre og ID-er), kobler spillerrapporter til tekniske krasj på versjon/enhet/tidspunkt, og regner ut alvorlighetsscore. Ikke vekk
Opus hvis det ikke finnes nye ubehandlede tekniske feil».

What it does, with no model at all:
1. Fetches the new feedback (`agent.py list`: the rows not noted yet, and what was noted before) and the error list (`agent.py tech`),
   through tools/feedback/agent.py, the only way into the database the routines have. Nothing is marked as read by fetching.
2. Puts the errors together in clusters: the message with numbers, ids, hashes and line numbers taken out, plus the first place in
   our code (file and function, no line). Each cluster has an id (8 hex of its signature) that the PRs name as `klynge:<id>`.
3. Weighs each cluster: severity (crash, black screen, lost save 5; a thrown error 3; console, hang, a file not loaded 2) × sessions ×
   churn weight (× 2 when it hits the start: loading, the tutorial). New = seen since the last report.
4. Sorts each new feedback: `teknisk` (linked to an error cluster by version, platform and time, or a bug by its topic and words),
   `ønske` or `balanse` (never fixed by the routine: they go to «Til Jonas: ønsker og balanse» in the report in /admin, never to git),
   or `uklar` (the light model decides). Weighs it: severity × churn weight (× 2 in the first hour or the tutorial, × 1.5 over 20 h).
5. Says whether Opus is needed: only when a technical cluster or feedback is new, not handled (no open PR naming it, none closed in the
   last HANDLED_DAYS), weighs at least MIN_FIX, and its likely risk is one the PR lock lets through (tools/triage/prlaas.py).
5b. A cluster or feedback the fix agent gave up on after two tries gets an open GitHub issue with the label `trenger-jonas`
   (--gi-opp; no player text in it, only the cluster's message, file and why). While that issue is open the cluster counts as handled,
   so the next run takes the next one in the list or the queue instead of waking Opus for the same fault every hour. Jonas closes the
   issue when he has looked at it, and the cluster can be tried again (18.11.2026, after a review: «en gjenstridig feil … blokkerer hele
   rutinen»).
6. With --belonn: the thank-you. Each noted feedback whose note names a PR that is merged and whose commit has reached `main` (the
   players' version), gets `agent.py fixed`: status fixed, a confirmation in the player's language and one takk-haill (once per
   feedback; supabase/migrations/20261118200000_agent_fixed.sql). Jonas 18.11.2026: «når en feilretting som stammer fra en innsendt
   spillerrapport faktisk slippes til produksjon, skal spilleren automatisk få en bekreftelse og en luksushaill i spillet».

Writes triage.json and rapport-utkast.md in --out (outside the repo: the feedback never goes into git), prints a short summary and as
the last line `TRIAGE {json}`: {"ingenting": bool, "trenger_opus": bool, "nye_tekniske": n, ...}.

    python3 tools/triage/klynge.py --out DIR [--belonn] [--test]     fetch, cluster, weigh, decide (and reward)
    python3 tools/triage/klynge.py --out DIR --fra DIR2               the same from feedback.json and tech.json already in DIR2
    python3 tools/triage/klynge.py --gi-opp ID --grunn "…" [--out DIR]  the fix agent gave up: an issue `trenger-jonas` for the cluster
                                                                      (ID is its 8 hex, or #N for a feedback with no cluster)
    python3 tools/triage/klynge.py --selftest                         the checks of this file, on made-up data
"""
import argparse, datetime, hashlib, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'ci')); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import risiko, prlaas

REPO = 'Grubleriet-AS/FishyBusiness-'
PROD_URL = 'https://detstorebla.no/version.json'
OPUS_TAK = 4          # at most this many Opus runs (a fix or a queue step) in 24 hours, counted from the lock's history (tools/triage/
                      # laas.py teller). Jonas 18.11.2026: «Tak: 4 i døgnet», then the same evening «Senk taket … fra 4 til 2 per døgn», and
                      # 19.11.2026, when nothing had been fixed for 19 hours: «la opus kjøre 4 ganger i døgnet»
STEG_TAK = 1          # of them, at most this many on steps from the queue («maksimalt 1 av de 2 daglige kjøringene kunne brukes på nye
RESERVE = 1           # steg fra køen, slik at 1 plass alltid holdes i reserve for feilretting»): a step only when RESERVE is left after it
MIN_FIX = 3            # the least weight a cluster or a feedback needs before Opus is woken for it (one crash in one session is 5)
HANDLED_DAYS = 3       # a PR closed or merged this many days ago still counts as handling its cluster
LINK_SLACK_H = 2       # a feedback is linked to an error cluster when it was sent within this many hours of the cluster's first/last

# ---------- the errors ----------
UUID = re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', re.I)
HEX = re.compile(r'\b(?=[0-9a-f]*\d)[0-9a-f]{6,}\b', re.I)
URLQ = re.compile(r'(https?://[^\s?#]+)[?#]\S*')
HASHED = re.compile(r'-[0-9a-f]{6,}(\.\w+)\b', re.I)          # data/boat-skiff59-3fa9c2e1.bin
NUM = re.compile(r'(?<![A-Za-z_])\d+(?:[.,]\d+)?')
FILE = re.compile(r'((?:src/)?(?:js/)?(?:ui|core|view3d|lib)/[\w./-]+?\.js|(?:src/)?(?:js/)?[\w-]+\.js)(?::\d+)?(?::\d+)?')
FUNC = re.compile(r'at (?:async )?([\w$.<>]+) \(')


def normalize(msg):
    """The message with what changes from one time to the next taken out: ids, hashes, numbers, line numbers, URL queries."""
    s = str(msg or '')
    s = URLQ.sub(r'\1', s)
    s = HASHED.sub(r'-#\1', s)
    s = UUID.sub('#', s)
    s = HEX.sub('#', s)
    s = NUM.sub('#', s)
    return ' '.join(s.split())[:200]


def code_path(p):
    """'ui/10f-cloud.js' and 'js/ui/10f-cloud.js' as 'src/js/ui/10f-cloud.js'; '' for what is not our code."""
    p = p.split('?')[0]
    if '://' in p:
        host, _, p = p.split('://', 1)[1].partition('/')
        if not re.match(r'^(([\w-]+\.)?detstorebla\.no|localhost|127\.0\.0\.1)(:\d+)?$', host): return ''   # another host's script is not ours
    p = re.sub(r'^(src/)?(js/)?', '', p)
    if not p.endswith('.js') or '..' in p: return ''
    return 'src/js/' + p if os.path.isfile(os.path.join(ROOT, 'src', 'js', p)) else ''


def frame(src, stack):
    """(file, function) of the first place in our code: from src ('ui/10f-cloud.js:248:7') or the stack."""
    for text in (src or '', stack or ''):
        for m in FILE.finditer(text):
            f = code_path(m.group(1))
            if f:
                fn = ''
                if text is stack:
                    line_start = stack.rfind('\n', 0, m.start()) + 1
                    fm = FUNC.search(stack[line_start:m.end() + 2])
                    fn = fm.group(1) if fm else ''
                return f, fn
    return '', ''


def alvor_err(msg, src):
    m = (msg or '').lower(); s = (src or '').lower()
    if s == 'crash' or m.startswith('krasj'): return 5
    if '3d svart skjerm' in m or 'én farge' in m or 'nan i kameraet' in m or 'nan i egen båt' in m: return 5
    if re.search(r'kystfiske_v2|save_put|lagringen feilet|save failed', m): return 5
    if s == 'hang' or m.startswith('heng'): return 2
    if s == 'resource' or m.startswith('resource:'): return 2
    if s == 'console': return 2
    return 3


def start_weight(msg, file):
    m = (msg or '').lower()
    return 2.0 if ('under lasting' in m or 'boot' in m or file.endswith(('ui/11-boot.js', 'errtrap.js'))) else 1.0


def clusters(errors):
    """The error list (tech_view's 'errors', grouped by exact message) as clusters by signature."""
    out = {}
    for e in errors or []:
        f, fn = frame(e.get('src'), e.get('stack'))
        norm = normalize(e.get('msg'))
        sig = '%s @ %s%s' % (norm, f or (e.get('src') or '?').split(':')[0], (':' + fn) if fn else '')
        cid = hashlib.sha1(sig.encode()).hexdigest()[:8]
        c = out.setdefault(cid, {'id': cid, 'sig': sig, 'msg': norm, 'file': f, 'fn': fn, 'src': e.get('src'), 'n': 0, 'sessions': 0, 'players': 0,
                                 'first': None, 'last': None, 'versions': set(), 'platforms': {}, 'gpus': [], 'examples': [], 'stack': e.get('stack') or '',
                                 'alvor': alvor_err(e.get('msg'), e.get('src')), 'feedback': []})
        c['n'] += int(e.get('n') or 0); c['sessions'] += int(e.get('sessions') or 0); c['players'] += int(e.get('players') or 0)
        for k in ('first', 'last'):
            v = e.get(k)
            if v and (c[k] is None or (v < c[k] if k == 'first' else v > c[k])): c[k] = v
        c['versions'] |= set(e.get('versions') or [])
        for p, n in (e.get('platforms') or {}).items(): c['platforms'][p] = c['platforms'].get(p, 0) + n
        for g in e.get('gpus') or []:
            if g not in c['gpus']: c['gpus'].append(g)
        if len(c['examples']) < 3 and e.get('msg') not in c['examples']: c['examples'].append(e.get('msg'))
        c['alvor'] = max(c['alvor'], alvor_err(e.get('msg'), e.get('src')))
    for c in out.values():
        c['versions'] = sorted(c['versions'])
        c['vekt'] = start_weight(c['msg'], c['file'])
        c['score'] = round(c['alvor'] * max(c['sessions'], 1) * c['vekt'], 1)
        c['risiko'] = risiko.file_class(c['file'])[0] if c['file'] else risiko.MIDDELS
    return sorted(out.values(), key=lambda c: -c['score'])


# ---------- the feedback ----------
TECH_KW = re.compile(r'krasj|kræsj|crash|fryser|frøs|henger|hang|svart skjerm|hvit skjerm|laster ikke|lastet ikke|starter ikke|funker ikke|fungerer ikke|'
                     r'virker ikke|går ikke an|\bbug|\bfeil(?:en|melding)?\b|error|mistet|forsvant|borte|lagring|lagret ikke|kan ikke trykke|stuck|'
                     r'freez|doesn.?t work|not working|\blost\b|disappear|black screen|won.?t load|glitch|lagg|hakker|kom ikke', re.I)
LOSS_KW = re.compile(r'mistet|forsvant|tapt|borte|lost|disappear|lagring|progress|fremgang|betalt|kjøpte|kjøpt|payment|paid|refund|krasj|crash|svart skjerm|black screen', re.I)
BAL_KW = re.compile(r'for dyr|for billig|for lite|for mye|for lav|for høy|\bpris|betaler|lønn|tjener|balanse|kvote|for lang tid|for treg|tar for lang|'
                    r'for vanskelig|for lett|too expensive|too cheap|too slow|\bprice|grind|economy', re.I)
WISH_KW = re.compile(r'ønsk|kunne dere|kan dere|hadde vært|fint om|foreslå|forslag|legg til|legge til|savner|\bmer av|\bflere\b|wish|suggest|would be nice|'
                     r'please add|could you add|feature|idé|ide:', re.I)
TOPIC_TYPE = {'bug': 'teknisk', 'perf': 'teknisk', 'idea': 'ønske', 'econ': 'balanse', 'fish': 'balanse'}
TOPIC_ALVOR = {'bug': 3, 'perf': 2, 'ui': 2, 'tut': 2, 'boat': 2, 'world': 2, 'fish': 1, 'econ': 1, 'idea': 1, 'other': 1}


def ts(v):
    try: return datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))
    except Exception: return None


# The page's own watch (a crash, a hang, a start that stood or was slow) is seen on every version and platform, all day: the version, the
# platform and the hour then say nothing about a feedback, and every bug report was linked to the crash cluster (19.–25.11.2026: the
# guest book, the standing plan, a fishing vessel mark, all «klynge:161ab007», which waited for Jonas, so none was taken: fix_fb wants a
# feedback with no cluster). Such a cluster is linked only to a feedback whose words are about a crash or a hang.
WATCH_MSG = re.compile(r'krasj|heng|oppstarten|treg oppstart', re.I)
CRASH_KW = re.compile(r'krasj|kræsj|crash|fryser|frøs|frys|henger seg|hengt seg|hang|svart skjerm|hvit skjerm|laster ikke|lastet ikke|starter ikke|'
                      r'freez|black screen|won.?t load|lagg|hakker|kastet ut|omstart|restart', re.I)
# the game's own report of a grounding (ui/06e-feedback.js: «[Grunnstøting] Spillerens svar: …»): never about an error cluster, and not a
# bug report to fix one by one either; they are counted (the incidents and Autonav's own lists have each of them: agent.py incidents)
GRUNN = re.compile(r'^\s*\[Grunnstøting\]')
def watch(c): return (c.get('src') or '') in ('crash', 'hang') or bool(WATCH_MSG.match(c.get('msg') or ''))


def link(row, cls):
    """The error cluster this feedback most likely is about: same version and platform, sent near the cluster's time; the most severe.
    A crash or hang cluster only for a feedback that speaks of one (watch, CRASH_KW)."""
    m = row.get('meta') or {}; t = ts(row.get('ts')); crash = bool(CRASH_KW.search(row.get('body') or ''))
    best = None
    for c in cls:
        if c['alvor'] < 3 or not t: continue
        if watch(c) and not crash: continue
        if not m.get('version') or m.get('version') not in c['versions']: continue          # the version must be known and the same
        if m.get('platform') and c['platforms'] and str(m.get('platform')).lower() not in {k.lower() for k in c['platforms']}: continue
        a, b = ts(c['first']), ts(c['last'])
        if not a or not b: continue
        slack = datetime.timedelta(hours=LINK_SLACK_H)
        if not (a - slack <= t <= b + slack): continue
        if not best or (c['alvor'], c['score']) > (best['alvor'], best['score']): best = c
    return best


def classify_feedback(row, cls):
    body = row.get('body') or ''; topic = row.get('topic') or 'other'
    if GRUNN.match(body):
        m = row.get('meta') or {}
        return {'id': row.get('id'), 'type': 'grunnstøting', 'alvor': 2, 'vekt': 1.0, 'score': 2.0, 'klynge': None, 'topic': topic, 'version': m.get('version'),
                'platform': m.get('platform'), 'who': row.get('who')}
    c = link(row, cls) if topic in ('bug', 'perf', 'ui', 'tut', 'boat', 'world', 'other') or TECH_KW.search(body) else None
    tech, bal, wish = bool(TECH_KW.search(body)), bool(BAL_KW.search(body)), bool(WISH_KW.search(body))
    if c: typ = 'teknisk'
    elif topic in TOPIC_TYPE:
        typ = TOPIC_TYPE[topic]
        if typ == 'balanse' and tech: typ = 'teknisk'
    elif tech: typ = 'teknisk'
    elif bal: typ = 'balanse'
    elif wish: typ = 'ønske'
    else: typ = 'uklar'
    alvor = TOPIC_ALVOR.get(topic, 1) if typ != 'teknisk' else max(3 if (topic == 'bug' or tech) else 2, TOPIC_ALVOR.get(topic, 1))
    if typ == 'teknisk' and LOSS_KW.search(body): alvor = 5
    if c: alvor = max(alvor, c['alvor'])
    m = row.get('meta') or {}
    vekt = 1.0
    try: early = (m.get('t') is not None and float(m.get('t')) < 60) or bool(m.get('tut')) or row.get('played') == '<1 t'
    except (TypeError, ValueError): early = row.get('played') == '<1 t'
    if early or topic == 'tut': vekt *= 2
    if row.get('played') in ('20-100 t', '100+ t'): vekt *= 1.5
    return {'id': row.get('id'), 'type': typ, 'alvor': alvor, 'vekt': vekt, 'score': round(alvor * vekt, 1), 'klynge': c['id'] if c else None,
            'topic': topic, 'version': m.get('version'), 'platform': m.get('platform'), 'who': row.get('who')}


# ---------- what is handled, and the thank-you ----------
GIVEN_UP = 'trenger-jonas'
REG_LABEL = 'regresjon'   # the regression's red tests, one issue each (tools/regresjon/saker.py, live-drift fase 5)


def reg_cover(test):
    """The files tests/run.py's COVER says the test covers (not the test files themselves)."""
    sys.path.insert(0, os.path.join(ROOT, 'tests'))
    import run as R
    return sorted(f for f, ts_ in R.COVER.items() if test in ts_ and not f.startswith('tests/'))
KLYNGE_REF = re.compile(r'klynge:([0-9a-f]{8})')
FB_REF = re.compile(r'tilbakemelding #(\d+)')
PR_REF = re.compile(r'/pull/(\d+)')


def handled(prs, now):
    """The cluster ids and feedback ids an open PR, or one closed in the last HANDLED_DAYS, names."""
    cl, fb = set(), set()
    for p in prs or []:
        if p.get('state') != 'open':
            t = ts(p.get('closed_at') or p.get('merged_at'))
            if not t or (now - t).total_seconds() > HANDLED_DAYS * 86400: continue
        text = (p.get('title') or '') + '\n' + (p.get('body') or '')
        cl |= set(KLYNGE_REF.findall(text)); fb |= {int(x) for x in FB_REF.findall(text)}
    return cl, fb


def reward_candidates(noted, pr_state, released):
    """[(feedback id, PR number)] for the noted feedback whose note names a merged PR that has reached main.
    pr_state(n) -> the PR dict (or None); released(pr) -> True when its commit is on main."""
    out = []
    for n in noted or []:
        if n.get('status') in ('fixed', 'no'): continue
        for num in dict.fromkeys(int(x) for x in PR_REF.findall(n.get('note') or '')):
            p = pr_state(num)
            if p and p.get('merged_at') and released(p): out.append((n['id'], num)); break
    return out


def given_up(issues):
    """The cluster ids and feedback ids of the open `trenger-jonas` issues."""
    cl, fb = set(), set()
    for i in issues or []:
        if i.get('state') != 'open': continue
        text = (i.get('title') or '') + '\n' + (i.get('body') or '')
        cl |= set(KLYNGE_REF.findall(text)); fb |= {int(x) for x in FB_REF.findall(text)}
    return cl, fb


REG_MARK = re.compile(r'<!-- regresjon (\{.*?\}) -->')
REG_ALVOR, REG_KRONISK = 3, 4   # a test red twice with the same seed weighs as a thrown error; three nights in a row a little more


def reg_clusters(reg_issues, cover):
    """The open `regresjon` issues (tools/regresjon/saker.py, live-drift fase 5) as technical clusters: one per red test, its id the
    issue's (`klynge:<id>`), the files the test covers (cover(test)) as what a fix may touch, and the risk the highest of theirs. They
    are «new» while the issue is open (the test is red each night), so a PR naming the id or a `trenger-jonas` issue is what handles one.
    One session each: a test is not the players', so the players' clusters (sessions × severity) come first."""
    out = []
    for i in reg_issues or []:
        if i.get('state', 'open') != 'open': continue
        m = REG_MARK.search(i.get('body') or '')
        if not m: continue
        try: d = json.loads(m.group(1))
        except ValueError: continue
        t = d.get('test'); cid = d.get('id')
        if not t or not cid or not re.fullmatch(r'[0-9a-f]{8}', cid): continue
        labels = [l['name'] if isinstance(l, dict) else l for l in i.get('labels') or []]
        files = cover(t) if cover else []
        alvor = REG_KRONISK if 'kronisk' in labels else REG_ALVOR
        out.append({'id': cid, 'sig': 'regresjon ' + t, 'msg': 'Regresjon: %s er rød: %s' % (t, (d.get('sjekk') or '')[:120]), 'file': files[0] if files else '',
                    'files': files, 'fn': '', 'src': 'regresjon', 'n': int(d.get('netter') or 1), 'sessions': 1, 'players': 0, 'first': d.get('forst'),
                    'last': d.get('sist'), 'versions': [], 'platforms': {}, 'gpus': [], 'examples': [], 'stack': '', 'alvor': alvor, 'feedback': [],
                    'vekt': 1.0, 'score': float(alvor), 'risiko': risiko.max_class(*[risiko.file_class(f)[0] for f in files]) if files else risiko.MIDDELS,
                    'regresjon': {'test': t, 'sak': i.get('number'), 'netter': int(d.get('netter') or 1), 'kronisk': 'kronisk' in labels}})
    return out


def decide(rows, noted, errors, prs, last_run_ts, now, lock, issues=(), reg=(), cover=None):
    """Everything above, without fetching anything: the clusters, the feedback sorted, and whether Opus is needed. reg: the open
    `regresjon` issues; cover(test) -> the files the test covers."""
    cls = clusters(errors)
    fb = [classify_feedback(r, cls) for r in rows or []]
    for f in fb:
        if f['klynge']:
            c = next(c for c in cls if c['id'] == f['klynge']); c['feedback'].append(f['id']); c['score'] = round(c['score'] + f['alvor'], 1)
    cls = sorted(cls + reg_clusters(reg, cover), key=lambda c: -c['score'])   # (after the feedback: a player's report is never linked to a test)
    hcl, hfb = handled(prs, now)
    gcl, gfb = given_up(issues)
    since = ts(last_run_ts)
    for c in cls:
        c['ny'] = bool(c.get('regresjon')) or bool(since is None or (ts(c['last']) and ts(c['last']) > since))
        c['oppgitt'] = c['id'] in gcl
        c['behandlet'] = c['id'] in hcl or c['oppgitt']
    allowed = lambda c: prlaas.allows(lock, c['risiko'], c.get('files') or ([c['file']] if c.get('file') else []))   # (one hoy, three middels, never the same file)
    fix_cl = [c for c in cls if c['ny'] and not c['behandlet'] and c['score'] >= MIN_FIX and allowed(c)]
    fix_fb = [f for f in fb if f['type'] == 'teknisk' and not f['klynge'] and f['id'] not in hfb and f['id'] not in gfb and f['score'] >= MIN_FIX]
    blocked = [c for c in cls if c['ny'] and not c['behandlet'] and c['score'] >= MIN_FIX and not allowed(c)]
    return {'klynger': cls, 'tilbakemeldinger': fb, 'rett': fix_cl, 'rett_fb': fix_fb, 'sperret': blocked, 'oppgitt': sorted(gcl) + ['#%d' % n for n in sorted(gfb)],
            'onsker': [f for f in fb if f['type'] in ('ønske', 'balanse')], 'uklare': [f for f in fb if f['type'] == 'uklar'],
            'grunn': [f for f in fb if f['type'] == 'grunnstøting']}


def opus_budget(total, steps):
    """(left for a fix, left for a queue step) from the Opus runs of the last 24 hours, all of them and the steps among them."""
    left = OPUS_TAK - total
    return left, max(0, min(STEG_TAK - steps, left - RESERVE))


def summary(d, rewards, noted_n, opus_igjen=None):
    nye_tek = [c for c in d['klynger'] if c['ny'] and not c['behandlet'] and c['score'] >= MIN_FIX] + [f for f in d['tilbakemeldinger'] if f['type'] == 'teknisk']
    ingenting = not d['tilbakemeldinger'] and not nye_tek and not rewards
    want = bool(d['rett'] or d['rett_fb'])
    return {'ingenting': ingenting, 'trenger_opus': want and (opus_igjen is None or opus_igjen > 0), 'opus_igjen': opus_igjen,
            'opus_taket_naadd': want and opus_igjen is not None and opus_igjen <= 0, 'nye_tilbakemeldinger': len(d['tilbakemeldinger']),
            'nye_tekniske': len(nye_tek), 'kan_rettes': [c['id'] for c in d['rett']] + ['#%s' % f['id'] for f in d['rett_fb']],
            'sperret_av_pr_laasen': [c['id'] for c in d['sperret']], 'venter_paa_jonas': d.get('oppgitt', []), 'onsker_og_balanse': len(d['onsker']), 'uklare': len(d['uklare']), 'grunnstotinger': len(d.get('grunn', [])),
            'belonnet': [{'tilbakemelding': f, 'pr': p} for f, p in rewards], 'notert_for': noted_n}


def draft(d, s):
    """The report's deterministic parts in Markdown (the light model adds the replies and the top lines)."""
    L = ['## Feilretting: klyngene (klynge.py)', '']
    for c in d['klynger'][:10]:
        L.append('- `klynge:%s` %s × %d økter, alvor %d, score %s%s%s, risiko %s, %s' % (c['id'], c['msg'][:90], c['sessions'], c['alvor'], c['score'],
                 ', ny' if c['ny'] else '', ', har PR' if c['behandlet'] else '', c['risiko'], c['file'] or c['src']))
    if not d['klynger']: L.append('Ingen feil i feillista.')
    if d.get('oppgitt'):
        L += ['', 'Gitt opp etter to forsøk, venter på Jonas (en åpen sak `trenger-jonas` på GitHub; lukk den for å prøve igjen): ' + ', '.join('`klynge:%s`' % x if not x.startswith('#') else 'tilbakemelding %s' % x for x in d['oppgitt'])]
    if d['sperret']:
        L += ['', 'Venter på PR-låsen (en middels/høy PR venter på Jonas, under 24 timer): ' + ', '.join('`klynge:%s`' % c['id'] for c in d['sperret'])]
    if s['belonnet']:
        L += ['', '## Rettet og sluppet: takk-haill sendt', ''] + ['- tilbakemelding #%s (PR #%s)' % (b['tilbakemelding'], b['pr']) for b in s['belonnet']]
    if d.get('grunn'):
        L += ['', 'Automatiske grunnstøtingsrapporter: %d (%s). De rettes ikke én og én; stedene står i `agent.py incidents` og hører til Autonav.' % (
            len(d['grunn']), ', '.join('#%s' % f['id'] for f in d['grunn'][:30]))]
    L += ['', '## Til Jonas: ønsker og balanse', '']
    for f in sorted(d['onsker'], key=lambda f: -f['score']):
        L.append('- #%s %s (%s), score %s' % (f['id'], f['type'], f['topic'], f['score']))
    if not d['onsker']: L.append('Ingen nye.')
    return '\n'.join(L) + '\n'


# ---------- the world outside (only in a real run) ----------
def gh(path):
    p = subprocess.run(['gh', 'api', path], capture_output=True, text=True)
    if p.returncode: raise RuntimeError('gh api %s: %s' % (path, (p.stderr or p.stdout).strip()[:200]))
    return json.loads(p.stdout)


def git(*a):
    return subprocess.run(['git'] + list(a), cwd=ROOT, capture_output=True, text=True)


def prod_version():
    try:
        with urllib.request.urlopen(urllib.request.Request(PROD_URL, headers={'User-Agent': 'klynge.py'}), timeout=15) as r: return json.load(r).get('v')
    except Exception: return None


def released_on_main(p):
    """The PR's change is on main: its merge commit, or a commit naming it «(#N)» (a squash, or the pick to slipp/auto-N)."""
    sha = p.get('merge_commit_sha')
    if sha and git('merge-base', '--is-ancestor', sha, 'origin/main').returncode == 0: return True
    out = git('log', 'origin/main', '--format=%h', '-F', '--grep', '(#%d)' % p['number']).stdout.strip()
    return bool(out)


def real_run(a):
    import importlib.util
    sp = importlib.util.spec_from_file_location('agent', os.path.join(ROOT, 'tools', 'feedback', 'agent.py')); agent = importlib.util.module_from_spec(sp); sp.loader.exec_module(agent)
    agent.URL = agent.agent_url(a.test)
    if os.path.abspath(a.out).startswith(ROOT + os.sep): sys.exit('--out must be outside the repo: the feedback never goes into git')
    os.makedirs(a.out, exist_ok=True)
    if a.fra:
        fbd = json.load(open(os.path.join(a.fra, 'feedback.json'), encoding='utf-8')); tech = json.load(open(os.path.join(a.fra, 'tech.json'), encoding='utf-8'))
    else:
        fbd = agent.call('list', lim=100) or {}; tech = agent.call('tech', days=7) or {}
        json.dump(fbd, open(os.path.join(a.out, 'feedback.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        json.dump(tech, open(os.path.join(a.out, 'tech.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    now = datetime.datetime.now(datetime.timezone.utc)
    why = []
    try: prs = gh('repos/%s/pulls?state=all&sort=updated&direction=desc&per_page=60' % REPO)
    except Exception as e: prs = None; why.append(str(e))
    try: issues = gh('repos/%s/issues?state=open&labels=%s&per_page=100' % (REPO, GIVEN_UP))
    except Exception as e: issues = None; why.append(str(e))
    if issues is None: prs = None   # without the issues it is not known what was given up: never wake Opus blind
    try: reg = gh('repos/%s/issues?state=open&labels=%s&per_page=100' % (REPO, REG_LABEL))
    except Exception as e: reg = []; why.append(str(e))   # (without them the regression's red waits; the players' errors go on)
    for p in prs or []:   # the files of the PRs that wait for Jonas: a middels fix on one of them waits (prlaas.allows)
        if prlaas.ours(p) and prlaas.klasse(p) in ('middels', 'hoy'):
            try: p['files'] = [f['filename'] for f in gh('repos/%s/pulls/%d/files?per_page=100' % (REPO, p['number'])) or []]
            except Exception as e: why.append(str(e)); prs = None; break
    lock = prlaas.decide(prs or [], now) if prs is not None else {'lav': False, 'hoy': False, 'middels': False, 'middels_hoy': False, 'filer': [], 'blokkert_av': [], 'lukk': []}
    d = decide(fbd.get('rows'), fbd.get('noted'), tech.get('errors'), prs or [], (fbd.get('last_run') or {}).get('ts'), now, lock, issues or [], reg, reg_cover)
    rewards = []
    if a.belonn and prs is not None and not a.test:
        git('fetch', '-q', '--depth=200', 'origin', '+main:refs/remotes/origin/main')
        cache = {p['number']: p for p in prs}
        def pr_state(n):
            if n not in cache:
                try: cache[n] = gh('repos/%s/pulls/%d' % (REPO, n))
                except Exception: cache[n] = None
            return cache[n]
        ver = prod_version()
        for fid, num in reward_candidates(fbd.get('noted'), pr_state, released_on_main):
            try:
                r = agent.call('fixed', fid=fid, pr='https://github.com/%s/pull/%d' % (REPO, num), ver=ver or '?') or {}
                if r.get('ok'): rewards.append((fid, num))
                else: why.append('fixed #%s: %s' % (fid, r.get('why')))
            except SystemExit as e: why.append('fixed #%s: %s' % (fid, e))
    if prs is None:   # without the PRs nothing is known about what is handled: never wake Opus blind
        d['rett'], d['rett_fb'] = [], []
    import laas
    try: igjen, igjen_steg = opus_budget(laas.takes(ROOT, 'origin', 24), laas.takes(ROOT, 'origin', 24, kind='steg'))
    except Exception as e: igjen = igjen_steg = 0; why.append('Opus-telleren: %s' % e)   # without the count, no Opus: never past the cap blind
    s = summary(d, rewards, len(fbd.get('noted') or []), igjen)
    s['opus_igjen_steg'] = igjen_steg   # what tools/drift/RUTINE.md point 6 reads before a step from the queue
    s['feil'] = why; s['pr_laas'] = {'hoy': lock['hoy'], 'middels': lock['middels'], 'filer': lock['filer'], 'blokkert_av': [p['number'] for p in lock['blokkert_av']], 'lukk': [p['number'] for p in lock['lukk']]}
    dump = dict(d); dump['oppsummering'] = s
    json.dump(dump, open(os.path.join(a.out, 'triage.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=list)
    open(os.path.join(a.out, 'rapport-utkast.md'), 'w', encoding='utf-8').write(draft(d, s))
    print('%d nye tilbakemeldinger (%d tekniske, %d ønsker/balanse, %d uklare, %d grunnstøtinger), %d klynger i feillista, %d nye tekniske å se på' % (
        len(d['tilbakemeldinger']), sum(f['type'] == 'teknisk' for f in d['tilbakemeldinger']), len(d['onsker']), len(d['uklare']), len(d.get('grunn', [])), len(d['klynger']), s['nye_tekniske']))
    for c in d['rett'][:5]: print('  rett: klynge:%s score %s risiko %s  %s  (%s)' % (c['id'], c['score'], c['risiko'], c['msg'][:80], c['file'] or c['src']))
    for f in d['rett_fb'][:5]: print('  rett: tilbakemelding #%s score %s' % (f['id'], f['score']))
    for c in d['sperret'][:5]: print('  venter på PR-låsen: klynge:%s (%s)' % (c['id'], c['risiko']))
    for b in rewards: print('  takk-haill: tilbakemelding #%s (PR #%s er hos spillerne)' % b)
    for w in why: print('  FEIL: ' + w)
    if s['opus_taket_naadd']: print('  Opus-taket er nådd: %d kjøringer siste døgn (taket er %d); rettingen venter til en av dem er over et døgn gammel' % (OPUS_TAK - igjen, OPUS_TAK))
    print('INGENTING Å GJØRE' if s['ingenting'] else ('OPUS TRENGS' if s['trenger_opus'] else 'BARE TRIAGE (ingen modell for retting)'))
    print('TRIAGE ' + json.dumps(s, ensure_ascii=False))
    return 0


# ---------- the checks ----------
def selftest():
    bad = []
    def eq(what, got, want):
        if got != want: bad.append('%s: %r, ventet %r' % (what, got, want))
    now = datetime.datetime(2026, 11, 18, 18, 0, tzinfo=datetime.timezone.utc)
    iso = lambda h: (now - datetime.timedelta(hours=h)).isoformat()
    # normalizing
    eq('heng', normalize('Heng: spillet sto stille i 7 s · 3d'), normalize('Heng: spillet sto stille i 9.5 s · 3d'))
    eq('id', normalize('no feedback 1234'), 'no feedback #')
    eq('uuid', normalize('session 3fa9c2e1-1234-4abc-8def-001122334455 gone'), 'session # gone')
    eq('hash', normalize('resource: img https://detstorebla.no/data/boat-skiff59-3fa9c2e1.bin?x=1'), normalize('resource: img https://detstorebla.no/data/boat-skiff59-77aa00ff.bin'))
    eq('egenskapen står', normalize("Cannot read properties of undefined (reading 'boat')"), "Cannot read properties of undefined (reading 'boat')")
    eq('ramme src', frame('ui/10f-cloud.js:248:7', ''), ('src/js/ui/10f-cloud.js', ''))
    eq('ramme stack', frame('promise', 'TypeError: x\n    at shopClaim (https://detstorebla.no/js/ui/10i-shop.js:88:3)\n    at y (ui/11-boot.js:1:1)'), ('src/js/ui/10i-shop.js', 'shopClaim'))
    eq('ramme utenfor', frame('https://cdn.example.com/x.js:1:1', ''), ('', ''))
    eq('ramme som ikke finnes', frame('ui/finnes-ikke.js:1:1', ''), ('', ''))
    eq('ramme på testadressen', frame('https://test.detstorebla.no/js/errtrap.js:3:1', ''), ('src/js/errtrap.js', ''))
    eq('alvor krasj', alvor_err('Krasj: siden stoppet mens den var på skjermen · 3d', 'crash'), 5)
    eq('alvor svart', alvor_err('3D svart skjerm på dagtid', 'view3d gfx'), 5)
    eq('alvor heng', alvor_err('Heng: spillet sto stille i 6 s · kart', 'hang'), 2)
    eq('alvor kast', alvor_err("Cannot read properties of null (reading 'x')", 'ui/08-actions.js:10:2'), 3)
    E = [{'msg': 'Heng: spillet sto stille i 7 s · 3d', 'src': 'hang', 'n': 3, 'sessions': 2, 'players': 2, 'first': iso(30), 'last': iso(5), 'versions': ['v1']},
         {'msg': 'Heng: spillet sto stille i 9 s · 3d', 'src': 'hang', 'n': 1, 'sessions': 1, 'players': 1, 'first': iso(20), 'last': iso(4), 'versions': ['v2']},
         {'msg': 'Krasj: siden stoppet mens den var på skjermen · under lasting', 'src': 'crash', 'n': 2, 'sessions': 2, 'players': 2, 'first': iso(3), 'last': iso(1),
          'versions': ['v2'], 'platforms': {'Android': 2}},
         {'msg': "Cannot read properties of null (reading 'qty')", 'src': 'core/03-simulation.js:120:9', 'n': 1, 'sessions': 1, 'players': 1, 'first': iso(50), 'last': iso(50), 'versions': ['v1']},
         {'msg': "x is not a function", 'src': 'ui/08-actions.js:55:1', 'n': 4, 'sessions': 3, 'players': 3, 'first': iso(10), 'last': iso(2), 'versions': ['v2'], 'platforms': {'iOS': 3}}]
    cls = clusters(E)
    heng = [c for c in cls if c['msg'].startswith('Heng')]
    eq('heng slått sammen', (len(heng), heng[0]['sessions'] if heng else 0, heng[0]['versions'] if heng else []), (1, 3, ['v1', 'v2']))
    krasj = [c for c in cls if c['msg'].startswith('Krasj')][0]
    eq('krasj ved start teller dobbelt', (krasj['score'], krasj['alvor']), (20.0, 5))
    eq('risiko av fila', {c['file']: c['risiko'] for c in cls if c['file']}, {'src/js/core/03-simulation.js': 'middels', 'src/js/ui/08-actions.js': 'lav'})
    eq('stabil id', clusters(E)[0]['id'], cls[0]['id'])
    # the feedback
    R = [{'id': 11, 'ts': iso(2), 'topic': 'bug', 'body': 'Spillet krasjet da jeg startet', 'meta': {'version': 'v2', 'platform': 'Android', 't': 30}, 'played': '<1 t', 'who': 'a'},
         {'id': 12, 'ts': iso(2), 'topic': 'idea', 'body': 'Kunne dere lagt til flere båter?', 'meta': {'version': 'v2'}, 'played': '5-20 t', 'who': 'b'},
         {'id': 13, 'ts': iso(2), 'topic': 'econ', 'body': 'Torsken betaler for lite på mottaket', 'meta': {}, 'played': '20-100 t', 'who': 'c'},
         {'id': 14, 'ts': iso(2), 'topic': 'ui', 'body': 'Knappen for å selge virker ikke', 'meta': {'version': 'v2', 'platform': 'iOS'}, 'played': '1-5 t', 'who': 'd'},
         {'id': 15, 'ts': iso(2), 'topic': 'other', 'body': 'Hei, fin dag', 'meta': {}, 'played': '1-5 t', 'who': 'e'},
         {'id': 16, 'ts': iso(2), 'topic': 'bug', 'body': 'Jeg mistet alt jeg hadde', 'meta': {'version': 'v9', 'platform': 'Android'}, 'played': '20-100 t', 'who': 'f'}]
    F = {f['id']: f for f in (classify_feedback(r, cls) for r in R)}
    eq('krasj koblet', (F[11]['type'], F[11]['klynge'], F[11]['alvor'], F[11]['vekt']), ('teknisk', krasj['id'], 5, 2.0))
    eq('ønske', F[12]['type'], 'ønske'); eq('balanse', (F[13]['type'], F[13]['vekt']), ('balanse', 1.5))
    eq('ui-feil koblet til kast', (F[14]['type'], F[14]['klynge'] is not None), ('teknisk', True))
    eq('uklar', F[15]['type'], 'uklar'); eq('tapt fremdrift', (F[16]['type'], F[16]['alvor'], F[16]['klynge']), ('teknisk', 5, None))
    # the crashes and the hangs are on every version and platform all the time, so the version, the platform and the hour link nothing
    # to them: only a feedback that speaks of a crash or a hang. 19.–25.11.2026 every bug report (the guest book, the standing plan,
    # the automatic grounding reports, a fishing vessel mark) was linked to the crash cluster 161ab007, which waited for Jonas, so none
    # of them was ever taken (fix_fb wants a feedback with no cluster)
    R2 = [{'id': 21, 'ts': iso(2), 'topic': 'bug', 'body': 'Gjesteboka virker ikke, ingenting skjer når jeg trykker', 'meta': {'version': 'v2', 'platform': 'Android'}, 'played': '5-20 t', 'who': 'g'},
          {'id': 22, 'ts': iso(2), 'topic': 'bug', 'body': '[Grunnstøting] Spillerens svar: Ja, spillets feil. Båt: X. Styrt av: route. 4 knop.', 'meta': {'version': 'v2', 'platform': 'Android'}, 'played': '5-20 t', 'who': 'h'},
          {'id': 23, 'ts': iso(2), 'topic': 'bug', 'body': 'Spillet fryser og henger seg hele tiden', 'meta': {'version': 'v2', 'platform': 'Android'}, 'played': '5-20 t', 'who': 'i'},
          {'id': 24, 'ts': iso(2), 'topic': 'bug', 'body': '[Grunnstøting] Spillerens svar: Ja, spillets feil. Båt: Y. Styrt av: leia. 2 knop.', 'meta': {'version': 'v2', 'platform': 'iOS'}, 'played': '5-20 t', 'who': 'j'}]
    F2 = {f['id']: f for f in (classify_feedback(r, cls) for r in R2)}
    eq('en feil som ikke er en krasj, kobles ikke til krasjklyngen', (F2[21]['type'], F2[21]['klynge']), ('teknisk', None))
    eq('en automatisk grunnstøting kobles aldri til en klynge', (F2[22]['klynge'], F2[24]['klynge'], F2[22]['type']), (None, None, 'grunnstøting'))
    eq('en krasj i teksten kobles fortsatt', F2[23]['klynge'], krasj['id'])
    eq('grunnstøtingene telles for seg', len(decide(R2, [], E, [], iso(6), now, {'lav': True, 'middels_hoy': True})['grunn']), 2)
    eq('ukoblet teknisk feil kan rettes', [f['id'] for f in decide(R2, [], E, [], iso(6), now, {'lav': True, 'middels_hoy': True})['rett_fb']], [21])
    # deciding: nothing new
    open_lock = {'lav': True, 'middels_hoy': True}
    d = decide([], [], [], [], iso(0.5), now, open_lock); s = summary(d, [], 0)
    eq('tomt: ingenting', (s['ingenting'], s['trenger_opus']), (True, False))
    old = [dict(e, first=iso(80), last=iso(70)) for e in E]
    d = decide([], [], old, [], iso(1), now, open_lock); s = summary(d, [], 0)
    eq('bare gamle feil: ingen Opus', (s['ingenting'], s['trenger_opus']), (True, False))
    # new crash and errors
    d = decide([], [], E, [], iso(6), now, open_lock); s = summary(d, [], 0)
    eq('ny krasj: Opus', (s['ingenting'], s['trenger_opus'], krasj['id'] in s['kan_rettes']), (False, True, True))
    # handled by an open PR
    prs = [{'number': 5, 'state': 'open', 'title': 't', 'body': 'Retter ' + ' og '.join('klynge:' + c['id'] for c in cls)}]
    d = decide([], [], E, prs, iso(6), now, open_lock); s = summary(d, [], 0)
    eq('behandlet av PR', s['trenger_opus'], False)
    prs_old = [dict(prs[0], state='closed', closed_at=iso(24 * 5))]
    eq('gammel lukket PR teller ikke', summary(decide([], [], E, prs_old, iso(6), now, open_lock), [], 0)['trenger_opus'], True)
    # the regression's red tests (live-drift fase 5): an open `regresjon` issue is a technical cluster, handled by a PR or `trenger-jonas`
    ri = lambda n, t, cid, labels=('regresjon',), netter=1: {'number': n, 'state': 'open', 'labels': [{'name': l} for l in labels],
        'body': '<!-- regresjon %s -->\ntekst' % json.dumps({'test': t, 'id': cid, 'netter': netter, 'forst': '2026-11-17', 'sist': '2026-11-19', 'sjekk': 'FEIL noe'})}
    cov = {'errtest': ['src/js/errtrap.js', 'src/js/ui/10f-cloud.js'], 'docktest': ['src/js/ui/10c-dock.js']}.get
    REG = [ri(40, 'errtest', 'aaaa1111'), ri(41, 'docktest', 'bbbb2222', ('regresjon', 'kronisk'), 3), {'number': 42, 'state': 'open', 'labels': [], 'body': 'ingen markør'}]
    d = decide([], [], [], [], iso(0.5), now, open_lock, (), REG, cov); s = summary(d, [], 0)
    rc = {c['id']: c for c in d['klynger']}
    eq('regresjon: to klynger, saken uten markør hoppes over', sorted(rc), ['aaaa1111', 'bbbb2222'])
    bal = {'number': 43, 'state': 'open', 'labels': [{'name': 'balanse'}], 'body': '<!-- balanse -->\n**Balansesjekken** progweek: 302 kg → 142 kg'}
    eq('balansesaken blir aldri en klynge (den er Jonas\' og rettes aldri av Opus)', reg_clusters([bal], cov), [])
    eq('regresjon: risiko av filene testen dekker', (rc['aaaa1111']['risiko'], rc['bbbb2222']['risiko']), ('hoy', 'lav'))
    eq('regresjon: kronisk veier mer', (rc['aaaa1111']['score'], rc['bbbb2222']['score']), (3.0, 4.0))
    eq('regresjon: Opus for den som er lov', (s['trenger_opus'], s['kan_rettes'][:1]), (True, ['bbbb2222']))
    prs_r = [{'number': 9, 'state': 'open', 'title': 't', 'body': 'klynge:bbbb2222'}]
    s = summary(decide([], [], [], prs_r, iso(0.5), now, open_lock, (), REG, cov), [], 0)
    eq('regresjon: PR som nevner klyngen', 'bbbb2222' in s['kan_rettes'], False)
    gu = [{'state': 'open', 'title': 'x', 'body': 'klynge:aaaa1111 klynge:bbbb2222'}]
    s = summary(decide([], [], [], [], iso(0.5), now, open_lock, gu, REG, cov), [], 0)
    eq('regresjon: gitt opp venter på Jonas', (s['trenger_opus'], sorted(s['venter_paa_jonas'])), (False, ['aaaa1111', 'bbbb2222']))
    d = decide([], [], E, [], iso(6), now, open_lock, (), REG, cov)
    eq('regresjon: spillernes krasj først', d['rett'][0]['id'], krasj['id'])
    eq('regresjon: en tilbakemelding kobles aldri til en test', all(not c.get('regresjon') or not c['feedback'] for c in decide(R, [], E, [], iso(6), now, open_lock, (), REG, cov)['klynger']), True)
    shut_h = {'lav': True, 'middels_hoy': True, 'hoy': False, 'middels': True}
    s = summary(decide([], [], [], [], iso(0.5), now, shut_h, (), [REG[0]], cov), [], 0)
    eq('regresjon: høy venter når høy-plassen er tatt', (s['kan_rettes'], s['sperret_av_pr_laasen']), ([], ['aaaa1111']))
    # the PR lock: a middels cluster waits, a lav one goes
    shut = {'lav': True, 'middels_hoy': False}
    E2 = [E[3] | {'first': iso(2), 'last': iso(1)}]
    s = summary(decide([], [], E2, [], iso(6), now, shut), [], 0)
    eq('middels sperret av låsen', (s['trenger_opus'], len(s['sperret_av_pr_laasen'])), (False, 1))
    s = summary(decide([], [], [E[4]], [], iso(6), now, shut), [], 0)
    eq('lav går forbi låsen', s['trenger_opus'], True)
    # a technical feedback with no cluster wakes Opus; an idea does not
    eq('teknisk tilbakemelding', summary(decide([R[5]], [], [], [], iso(1), now, open_lock), [], 0)['trenger_opus'], True)
    s = summary(decide([R[1], R[2]], [], [], [], iso(1), now, open_lock), [], 0)
    eq('ønske og balanse: ingen Opus, men triage', (s['ingenting'], s['trenger_opus'], s['onsker_og_balanse']), (False, False, 2))
    eq('ønsker i utkastet', '## Til Jonas: ønsker og balanse' in draft(decide([R[1]], [], [], [], iso(1), now, open_lock), s) and '#12 ønske' in draft(decide([R[1]], [], [], [], iso(1), now, open_lock), s), True)
    # given up: an open issue trenger-jonas skips the cluster, the next one is taken; a closed one lets it be tried again
    krasj_id = krasj['id']
    iss = [{'number': 90, 'state': 'open', 'title': 'Trenger Jonas: klynge:%s' % krasj_id, 'body': '- klynge:%s' % krasj_id, 'labels': [{'name': 'trenger-jonas'}]}]
    d = decide([], [], E, [], iso(6), now, open_lock, iss); s = summary(d, [], 0)
    eq('oppgitt hoppes over, neste tas', (krasj_id in s['kan_rettes'], s['trenger_opus'], s['venter_paa_jonas']), (False, True, [krasj_id]))
    d = decide([], [], [E[2]], [], iso(6), now, open_lock, iss); s = summary(d, [], 0)
    eq('bare den oppgitte: ingen Opus', (s['trenger_opus'], s['ingenting']), (False, True))
    d = decide([], [], [E[2]], [], iso(6), now, open_lock, [dict(iss[0], state='closed')]); s = summary(d, [], 0)
    eq('lukket sak: prøves igjen', s['trenger_opus'], True)
    iss_fb = [{'number': 91, 'state': 'open', 'title': 'Trenger Jonas: tilbakemelding #16', 'body': '- tilbakemelding #16'}]
    eq('oppgitt tilbakemelding', summary(decide([R[5]], [], [], [], iso(1), now, open_lock, iss_fb), [], 0)['trenger_opus'], False)
    eq('oppgitt i utkastet', 'Gitt opp etter to forsøk' in draft(decide([], [], E, [], iso(6), now, open_lock, iss), summary(decide([], [], E, [], iso(6), now, open_lock, iss), [], 0)), True)
    # the budget: 2 a day, at most 1 of them on a queue step, and a step only when one is left for a fix after it
    eq('budsjett: ingen brukt', opus_budget(0, 0), (4, 1))
    eq('budsjett: én retting brukt, ett steg igjen', opus_budget(1, 0), (3, 1))
    eq('budsjett: ett steg brukt, ingen flere steg', opus_budget(1, 1), (3, 0))
    eq('budsjett: tre brukt, den siste er reserven til en feil', opus_budget(3, 0), (1, 0))
    eq('budsjett: fire brukt', opus_budget(4, 0), (0, 0))
    eq('budsjett: aldri under null', opus_budget(5, 1), (-1, 0))
    # the Opus cap: a fix waits when the day's runs are used, the triage goes on
    d = decide([], [], E, [], iso(6), now, open_lock)
    eq('taket nådd', (summary(d, [], 0, 0)['trenger_opus'], summary(d, [], 0, 0)['opus_taket_naadd'], summary(d, [], 0, 0)['ingenting']), (False, True, False))
    eq('taket ikke nådd', summary(d, [], 0, 1)['trenger_opus'], True)
    # what a public issue may say: names in the code stay, words a player may have typed go
    eq('egenskap står', public_text("Cannot read properties of undefined (reading 'boat')"), "Cannot read properties of undefined (reading 'boat')")
    eq('båtnavn fjernes', public_text("Fant ikke båten 'Havørn av Senja' i havna"), 'Fant ikke båten «…» i havna')
    eq('anførsel fjernes', public_text('Kunne ikke lagre "min første tur!"'), 'Kunne ikke lagre «…»')
    eq('norske tegn fjernes', public_text("ukjent art 'sei-lyr på Røst'"), 'ukjent art «…»')
    eq('ett ord med ø fjernes', public_text("båten 'Havørn' finnes ikke"), 'båten «…» finnes ikke')
    # the thank-you
    noted = [{'id': 21, 'status': 'planned', 'note': 'Rettet i https://github.com/x/y/pull/40'}, {'id': 22, 'status': 'planned', 'note': 'PR /pull/41'},
             {'id': 23, 'status': 'fixed', 'note': '/pull/40'}, {'id': 24, 'status': 'seen', 'note': 'ingen PR'}, {'id': 25, 'status': 'planned', 'note': '/pull/42'}]
    st = {40: {'number': 40, 'merged_at': iso(5)}, 41: {'number': 41, 'merged_at': iso(5)}, 42: {'number': 42, 'merged_at': None}}
    eq('takk-haill bare når sluppet', reward_candidates(noted, st.get, lambda p: p['number'] == 40), [(21, 40)])
    s = summary(decide([], noted, [], [], iso(1), now, open_lock), [(21, 40)], len(noted))
    eq('belønning alene er noe å gjøre', (s['ingenting'], s['trenger_opus']), (False, False))
    for b in bad: print('FEIL ' + b)
    print('OK klynge selftest' if not bad else 'FEIL klynge selftest: %d' % len(bad))
    return 1 if bad else 0


QUOTED = re.compile(r"'([^']*)'|\"([^\"]*)\"|«([^»]*)»|`([^`]*)`")


def public_text(msg):
    """An error message as it may stand in a public issue: what is quoted stays only when it looks like a name in the code
    ('boat', "S.cargo"), never words a player may have typed (a boat's name, a message): those become «…» (18.11.2026)."""
    def keep(m):
        inner = next(g for g in m.groups() if g is not None)
        return m.group(0) if re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$.\[\]#-]{0,40}', inner, re.ASCII) else '«…»'
    return QUOTED.sub(keep, msg or '')


def give_up(a):
    """An open issue `trenger-jonas` for a cluster (8 hex) or a feedback (#N) the fix agent gave up on. No player text goes in it."""
    key = a.gi_opp.strip()
    c = None
    if a.out and os.path.exists(os.path.join(a.out, 'triage.json')):
        c = next((k for k in json.load(open(os.path.join(a.out, 'triage.json'), encoding='utf-8')).get('klynger', []) if k['id'] == key), None)
    if re.fullmatch(r'[0-9a-f]{8}', key): ref = 'klynge:' + key
    elif re.fullmatch(r'#?\d+', key): ref = 'tilbakemelding #' + key.lstrip('#')
    else: sys.exit('--gi-opp tar en klynge-id (8 hex) eller #N')
    title = 'Trenger Jonas: %s%s' % (ref, (' ' + public_text(c['msg'])[:70]) if c else '')
    body = ['Feilrettingen ga opp etter to forsøk (`tools/feilretting/RUTINE.md` punkt 5), så denne hoppes over til saken lukkes.', '',
            '- %s' % ref]
    if c: body += ['- Melding (normalisert): `%s`' % public_text(c['msg'])[:160].replace('`', "'"), '- Sted: `%s`' % (c['file'] or c['src']),
                   '- Økter: %d, versjoner: %s, alvor %d, score %s' % (c['sessions'], ', '.join(c['versions'][-4:]), c['alvor'], c['score'])]
    body += ['', '**Hvorfor den ble gitt opp:** ' + (a.grunn or '(ikke oppgitt)')[:1500], '',
             'Lukk saken når du har sett på den (eller rettet den selv): da kan Driften prøve igjen.', '', '---', '_Feilrettingen (`tools/triage/klynge.py --gi-opp`)_']
    try:
        subprocess.run(['gh', 'api', 'repos/%s/labels' % REPO, '-f', 'name=' + GIVEN_UP, '-f', 'color=D93F0B', '-f', 'description=Feilrettingen ga opp etter to forsøk'], capture_output=True, text=True)
        r = subprocess.run(['gh', 'api', 'repos/%s/issues' % REPO, '-f', 'title=' + title, '-f', 'body=' + '\n'.join(body), '-f', 'labels[]=' + GIVEN_UP, '-q', '.html_url'],
                           capture_output=True, text=True)
        if r.returncode: raise RuntimeError((r.stderr or r.stdout).strip()[:200])
        print('GITT OPP: ' + r.stdout.strip()); return 0
    except Exception as e:
        print('FEIL: kunne ikke åpne saken: %s' % e); return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out'); ap.add_argument('--fra'); ap.add_argument('--belonn', action='store_true'); ap.add_argument('--test', action='store_true')
    ap.add_argument('--selftest', action='store_true'); ap.add_argument('--gi-opp'); ap.add_argument('--grunn')
    a = ap.parse_args()
    if a.selftest: return selftest()
    if a.gi_opp: return give_up(a)
    if not a.out: ap.error('--out er påkrevd')
    return real_run(a)


if __name__ == '__main__':
    sys.exit(main())
