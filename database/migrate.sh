#!/usr/bin/env bash
# Um único histórico para o PostgreSQL compartilhado; sem runtime das aplicações.
set -Eeuo pipefail
action=${1:-migrate}
[[ $# -le 1 && $action =~ ^(migrate|validate|info)$ ]] || {
  echo 'Uso: migrate.sh [migrate|validate|info]. clean/repair/baseline não são expostos.' >&2; exit 2;
}
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
: "${PGHOST:?Configure PGHOST}" "${PGPORT:?Configure PGPORT}" "${PGDATABASE:?Configure PGDATABASE}"
: "${PGUSER:?Configure PGUSER}" "${PGPASSWORD:?Configure PGPASSWORD fora do Git}"
[[ $PGHOST =~ ^[a-zA-Z0-9.-]+$ && $PGPORT =~ ^[1-9][0-9]{0,4}$ && $PGPORT -le 65535 &&
   $PGDATABASE =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ && $PGUSER == sonora_migrator ]] || {
  echo 'ERROR invalid_migration_connection (requires sonora_migrator)' >&2; exit 2;
}
export FLYWAY_URL="jdbc:postgresql://$PGHOST:$PGPORT/$PGDATABASE"
export FLYWAY_USER=$PGUSER FLYWAY_PASSWORD=$PGPASSWORD
export FLYWAY_LOCATIONS="filesystem:$root/migrations"
export FLYWAY_CONFIG_FILES="$root/flyway.toml"
home=${FLYWAY_HOME:-$root/../output/tools/flyway}
[[ -f $home/flyway ]] || { echo 'ERROR prepare Flyway with database/prepare.py first' >&2; exit 2; }
cd "$root"
exec bash "$home/flyway" "$action"
