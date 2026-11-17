-- Interface de leitura publicada para o C# (contracts/database.json -> readViews).
-- Expõe somente as colunas contratadas: sem credenciais, hashes, lotes internos ou áudio.

CREATE VIEW sonora_read.locations AS
SELECT id, name, city, latitude, longitude, is_demo
FROM sonora.locations;

CREATE VIEW sonora_read.sources AS
SELECT id, name, source_url, snapshot_date, license, origin, limitations
FROM sonora.sources;

CREATE VIEW sonora_read.devices AS
SELECT id, location_id, name, enabled, last_received_at
FROM sonora.devices;

CREATE VIEW sonora_read.observations AS
SELECT id, source_id, location_id, device_id, session_id, external_id, observed_at, received_at,
       duration_seconds, laeq_db_a, origin, method, calibration_status
FROM sonora.observations;

-- Somente o artefato ML mais recente; sem artefato a view fica vazia e o C# responde 204.
CREATE VIEW sonora_read.ml_summaries AS
SELECT model_version, created_at, payload
FROM sonora.ml_summaries
ORDER BY created_at DESC, id DESC
LIMIT 1;

-- Explícito além dos privilégios padrão da V1: os dois runtimes leem as views; nenhum grava nelas.
GRANT SELECT ON ALL TABLES IN SCHEMA sonora_read TO sonora_ingest, sonora_query;
