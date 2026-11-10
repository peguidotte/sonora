#!/usr/bin/env bash
# Ubuntu 24.04. Provisionamento idempotente; não instala aplicação fictícia.
set -Eeuo pipefail
umask 077
[[ $EUID == 0 ]] || { echo 'Executar como root.' >&2; exit 1; }
fqdn=${1:?Informe o FQDN público da VM}
[[ $fqdn =~ ^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$ ]] || exit 2
site_address=$fqdn
if [[ ${2:-} == --local ]]; then site_address="http://$fqdn"; fi
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || { echo 'Requer Ubuntu 24.04.' >&2; exit 2; }
exec > >(tee -a /var/log/sonora-provision.log) 2>&1
trap 'rc=$?; echo "$(date -Is) ERROR provision line=$LINENO exit=$rc"; exit "$rc"' ERR
echo "$(date -Is) START provision"
export DEBIAN_FRONTEND=noninteractive
apt-get -o APT::Update::Error-Mode=any update -qq
apt-get install -y -qq ca-certificates curl gnupg postgresql postgresql-client openjdk-21-jre-headless python3 libicu74 libssl3t64 libgssapi-krb5-2 netplan.io logrotate
desired_hostname=${SONORA_HOSTNAME:-sonora}
[[ $desired_hostname =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]] || exit 2
echo "$(date -Is) stage=network"
hostnamectl set-hostname "$desired_hostname"
/bin/bash /opt/sonora/bootstrap/network.sh check

echo "$(date -Is) stage=users_and_directories"
for component in api soa migrator monitor; do
  id "sonora-$component" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "sonora-$component"
done
install -d -m 0755 /opt/sonora /opt/sonora/api /opt/sonora/soa
install -d -m 0755 /etc/sonora
install -d -m 0700 /etc/sonora/admin /var/lib/sonora/incoming
for component in api soa; do
  install -d -m 0755 "/opt/sonora/$component/releases"
  install -d -o "sonora-$component" -g "sonora-$component" -m 0750 "/var/lib/sonora/$component"
done
install -d -o postgres -g postgres -m 0700 /var/backups/sonora
install -d -m 0750 -o root -g sonora-soa /var/lib/sonora/imports

# Senhas e chaves são geradas na VM, fora do Terraform/state, Git e logs.
python3 - <<'PY'
from pathlib import Path
import hashlib, json, os, secrets, grp, tempfile
base = Path('/etc/sonora')
def write(path, text, mode=0o600, group=None):
    with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, delete=False) as output:
        output.write(text)
        temporary = Path(output.name)
    temporary.chmod(mode)
    if group:
        os.chown(temporary, 0, grp.getgrnam(group).gr_gid)
    temporary.replace(path)
def secret(name):
    p = base / 'admin' / name
    if not p.exists():
        write(p, secrets.token_hex(32) + '\n')
    return p.read_text().strip()
for role in ('migrator', 'ingest', 'query'):
    secret(f'db-{role}.key')
specs = {
    'api': [('read', ['acoustics:read']), ('api-operator', ['acoustics:read', 'operations:read'])],
    'soa': [('soa-operator', ['imports:manage', 'operations:read']), ('device', ['observations:write'])],
}
for app, entries in specs.items():
    records = []
    for name, scopes in entries:
        record = {'id': name, 'sha256': hashlib.sha256(secret(name + '.key').encode()).hexdigest(), 'scopes': scopes}
        if name == 'device':
            record['deviceId'] = '11111111-1111-4111-8111-111111111111'
        records.append(record)
    p = base / f'{app}-keys.json'
    write(p, json.dumps({'keys': records}, indent=2) + '\n', 0o640, 'sonora-' + app)
    role = 'query' if app == 'api' else 'ingest'
    password = secret(f'db-{role}.key')
    port = 8080 if app == 'api' else 8082
    env = {
        'SONORA_DB_HOST': '127.0.0.1', 'SONORA_DB_PORT': '5432',
        'SONORA_DB_NAME': 'sonora', 'SONORA_DB_USER': 'sonora_' + role,
        'SONORA_DB_PASSWORD': password, 'SONORA_KEYS_FILE': str(base / f'{app}-keys.json'),
        'SONORA_HTTP_HOST': '127.0.0.1', 'SONORA_HTTP_PORT': str(port),
    }
    if app == 'api':
        env.update(ASPNETCORE_URLS=f'http://127.0.0.1:{port}', ASPNETCORE_ENVIRONMENT='Production',
                   ConnectionStrings__Sonora=f'Host=127.0.0.1;Database=sonora;Username=sonora_{role};Password={password}')
    else:
        env.update(SERVER_ADDRESS='127.0.0.1', SERVER_PORT=str(port),
                   SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:5432/sonora',
                   SPRING_DATASOURCE_USERNAME='sonora_' + role, SPRING_DATASOURCE_PASSWORD=password,
                   SPRING_FLYWAY_ENABLED='false', SPRING_JPA_HIBERNATE_DDL_AUTO='validate')
    p = base / f'{app}.env'
    write(p, ''.join(f'{k}="{v}"\n' for k, v in env.items()))
