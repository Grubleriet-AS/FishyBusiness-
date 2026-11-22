# tools/saves/fetch.py against a stand-in for PostgREST on localhost (no database key, no real save): the save gate stopped two releases
# on 21.11.2026 on «The read operation timed out», as a page of a thousand rows of save_hist had grown to about 100 MB. With as many
# rows as production had then (670 saves, 2 600 in save_hist, 60 kB each here), the biggest answer must stay small, and the saves
# laid out must be the same as before: every player's save and the newest earlier one, the same save once.
import base64, gzip, hashlib, http.server, json, os, re, subprocess, sys, tempfile, threading, urllib.parse
ok = lambda c: 'OK  ' if c else 'FEIL'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FETCH = sys.argv[sys.argv.index('--fetch') + 1] if '--fetch' in sys.argv else os.path.join(ROOT, 'tools/saves/fetch.py')
NP, NH, PAD = 670, 2600, 60000
code = lambda o: 'KYST2:' + base64.b64encode(gzip.compress(json.dumps(o).encode(), 1)).decode()
pad = os.urandom(PAD // 2).hex()
SAVES = [{'player_id': 'p%03d' % i, 'data': code({'t': i, 'pad': pad}), 'updated_at': 'x'} for i in range(NP)]
HIST = [{'id': k + 1, 'player_id': 'p%03d' % (k % NP), 'data': code({'t': 10000 + k, 'pad': pad}), 'saved_at': 'x'} for k in range(NH)]
HIST[-1]['data'] = SAVES[(NH - 1) % NP]['data']   # (a player's newest earlier save the same as the save now: one file)
big = [0]

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); t = u.path.rsplit('/', 1)[1]; q = urllib.parse.parse_qs(u.query)
        rows = SAVES if t == 'saves' else sorted(HIST, key=lambda r: -r['id'])
        if 'id' in q: want = set(int(x) for x in re.match(r'in\.\((.*)\)', q['id'][0]).group(1).split(',')); rows = [r for r in rows if r['id'] in want]
        off, lim = int(q.get('offset', ['0'])[0]), min(int(q.get('limit', ['1000'])[0]), 1000)
        sel = q['select'][0].split(','); body = json.dumps([{k: r[k] for k in sel} for r in rows[off:off + lim]]).encode()
        big[0] = max(big[0], len(body))
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
out = tempfile.mkdtemp()
env = dict(os.environ, SUPABASE_URL='http://127.0.0.1:%d' % srv.server_address[1], SUPABASE_SERVICE_ROLE_KEY='stand-in', no_proxy='127.0.0.1', NO_PROXY='127.0.0.1')
for k in ('HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy'): env.pop(k, None)
p = subprocess.run([sys.executable, FETCH, '--hist', '1', '--out', out], env=env, capture_output=True, text=True, timeout=600)
srv.shutdown()
files = set(f[:-5] for f in os.listdir(out) if f.endswith('.json'))
fp = lambda s: hashlib.sha256(s.encode()).hexdigest()[:8]
raw = lambda c: gzip.decompress(base64.b64decode(c[6:])).decode()
newest = {}
for r in sorted(HIST, key=lambda r: -r['id']): newest.setdefault(r['player_id'], r)
want = set(fp(raw(r['data'])) for r in SAVES) | set(fp(raw(r['data'])) for r in newest.values())
print('svar:', p.returncode, p.stdout.strip()[-80:], p.stderr.strip()[-200:], 'største svar %.1f MB' % (big[0] / 1e6))
print(ok(p.returncode == 0 and files == want), 'every save and the newest earlier one of each player, the same save once', (len(files), len(want)))
print(ok(big[0] < 15e6), 'no answer over 15 MB (%.1f MB)' % (big[0] / 1e6))
