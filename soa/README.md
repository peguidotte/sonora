# Ingestão Java, migrations e views

Responsável: **Felipe Soares Xavier, RM556931**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/soa.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: PostgreSQL + migrations/seed/arquivos locais, sem API C# ativa.

Build, configuração e publicação devem seguir o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações); caminhos e toolchain ficam em [pipeline.json](../deploy/pipeline.json). Manter migrations/views/seed no [módulo database/](../database/README.md), parte da entrega de SOA, com execução independente dos projetos Java/C# e reutilizável por CI/Linux.

## Starter técnico

Base Java 21/Maven, Spring Boot, JPA/PostgreSQL, healthchecks e springdoc. Não contém entidades, repositórios, ingestão, importações ou tabelas/views/seed de negócio. **Felipe desenvolve a entrega**, incluindo as próximas migrations em `database/`, conforme a ficha e os contratos. Os testes atuais cobrem somente a base operacional.

Requer JDK 21, Maven 3.9+, PostgreSQL 16 preparado por [database/](../database/README.md) e um arquivo de [credenciais locais](../contracts/README.md#credenciais-locais-dos-starters). Na raiz do clone, PowerShell, usando exclusivamente o banco descartável do Compose:

```powershell
$env:SONORA_DB_PASSWORD = 'ci-ingest-only'
$env:SONORA_KEYS_FILE = "$PWD/output/dev/soa-keys.json"
mvn -B -f soa/pom.xml verify
java -jar soa/target/sonora-ingestion-0.1.0-SNAPSHOT.jar
```

Padrões locais: `SONORA_DB_HOST=127.0.0.1`, `SONORA_DB_PORT=55432`, `SONORA_DB_NAME=sonora`, `SONORA_DB_USER=sonora_ingest`; senha sem padrão. `SONORA_HTTP_HOST=127.0.0.1` e `SONORA_HTTP_PORT=8082`. Sobrescrever por variáveis; `SPRING_DATASOURCE_*` e `SERVER_ADDRESS/PORT` têm precedência quando presentes. Na Azure, o provisionamento já fornece porta de banco 5432 e credenciais próprias.

Rotas disponíveis em `/api/ingestion/v1`: `GET /health/live` anônimo; `GET /health/ready` e `GET /openapi.json` exigem `X-Api-Key` com `operations:read`. Ready retorna 200 com banco acessível ou 503 sem conexão; **não certifica o domínio/views ainda ausentes**. A documentação automática descreve apenas o que existe; o OpenAPI de `contracts/` continua sendo o alvo completo da entrega.

Hibernate usa `ddl-auto=validate`, schema `sonora`; inicialização SQL e Flyway da aplicação desativados. Não adicionar migrations ao JAR nem usar `update/create` no Hibernate: executar a CLI independente antes do serviço. Com entidades futuras, Hibernate validará seus mapeamentos contra o banco preparado.

`OperationalAccess` libera somente as rotas operacionais explícitas. Ao criar ingestão/importações, Felipe deve ampliar a autorização com os respectivos escopos e vínculo de dispositivo, além de validar DTOs/regras; a chave operacional não deve autorizar escrita automaticamente. Remover uma chave do arquivo revoga o acesso na próxima requisição; fixtures `mock-*` não autenticam.

`mvn verify` gera um único JAR executável em `target/`, consumido pelo pipeline sem C# ativo. A CI deve continuar bloqueando publicação até as migrations de domínio/views passarem no checker; compilar o starter não significa entrega integrada ou deploy concluído.
