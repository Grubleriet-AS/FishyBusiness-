"""The watch on the database (tools/server/vakt/vakt.sh, steg 138, 17.11.2026) against a stand-in for Supabase, ntfy.sh and Caddy's
metrics on this machine: an answer sends nothing; one miss sends nothing; the second miss in a row sends one push, and the misses after
it no more; no answer at all (a hang) is a miss; the first answer after sends one push that it answers again; a push that did not go is
tried again the next minute; the push has the topic and no key; the request count is kept once an hour. And status.sh runs without
systemd and changes nothing. No browser. Prints OK or FEIL."""
import json, os, subprocess, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAKT = os.path.join(ROOT, 'tools/server/vakt/vakt.sh')
S = {'db': 200, 'ntfy': 200, 'pushes': [], 'asks': 0}


def check(ok, what, extra=''):
    print(('OK  ' if ok else 'FEIL') + ' ' + what + (('  ' + json.dumps(extra, ensure_ascii=False, default=str)[:400]) if extra != '' else ''))


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def reply(self, code, body=b'null'):
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        if self.path == '/metrics':
            return self.reply(200, b'# HELP x\ncaddy_http_request_duration_seconds_count{code="200",handler="file_server",server="srv0"} 1200\n'
                              b'caddy_http_request_duration_seconds_count{code="502",handler="reverse_proxy",server="srv0"} 7\n')
        self.reply(404)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        if self.path == '/rest/v1/rpc/sp_now':
            S['asks'] += 1; S['key'] = self.headers.get('apikey')
            if S['db'] == 'hang':
                time.sleep(4)
                try: return self.reply(200)
                except OSError: return   # (the watch gave up first, as it should)
            return self.reply(S['db'], b'{}')
        if self.path == '/ntfy/':
            S['pushes'].append(json.loads(body)); return self.reply(S['ntfy'], b'{}')
        self.reply(404)


srv = ThreadingHTTPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
st = tempfile.mkdtemp(prefix='vakt-')
ENV = dict(os.environ, NTFY_TOPIC='dsb-vakt-test0123', SUPA_URL='http://127.0.0.1:%d' % port, SUPA_KEY='sb_publishable_test',
           NTFY_URL='http://127.0.0.1:%d/ntfy' % port, CADDY_METRICS='http://127.0.0.1:%d/metrics' % port, STATE_DIRECTORY=st, VAKT_WAIT='2')


def minute(db, ntfy=200):
    S['db'] = db; S['ntfy'] = ntfy; n = len(S['pushes'])
    r = subprocess.run(['bash', VAKT], env=ENV, capture_output=True, text=True, timeout=60)
    return r.returncode, S['pushes'][n:], r.stdout + r.stderr


def titles(ps): return [p.get('title', '') for p in ps]


c, p, out = minute(200)
check(c == 0 and p == [] and S['asks'] == 1 and S['key'] == 'sb_publishable_test', 'an answer: nothing sent, the database asked once with the publishable key', out)
c, p, out = minute(503)
check(c == 0 and p == [], 'one miss (503): no push yet', out)
c, p, out = minute(503)
check(len(p) == 1 and 'svarer ikke' in p[0]['title'] and p[0]['topic'] == 'dsb-vakt-test0123' and p[0]['priority'] == 5 and '503' in p[0]['message'],
      'the second miss in a row: one push, with the topic, high priority and what failed', p)
check(all('sb_publishable' not in json.dumps(x) and 'SUPA' not in json.dumps(x) for x in p), 'the push has no key and no address of the database', p)
c, p, out = minute(503)
c2, p2, out2 = minute('hang')
check(p == [] and p2 == [] and 'miss 4 (000' in out2, 'the misses after it send no more; a hang (no answer in the time) is a miss too', out + out2)
c, p, out = minute(200)
check(len(p) == 1 and 'svarer igjen' in p[0]['title'] and 'min' in p[0]['message'], 'the first answer after: one push that it answers again', p)
c, p, out = minute(200)
check(p == [] and open(os.path.join(st, 'state')).read().split() == ['0', '0', '0'], 'and then nothing, and the state is clear', out)
# a push that did not go (ntfy.sh down) is tried again the next minute
minute(503); c, p, out = minute(503, ntfy=500); c2, p2, out2 = minute(503)
check(len(p) == 1 and len(p2) == 1, 'a push that ntfy.sh did not take is sent again the next minute', {'first': titles(p), 'next': titles(p2)})
c, p, out = minute(503)
check(p == [], 'and only once after it went', titles(p))
minute(200)
# the request count, once an hour
rows = open(os.path.join(st, 'req.tsv')).read().strip().split('\n')
check(len(rows) == 1 and rows[0].split('\t')[1:] == ['1207', '7'], 'Caddy\'s count is kept once an hour (the total and the 5xx), not every minute', rows)
# without the topic it stops with a clear error
r = subprocess.run(['bash', VAKT], env={k: v for k, v in ENV.items() if k != 'NTFY_TOPIC'}, capture_output=True, text=True, timeout=30)
check(r.returncode != 0 and 'NTFY_TOPIC' in r.stderr, 'without the topic it stops and says so', r.stderr[-200:])
# status.sh: runs here without systemd, the relay or the watch's files, and prints its sections
before = set(os.listdir(st))
r = subprocess.run(['bash', os.path.join(ROOT, 'tools/server/status.sh')], capture_output=True, text=True, timeout=60)
secs = [l for l in r.stdout.split('\n') if l.startswith('== ')]
check(r.returncode == 0 and len(secs) >= 9 and 'CPU de siste 5 s' in r.stdout and set(os.listdir(st)) == before,
      'status.sh runs without systemd, prints all its sections and changes nothing', {'sections': [s[3:30] for s in secs], 'err': r.stderr[-300:]})
for name in ('tools/server/vakt/vakt.sh', 'tools/server/vakt/setup.sh', 'tools/server/status.sh', 'tools/server/setup.sh'):
    r = subprocess.run(['bash', '-n', os.path.join(ROOT, name)], capture_output=True, text=True)
    check(r.returncode == 0, 'bash -n ' + name, r.stderr[-200:])
srv.shutdown()
