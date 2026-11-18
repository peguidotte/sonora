#!/usr/bin/env bash
# Demonstração opt-in da GS. Requer as migrations e as chaves locais do provisionamento.
set -Eeuo pipefail
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d sonora <<'SQL'
BEGIN;
INSERT INTO sonora.locations (id,name,city,latitude,longitude,is_demo)
VALUES ('b791ced1-b669-474c-a17c-72ab39415b89','Laboratório Sonora (simulado)','São Paulo',-23.56,-46.65,true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sonora.sources (id,name,source_url,snapshot_date,license,origin,limitations)
VALUES ('91eec436-5b36-43a3-8c2f-308558a7dc91','Laboratório GS','https://github.com/peguidotte/sonora',DATE '2026-11-17','Demonstração acadêmica','simulated','["Sinal gerado em software."]')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sonora.devices (id,name,location_id,source_id,enabled,method,calibration_status)
VALUES ('11111111-1111-4111-8111-111111111111','Dispositivo GS','b791ced1-b669-474c-a17c-72ab39415b89','91eec436-5b36-43a3-8c2f-308558a7dc91',true,'wokwi_linear_demo','simulated')
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM sonora.devices d JOIN sonora.locations l ON l.id=d.location_id
 WHERE d.id='11111111-1111-4111-8111-111111111111' AND l.is_demo AND l.id='b791ced1-b669-474c-a17c-72ab39415b89' AND d.source_id='91eec436-5b36-43a3-8c2f-308558a7dc91')
 THEN RAISE EXCEPTION 'O dispositivo já pertence a outro cadastro. Nenhum dado foi alterado.'; END IF;
END $$;
COMMIT;
SQL
python3 - <<'PY'
import json
from pathlib import Path
from urllib.request import Request, urlopen

def request(port, path, key, data=None):
    headers = {"X-Api-Key": Path("/etc/sonora/admin", key + ".key").read_text().strip(),
               "Content-Type": "application/json"}
    req = Request(f"http://127.0.0.1:{port}{path}", headers=headers,
                  data=None if data is None else json.dumps(data).encode())
    with urlopen(req, timeout=10) as res:
        return res.status, json.load(res)

item = dict(deviceId="11111111-1111-4111-8111-111111111111", sessionId="gs-linux-2026",
            externalId="janela-001", observedAt="2026-11-17T15:00:00Z", durationSeconds=5, laeqDbA=63.4)
for _ in range(2):
    status, _result = request(8082, "/api/ingestion/v1/sonora/observations", "device", item)
    print(f"Java: HTTP {status} | externalId=janela-001")
prefix = "/api/sonora/v1/locations/b791ced1-b669-474c-a17c-72ab39415b89"
period = "?from=2026-11-17T15:00:00Z&to=2026-11-17T15:01:00Z&origin=simulated"
status, profile = request(8080, prefix + "/noise-profile" + period, "read")
if profile.get("laeqDbA") != 63.4:
    raise SystemExit("Perfil inesperado para a janela de demonstração")
print(f"C#: HTTP {status} | simulated | LAeq = {profile['laeqDbA']} dB(A) | 17/11/2026 15:00 UTC")
PY
