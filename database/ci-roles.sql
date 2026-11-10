-- Somente PostgreSQL descartável de testes. Nunca executar na VM de deploy.
CREATE ROLE sonora_migrator LOGIN PASSWORD 'ci-migration-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE sonora_ingest LOGIN PASSWORD 'ci-ingest-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE sonora_query LOGIN PASSWORD 'ci-query-only' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE sonora OWNER TO sonora_migrator;
REVOKE ALL ON DATABASE sonora FROM PUBLIC;
GRANT CONNECT ON DATABASE sonora TO sonora_migrator, sonora_ingest, sonora_query;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
