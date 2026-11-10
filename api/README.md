# Consulta acústica .NET e painel

Responsável: **Leonardo Correa de Mello, RM555573**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/csharp.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: PostgreSQL + schema/seed comum, sem Java HTTP ativo.

Build, configuração e publicação devem seguir o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações); caminhos e toolchain ficam em [pipeline.json](../deploy/pipeline.json). Preparar o banco com o [módulo database/](../database/README.md), sem criar schema concorrente no C#.

## Starter técnico

Base .NET 10 com EF Core/Npgsql, contexto vazio somente leitura, healthchecks e OpenAPI gerado das rotas implementadas. Não contém entidades, consultas, cálculos, painel ou rotas de negócio. **Leonardo desenvolve a entrega** conforme a ficha e os contratos; os testes atuais cobrem somente a base operacional.

Requer SDK .NET 10, PostgreSQL 16 preparado por [database/](../database/README.md) e um arquivo de [credenciais locais](../contracts/README.md#credenciais-locais-dos-starters). Na raiz do clone, PowerShell, usando exclusivamente o banco descartável do Compose:

```powershell
$env:SONORA_DB_PASSWORD = 'ci-query-only'
$env:SONORA_KEYS_FILE = "$PWD/output/dev/api-keys.json"
dotnet test api/Sonora.Api.Tests -c Release
dotnet run --project api/Sonora.Api
```

Padrões locais: `SONORA_DB_HOST=127.0.0.1`, `SONORA_DB_PORT=55432`, `SONORA_DB_NAME=sonora`, `SONORA_DB_USER=sonora_query`; senha sem padrão. `SONORA_HTTP_HOST=127.0.0.1` e `SONORA_HTTP_PORT=8080`. Sobrescrever por variáveis de ambiente; `ConnectionStrings__Sonora` e `ASPNETCORE_URLS` têm precedência quando presentes. Na Azure, o provisionamento já fornece porta de banco 5432 e credenciais próprias.

Rotas disponíveis em `/api/sonora/v1`: `GET /health/live` anônimo; `GET /health/ready` e `GET /openapi.json` exigem `X-Api-Key` com `operations:read`. Ready retorna 200 com banco acessível ou 503 sem conexão; **não certifica o domínio/views ainda ausentes**. A documentação automática descreve apenas o que existe; o OpenAPI de `contracts/` continua sendo o alvo completo da entrega.

Mapear as views em `SonoraReadContext` com `ToView(..., "sonora_read")`, sem `EnsureCreated`, `Migrate` ou migrations EF. O papel PostgreSQL impede escrita. Cada rota futura deve declarar `RequiredScope` adequado e validar DTOs/regras conforme o contrato; a proteção nega endpoints novos sem escopo. O starter não implementa autenticação comercial ou rotas de ingestão.

Build de deploy: `dotnet publish api/Sonora.Api -c Release -r linux-arm64 --self-contained true -o output/api`. O pipeline usa o mesmo projeto e testes, sem depender do Java ativo. A CI deve continuar bloqueando publicação até as migrations de domínio/views passarem no checker; compilar o starter não significa entrega integrada ou deploy concluído.
