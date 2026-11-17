#!/usr/bin/env bash
# Roteiro de evidências da entrega SOA. Executa cada etapa a partir de um banco VAZIO e pausa para o print.
# Requisitos: Docker (com Compose) e Python 3. Rodar na raiz do clone, no Git Bash (Windows) ou bash (Linux/macOS):
#   bash soa/evidencias/gerar-evidencias.sh
# EVIDENCIAS_SEM_PAUSA=1 executa direto, sem pausas. Usa somente o PostgreSQL descartável do laboratório.
set -Eeuo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

[[ -f AGENTS.md && -d soa && -d database ]] || { echo 'Execute na raiz do clone do sonora.' >&2; exit 2; }
PY=
for candidate in python3 python py; do
  # No Windows, "python3" pode ser só o atalho da Microsoft Store: testar execução real.
  if command -v "$candidate" >/dev/null && "$candidate" -c 'import sys; assert sys.version_info >= (3, 9)' >/dev/null 2>&1; then
    PY=$candidate; break
  fi
done
[[ -n $PY ]] || { echo 'Instale Python 3.9+.' >&2; exit 2; }
docker info >/dev/null 2>&1 || { echo 'Abra o Docker Desktop e tente de novo.' >&2; exit 2; }
HOST_ROOT=$(pwd -W 2>/dev/null || pwd)
COMPOSE=(docker compose -p sonora-local -f database/compose.yaml)
NET=sonora-local_default
API=http://127.0.0.1:8082/api/ingestion/v1
DEVICE=11111111-1111-4111-8111-111111111111
APP=sonora-soa-evidencias

titulo() {
  [[ ${EVIDENCIAS_SEM_PAUSA:-} == 1 ]] || clear
  printf '\n\033[1;45;97m  %s  \033[0m\n\033[1;35m%s\033[0m\n\n' "$1" "$2"
}
pausa() {
  [[ ${EVIDENCIAS_SEM_PAUSA:-} == 1 ]] && return
  printf '\n\033[1;33m>> Tire o print como soa/evidencias/%s e pressione Enter...\033[0m' "$1"
  read -r _
}
psql_admin() { docker exec sonora-local-postgres-1 psql -U postgres -d sonora "$@"; }
http() { # método rota chave [corpo]  -> imprime status e corpo, sem mostrar a chave
  local method=$1 route=$2 key=$3 body=${4:-}
  local args=(-s -X "$method" -w '\n<- HTTP %{http_code}\n' "$API$route")
  [[ -n $key ]] && args+=(-H "X-Api-Key: $key")
  [[ -n $body ]] && args+=(-H 'Content-Type: application/json' --data-binary "$body")
  printf '\033[36m-> %s %s%s\033[0m\n' "$method" "/api/ingestion/v1$route" "${body:+  $body}"
  curl "${args[@]}"
  echo
}
encerrar() { docker rm -f "$APP" >/dev/null 2>&1 || true; }
trap encerrar EXIT

# ---------------------------------------------------------------- preparação (sem print)
echo 'Preparando Flyway, credenciais locais e dados públicos...'
"$PY" database/prepare.py >/dev/null
"$PY" - <<'PYTHON'
from pathlib import Path
import hashlib, json, secrets
dev = Path("output/dev"); dev.mkdir(parents=True, exist_ok=True)
if not (dev / "soa-keys.json").exists():
    keys = []
    for name, scopes, device in (("soa-operator", ["imports:manage", "operations:read"], None),
                                 ("soa-device-demo-a", ["observations:write"], "11111111-1111-4111-8111-111111111111")):
        key = secrets.token_urlsafe(32)
        (dev / f"{name}.key").write_text(key, encoding="utf-8")
        entry = {"id": name, "sha256": hashlib.sha256(key.encode()).hexdigest(), "scopes": scopes}
        if device: entry["deviceId"] = device
        keys.append(entry)
    (dev / "soa-keys.json").write_text(json.dumps({"keys": keys}), encoding="utf-8")
if not (dev / "imports.json").exists():
    (dev / "imports.json").write_text(Path("soa/imports.example.json").read_text(encoding="utf-8"), encoding="utf-8")
PYTHON
NC=output/noisecapture/sao-paulo.points.geojson
if [[ ! -f $NC ]]; then
  mkdir -p output/noisecapture
  [[ -f output/noisecapture/Brazil.zip ]] || curl -fsSL -o output/noisecapture/Brazil.zip https://data.noise-planet.org/dump/Brazil.zip
  "$PY" - <<'PYTHON'