p = base / 'migrator.env'
write(p, ''.join(f'{k}="{v}"\n' for k, v in {
    'PGHOST': '127.0.0.1', 'PGPORT': '5432', 'PGDATABASE': 'sonora',
    'PGUSER': 'sonora_migrator', 'PGPASSWORD': secret('db-migrator.key'),
    'SONORA_DB_HOST': '127.0.0.1', 'SONORA_DB_PORT': '5432', 'SONORA_DB_NAME': 'sonora',
    'SONORA_DB_USER': 'sonora_migrator', 'SONORA_DB_PASSWORD': secret('db-migrator.key'),
}.items()))
PY

echo "$(date -Is) stage=database_roles"
# SQL via stdin: senhas não entram em argumentos nem no log do shell.
python3 - <<'PY' | runuser -u postgres -- psql -X --set=ON_ERROR_STOP=1 --quiet postgres
from pathlib import Path
for suffix in ('migrator', 'ingest', 'query'):
    role = 'sonora_' + suffix
    password = Path('/etc/sonora/admin/db-' + suffix + '.key').read_text().strip()
    print(f"SELECT 'CREATE ROLE {role} LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{role}')\\gexec")
    print(f"ALTER ROLE {role} PASSWORD '{password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;")
print("SELECT 'CREATE DATABASE sonora OWNER sonora_migrator' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='sonora')\\gexec")
print('REVOKE ALL ON DATABASE sonora FROM PUBLIC;')
print('GRANT CONNECT ON DATABASE sonora TO sonora_migrator, sonora_ingest, sonora_query;')
PY
runuser -u postgres -- psql -X --set=ON_ERROR_STOP=1 --quiet sonora <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
# Sem tabelas/views/seed aqui: as migrations pertencem exclusivamente ao SOA.

echo "$(date -Is) stage=proxy"
if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /tmp/sonora-caddy.gpg
  gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg /tmp/sonora-caddy.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
  chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get -o APT::Update::Error-Mode=any update -qq
  apt-get install -y -qq caddy
fi
cat > /etc/caddy/Caddyfile <<EOF
$site_address {
    handle /api/sonora/v1/* {
        reverse_proxy 127.0.0.1:8080
    }
    handle /api/ingestion/v1/* {
        reverse_proxy 127.0.0.1:8082
    }
    handle /dashboard* {
        reverse_proxy 127.0.0.1:8080
    }
    handle {
        respond "Sonora: applications not deployed on this route." 503
    }
}
EOF
chmod 0644 /etc/caddy/Caddyfile
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

echo "$(date -Is) stage=services"
for component in api soa; do
  cat > "/etc/systemd/system/sonora-$component.service" <<EOF
[Unit]
Description=Sonora $component
After=network-online.target postgresql.service
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10
[Service]
Type=simple
User=sonora-$component
Group=sonora-$component
WorkingDirectory=/opt/sonora/$component/current
EnvironmentFile=/etc/sonora/$component.env
ExecStart=/bin/bash /opt/sonora/$component/current/bin/start.sh
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/sonora/$component
UMask=0027
[Install]
WantedBy=multi-user.target
EOF
done
install -m 0755 /opt/sonora/bootstrap/monitor.sh /usr/local/bin/sonora-monitor
install -m 0755 /opt/sonora/bootstrap/network.sh /usr/local/sbin/sonora-network
install -m 0700 /opt/sonora/bootstrap/verify.sh /usr/local/sbin/sonora-verify
install -m 0700 /opt/sonora/bootstrap/deploy-release.py /usr/local/sbin/sonora-deploy
if [[ ! -e /etc/sonora/monitor.env ]]; then
  printf 'INTERVAL_SECONDS=30\nCPU_THRESHOLD=85\nMEMORY_THRESHOLD=85\nDISK_THRESHOLD=85\n' > /etc/sonora/monitor.env
fi
cat > /etc/systemd/system/sonora-monitor.service <<'EOF'
[Unit]
Description=Sonora infrastructure monitor
After=local-fs.target
[Service]
Type=simple
User=sonora-monitor
EnvironmentFile=/etc/sonora/monitor.env
ExecStart=/usr/local/bin/sonora-monitor
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now postgresql caddy sonora-monitor
systemctl restart sonora-monitor
systemctl reload caddy
echo "$(date -Is) stage=audit_retention"
# Limitar retenção e persistir logs de serviço entre reboots da VM dedicada.
install -d -m 0755 /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/sonora.conf <<'EOF'
[Journal]
Storage=persistent
SystemMaxUse=100M
MaxRetentionSec=14day
EOF
cat > /etc/logrotate.d/sonora <<'EOF'
/var/log/sonora-*.log {
    su root root
    weekly
    maxsize 5M
    rotate 4
    compress
    missingok
    notifempty
    create 0600 root root
}
EOF
systemctl restart systemd-journald
journalctl --flush
logrotate --debug /etc/logrotate.d/sonora > /var/log/sonora-logrotate-validation.log 2>&1
echo "$(date -Is) COMPLETE provision; aplicações aguardam artefatos reais e migrations SOA."
