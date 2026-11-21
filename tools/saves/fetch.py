"""The players' saves from the account database, for tests/savestest.py (Jonas 08.10.2026: start the game with every real save before it
goes out, so a save that cannot start is caught before a player meets it).

Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase › Project Settings › API; in GitHub Actions as secrets). Writes each save, and
the last few earlier ones of each player (save_hist), as plain JSON to tests/saves/ (in .gitignore: the players' games never go into the
repository, which is public), or to the folder --out names (the release job: "$RUNNER_TEMP/saves", deleted when the job ends).

A file is named by the save's fingerprint, the first 8 characters of the sha256 of the save (L1c, 11.11.2026): the same as
tests/savestest.py prints, and nothing of the player's (no id, no name, no time). Two rows with the same save are one file. Nothing but
the number of saves is printed.

  python3 tools/saves/fetch.py                  # the saves now
  python3 tools/saves/fetch.py --hist 3         # and up to three earlier ones of each player
  python3 tools/saves/fetch.py --out <folder>   # there, not in tests/saves/
  python3 tools/saves/fetch.py --find 1a2b3c4d  # whose save the gate stopped on: the row behind a fingerprint (player id and time).
                                                # Writes no file, and refuses in GitHub Actions: the answer is for Jonas' own screen
"""
import base64, gzip, json, os, socket, sys, time, urllib.request, hashlib

URL = os.environ.get('SUPABASE_URL') or json.load(open(os.path.join(os.path.dirname(__file__), '../../src/data/cloud.json')))['supabaseUrl']
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
arg = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv and sys.argv.index(k) + 1 < len(sys.argv) else None
OUT = arg('--out') or os.path.join(os.path.dirname(__file__), '../../tests/saves')
fp = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()[:8]

def page(path, n, off):
    # one answer, tried three times: a read that times out is asked again after 5 and 15 s (the gate stopped two releases on
    # 21.11.2026 on «The read operation timed out»: a page of a thousand rows of save_hist had grown to about 100 MB)
    for i in range(3):
        rq = urllib.request.Request(URL.rstrip('/') + '/rest/v1/' + path + '&limit=%d&offset=%d' % (n, off), headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY})
        try:
            with urllib.request.urlopen(rq, timeout=180) as r: return json.load(r)
        except (socket.timeout, TimeoutError, ConnectionError) as e:
            if i == 2: raise
            time.sleep(5 if i == 0 else 15)

def get(path, n=1000):
    # n rows at a time, until a page comes back empty (PostgREST gives no more than the project's «max rows» in one answer and says
    # nothing about the rest); the caller's order must be total, or rows move between the pages while players save. A row with a save
    # in it is up to 200 kB, so those go 50 at a time (about 10 MB an answer)
    out = []
    while True:
        p = page(path, n, len(out))
        if not p: return out
        out += p

def raw(code):
    if not code or not code.startswith('KYST2:'): return code
    return gzip.decompress(base64.b64decode(code[6:])).decode('utf-8')

def main():
    if not KEY: sys.exit('SUPABASE_SERVICE_ROLE_KEY is not set')
    find = arg('--find')
    if find and os.environ.get('GITHUB_ACTIONS'): sys.exit('--find is not for a job: its answer names a player, and the log is public')
    hist = int(arg('--hist') or 0) or (3 if find else 0)
    rows = [('save', r) for r in get('saves?select=player_id,data,updated_at&order=player_id', 50)]
    if hist:
        # which rows: the ids alone first (light), the newest `hist` of each player; then only those rows' saves, 50 at a time (before
        # 21.11.2026 every row of save_hist came with its save, 156 MB, and all but one per player were thrown away)
        per = {}
        for r in get('save_hist?select=id,player_id&order=id.desc'):
            per.setdefault(r['player_id'], [])
            if len(per[r['player_id']]) < hist: per[r['player_id']].append(r['id'])
        ids = sorted((i for v in per.values() for i in v), reverse=True)
        for k in range(0, len(ids), 50):
            rows += [('hist', r) for r in page('save_hist?select=id,player_id,data,saved_at&id=in.(%s)&order=id.desc' % ','.join(str(i) for i in ids[k:k + 50]), 50, 0)]
    if not find:
        os.makedirs(OUT, exist_ok=True)
        for f in os.listdir(OUT):
            if f.endswith('.json'): os.remove(os.path.join(OUT, f))
    seen, skipped = set(), 0
    for kind, r in rows:
        try: s = raw(r['data']); json.loads(s)
        except Exception: skipped += 1; continue   # (the error is not printed: a JSON error quotes the text it stopped at)
        f = fp(s)
        if find:
            if f == find.lower(): print(kind, 'player', r['player_id'], r.get('updated_at') or r.get('saved_at'))
            continue
        if f in seen: continue
        seen.add(f); open(os.path.join(OUT, f + '.json'), 'w', encoding='utf-8').write(s)
    if find: return
    if skipped: print(('::warning::' if os.environ.get('GITHUB_ACTIONS') else '') + '%d rows skipped (not a save that can be read)' % skipped)
    print(len(seen), 'saves fetched')
    # no save, or more rows unreadable than read (the cloud's format has changed under this script): the gate would test nothing
    if not seen or skipped > len(seen): sys.exit('The saves could not be fetched as saves: %d read, %d unreadable. The gate has nothing to stand on.' % (len(seen), skipped))

if __name__ == '__main__': main()