import zipfile
z = zipfile.ZipFile("output/noisecapture/Brazil.zip")
name = next(n for n in z.namelist() if n.count("Paulo") == 2 and n.endswith(".points.geojson"))
open("output/noisecapture/sao-paulo.points.geojson", "wb").write(z.read(name))
PYTHON
fi
OPERATOR=$(cat output/dev/soa-operator.key)
DEVICE_KEY=$(cat output/dev/soa-device-demo-a.key)
export PYTHONIOENCODING=utf-8
maven() {
  docker run --rm --network "$NET" -v "$HOST_ROOT:/workspace" -v sonora-m2:/root/.m2 -w /workspace \
    -e SONORA_DB_HOST=postgres -e SONORA_DB_PORT=5432 -e SONORA_DB_PASSWORD=ci-ingest-only \
    maven:3.9-eclipse-temurin-21 mvn -B -f soa/pom.xml "$@"
}
echo 'Compilando o JAR (os testes rodam na última etapa, para não misturar dados de teste nos prints)...'
maven -q -DskipTests package

# ---------------------------------------------------------------- 1. migrations
titulo '1/7  MIGRATIONS' 'Banco PostgreSQL 16 recriado VAZIO; Flyway CLI aplica V1-V3 sem nenhum JAR de aplicação.'
"${COMPOSE[@]}" down -v >/dev/null 2>&1 || true
"${COMPOSE[@]}" up -d --wait postgres >/dev/null 2>&1
"${COMPOSE[@]}" run --rm migrate 2>&1 | grep -E 'Migrating|Successfully'
echo
"${COMPOSE[@]}" run --rm migrate info 2>&1 | grep -E '^\+|^\| (Category|Versioned)'
echo
psql_admin -c '\dt sonora.*' -c '\dv sonora_read.*'
pausa 01-migrations.png

# ---------------------------------------------------------------- 2. seed
titulo '2/7  SEED DE LABORATÓRIO' 'Dados sintéticos das fixtures + fonte NoiseCapture, com histórico separado e trava explícita.'
echo '$ migrate.sh seed  (sem a trava)'
"${COMPOSE[@]}" run --rm migrate seed 2>&1 | grep -E 'ERROR' || true
echo
echo '$ SONORA_ALLOW_DEV_SEED=1 migrate.sh seed'
"${COMPOSE[@]}" run --rm -e SONORA_ALLOW_DEV_SEED=1 migrate seed 2>&1 | grep -E 'Migrating|Successfully'
echo
psql_admin -c 'select name, origin, license from sonora.sources' -c 'select name, latitude, longitude, is_demo from sonora.locations'
pausa 02-seed.png

# ---------------------------------------------------------------- 3. serviço
titulo '3/7  SERVIÇO NO AR' 'JAR iniciado com a conta sonora_ingest; Hibernate valida as entidades contra o schema migrado.'
docker rm -f "$APP" >/dev/null 2>&1 || true
docker run -d --name "$APP" --network "$NET" -p 127.0.0.1:8082:8082 -v "$HOST_ROOT:/workspace:ro" -w /workspace \
  -e SONORA_DB_HOST=postgres -e SONORA_DB_PORT=5432 -e SONORA_DB_PASSWORD=ci-ingest-only -e SONORA_HTTP_HOST=0.0.0.0 \
  -e SONORA_KEYS_FILE=/workspace/output/dev/soa-keys.json -e SONORA_IMPORTS_FILE=/workspace/output/dev/imports.json \
  eclipse-temurin:21-jre java -jar soa/target/sonora-ingestion-0.1.0-SNAPSHOT.jar >/dev/null
for _ in $(seq 60); do curl -fs "$API/health/live" >/dev/null 2>&1 && break; sleep 1; done
docker logs "$APP" 2>&1 | grep -E 'Starting IngestionApplication|HikariPool-1 - Start completed|Tomcat started|Started IngestionApplication' \
  | sed -E 's/^([0-9T:.-]+)Z +INFO [0-9]+ --- \[sonora-ingestion\] \[ *[^]]*\] /\1 /'
echo
http GET /health/live ''
http GET /health/ready "$OPERATOR"
pausa 03-servico.png

