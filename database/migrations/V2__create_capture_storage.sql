-- Armazenamento da captura Sonora (entrega SOA). Interface: contracts/database.json.
-- Regras que o banco consegue garantir ficam aqui (tipos, faixas, unicidade e origem coerente);
-- regras de autorização e mapeamento geográfico ficam no serviço Java.

CREATE TABLE sonora.locations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sonora.sources (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  source_url text NOT NULL CHECK (source_url ~ '^https?://[^[:space:]]+$'),
  snapshot_date date NOT NULL,
  license text NOT NULL CHECK (char_length(license) BETWEEN 1 AND 200),
  origin text NOT NULL CHECK (origin IN ('simulated', 'public_dataset')),
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(limitations) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Alvo das chaves compostas: impede observação/dispositivo com origem diferente da fonte.
  CONSTRAINT sources_id_origin_key UNIQUE (id, origin)
);

CREATE TABLE sonora.devices (
  id uuid PRIMARY KEY,
  location_id uuid NOT NULL REFERENCES sonora.locations (id),
  source_id uuid NOT NULL,
  -- Dispositivos IoT do Sonora são simulados (Wokwi); a origem não vem da requisição.
  source_origin text NOT NULL DEFAULT 'simulated' CHECK (source_origin = 'simulated'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  enabled boolean NOT NULL DEFAULT true,
  method text NOT NULL CHECK (method IN ('wokwi_linear_demo')),
  calibration_status text NOT NULL CHECK (calibration_status IN ('unknown', 'simulated', 'documented')),
  last_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devices_source_origin_fkey FOREIGN KEY (source_id, source_origin)
    REFERENCES sonora.sources (id, origin)
);

CREATE TABLE sonora.import_batches (
  id uuid PRIMARY KEY,
  file_id varchar(128) NOT NULL CHECK (file_id ~ '^[A-Za-z0-9._-]{1,128}$'),
  source_id uuid NOT NULL REFERENCES sonora.sources (id),
  -- Calculado pelo servidor; só um lote ainda em 'created' pode não ter o hash (ver CHECK abaixo).
  file_sha256 text CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('created', 'processing', 'completed', 'completed_with_errors', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  -- Resumo auditável por código (sem dados brutos): [{kind, code, count, firstFeatureIndex}].
  errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(errors) = 'array'),
  CONSTRAINT import_batches_hash_known CHECK (status = 'created' OR file_sha256 IS NOT NULL),
  CONSTRAINT import_batches_terminal_state CHECK (
    (status IN ('completed', 'completed_with_errors', 'failed')) = (completed_at IS NOT NULL))
);

CREATE INDEX import_batches_created_at_idx ON sonora.import_batches (created_at DESC, id);

CREATE TABLE sonora.observations (
  id uuid PRIMARY KEY,
  source_id uuid NOT NULL,
  origin text NOT NULL CHECK (origin IN ('simulated', 'public_dataset')),
  location_id uuid NOT NULL REFERENCES sonora.locations (id),
  device_id uuid REFERENCES sonora.devices (id),
  batch_id uuid REFERENCES sonora.import_batches (id),
  -- Produtor da série: dispositivo IoT ou trilha da fonte pública (nunca dado pessoal).
  producer_id text NOT NULL CHECK (char_length(producer_id) BETWEEN 1 AND 160),
  session_id varchar(128) NOT NULL CHECK (char_length(session_id) >= 1),
  external_id varchar(128) NOT NULL CHECK (char_length(external_id) >= 1),
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  -- Limites técnicos de validação; NaN/Infinity ficam fora destas faixas no PostgreSQL.
  duration_seconds double precision NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 3600),
  laeq_db_a double precision NOT NULL CHECK (laeq_db_a >= 0 AND laeq_db_a <= 140),
  method text NOT NULL CHECK (method IN ('wokwi_linear_demo', 'noisecapture_1s')),
  calibration_status text NOT NULL CHECK (calibration_status IN ('unknown', 'simulated', 'documented')),
  -- Importação: distância do ponto público ao local (auditoria do critério de 50 m) sem guardar a trajetória.
  match_distance_meters double precision CHECK (match_distance_meters >= 0 AND match_distance_meters <= 50),
  CONSTRAINT observations_source_external_key UNIQUE (source_id, external_id),
  CONSTRAINT observations_import_distance CHECK ((batch_id IS NULL) = (match_distance_meters IS NULL)),
  CONSTRAINT observations_source_origin_fkey FOREIGN KEY (source_id, origin)
    REFERENCES sonora.sources (id, origin),
  -- Cada observação vem de exatamente um canal: dispositivo IoT ou lote de importação.
  CONSTRAINT observations_single_channel CHECK ((device_id IS NULL) <> (batch_id IS NULL))
);

CREATE INDEX observations_location_period_idx ON sonora.observations (location_id, origin, observed_at);
CREATE INDEX observations_device_period_idx ON sonora.observations (device_id, observed_at) WHERE device_id IS NOT NULL;
CREATE INDEX observations_batch_idx ON sonora.observations (batch_id) WHERE batch_id IS NOT NULL;

CREATE TABLE sonora.ml_summaries (
  id uuid PRIMARY KEY,
  model_version text NOT NULL CHECK (char_length(model_version) BETWEEN 1 AND 200),
  dataset_sha256 text NOT NULL CHECK (dataset_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'
    AND payload ->> 'modelVersion' = model_version
    AND payload ->> 'datasetSha256' = dataset_sha256),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_summaries_model_dataset_key UNIQUE (model_version, dataset_sha256)
);

-- Menor privilégio do runtime Java (os GRANTs padrão vêm da V1):
-- observações e resumos ML são imutáveis; dispositivos só atualizam o último recebimento.
REVOKE UPDATE, DELETE, TRUNCATE ON sonora.observations FROM sonora_ingest;
REVOKE UPDATE, DELETE, TRUNCATE ON sonora.ml_summaries FROM sonora_ingest;
REVOKE DELETE, TRUNCATE ON sonora.import_batches, sonora.locations, sonora.sources FROM sonora_ingest;
REVOKE UPDATE, DELETE, TRUNCATE ON sonora.devices FROM sonora_ingest;
GRANT UPDATE (last_received_at) ON sonora.devices TO sonora_ingest;
