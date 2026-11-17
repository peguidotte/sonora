-- SEED SINTÉTICO DE DESENVOLVIMENTO. Nunca aplicar na Azure.
-- Espelha contracts/fixtures (location.json, devices.json, observations.json e a fonte de profile.json)
-- para que C#, Mobile e IoT rodem standalone contra o mesmo PostgreSQL sem o Java ativo.

INSERT INTO sonora.sources (id, name, source_url, snapshot_date, license, origin, limitations)
VALUES ('22222222-2222-4222-8222-222222222222', 'Shared synthetic dataset', 'https://example.invalid/fixtures',
        DATE '2026-11-08', 'Synthetic project fixture', 'simulated',
        '["Not a physical sound measurement."]'::jsonb);

INSERT INTO sonora.locations (id, name, city, latitude, longitude, is_demo)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Demo location A', 'São Paulo', -23.56, -46.65, true);

INSERT INTO sonora.devices (id, location_id, source_id, name, enabled, method, calibration_status, last_received_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '22222222-2222-4222-8222-222222222222', 'Demo device A', true, 'wokwi_linear_demo', 'simulated',
        TIMESTAMPTZ '2026-11-08T15:00:00Z');

INSERT INTO sonora.observations (id, source_id, origin, location_id, device_id, producer_id, session_id, external_id,
                                 observed_at, received_at, duration_seconds, laeq_db_a, method, calibration_status)
VALUES
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'simulated',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111', 'demo-a-boot-001', 'fixture-a-1',
   TIMESTAMPTZ '2026-11-08T15:00:00Z', TIMESTAMPTZ '2026-11-08T15:00:00Z', 5, 60, 'wokwi_linear_demo', 'simulated'),
  ('33333333-3333-4333-8333-333333333334', '22222222-2222-4222-8222-222222222222', 'simulated',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111', 'demo-a-boot-001', 'fixture-a-2',
   TIMESTAMPTZ '2026-11-08T15:00:05Z', TIMESTAMPTZ '2026-11-08T15:00:05Z', 5, 70, 'wokwi_linear_demo', 'simulated');
