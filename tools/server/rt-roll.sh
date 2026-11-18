#!/usr/bin/env bash
# Swaps in a new version of the real-time relay and rolls back by itself when it does not come up (docs/systemer/publisering.md
# «Utrullingen sjekker seg selv», 18.11.2026). Installed by setup.sh as /usr/local/sbin/dsb-rt-roll and run as root by
# dsb-rt-reload.service when GitHub has uploaded a new VERSION to /srv/detstorebla/rt.
#
# /srv/detstorebla/rt is only the inbox the deploy user uploads to; the service runs from /opt/dsb-rt/live. The new files are copied
# to /opt/dsb-rt/live (the one before is kept as /opt/dsb-rt/prev), the service is restarted, and the health check asks the relay's
# own /stats on 127.0.0.1, which only counts what is in memory (cheap: no database, no disk), until it answers, then waits a few
# seconds more and checks that the service has not restarted in between. If the new version does not hold, prev goes back to live
# and the service is restarted on it, and the version is remembered as bad, so running this again (setup.sh) does not put it back.
# The answer goes to /srv/detstorebla/rt-status/STATUS (one line of JSON; the folder is root's, the deploy user can only read it):
#   {"v":"<the version asked for>","result":"ok|rolled-back|failed","live":"<the version running now>","at":"<UTC>"}
# The inbox belongs to the deploy user, so nothing in it is trusted: VERSION is read only as a plain file of 16 hex characters, and
# nothing is ever written there. Before every restart the service's start limit is cleared (a version that crashes at once uses it
# up, and the restart onto the version before would be refused). It always exits 0, so the path unit keeps watching after a bad
# version; STATUS says what happened, and so does the journal.
# Everything can be moved with DSB_* variables, for the test on a machine without systemd (tools/server/rt-roll-test.sh).
set -uo pipefail
SITE=${DSB_SITE:-/srv/detstorebla}; IN="$SITE/rt"; OUT=${DSB_RT_STATUS_DIR:-$SITE/rt-status}; BASE=${DSB_RT_BASE:-/opt/dsb-rt}
SVC=${DSB_RT_SVC:-dsb-rt.service}; URL=${DSB_RT_URL:-http://127.0.0.1:8787/stats}
WAIT=${DSB_RT_WAIT:-20}; HOLD=${DSB_RT_HOLD:-5}; LOCK=${DSB_RT_LOCK:-/run/dsb-rt-roll.lock}
SYSTEMCTL=${DSB_SYSTEMCTL:-systemctl}
log(){ echo "rt-roll: $*"; }
ver(){ # a version is a plain file (no link) holding 16 hex characters, else «none»
  local v=''; [ -f "$1/VERSION" ] && [ ! -L "$1/VERSION" ] && v=$(head -c 64 "$1/VERSION" | tr -d '\n')
  printf '%s' "$v" | grep -qxE '[0-9a-f]{16}' && printf '%s' "$v" || printf none; }
status(){ # the result for the roll-out, replaced in one move in root's own folder
  install -d -m 755 "$OUT"
  printf '{"v":"%s","result":"%s","live":"%s","at":"%s"}\n' "$1" "$2" "$(ver "$BASE/live")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/.STATUS.tmp" \
    && chmod 644 "$OUT/.STATUS.tmp" && mv -f "$OUT/.STATUS.tmp" "$OUT/STATUS"
  log "$1: $2 (live: $(ver "$BASE/live"))"; }
restart(){ "$SYSTEMCTL" reset-failed "$SVC" 2>/dev/null; "$SYSTEMCTL" restart "$SVC"; }
restarts(){ "$SYSTEMCTL" show -p NRestarts --value "$SVC" 2>/dev/null || echo 0; }
healthy(){ # /stats answers within WAIT seconds, and after HOLD more the service is still up and has not been restarted
  local i=0 n0
  until curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; do i=$((i + 1)); [ "$i" -ge "$WAIT" ] && return 1; sleep 1; done
  n0=$(restarts); sleep "$HOLD"
  "$SYSTEMCTL" is-active -q "$SVC" && [ "$(restarts)" = "$n0" ] && curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; }
copy(){ # the inbox as it is (links stay links), owned by root and only readable by the service
  rm -r -- "$2" 2>/dev/null
  mkdir -p "$2" && cp -a "$1/." "$2/" && chown -R root:root "$2" && chmod -R go-w,a+rX "$2"; }
up(){ # the live version: running and answering, started again if not
  if "$SYSTEMCTL" is-active -q "$SVC" && healthy; then return 0; fi
  restart; healthy; }

exec 9>"$LOCK"; flock 9
mkdir -p "$BASE"; touch "$BASE/bad-versions"
[ -f "$IN/server.mjs" ] || { log "nothing in $IN yet"; exit 0; }
V=$(ver "$IN")
if [ "$V" = none ]; then log "$IN/VERSION is not a version"; status none failed; exit 0; fi
# the version already running (setup.sh run again, or the same upload twice), or one that has been rolled back before: only make
# sure the live one is up, and say again what happened to V
if [ "$(ver "$BASE/live")" = "$V" ]; then if up; then status "$V" ok; else status "$V" failed; fi; exit 0; fi
if grep -qxF "$V" "$BASE/bad-versions"; then if up; then status "$V" rolled-back; else status "$V" failed; fi; exit 0; fi
copy "$IN" "$BASE/next" || { log "could not copy $IN"; status "$V" failed; exit 0; }
[ -d "$BASE/live" ] && { rm -r -- "$BASE/prev" 2>/dev/null; mv "$BASE/live" "$BASE/prev"; }
mv "$BASE/next" "$BASE/live"
restart
if healthy; then status "$V" ok; exit 0; fi
log "$V did not come up: $(journalctl -u "$SVC" -n 5 --no-pager -o cat 2>/dev/null | tr '\n' ' ' | cut -c1-400)"
echo "$V" >> "$BASE/bad-versions"
if [ -d "$BASE/prev" ]; then
  rm -r -- "$BASE/bad" 2>/dev/null; mv "$BASE/live" "$BASE/bad"; mv "$BASE/prev" "$BASE/live"
  restart
  if healthy; then status "$V" rolled-back; else status "$V" failed; fi
else status "$V" failed; fi
exit 0
