#!/usr/bin/env bash
# Verifica a VM real. Não instala aplicação fictícia nem imprime credenciais.
set -Eeuo pipefail
export LC_ALL=C
umask 077
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
network_script=$script_dir/network.sh
monitor_script=/usr/local/bin/sonora-monitor
[[ -f $network_script ]] || network_script=/usr/local/sbin/sonora-network
[[ $EUID == 0 ]] || { echo 'Executar como root.' >&2; exit 2; }
infra_only=false
fault=false
load=false
for arg in "$@"; do
  case $arg in
    --infrastructure-only) infra_only=true;;
    --fault-test) fault=true;;
    --load-test) load=true;;
    *) echo 'Uso: verify.sh [--infrastructure-only] [--fault-test] [--load-test]' >&2; exit 2;;
  esac
done
exec > >(tee -a /var/log/sonora-verify.log) 2>&1
failures=0
pending=0
check() {
  local name=$1
  shift
  if "$@"; then printf '%s PASS %s\n' "$(date -Is)" "$name";
  else failures=$((failures+1)); printf '%s FAIL %s\n' "$(date -Is)" "$name"; fi
}
printf '%s START verify boot_id=%s\n' "$(date -Is)" "$(cat /proc/sys/kernel/random/boot_id)"
check hostname test "$(hostname)" = "${SONORA_HOSTNAME:-sonora}"
check network /bin/bash "$network_script" check
for unit in postgresql caddy sonora-monitor; do
  check "${unit}_active" systemctl is-active --quiet "$unit"
  check "${unit}_boot" systemctl is-enabled --quiet "$unit"
done
check database pg_isready -h 127.0.0.1 -p 5432 -d sonora
check journal_persistent test -d /var/log/journal
check_log_rotation() { logrotate --debug /etc/logrotate.d/sonora > /var/log/sonora-logrotate-validation.log 2>&1; }
check log_rotation check_log_rotation
check proxy_config caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
check database_permissions runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -At sonora -c "
DO \$\$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('sonora_migrator','sonora_ingest','sonora_query')
     AND (rolsuper OR rolcreatedb OR rolcreaterole)) OR
     (SELECT count(*) FROM pg_roles WHERE rolname IN ('sonora_migrator','sonora_ingest','sonora_query')) <> 3 OR
     has_schema_privilege('sonora_query','public','CREATE') THEN
    RAISE EXCEPTION 'Unsafe or missing database roles';
  END IF;
END \$\$;"
check private_files python3 - <<'PY'
from pathlib import Path
import grp, stat, subprocess
for name in ('admin', 'api.env', 'soa.env', 'migrator.env'):
    p = Path('/etc/sonora') / name
    assert p.stat().st_uid == 0 and not stat.S_IMODE(p.stat().st_mode) & 0o077, 'Unsafe configuration permissions'
for name in ('api', 'soa'):
    p = Path(f'/etc/sonora/{name}-keys.json')
    assert (p.stat().st_uid == 0 and stat.S_IMODE(p.stat().st_mode) == 0o640
            and p.stat().st_gid == grp.getgrnam('sonora-' + name).gr_gid), 'Unsafe key-file permissions'
    assert subprocess.run(['runuser','-u','sonora-' + name,'--','test','-r',str(p)]).returncode == 0
    for other in ('admin/read.key', 'migrator.env', ('soa' if name=='api' else 'api') + '-keys.json'):
        assert subprocess.run(['runuser','-u','sonora-' + name,'--','test','-r','/etc/sonora/' + other]).returncode != 0
print('Configuration metadata checked; no secret contents emitted.')
PY
check internal_listeners python3 - <<'PY'
import subprocess
lines = subprocess.check_output(['ss','-H','-ltn'], text=True).splitlines()
for line in lines:
    address = line.split()[3]
    host, _, port = address.rpartition(':')
    if port in ('5432','8080','8082'):
        assert host in ('127.0.0.1','[::1]','::1'), 'Application/database listener is public'
print('Application/database listeners restricted to loopback.')
PY

