-- SEED DE DESENVOLVIMENTO para demonstrar a importação real do NoiseCapture. Nunca aplicar na Azure.
-- A fonte descreve o dump público real; os locais são de DEMONSTRAÇÃO (is_demo=true), posicionados onde
-- o recorte São Paulo do dump de 08/11/2026 tem pontos a até 50 m (contagem no README de soa/).
-- Não representam cobertura do bairro nem foram escolhidos pela equipe como recorte final do produto.

INSERT INTO sonora.sources (id, name, source_url, snapshot_date, license, origin, limitations)
VALUES ('55555555-5555-4555-8555-555555555555', 'NoiseCapture Brazil dump', 'https://data.noise-planet.org/dump/Brazil.zip',
        DATE '2026-11-08', 'ODbL 1.0 (NoiseCapture / Noise-Planet)', 'public_dataset',
        '["Crowdsourced smartphone measurements; calibration unknown.", "Historical points; no continuous coverage.", "Points of the same track are correlated."]'::jsonb);

INSERT INTO sonora.locations (id, name, city, latitude, longitude, is_demo)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Demo location B (Paulista area)', 'São Paulo', -23.546, -46.658, true),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Demo location C (Paulista area)', 'São Paulo', -23.542, -46.650, true);
