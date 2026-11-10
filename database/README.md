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

## Compatibilidade API/banco

`contracts/database.json` também define `writeModels`: vínculo explícito entre propriedades de requests OpenAPI e colunas de armazenamento, além das colunas preenchidas pelo servidor. As views de leitura continuam em `readViews`. Atualizar esse mapeamento e os contratos no mesmo PR que altera API/SQL; não inferir vínculos automaticamente a partir dos nomes.

Depois de migrar um PostgreSQL descartável, executar com as variáveis PG do usuário `sonora_migrator`:

```bash
python tools/check_database_compatibility.py --baseline-ref origin/main
```

O script consulta o catálogo real em modo somente leitura, com timeout. Bloqueia incompatibilidade de tipos suportados, API que aceita texto maior que `varchar(n)`, API sem limite para coluna limitada, null/opcional incompatível com `NOT NULL`, coluna obrigatória nova sem origem/default e remoção/renomeação/exposição de colunas nas views. Na leitura, a direção se inverte: a capacidade de saída do banco deve caber no limite declarado da resposta. O contrato anterior também é conferido para preservar consumidores ainda rodando; reduzir os dois limites no mesmo PR não elimina essa verificação. SQL de migrations já publicado na baseline não pode ser editado/removido: criar uma nova versão, preservando o histórico do Flyway.

Saídas: `0` sem incompatibilidade detectada no escopo, `1` incompatível e `2` verificação incompleta/erro. O relatório inclui `checkedFields` e pendências. Durante o bootstrap, `--allow-unimplemented` permite relações inteiras ainda ausentes, mas não ignora incompatibilidades de relações existentes nem campos HTTP sem mapeamento. A CI usa essa opção somente enquanto não houver projeto de aplicação; com C# ou SOA presentes, todas as relações contratadas são exigidas. Sem baseline configurada, não há verificação da versão anterior.

O checker compara **contratos e catálogo**, não as classes/validações efetivas dos serviços. Expressões `CHECK`, transformações, nullabilidade de expressões/joins em views, valores JSON e regras de negócio precisam de testes de integração/HTTP. As APIs devem testar valor no limite e acima dele, respostas e validação efetiva, inclusive strings Unicode. Não corrigir divergência truncando dados silenciosamente nem tratar `checkedFields=0` com pendências como banco integrado aprovado.

Regressões unitárias e PostgreSQL reais ficam em `tools/test_database_compatibility.py`. A CI executa `test_database*.py`; testes que alteram SQL usam apenas schemas de laboratório gerados e descartados no banco de testes.

## Deploy

O [pipeline](../deploy/azure/README.md) publica um artefato `database` com SQL/configuração/CLI, independente de SOA/C#. Na VM: backup, aplicação como usuário migrador e confirmação de sucesso; depois são publicados os serviços. Falha de migration interrompe o deploy. O retorno de um binário não desfaz alterações de schema/dados; backup é preservado. O provisionamento Linux continua responsável por instalar PostgreSQL e criar banco/roles; as tabelas e views ficam neste módulo.
