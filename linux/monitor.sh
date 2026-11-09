#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

read_cpu() {
  # guest/guest_nice já estão incluídos em user/nice: não somar duas vezes.
  awk '/^cpu / {s=0; for(i=2;i<=9;i++) s+=$i; print s, $5+$6; exit}' "${PROC_ROOT:-/proc}/stat"
}

monitor_main() {
  local interval=${INTERVAL_SECONDS:-30} cpu_limit=${CPU_THRESHOLD:-85}
  local mem_limit=${MEMORY_THRESHOLD:-85} disk_limit=${DISK_THRESHOLD:-85}
  local samples=${SAMPLE_COUNT:-0} disk_path=${DISK_PATH:-/var/lib/postgresql}
  local value
  for value in "$interval" "$cpu_limit" "$mem_limit" "$disk_limit" "$samples"; do
    [[ $value =~ ^(0|[1-9][0-9]{0,5})$ ]] || { echo 'ERROR invalid_monitor_configuration' >&2; return 2; }
  done
  ((interval >= 1 && interval <= 3600 && cpu_limit >= 1 && cpu_limit <= 100 &&
    mem_limit >= 1 && mem_limit <= 100 && disk_limit >= 1 && disk_limit <= 100)) || {
    echo 'ERROR invalid_monitor_limits' >&2; return 2;
  }
  [[ -d $disk_path ]] || { echo 'ERROR missing_disk_path' >&2; return 2; }
  local previous_total previous_idle total idle delta cpu memory disk state count=0 resource limit reading
  local -A prior=([cpu]=normal [memory]=normal [disk]=normal)
  read -r previous_total previous_idle < <(read_cpu)
  trap 'rc=$?; printf "%s ERROR monitor exit=%s line=%s\n" "$(date -Is)" "$rc" "$LINENO" >&2; exit "$rc"' ERR
  printf '%s START monitor interval=%s disk_path=%s\n' "$(date -Is)" "$interval" "$disk_path"
  while sleep "$interval"; do
    read -r total idle < <(read_cpu)
    delta=$((total-previous_total))
    ((delta > 0 && idle >= previous_idle && idle-previous_idle <= delta)) || {
      echo 'ERROR invalid_cpu_sample' >&2; return 1;
    }
    cpu=$((100*(delta-idle+previous_idle)/delta))
    previous_total=$total
    previous_idle=$idle
    memory=$(awk '/^MemTotal:/ {t=$2} /^MemAvailable:/ {a=$2; found=1}
      END {if (!found || t<=0 || a<0 || a>t) exit 1; printf "%.0f", 100*(t-a)/t}' "${PROC_ROOT:-/proc}/meminfo")
    disk=$(df -P -- "$disk_path" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
    [[ $disk =~ ^[0-9]+$ ]] && ((disk <= 100)) || { echo 'ERROR invalid_disk_sample' >&2; return 1; }
    state=normal
    for resource in cpu memory disk; do
      case $resource in
        cpu) reading=$cpu; limit=$cpu_limit;;
        memory) reading=$memory; limit=$mem_limit;;
        disk) reading=$disk; limit=$disk_limit;;
      esac
      if ((reading >= limit)); then
        state=alert
        if [[ ${prior[$resource]} != alert ]]; then
          printf '%s alert resource=%s value=%s threshold=%s\n' "$(date -Is)" "$resource" "$reading" "$limit"
        fi
        prior[$resource]=alert
      elif [[ ${prior[$resource]} == alert ]]; then
        printf '%s recovery resource=%s value=%s threshold=%s\n' "$(date -Is)" "$resource" "$reading" "$limit"
        prior[$resource]=normal
      fi
    done
    printf '%s sample cpu=%s memory=%s disk=%s state=%s\n' "$(date -Is)" "$cpu" "$memory" "$disk" "$state"
    count=$((count+1))
    if ((samples > 0 && count >= samples)); then break; fi
  done
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then monitor_main "$@"; fi
