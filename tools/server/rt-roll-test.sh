#!/usr/bin/env bash
# The test of rt-roll.sh without systemd (18.11.2026): a stand-in for systemctl starts the relay as a background process, and the
# versions go through the inbox: a good one (ok), another good one (ok), one that does not start and one that dies 1.5 s after it
# has answered (both rolled back), the bad one once more as setup.sh would (not put back), the same version again (only checked),
# and a VERSION that is a link to a secret (refused, nothing of it in STATUS). Needs node and the relay's packages:
# (cd tools/server/rt && npm ci --omit=dev). Prints OK lines; anything else is a fault. Run from the repo: bash tools/server/rt-roll-test.sh
set -uo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd); RT="$ROOT/rt"
[ -d "$RT/node_modules/ws" ] || { echo "FEIL: run (cd tools/server/rt && npm ci --omit=dev) first"; exit 1; }
T=$(mktemp -d); PORT=$((20000 + RANDOM % 20000))
export DSB_SITE="$T/site" DSB_RT_BASE="$T/opt" DSB_RT_URL="http://127.0.0.1:$PORT/stats" DSB_RT_WAIT=8 DSB_RT_HOLD=3 DSB_RT_LOCK="$T/lock"
export DSB_SYSTEMCTL="$T/bin/systemctl" FAKE_STATE="$T/state" RT_PORT=$PORT RT_HOST=127.0.0.1 RT_SECRET=$(openssl rand -hex 32)
mkdir -p "$T/bin" "$T/state" "$DSB_SITE/rt"; ST="$DSB_SITE/rt-status/STATUS"
cat > "$DSB_SYSTEMCTL" <<'EOS'
#!/usr/bin/env bash
P="$FAKE_STATE/pid"
case "$1" in
  # (as systemd: the old process is gone before the new one starts, and the new one gets none of the caller's files, the lock too)
  restart) if [ -f "$P" ]; then o=$(cat "$P"); kill "$o" 2>/dev/null; for _ in $(seq 30); do kill -0 "$o" 2>/dev/null || break; sleep 0.1; done; fi
           node "$DSB_RT_BASE/live/server.mjs" >>"$FAKE_STATE/log" 2>&1 9>&- & echo $! > "$P" ;;
  is-active) [ -f "$P" ] && kill -0 "$(cat "$P")" 2>/dev/null ;;
  show) echo 0 ;;
esac
EOS
chmod +x "$DSB_SYSTEMCTL"
fin(){ [ -f "$T/state/pid" ] && kill "$(cat "$T/state/pid")" 2>/dev/null; rm -r -- "$T"; }; trap fin EXIT
roll(){ bash "$ROOT/rt-roll.sh" >>"$T/state/roll" 2>&1; }
upload(){ # what the roll-out does: the files, then VERSION; the stand-in for the path unit then runs the script
  # (rsync --delete --exclude VERSION on the server; here by hand, as the test machine may have no rsync)
  find "$DSB_SITE/rt" -mindepth 1 -maxdepth 1 ! -name VERSION -exec rm -r -- {} +
  cp -a "$1/." "$DSB_SITE/rt/"; rm -f "$DSB_SITE/rt/VERSION"; echo "$2" > "$DSB_SITE/rt/VERSION"; roll; }
check(){ local s; s=$(cat "$ST" 2>/dev/null)
  if printf '%s' "$s" | grep -q "\"v\":\"$1\",\"result\":\"$2\",\"live\":\"$3\"" && curl -fsS --max-time 2 "$DSB_RT_URL" >/dev/null 2>&1
  then echo "OK $4: $s"; else echo "FEIL $4: $s (wanted v=$1 result=$2 live=$3, and /stats answering)"; sed 's/^/  /' "$T/state/roll" "$T/state/log" | tail -8; fi; }
G1=1111111111111111; G2=2222222222222222; B1=bbbbbbbbbbbbbbbb; B2=dddddddddddddddd
cp -a "$RT" "$T/good"
upload "$T/good" $G1;  check $G1 ok $G1 "the first version comes up"
cp -a "$RT" "$T/good2"; echo '// v2' >> "$T/good2/server.mjs"
upload "$T/good2" $G2; check $G2 ok $G2 "a new version takes the old one's place"
cp -a "$RT" "$T/broken"; echo 'this is not javascript (' >> "$T/broken/server.mjs"
upload "$T/broken" $B1; check $B1 rolled-back $G2 "a version that does not start is rolled back"
cp -a "$RT" "$T/dies"; echo 'setTimeout(() => process.exit(1), 1500);' >> "$T/dies/server.mjs"
upload "$T/dies" $B2; check $B2 rolled-back $G2 "a version that dies after answering is rolled back"
p0=$(cat "$T/state/pid"); roll; check $B2 rolled-back $G2 "running it again (setup.sh) gives the same answer"
[ "$(cat "$T/state/pid")" = "$p0" ] && echo "OK running it again did not put the bad version back (the relay was not restarted)" || echo "FEIL running it again put the bad version back (the relay was restarted)"
upload "$T/good2" $G2; check $G2 ok $G2 "the same version again only checks it"
echo "RT_SECRET=topsecret" > "$T/secret"; rm -f "$DSB_SITE/rt/VERSION"; ln -s "$T/secret" "$DSB_SITE/rt/VERSION"; roll
if grep -q '"v":"none","result":"failed","live":"'$G2'"' "$ST" && ! grep -q topsecret "$ST"; then echo "OK a VERSION that is a link is refused: $(cat "$ST")"
else echo "FEIL a VERSION that is a link: $(cat "$ST")"; fi
[ -e "$DSB_SITE/rt/STATUS" ] || [ -e "$DSB_SITE/rt/.STATUS.tmp" ] && echo "FEIL: something was written in the inbox" || echo "OK nothing was written in the inbox"
