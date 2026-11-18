#!/usr/bin/env bash
# The test of rt-roll.sh without systemd (18.11.2026): a stand-in for systemctl starts the relay as a background process, and three
# versions go through the inbox: a good one (ok), one that does not start (rolled back), and one that dies two seconds after it has
# answered (rolled back by the hold). Needs node and the relay's packages: (cd tools/server/rt && npm ci --omit=dev). Prints OK lines;
# anything else is a fault. Run from the repo: bash tools/server/rt-roll-test.sh
set -uo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd); RT="$ROOT/rt"
[ -d "$RT/node_modules/ws" ] || { echo "FEIL: run (cd tools/server/rt && npm ci --omit=dev) first"; exit 1; }
T=$(mktemp -d); PORT=$((20000 + RANDOM % 20000))
export DSB_SITE="$T/site" DSB_RT_BASE="$T/opt" DSB_RT_URL="http://127.0.0.1:$PORT/stats" DSB_RT_WAIT=8 DSB_RT_HOLD=3 DSB_RT_LOCK="$T/lock"
export DSB_SYSTEMCTL="$T/bin/systemctl" FAKE_STATE="$T/state" RT_PORT=$PORT RT_HOST=127.0.0.1 RT_SECRET=$(openssl rand -hex 32)
mkdir -p "$T/bin" "$T/state" "$DSB_SITE/rt"
cat > "$DSB_SYSTEMCTL" <<'EOF'
#!/usr/bin/env bash
P="$FAKE_STATE/pid"
case "$1" in
  # (as systemd: the old process is gone before the new one starts, and the new one gets none of the caller's files, the lock too)
  restart) if [ -f "$P" ]; then o=$(cat "$P"); kill "$o" 2>/dev/null; for _ in $(seq 30); do kill -0 "$o" 2>/dev/null || break; sleep 0.1; done; fi
           node "$DSB_RT_BASE/live/server.mjs" >>"$FAKE_STATE/log" 2>&1 9>&- & echo $! > "$P" ;;
  is-active) [ -f "$P" ] && kill -0 "$(cat "$P")" 2>/dev/null ;;
  show) echo 0 ;;
esac
EOF
chmod +x "$DSB_SYSTEMCTL"
fin(){ [ -f "$T/state/pid" ] && kill "$(cat "$T/state/pid")" 2>/dev/null; rm -r -- "$T"; }; trap fin EXIT
upload(){ # what the roll-out does: the files, then VERSION; the stand-in for the path unit then runs the script
  # (rsync --delete --exclude VERSION --exclude STATUS on the server; here by hand, as the test machine may have no rsync)
  find "$DSB_SITE/rt" -mindepth 1 -maxdepth 1 ! -name STATUS ! -name VERSION -exec rm -r -- {} +
  cp -a "$1/." "$DSB_SITE/rt/"; echo "$2" > "$DSB_SITE/rt/VERSION"
  bash "$ROOT/rt-roll.sh" >>"$T/state/roll" 2>&1; }
check(){ local s; s=$(cat "$DSB_SITE/rt/STATUS" 2>/dev/null)
  if printf '%s' "$s" | grep -q "\"v\":\"$1\",\"result\":\"$2\",\"live\":\"$3\"" && curl -fsS --max-time 2 "$DSB_RT_URL" >/dev/null 2>&1
  then echo "OK $4: $s"; else echo "FEIL $4: $s (wanted v=$1 result=$2 live=$3, and /stats answering)"; sed 's/^/  /' "$T/state/roll" "$T/state/log" | tail -8; fi; }
cp -a "$RT" "$T/good"
upload "$T/good" good1;  check good1 ok good1 "the first version comes up"
cp -a "$RT" "$T/good2"; echo '// v2' >> "$T/good2/server.mjs"
upload "$T/good2" good2; check good2 ok good2 "a new version takes the old one's place"
cp -a "$RT" "$T/broken"; echo 'this is not javascript (' >> "$T/broken/server.mjs"
upload "$T/broken" broken; check broken rolled-back good2 "a version that does not start is rolled back"
cp -a "$RT" "$T/dies"; echo 'setTimeout(() => process.exit(1), 1500);' >> "$T/dies/server.mjs"
upload "$T/dies" dies; check dies rolled-back good2 "a version that dies after answering is rolled back"
echo good2 > "$DSB_SITE/rt/VERSION"; bash "$ROOT/rt-roll.sh" >>"$T/state/roll" 2>&1
check good2 ok good2 "the same version again only checks it"
[ -f "$DSB_RT_BASE/live/STATUS" ] && echo "FEIL: STATUS went into the live copy" || echo "OK the live copy has no STATUS"
