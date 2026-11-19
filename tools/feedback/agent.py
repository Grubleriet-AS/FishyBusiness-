"""The feedback agent's hands (06.10.2026; tools/feedback/RUTINE.md, supabase/functions/feedback-agent, docs/systemer/tilbakemelding-og-admin.md 4.22).

Talks to the Edge Function feedback-agent with the token FEEDBACK_AGENT_TOKEN (Jonas sets it as an API credential in the Claude
Code environment, which sessions use without seeing it; it is never written anywhere). What it fetches is the players' feedback: it goes to a folder outside the repo
(--out, by default a temporary folder) and never into git.

    python3 tools/feedback/agent.py list [--lim 40] [--out DIR] [--imgs]     the new feedback to DIR/feedback.json (pictures to DIR/img/)
    python3 tools/feedback/agent.py note ID --score 6 --status seen --note "..." [--reply "..."]
    python3 tools/feedback/agent.py run --report RAPPORT.md [--pr URL "title"]... [--n 12]
    python3 tools/feedback/agent.py tech [--days 7] [--out DIR]                 the errors and the frame rate by device to DIR/tech.json
    python3 tools/feedback/agent.py incidents [--days 30] [--out DIR]           the groundings, the blows and the collisions to DIR/incidents.json,
                                                                                summed up per place (17.11.2026)
    python3 tools/feedback/agent.py uke                                          the week's numbers (tools/triage/ukesrapport.py uses them)
    python3 tools/feedback/agent.py fixed ID --pr URL --ver V                    a fix of this feedback is out with the players: status
                                                                                fixed, a confirmation and the takk-haill once (18.11.2026;
                                                                                tools/triage/klynge.py --belonn does it by itself)
    python3 tools/feedback/agent.py --test list ...                             the same against the test project (what Jonas sends from
                                                                                test.detstorebla.no); use another --out than production's
"""
import argparse, base64, json, os, sys, tempfile, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLOUD = json.load(open(os.path.join(ROOT, 'src', 'data', 'cloud.json')))
URL = CLOUD['supabaseUrl'].rstrip('/') + '/functions/v1/feedback-agent'


def agent_url(test):
    # --test: the test project, where what is sent from test.detstorebla.no lands (the «test» block in cloud.json)
    return (CLOUD['test']['supabaseUrl'] if test else CLOUD['supabaseUrl']).rstrip('/') + '/functions/v1/feedback-agent'


