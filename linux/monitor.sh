#!/usr/bin/env bash
set -Eeuo pipefail
interval=${INTERVAL_SECONDS:-30}
cpu_limit=${CPU_THRESHOLD:-85}
mem_limit=${MEMORY_THRESHOLD:-85}
disk_limit=${DISK_THRESHOLD:-85}
for value in "$interval" "$cpu_limit" "$mem_limit" "$disk_limit"; do
  [[ $value =~ ^[0-9]+$ && $value -gt 0 && $value -le 3600 ]] || exit 2
done
read_cpu() { awk '/^cpu / {s=0; for(i=2;i<=9;i++) s+=$i; print s, $5+$6; exit}' /proc/stat; }
read -r previous_total previous_idle < <(read_cpu)
previous_state=normal
while sleep "$interval"; do
  read -r total idle < <(read_cpu)
  delta=$((total-previous_total))
  cpu=0
  if ((delta > 0)); then cpu=$((100*(delta-idle+previous_idle)/delta)); fi
  previous_total=$total
  previous_idle=$idle
  memory=$(awk '/MemTotal:/ {t=$2} /MemAvailable:/ {a=$2} END {printf "%.0f", 100*(t-a)/t}' /proc/meminfo)
  disk=$(df -P /var/lib/postgresql | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
  state=normal
  if ((cpu >= cpu_limit || memory >= mem_limit || disk >= disk_limit)); then state=alert; fi
  printf '%s sample cpu=%s memory=%s disk=%s state=%s\n' "$(date -Is)" "$cpu" "$memory" "$disk" "$state"
  if [[ $state != "$previous_state" ]]; then
    printf '%s transition from=%s to=%s\n' "$(date -Is)" "$previous_state" "$state"
  fi
  previous_state=$state
done
