#!/usr/bin/env bash
# The game server's numbers, read only (docs/planer/drift-billig-og-stabil.md D4, steg 138, 17.11.2026). Nothing is changed, nothing is
# sent anywhere, and nothing of a player is shown (no addresses, no names): the machine, the relay's counts, Caddy's errors and the
# requests per hour. Run as root on the server, and paste what it prints:
#
#   curl -fsSL https://raw.githubusercontent.com/Grubleriet-AS/FishyBusiness-/ccr-5e1ba2f4-pusvyd/tools/server/status.sh | bash
set -uo pipefail
say(){ printf '\n== %s\n' "$*"; }
say "Maskinen ($(hostname), $(date -u '+%Y-%m-%d %H:%M UTC'))"
echo "Oppe: $(uptime -p 2>/dev/null || true); last (1, 5, 15 min): $(cut -d' ' -f1-3 /proc/loadavg) på $(nproc) kjerner"
# the CPU over five seconds: busy and waiting on the disk (iowait), from /proc/stat
read -r _ u1 n1 s1 i1 w1 q1 sq1 st1 _ < /proc/stat; sleep 5; read -r _ u2 n2 s2 i2 w2 q2 sq2 st2 _ < /proc/stat
tot=$(( (u2+n2+s2+i2+w2+q2+sq2+st2) - (u1+n1+s1+i1+w1+q1+sq1+st1) )); [ "$tot" -gt 0 ] || tot=1
echo "CPU de siste 5 s: $(( 100 * ((u2+n2+s2+q2+sq2) - (u1+n1+s1+q1+sq1)) / tot )) % i bruk, $(( 100 * (w2-w1) / tot )) % venter på disken, $(( 100 * (st2-st1) / tot )) % tatt av verten (steal)"
[ -r /proc/pressure/io ] && echo "Trykk på disken (PSI, snitt 10 s / 60 s / 300 s): $(awk '/^some/ {print $2, $3, $4}' /proc/pressure/io)"
[ -r /proc/pressure/cpu ] && echo "Trykk på CPU-en (PSI): $(awk '/^some/ {print $2, $3, $4}' /proc/pressure/cpu)"
free -h | sed 's/^/  /'
say "Disken"
df -h -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null | sed 's/^/  /'
du -sh /srv/detstorebla/current /srv/detstorebla/test /var/log/journal 2>/dev/null | sed 's/^/  /'
say "Prosessene som bruker mest"
ps -eo pcpu,pmem,rss,etime,comm --sort=-pcpu | head -8 | sed 's/^/  /'
say "Tjenestene"
for s in caddy dsb-rt dsb-vakt.timer; do printf '  %-16s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null || true)"; done
say "Reléet (127.0.0.1:8787/stats)"
curl -s --max-time 5 http://127.0.0.1:8787/stats 2>/dev/null | head -c 1500 || echo "  svarer ikke"; echo
say "Vakta på databasen (siste døgn)"
journalctl -u dsb-vakt --since '24 hours ago' --no-pager -o cat 2>/dev/null | grep -E '^vakt:' | tail -20 | sed 's/^/  /'
[ -f /var/lib/dsb-vakt/state ] && echo "  nå: $(cat /var/lib/dsb-vakt/state) (bom på rad, siden, varslet)"
say "Forespørsler per time (Caddy, siste døgn): tid UTC, antall, 5xx"
if [ -f /var/lib/dsb-vakt/req.tsv ]; then
  # (a count lower than the one before: Caddy started again, and that hour is left out)
  pt=''; pe=0; while IFS=$'\t' read -r t n e; do
    [ -n "$pt" ] && [ "$n" -ge "$pt" ] && printf '  %s  %8d  %5d\n' "$(date -u -d "@$t" '+%m-%d %H:%M')" $((n - pt)) $((e - pe))
    pt=$n; pe=$e; done < <(tail -n 25 /var/lib/dsb-vakt/req.tsv)
else echo "  ingen tall ennå (vakta skriver dem én gang i timen etter at tools/server/vakt/setup.sh er kjørt)"; fi
say "Feil i Caddy (siste døgn)"
echo "  $(journalctl -u caddy --since '24 hours ago' --no-pager -o cat 2>/dev/null | grep -c '"level":"error"' || true) feillinjer; de siste:"
journalctl -u caddy --since '24 hours ago' --no-pager -o cat 2>/dev/null | grep '"level":"error"' | tail -5 | sed -E 's/"(remote_ip|client_ip|remote_addr)":"[^"]*"/"\1":"–"/g' | cut -c1-220 | sed 's/^/  /'
say "Feil i reléet (siste døgn)"
journalctl -u dsb-rt --since '24 hours ago' --no-pager -o cat -p warning 2>/dev/null | tail -5 | cut -c1-220 | sed 's/^/  /'
