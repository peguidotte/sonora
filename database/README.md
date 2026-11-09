# Migrations compartilhadas do Sonora

Módulo de banco independente dos projetos Java/C#. Responsável acadêmico: **Felipe Soares Xavier, RM556931 (SOA)**; Leonardo revisa a interface de leitura. A rubrica e as evidências continuam na [ficha de SOA](../docs/disciplinas/soa.md). Este módulo não é uma nona disciplina nem uma aplicação web.

Uma sequência de SQL em `migrations/`, executada pelo Flyway CLI com `sonora_migrator`. Versão, origem e SHA-256 do runtime estão em `toolchain.json`; `prepare.py` verifica a distribuição oficial e prepara a CLI/JDBC PostgreSQL em `output/tools/flyway`. Requer Java 21, fornecido pelo host/CI, sem build ou JAR das aplicações. Bibliotecas/licenças são distribuídas no artefato, fora do Git.

## Reprodução sem aplicações ou Azure

Pré-requisitos: Python 3.12+ e Docker Compose. Na raiz do clone:

```bash
python database/prepare.py
docker compose -p sonora-local -f database/compose.yaml up -d --wait postgres
docker compose -p sonora-local -f database/compose.yaml run --rm migrate
docker compose -p sonora-local -f database/compose.yaml run --rm migrate validate
docker compose -p sonora-local -f database/compose.yaml down
```

Esse Compose cria um PostgreSQL descartável com senhas públicas de CI, acessível no host em `127.0.0.1:55432`. Nunca usar essas contas/arquivo `ci-roles.sql` na Azure. `down` encerra o laboratório; não armazene dados importantes nele.

Com PostgreSQL e Java 21 locais, exportar `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER=sonora_migrator` e `PGPASSWORD` fora do Git e executar `bash database/migrate.sh`. `FLYWAY_HOME` permite selecionar um runtime preparado; padrão `output/tools/flyway`. A mesma interface vale no CI e na VM. O comando expõe apenas `migrate`, `validate` e `info`, sem senha em argumentos; não executa `clean`, `repair` ou `baseline`.

## Evolução e testes

`V1__create_namespaces.sql` prepara somente os schemas e permissões padrão. **Tabelas, views e seed do domínio ainda serão desenvolvidos pelo Felipe**, conforme [database.json](../contracts/database.json). Histórico Flyway fica em `sonora_meta`, fora da interface de leitura. Qualificar objetos de domínio como `sonora.nome` e views como `sonora_read.nome`; não usar o schema padrão `sonora_meta` para tabelas da aplicação. Runtime Java usa `sonora_ingest`; C# usa `sonora_query`; nenhum aplica migrations. As views devem cumprir o contrato e expor somente campos permitidos.

Criar novas versões `V2__...sql`, `V3__...sql`; preservar migrations já aplicadas e coordenar numeração/revisão. Mudanças devem preservar serviços que ainda estejam rodando. Seed sintético de demonstração deve ser explícito e separado das migrations de produção em `seeds/dev/` quando implementado; não importar fixtures de ML como resultado real nem carregar seed automaticamente na Azure.

Os testes de integração em `tools/test_database.py` verificam reexecução, permissões, checksum alterado e rollback de SQL que falha. Em PostgreSQL descartável, com variáveis PG e Java/psql/Bash configurados:

```bash
SONORA_DATABASE_TESTS=1 python -m unittest discover -s tools -p 'test_database.py' -v
```

Essa opção cria objetos temporários e provoca falha controlada em cópias das migrations; usar exclusivamente banco de testes. A CI prepara as mesmas contas em PostgreSQL 16 e executa estes testes antes dos builds. Testes sem a opção declaram a integração como pulada, sem presumir aprovação.

## Deploy

O [pipeline](../deploy/azure/README.md) publica um artefato `database` com SQL/configuração/CLI, independente de SOA/C#. Na VM: backup, aplicação como usuário migrador e confirmação de sucesso; depois são publicados os serviços. Falha de migration interrompe o deploy. O retorno de um binário não desfaz alterações de schema/dados; backup é preservado. O provisionamento Linux continua responsável por instalar PostgreSQL e criar banco/roles; as tabelas e views ficam neste módulo.
