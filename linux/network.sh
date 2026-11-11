#!/usr/bin/env bash
# Rede de VM Ubuntu dedicada. Azure mantém DHCP gerenciado pela plataforma.
set -Eeuo pipefail
export LC_ALL=C
umask 077
action=${1:-check}

render() {
  python3 - "$1" <<'PY'
import ipaddress, json, re, sys
try:
    c = json.load(open(sys.argv[1], encoding='utf-8'))
    if set(c) - {'interface', 'mode', 'address', 'gateway', 'dns'}:
        raise ValueError('unknown field')
    interface = c['interface']
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,14}', interface) or interface == 'lo':
        raise ValueError('invalid interface')
    if c['mode'] not in ('dhcp', 'static') or not isinstance(c['dns'], list) or not c['dns']:
        raise ValueError('invalid mode/dns')
    if any(not isinstance(a, str) for a in c['dns']):
        raise ValueError('dns addresses must be strings')
    dns = [str(ipaddress.ip_address(a)) for a in c['dns']]
    nic = {'dhcp4': c['mode'] == 'dhcp', 'nameservers': {'addresses': dns}}
    if c['mode'] == 'static':
        address = ipaddress.IPv4Interface(c['address'])
        gateway = ipaddress.IPv4Address(c['gateway'])
        if (gateway not in address.network or gateway == address.ip or
                (address.network.prefixlen <= 30 and (address.ip in (address.network.network_address, address.network.broadcast_address)
                 or gateway in (address.network.network_address, address.network.broadcast_address)))):
            raise ValueError('gateway must be another address in subnet')
        nic.update(addresses=[str(address)], routes=[{'to': 'default', 'via': str(gateway)}])
    elif 'address' in c or 'gateway' in c:
        raise ValueError('DHCP must not specify static address/gateway')
    print(json.dumps({'network': {'version': 2, 'renderer': 'networkd', 'ethernets': {interface: nic}}}, indent=2))
except (ValueError, KeyError, TypeError, OSError):
    sys.exit('ERROR invalid_network_configuration')
PY
}

check() {
  local interface=${1:-} dns_name=${DNS_CHECK_NAME:-login.microsoftonline.com}
  [[ $dns_name =~ ^[a-zA-Z0-9.-]+$ ]] || return 2
  if [[ -z $interface ]]; then interface=$(ip -4 route show default | awk 'NR==1 {for(i=1;i<NF;i++) if($i=="dev") {print $(i+1); exit}}'); fi
  [[ $interface =~ ^[a-zA-Z0-9_.-]+$ && $interface != lo ]] || return 1
  ip -4 address show dev "$interface" scope global | grep -q 'inet ' || return 1
  ip -4 route show default dev "$interface" | grep -q '^default ' || return 1
  getent ahostsv4 "$dns_name" >/dev/null || return 1
  printf '%s PASS network interface=%s hostname=%s dns=%s\n' "$(date -Is)" "$interface" "$(hostname)" "$dns_name"
  ip -brief address show dev "$interface"
  ip -4 route show default dev "$interface"
  resolvectl status "$interface" --no-pager
}

case $action in
  render) [[ $# == 2 ]] || exit 2; render "$2";;
  check) check "${2:-}";;
  configure)
    [[ $# == 2 && $EUID == 0 ]] || { echo 'Uso: sudo network.sh configure CONFIG.json' >&2; exit 2; }
    # netplan try exige confirmação pelo console; nenhuma mudança de rede via CI/Run Command.
    [[ -t 0 && -t 1 ]] || { echo 'ERROR console_required_for_netplan_try' >&2; exit 2; }
    install -d -m 0700 /var/backups/sonora/network
    backup=$(mktemp -d /var/backups/sonora/network/change-XXXXXX)
    mkdir -p "$backup/previous" "$backup/stage/etc/netplan"
    render "$2" > "$backup/stage/etc/netplan/99-sonora.yaml"
    interface=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["interface"])' "$2")
    ip link show dev "$interface" >/dev/null
    # Este perfil substitui a configuração completa: limitar a VM com uma interface.
    count=$(find /sys/class/net -mindepth 1 -maxdepth 1 ! -name lo | wc -l)
    [[ $count == 1 ]] || { echo 'ERROR requires_single_interface_vm' >&2; exit 2; }
    netplan generate --root-dir "$backup/stage"
    exec > >(tee -a /var/log/sonora-network.log) 2>&1
    printf '%s START network backup=%s\n' "$(date -Is)" "$backup"
    shopt -s nullglob
    originals=(/etc/netplan/*.yaml /etc/netplan/*.yml)
    for file in "${originals[@]}"; do cp -p -- "$file" "$backup/previous/"; done
    rollback() {
      rc=$?
      trap - EXIT
      if ((rc != 0)); then
        rm -f -- /etc/netplan/99-sonora.yaml
        for file in "$backup/previous/"*; do cp -p -- "$file" /etc/netplan/; done
        netplan apply || printf '%s ERROR network_rollback_failed use_console backup=%s\n' "$(date -Is)" "$backup"
        printf '%s ERROR network exit=%s rollback_attempted backup=%s\n' "$(date -Is)" "$rc" "$backup"
      fi
      exit "$rc"
    }
    trap rollback EXIT
    for file in "${originals[@]}"; do rm -- "$file"; done
    install -m 0600 "$backup/stage/etc/netplan/99-sonora.yaml" /etc/netplan/99-sonora.yaml
    # netplan try pode sair com 0 após rejeição/timeout. Com stdout em tee, Python
    # também bufferiza o prompt: exigir a confirmação explícita em saída não bufferizada.
    PYTHONUNBUFFERED=1 netplan try --timeout 60 | tee "$backup/try.log"
    grep -Fxq 'Configuration accepted.' "$backup/try.log" || {
      echo 'ERROR network_change_not_confirmed' >&2; exit 1;
    }
    # Endereço/rota/DNS podem convergir depois da confirmação imediata no console.
    network_ready=false
    for _ in {1..15}; do
      if check "$interface"; then network_ready=true; break; fi
      sleep 1
    done
    $network_ready || { echo 'ERROR network_did_not_converge' >&2; exit 1; }
    printf '%s COMPLETE network backup=%s\n' "$(date -Is)" "$backup"
    trap - EXIT
    ;;
  *) echo 'Uso: network.sh check [interface] | render CONFIG.json | configure CONFIG.json' >&2; exit 2;;
esac
