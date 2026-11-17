#!/usr/bin/env bash
# The watch on the game's server (docs/planer/drift-billig-og-stabil.md D3, steg 138, 17.11.2026). Run once a minute by systemd
# (dsb-vakt.timer, tools/server/vakt/setup.sh). It asks the database something small (sp_now, a read of a table that a player's game
# also makes without signing in) and tells Jonas's phone through ntfy.sh after two misses in a row, once, and once more when it answers
# again. The watch inside the database (uptime_tick, err_alert) cannot do this: on 17.11.2026 Supabase hung from 11:45 to 12:15 UTC and
# pg_cron did not start its jobs, so nothing was sent.
#
# Nothing of a player goes anywhere: the question carries only the game's publishable key (the same as in every player's page), and the
# push says only that the database does not answer, how it failed and for how long. The topic is a random string in /etc/dsb-vakt.env
# (never in the repo): whoever knows it can read the pushes, so it is not shared.
#
# Once an hour it also keeps Caddy's request count (its metrics on 127.0.0.1:2019, no addresses and no paths) for status.sh.
#
# /etc/dsb-vakt.env: NTFY_TOPIC (required), SUPA_URL and SUPA_KEY (from the game's src/data/cloud.json), and for the tests
# NTFY_URL (default https://ntfy.sh), CADDY_METRICS (default http://127.0.0.1:2019/metrics, "" to leave out), and STATE_DIRECTORY
# (systemd gives /var/lib/dsb-vakt).
set -uo pipefail
: "${NTFY_TOPIC:?NTFY_TOPIC is missing (/etc/dsb-vakt.env)}" "${SUPA_URL:?SUPA_URL is missing}" "${SUPA_KEY:?SUPA_KEY is missing}"
NTFY_URL=${NTFY_URL:-https://ntfy.sh}; CADDY_METRICS=${CADDY_METRICS-http://127.0.0.1:2019/metrics}
ST=${STATE_DIRECTORY:-/var/lib/dsb-vakt}; FAILS_FOR=${VAKT_FAILS:-2}; WAIT=${VAKT_WAIT:-20}   # (VAKT_WAIT shorter only in the test)
mkdir -p "$ST"; STATE="$ST/state"
now=$(date +%s)
# fails in a row, when the first of them came, whether the push has gone
fails=0; since=0; told=0
[ -f "$STATE" ] && read -r fails since told < "$STATE"
fails=${fails:-0}; since=${since:-0}; told=${told:-0}

push(){   # title, message, priority (1-5), tag
  local body
  body=$(printf '{"topic":"%s","title":"%s","message":"%s","priority":%d,"tags":["%s"]}' "$NTFY_TOPIC" "$1" "$2" "$3" "$4")
  curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H 'Content-Type: application/json' -d "$body" "$NTFY_URL/" || true
}

# the question: 20 s at most, a 200 is an answer; anything else (5xx, 4xx, a time-out, no network) is a miss
out=$(curl -s -o /dev/null -w '%{http_code} %{time_total}' --max-time "$WAIT" -X POST "$SUPA_URL/rest/v1/rpc/sp_now" \
  -H "apikey: $SUPA_KEY" -H 'Content-Type: application/json' -d '{}' 2>/dev/null) || true
code=${out%% *}; secs=${out#* }; [ -n "$code" ] && [ "$code" != "$out" ] || { code=000; secs=$WAIT; }
mins(){ echo $(( ($1 + 30) / 60 )); }
if [ "$code" = 200 ]; then
  if [ "$told" = 1 ]; then
    r=$(push "Det Store Blå: databasen svarer igjen" "Supabase svarer igjen etter omtrent $(mins $((now - since))) min. Spillet går som vanlig." 3 "white_check_mark")
    echo "vakt: answers again after $((now - since)) s (push $r)"
  fi
  echo "0 0 0" > "$STATE"
else
  [ "$fails" = 0 ] && since=$now
  fails=$((fails + 1))
  why=$([ "$code" = 000 ] && echo "ikke noe svar på $WAIT s" || echo "svarte $code")
  echo "vakt: miss $fails ($code, ${secs} s)"
  if [ "$fails" -ge "$FAILS_FOR" ] && [ "$told" = 0 ]; then
    r=$(push "Det Store Blå: databasen svarer ikke" "Supabase har ikke svart på $(mins $((now - since + 60))) min ($why). Spillerne spiller videre på enheten, og lagringene venter. Se status.supabase.com." 5 "warning")
    echo "vakt: told ($r)"
    # only a push that went (2xx) counts: one that did not is tried again next minute
    case "$r" in 2*) told=1;; esac
  fi
  echo "$fails $since $told" > "$STATE"
fi

# Caddy's requests, once an hour (status.sh shows the last day): the total and the 5xx since Caddy started
if [ -n "$CADDY_METRICS" ] && { [ ! -f "$ST/req.tsv" ] || [ $((now - $(stat -c %Y "$ST/req.tsv"))) -ge 3540 ]; }; then
  m=$(curl -s --max-time 5 "$CADDY_METRICS" 2>/dev/null || true)
  if [ -n "$m" ]; then
    tot=$(awk '/^caddy_http_request_duration_seconds_count/ {s += $NF} END {printf "%d", s}' <<<"$m")
    e5=$(awk '/^caddy_http_request_duration_seconds_count/ && /code="5/ {s += $NF} END {printf "%d", s}' <<<"$m")
    printf '%s\t%s\t%s\n' "$now" "$tot" "$e5" >> "$ST/req.tsv"
    tail -n 200 "$ST/req.tsv" > "$ST/req.tmp" && mv "$ST/req.tmp" "$ST/req.tsv"
  fi
fi
exit 0