# ---------------------------------------------------------------- 4. regras via HTTP
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OBS='{"externalId":"evidencia-1","deviceId":"'$DEVICE'","sessionId":"demo-a-boot-002","observedAt":"'$NOW'","durationSeconds":5,"laeqDbA":62.5}'
titulo '4/7  REGRAS DE NEGÓCIO (API REST)' 'Autenticação por escopo, idempotência, conflito, vínculo do dispositivo e validação estrita.'
http POST /sonora/observations '' "$OBS"
http POST /sonora/observations "$OPERATOR" "$OBS"
http POST /sonora/observations "$DEVICE_KEY" "$OBS"
http POST /sonora/observations "$DEVICE_KEY" "$OBS"
http POST /sonora/observations "$DEVICE_KEY" "${OBS/62.5/70}"
http POST /sonora/observations "$DEVICE_KEY" "${OBS/$DEVICE/22222222-2222-4222-8222-222222222222}"
http POST /sonora/observations "$DEVICE_KEY" "${OBS/\"laeqDbA\"/\"origin\":\"public_dataset\",\"laeqDbA\"}"
http POST /sonora/observations "$DEVICE_KEY" "${OBS/62.5/140.5}"
http POST /sonora/observations "$DEVICE_KEY" "${OBS/$NOW/2099-01-01T00:00:00Z}"
pausa 04-regras-http.png

titulo '4b/7  PERSISTÊNCIA NO POSTGRESQL' 'Campos resolvidos pelo servidor (origem, local, método) e a mesma linha na view lida pelo C#.'
psql_admin -c "select external_id, origin, method, calibration_status, laeq_db_a, observed_at, received_at
               from sonora.observations where external_id = 'evidencia-1'"
psql_admin -c "select name, last_received_at from sonora.devices"
echo '$ como sonora_query (conta do C#, somente leitura):'
docker exec -e PGPASSWORD=ci-query-only sonora-local-postgres-1 psql -h 127.0.0.1 -U sonora_query -d sonora \
  -c "select external_id, origin, laeq_db_a from sonora_read.observations order by observed_at" \
  -c "insert into sonora.observations (id) values (gen_random_uuid())" 2>&1 || true
pausa 05-persistencia.png

# ---------------------------------------------------------------- 5. documentação
titulo '5/7  DOCUMENTAÇÃO AUTOMÁTICA' 'OpenAPI 3.1 gerado pelo springdoc a partir do código; protegido por operations:read.'
mkdir -p output/evidencias
http GET /openapi.json ''
curl -fs -H "X-Api-Key: $OPERATOR" "$API/openapi.json" > output/evidencias/openapi.json
"$PY" - <<'PYTHON'
import json
d = json.load(open("output/evidencias/openapi.json", encoding="utf-8"))
print(f"{d['info']['title']}  v{d['info']['version']}  (OpenAPI {d['openapi']})\n")
for path, ops in d["paths"].items():
    for method, op in ops.items():
        scopes = ", ".join(op.get("x-required-scopes") or ["anônimo"])
        print(f"{method.upper():5} {path:42} [{scopes}]  respostas: {' '.join(sorted(op['responses']))}")
print("\nSchemas:", ", ".join(d["components"]["schemas"]))
print("Arquivo completo: output/evidencias/openapi.json")
PYTHON
pausa 06-openapi.png

# ---------------------------------------------------------------- 6. importação real
titulo '6/7  IMPORTAÇÃO REAL — NOISECAPTURE' 'Dump público (ODbL), 282.021 pontos de São Paulo; reimportação não duplica.'
for vez in 1 2; do
  echo "Importação #$vez"
  curl -s -X POST -H "X-Api-Key: $OPERATOR" -H 'Content-Type: application/json' \
    --data-binary '{"fileId":"noisecapture-sp-2026-11-08"}' "$API/sonora/batches" \
    | "$PY" -c 'import json,sys; b=json.load(sys.stdin); print("  ", {k: b[k] for k in ("status","acceptedCount","duplicateCount","rejectedCount")})'
done
echo
psql_admin -c "select status, accepted_count, duplicate_count, rejected_count,
               (select count(*) from sonora.observations o where o.batch_id = b.id) as linhas_gravadas
               from sonora.import_batches b order by created_at"
echo 'Motivos das rejeições na primeira importação:'
psql_admin -At -c "select format('  %s: %s', x->>'code', x->>'count') from sonora.import_batches b,
               jsonb_array_elements(b.errors) x where b.created_at = (select min(created_at) from sonora.import_batches)"
pausa 07-importacao-noisecapture.png

# ---------------------------------------------------------------- 7. testes (por último: gravam dados de teste)
titulo '7/7  TESTES AUTOMATIZADOS' 'mvn verify: 15 unitários + 15 de integração (HTTP real + PostgreSQL real). Demora ~1-3 min.'
docker rm -f "$APP" >/dev/null 2>&1 || true
maven verify 2>&1 | grep -E 'Tests run:|BUILD' | sed -E 's/, Time elapsed: [0-9.]+ s//; s/ -- in com\.sonora\.ingestion\./  /'
pausa 08-testes.png

titulo 'FIM' 'Serviço encerrado. O PostgreSQL de laboratório continua no Docker (remover: docker compose -p sonora-local -f database/compose.yaml down -v).'
