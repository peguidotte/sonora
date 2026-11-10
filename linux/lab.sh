#!/usr/bin/env bash
# Executar somente na VM descartável criada por lab.py, nunca na VM Azure.
set -Eeuo pipefail
export LC_ALL=C
umask 077
[[ $EUID == 0 && -f /etc/sonora-lab.json ]] || { echo 'ERROR isolated_lab_required'; exit 2; }
grep -Eq 'VirtualBox|innotek|Oracle' /sys/class/dmi/id/{product_name,sys_vendor} || exit 2
base=/var/lib/sonora-lab
install -d -m 0700 "$base"
phase=${1:?Informe a etapa do laboratório}
printf '\n%s START lab phase=%s boot_id=%s\n' "$(date -Is)" "$phase" "$(cat /proc/sys/kernel/random/boot_id)"

fingerprint() {
  python3 - <<'PY'
import hashlib, json, subprocess
from pathlib import Path
keys = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('/etc/sonora/admin').glob('*.key')}
oid = subprocess.check_output(['runuser','-u','postgres','--','psql','-XAt','postgres','-c',
                              "SELECT oid FROM pg_database WHERE datname='sonora'"], text=True).strip()
assert len(keys) >= 7 and oid
print(json.dumps({'keys': keys, 'databaseOid': oid}, sort_keys=True))
PY
}

network_state() {
  printf '%s NETWORK_STATE\n' "$(date -Is)"
  ip -4 -brief address show dev enp0s3
  ip -4 route show default
  resolvectl status enp0s3 --no-pager
  sha256sum /etc/netplan/*.yaml
}

case "$phase" in
  baseline)
    cloud-init status --wait
    [[ $(. /etc/os-release; echo "$VERSION_ID") == 24.04 ]]
    [[ ! -e /etc/sonora && ! -e /opt/sonora/api ]]
    ! dpkg-query -W -f='${Status}' postgresql 2>/dev/null | grep -q 'install ok installed'
    ! systemctl is-active --quiet sonora-monitor
    cat /etc/sonora-lab.json
    uname -srmo
    getconf _NPROCESSORS_ONLN
    free -h
    cat /etc/os-release
    network_state
    echo 'PASS clean_ubuntu_no_sonora_or_postgresql'
    ;;
  provision)
    bash /opt/sonora/bootstrap/provision.sh sonora.localhost --local
    ;;
  verify)
    bash /opt/sonora/bootstrap/verify.sh --infrastructure-only --fault-test --load-test
    ;;
  reprovision)
    fingerprint > "$base/before-reprovision.json"
    printf 'lab persistence marker\n' > /var/lib/sonora/api/lab-persistence.txt
    bash /opt/sonora/bootstrap/provision.sh sonora.localhost --local
    fingerprint > "$base/after-reprovision.json"
    cmp "$base/before-reprovision.json" "$base/after-reprovision.json"
    grep -qx 'lab persistence marker' /var/lib/sonora/api/lab-persistence.txt
    echo 'PASS reprovision_preserved_credentials_database_oid_and_file'
    ;;
  network-static)
    # Cloud-init não deve sobrescrever a configuração exercitada no próximo boot.
    printf 'network: {config: disabled}\n' > /etc/cloud/cloud.cfg.d/99-sonora-lab-network.cfg
    printf '%s\n' '{"interface":"enp0s3","mode":"static","address":"10.0.2.15/24","gateway":"10.0.2.2","dns":["10.0.2.3"]}' > "$base/static.json"
    network_state
    bash /opt/sonora/bootstrap/network.sh configure "$base/static.json"
    python3 - <<'PY'
import json
from pathlib import Path
config = json.loads(Path('/etc/netplan/99-sonora.yaml').read_text())
nic = config['network']['ethernets']['enp0s3']
assert nic['dhcp4'] is False and nic['addresses'] == ['10.0.2.15/24']
PY
    network_state
    echo 'PASS static_configuration_confirmed'
    ;;
  network-timeout)
    cp /etc/netplan/99-sonora.yaml "$base/netplan-before-timeout.yaml"
    printf '%s\n' '{"interface":"enp0s3","mode":"static","address":"10.0.2.20/24","gateway":"10.0.2.2","dns":["10.0.2.3"]}' > "$base/trial.json"
    (sleep 8; network_state > "$base/network-during-trial.log") &
    observer=$!
    set +e
    bash /opt/sonora/bootstrap/network.sh configure "$base/trial.json"
    rc=$?
    set -e
    wait "$observer"
    cat "$base/network-during-trial.log"
    [[ $rc != 0 ]]
    cmp "$base/netplan-before-timeout.yaml" /etc/netplan/99-sonora.yaml
    ip -4 address show dev enp0s3 | grep -q '10.0.2.15/24'
    ! ip -4 address show dev enp0s3 | grep -q '10.0.2.20/24'
    bash /opt/sonora/bootstrap/network.sh check enp0s3
    network_state
    echo 'PASS timeout_rollback_runtime_disk_route_and_dns'
    ;;
  network-dhcp)
    printf '%s\n' '{"interface":"enp0s3","mode":"dhcp","dns":["10.0.2.3"]}' > "$base/dhcp.json"
    bash /opt/sonora/bootstrap/network.sh configure "$base/dhcp.json"
    network_state
    echo 'PASS dhcp_configuration_confirmed'
    ;;
  before-reboot)
    cat /proc/sys/kernel/random/boot_id > "$base/boot-before.txt"
    fingerprint > "$base/before-reboot.json"
    sha256sum /etc/netplan/99-sonora.yaml > "$base/network-before-reboot.sha256"
    echo 'PASS reboot_baseline_saved'
    ;;
  after-reboot)
    [[ $(cat "$base/boot-before.txt") != "$(cat /proc/sys/kernel/random/boot_id)" ]]
    fingerprint > "$base/after-reboot.json"
    cmp "$base/before-reboot.json" "$base/after-reboot.json"
    sha256sum --check "$base/network-before-reboot.sha256"
    bash /opt/sonora/bootstrap/verify.sh --infrastructure-only
    grep -qx 'lab persistence marker' /var/lib/sonora/api/lab-persistence.txt
    journalctl --list-boots --no-pager
    echo 'PASS actual_reboot_services_network_credentials_and_file'
    ;;
  delivery-pending)
    set +e
    bash /opt/sonora/bootstrap/verify.sh
    rc=$?
    set -e
    [[ $rc == 3 ]]
    echo 'PENDING academic_delivery: real_applications_and_domain_migrations_not_installed (verify exit=3)'
    ;;
  collect)
    echo 'VERSIONS'
    dpkg-query -W postgresql openjdk-21-jre-headless caddy netplan.io systemd
    echo 'MONITOR_JOURNAL'
    journalctl -u sonora-monitor -n 40 -o short-iso --no-pager
    echo 'NETWORK_LOG'
    cat /var/log/sonora-network.log
    echo 'LOG_ROTATION'
    cat /etc/logrotate.d/sonora
    echo 'PASS evidence_collection_without_secret_contents'
    ;;
  *) echo 'ERROR unknown_lab_phase'; exit 2;;
esac
printf '%s COMPLETE lab phase=%s\n' "$(date -Is)" "$phase"