def call(op, **kw):
    # an API credential in the Claude Code environment: the session may see the variable only as a stand-in, which the proxy swaps
    # for the real token on its way to Supabase; without the variable the call goes bare, in case the proxy adds the header itself
    tok = os.environ.get('FEEDBACK_AGENT_TOKEN', '')
    hdr = {'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + tok} if tok else {})}
    req = urllib.request.Request(URL, data=json.dumps({'op': op, **kw}).encode(), method='POST', headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out = json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')[:300]
        if e.code == 401:
            sys.exit('feedback-agent %s: the token was not accepted%s. Jonas sets FEEDBACK_AGENT_TOKEN as an API credential in the Claude Code environment, the same as the secret in Supabase' % (op, '' if tok else ' (FEEDBACK_AGENT_TOKEN is not in the environment)'))
        sys.exit('feedback-agent %s: HTTP %d %s' % (op, e.code, body))
    except urllib.error.URLError as e:
        sys.exit('feedback-agent %s: %s (is %s allowed in the environment\'s network access?)' % (op, e.reason, URL.split('/')[2]))
    if not out.get('ok'):
        sys.exit('feedback-agent %s: %s' % (op, out.get('why')))
    return out.get('data')


def to_ll(x, y):
    # the game's frame (UTM zone 33 in km, core/00-proj.js natP): x = (E + 250 km) / 1000, y = (8 050 km - N) / 1000; None without pyproj
    try:
        from pyproj import Transformer
        lon, lat = Transformer.from_crs('EPSG:25833', 'EPSG:4326', always_xy=True).transform(x * 1000 - 250000, 8050000 - y * 1000)
        return round(lat, 4), round(lon, 4)
    except Exception:
        return None


def incidents(d, out):
    # the groundings ('aground'), the blows against a quay, a pier, a breakwater or a sea mark ('hit') and the collisions with another
    # vessel ('clash'), each with where, the boat, the speed and who steered (leia = Autonav, route, return, ops, helm, sleep, drift)
    if os.path.abspath(out).startswith(ROOT + os.sep):
        sys.exit('--out must be outside the repo')
    os.makedirs(out, exist_ok=True)
    json.dump(d, open(os.path.join(out, 'incidents.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rows = d.get('rows') or []
    print('the last %s days: %d incidents; written to %s' % (d.get('days'), len(rows), os.path.join(out, 'incidents.json')))
    for t in d.get('totals') or []:
        print('  %-8s %-7s %4d times, %3d players' % (t['kind'], t.get('how') or '-', t['n'], t['players']))
    # per place (1 km cells), most first: where the same thing happens to several players is a fault in the game, not a slip
    cells = {}
    for r in rows:
        x, y = (r.get('d') or {}).get('x'), (r.get('d') or {}).get('y')
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            continue
        c = cells.setdefault((r['kind'], int(x), int(y)), {'n': 0, 'who': set(), 'how': {}, 'boat': {}, 'x': x, 'y': y, 'last': r['ts'], 'ver': set()})
        c['n'] += 1; c['who'].add(r.get('who')); c['ver'].add(r.get('version'))
        h = (r.get('d') or {}).get('how') or '-'; c['how'][h] = c['how'].get(h, 0) + 1
        bt = (r.get('d') or {}).get('boat') or '-'; c['boat'][bt] = c['boat'].get(bt, 0) + 1
    print('places (1 km), most players first:')
    for (k, cx, cy), c in sorted(cells.items(), key=lambda kv: (-len(kv[1]['who']), -kv[1]['n']))[:40]:
        print('  %-7s %3d times %2d players  at %s (x %.2f, y %.2f)  %s  %s  last %s' % (k, c['n'], len(c['who']), to_ll(c['x'], c['y']), c['x'], c['y'],
              ','.join('%s %d' % kv for kv in c['how'].items()), ','.join('%s %d' % kv for kv in c['boat'].items()), c['last'][:16]))


def main():
    global URL
    ap = argparse.ArgumentParser()
    ap.add_argument('--test', action='store_true', help='the test project (feedback sent from test.detstorebla.no), not production')
    sub = ap.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('list'); a.add_argument('--lim', type=int, default=40); a.add_argument('--out', default=os.path.join(tempfile.gettempdir(), 'dsb-feedback'))
    a.add_argument('--imgs', action='store_true')
    n = sub.add_parser('note'); n.add_argument('id', type=int); n.add_argument('--score', type=float); n.add_argument('--status', choices=['new', 'seen', 'fixed', 'planned', 'no'])
    n.add_argument('--note', required=True); n.add_argument('--reply')
    tc = sub.add_parser('tech'); tc.add_argument('--days', type=int, default=7); tc.add_argument('--out', default=os.path.join(tempfile.gettempdir(), 'dsb-feedback'))
    ic = sub.add_parser('incidents'); ic.add_argument('--days', type=int, default=30); ic.add_argument('--out', default=os.path.join(tempfile.gettempdir(), 'dsb-feedback'))
    fx = sub.add_parser('fixed'); fx.add_argument('id', type=int); fx.add_argument('--pr', required=True); fx.add_argument('--ver', default='?')
    sub.add_parser('uke')
    r = sub.add_parser('run'); r.add_argument('--report', required=True); r.add_argument('--pr', nargs=2, action='append', metavar=('URL', 'TITLE'), default=[])
    r.add_argument('--n', type=int, default=0)
    o = ap.parse_args()
    URL = agent_url(o.test)
    if o.cmd == 'list':
        d = call('list', lim=o.lim)
        if os.path.abspath(o.out).startswith(ROOT + os.sep):
            sys.exit('--out must be outside the repo: the feedback never goes into git')
        os.makedirs(o.out, exist_ok=True)
        json.dump(d, open(os.path.join(o.out, 'feedback.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        rows = d.get('rows') or []
        print('%d new (%d not yet read), %d noted before; written to %s' % (len(rows), d.get('left', 0) - len(rows), len(d.get('noted') or []), os.path.join(o.out, 'feedback.json')))
        for x in rows:
            m = x.get('meta') or {}
            print('#%s %s %s %s who=%s played=%s earlier=%s img=%s vid=%s %s/%s' % (x['id'], x['ts'][:16], x['topic'], ('*' * (x.get('rating') or 0)) or '-', x['who'], x.get('played'),
                  x.get('earlier'), x.get('nimg'), x.get('nvid'), m.get('version'), m.get('platform')))
            print('   ' + ' '.join(x['body'].split())[:300])
            if o.imgs and x.get('nimg'):
                os.makedirs(os.path.join(o.out, 'img'), exist_ok=True)
                for k, u in enumerate(call('imgs', fid=x['id']) or []):
                    head, _, b64 = u.partition(',')
                    ext = 'png' if 'png' in head else 'webp' if 'webp' in head else 'jpg'
                    p = os.path.join(o.out, 'img', '%s-%d.%s' % (x['id'], k, ext)); open(p, 'wb').write(base64.b64decode(b64)); print('   picture', p)
    elif o.cmd == 'incidents':
        incidents(call('incidents', days=o.days), o.out)
    elif o.cmd == 'tech':
        d = call('tech', days=o.days) or {}
        os.makedirs(o.out, exist_ok=True); json.dump(d, open(os.path.join(o.out, 'tech.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        s = d.get('sessions') or {}
        print('the last %s days: %s sessions, %s rage quits, %s min on average; written to %s' % (d.get('days'), s.get('n'), s.get('rage'), s.get('avg_min'), os.path.join(o.out, 'tech.json')))
        print('errors (most first):')
        for e in (d.get('errors') or [])[:15]:
            print('  %4d × in %d sessions, %d players  %s  [%s]  %s' % (e['n'], e['sessions'], e['players'], ' '.join(str(e['msg']).split())[:110], ','.join(e.get('versions') or []), ' · '.join(e.get('gpus') or [])[:80]))
        print('frame rate by device (most measured first):')
        for f in (d.get('fps_device') or [])[:15]:
            print('  %5s fps (low %s, drops %s, 3D level %s)  %s / %s / %s  n=%s' % (f.get('fps'), f.get('low'), f.get('drops'), f.get('lvl'), f.get('platform'), f.get('browser'), f.get('gpu'), f.get('n')))
        print('by version:', ', '.join('%s %s fps (%s under 20)' % (v['version'], v['fps'], v['slow']) for v in d.get('fps_version') or []))
    elif o.cmd == 'uke':
        print(json.dumps(call('uke'), ensure_ascii=False, indent=1))
    elif o.cmd == 'fixed':
        d = call('fixed', fid=o.id, pr=o.pr, ver=o.ver) or {}
        print(('fixed %d%s' % (o.id, ', takk-haill sendt' if d.get('rewarded') else '')) if d.get('ok') else 'not fixed %d: %s' % (o.id, d.get('why')))
    elif o.cmd == 'note':
        call('note', fid=o.id, note=o.note, score=o.score, st=o.status, reply=o.reply); print('noted', o.id)
    else:
        rep = open(o.report, encoding='utf-8').read()
        rid = call('run', report=rep, prs=[{'url': u, 'title': t} for u, t in o.pr], n=o.n); print('report', rid)


if __name__ == '__main__':
    main()
