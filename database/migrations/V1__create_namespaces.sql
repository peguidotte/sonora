-- Base técnica. Tabelas, views e seed do domínio serão desenvolvidos em SOA.
CREATE SCHEMA sonora;
CREATE SCHEMA sonora_read;
REVOKE ALL ON SCHEMA sonora, sonora_read FROM PUBLIC;
GRANT USAGE ON SCHEMA sonora TO sonora_ingest;
GRANT USAGE ON SCHEMA sonora_read TO sonora_ingest, sonora_query;
ALTER DEFAULT PRIVILEGES IN SCHEMA sonora
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sonora_ingest;
ALTER DEFAULT PRIVILEGES IN SCHEMA sonora
  GRANT USAGE, SELECT ON SEQUENCES TO sonora_ingest;
ALTER DEFAULT PRIVILEGES IN SCHEMA sonora_read
  GRANT SELECT ON TABLES TO sonora_ingest, sonora_query;