if $fault; then
  old_pid=$(systemctl show sonora-monitor -p MainPID --value)
  old_restarts=$(systemctl show sonora-monitor -p NRestarts --value)
  if [[ $old_pid =~ ^[1-9][0-9]*$ ]] && systemctl kill --kill-whom=main --signal=SIGKILL sonora-monitor; then
    new_pid=0
    for _ in {1..20}; do
      sleep 1
      new_pid=$(systemctl show sonora-monitor -p MainPID --value)
      new_restarts=$(systemctl show sonora-monitor -p NRestarts --value)
      if [[ $new_pid != "$old_pid" && $new_pid != 0 ]] && ((new_restarts > old_restarts)) &&
         systemctl is-active --quiet sonora-monitor; then break; fi
    done
    check monitor_new_pid test "$new_pid" != "$old_pid"
    check monitor_recovered systemctl is-active --quiet sonora-monitor
    check monitor_restart_count test "${new_restarts:-0}" -gt "$old_restarts"
    printf '%s evidence monitor old_pid=%s new_pid=%s restarts_before=%s restarts_after=%s\n' \
      "$(date -Is)" "$old_pid" "$new_pid" "$old_restarts" "${new_restarts:-0}"
  else failures=$((failures+1)); echo 'FAIL monitor_fault_injection'; fi
fi

if $load; then
  # O usuário do serviço lê apenas o runtime instalado (bootstrap é root-only).
  check monitor_runtime_readable runuser -u sonora-monitor -- test -r "$monitor_script"
  # Unidades de laboratório isoladas: não alterar limites/configuração do monitor de produção.
  monitor_unit="sonora-lab-monitor-$$"
  load_unit="sonora-lab-load-$$"
  cleanup() {
    systemctl stop "$load_unit" "$monitor_unit" >/dev/null 2>&1 || true
    systemctl reset-failed "$load_unit" "$monitor_unit" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT
  systemd-run --quiet --collect --unit="$monitor_unit" -p RuntimeMaxSec=30 -p MemoryMax=64M \
    -p User=sonora-monitor /usr/bin/env INTERVAL_SECONDS=1 SAMPLE_COUNT=20 CPU_THRESHOLD=10 \
    MEMORY_THRESHOLD=100 DISK_THRESHOLD=100 /bin/bash "$monitor_script"
  sleep 3
  systemd-run --quiet --collect --unit="$load_unit" -p RuntimeMaxSec=10 -p CPUQuota=75% -p MemoryMax=64M \
    -p User=sonora-monitor /usr/bin/python3 -c 'import time; end=time.monotonic()+8
while time.monotonic()<end: pass'
  for _ in {1..27}; do
    sleep 1
    if ! systemctl is-active --quiet "$monitor_unit"; then break; fi
  done
  sample=$(journalctl -u "$monitor_unit" -o cat --no-pager)
  printf '%s\n' "$sample"
  check cpu_alert grep -q 'alert resource=cpu' <<< "$sample"
  check cpu_recovery grep -q 'recovery resource=cpu' <<< "$sample"
  check monitor_samples grep -q 'sample cpu=' <<< "$sample"
  cleanup
  trap - EXIT
fi

if $infra_only; then
  echo 'SKIP applications: infrastructure-only does not validate the complete academic delivery.'
else
  for app in soa api; do
    if ! systemctl is-active --quiet "sonora-$app"; then
      pending=$((pending+1)); printf 'PENDING application=%s requires_real_release\n' "$app"; continue
    fi
    check "${app}_boot" systemctl is-enabled --quiet "sonora-$app"
    check "${app}_http" python3 - "$app" <<'PY'
import json, sys
from pathlib import Path
from urllib.request import Request, urlopen
app = sys.argv[1]
port, prefix, name = (8080, '/api/sonora/v1', 'api-operator') if app == 'api' else (8082, '/api/ingestion/v1', 'soa-operator')
key = Path(f'/etc/sonora/admin/{name}.key').read_text().strip()
paths = [prefix + '/health/live', prefix + '/health/ready']
if app == 'api': paths.append(prefix + '/locations')
try:
    for path in paths:
        with urlopen(Request(f'http://127.0.0.1:{port}{path}', headers={'X-Api-Key': key}), timeout=5) as r:
            assert r.status == 200 and not r.headers.get('X-Demo-Mode')
            json.load(r)
    print('Authenticated real application health/query passed.')
except Exception:
    sys.exit('ERROR application_http_verification_failed (no payload or credentials logged)')
PY
  done
fi
printf '%s COMPLETE verify failures=%s pending=%s infrastructure_only=%s\n' "$(date -Is)" "$failures" "$pending" "$infra_only"
if ((failures)); then exit 1; fi
if ((pending)); then exit 3; fi
