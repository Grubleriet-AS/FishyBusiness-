#!/usr/bin/env bash
# Sets up the watch (tools/server/vakt/vakt.sh, steg 138) on the game's server: the script in /opt/dsb-vakt, owned by root; the topic
# in /etc/dsb-vakt.env (made here once, readable only by root); and dsb-vakt.timer, which runs it once a minute as a user of its own
# with nothing but its state in /var/lib/dsb-vakt. tools/server/setup.sh runs it too; on its own, as root on the server:
#
#   curl -fsSL https://raw.githubusercontent.com/Grubleriet-AS/FishyBusiness-/ccr-5e1ba2f4-pusvyd/tools/server/vakt/setup.sh | bash
#
# It sends one test push at the end, and prints the topic to subscribe to in the ntfy app. Running it again is safe: the topic is kept.
set -euo pipefail
REF=${DSB_REF:-ccr-5e1ba2f4-pusvyd}; RAW="https://raw.githubusercontent.com/Grubleriet-AS/FishyBusiness-/$REF"
ENVF=/etc/dsb-vakt.env; DIR=/opt/dsb-vakt
[ "$(id -u)" = 0 ] || { echo "Run this as root (or with sudo)."; exit 1; }
command -v curl >/dev/null || { apt-get update -q && apt-get install -yq curl; }

# the script and the game's cloud settings: next to this file in a checkout, or from the same branch on GitHub
HERE=${BASH_SOURCE[0]:-}; ROOT=""
if [ -n "$HERE" ] && [ -f "$(dirname "$HERE")/vakt.sh" ]; then ROOT=$(cd "$(dirname "$HERE")/../../.." && pwd); fi
get(){ if [ -n "$ROOT" ] && [ -f "$ROOT/$1" ]; then cat "$ROOT/$1"; else curl -fsSL "$RAW/$1"; fi; }
install -d -m 755 -o root -g root "$DIR"
get tools/server/vakt/vakt.sh > "$DIR/vakt.sh.new"; bash -n "$DIR/vakt.sh.new"
mv "$DIR/vakt.sh.new" "$DIR/vakt.sh"; chown root:root "$DIR/vakt.sh"; chmod 755 "$DIR/vakt.sh"
CFG=$(get src/data/cloud.json)
SUPA_URL=$(sed -n 's/.*"supabaseUrl": *"\([^"]*\)".*/\1/p' <<<"$CFG" | head -1); SUPA_KEY=$(sed -n 's/.*"supabaseAnon": *"\([^"]*\)".*/\1/p' <<<"$CFG" | head -1)
[ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ] || { echo "Could not read supabaseUrl and supabaseAnon from src/data/cloud.json." >&2; exit 1; }

# the topic: random, made once; the rest follows the game's settings each time this runs
TOPIC=$(sed -n 's/^NTFY_TOPIC=//p' "$ENVF" 2>/dev/null || true); NEW=0
if [ -z "$TOPIC" ]; then TOPIC="dsb-vakt-$(openssl rand -hex 12 2>/dev/null || head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"; NEW=1; fi
(umask 077; printf 'NTFY_TOPIC=%s\nSUPA_URL=%s\nSUPA_KEY=%s\n' "$TOPIC" "$SUPA_URL" "$SUPA_KEY" > "$ENVF")
chown root:root "$ENVF"; chmod 600 "$ENVF"

cat > /etc/systemd/system/dsb-vakt.service <<EOF
[Unit]
Description=Det Store Blå: the watch on the database (tools/server/vakt)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
DynamicUser=yes
StateDirectory=dsb-vakt
EnvironmentFile=$ENVF
ExecStart=$DIR/vakt.sh
TimeoutStartSec=50
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6
RestrictNamespaces=yes
CapabilityBoundingSet=
EOF
cat > /etc/systemd/system/dsb-vakt.timer <<EOF
[Unit]
Description=Det Store Blå: the watch on the database, once a minute

[Timer]
OnBootSec=60
OnUnitActiveSec=60
AccuracySec=5

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now dsb-vakt.timer >/dev/null 2>&1
systemctl start dsb-vakt.service || true
echo "The watch: $(systemctl is-active dsb-vakt.timer) (journalctl -u dsb-vakt shows each miss; the state is in /var/lib/dsb-vakt)"

# one test push, so the phone shows it works
set -a; . "$ENVF"; set +a
r=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H 'Content-Type: application/json' \
  -d "{\"topic\":\"$NTFY_TOPIC\",\"title\":\"Det Store Blå: vakta er satt opp\",\"message\":\"Du får en melding her når databasen ikke svarer, og en når den svarer igjen.\",\"priority\":3,\"tags\":[\"wave\"]}" https://ntfy.sh/ || true)
echo "Test push to ntfy.sh: $r"
if [ "$NEW" = 1 ]; then echo; echo "Subscribe to this topic in the ntfy app (Android or iPhone: «+», then the name), and keep it to yourself:"; echo; echo "  $TOPIC"; echo
else echo "The topic is kept from before (sed -n 's/^NTFY_TOPIC=//p' $ENVF shows it)."; fi
