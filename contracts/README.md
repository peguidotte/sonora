# Contratos do Sonora

Versão verificável: **0.4.0**. Decisões de negócio/execução estão na [arquitetura](../docs/arquitetura.md); a rubrica permanece nas [fichas](../docs/disciplinas/README.md). Cada interface tem uma única fonte:

| Arquivo | Autoridade |
| --- | --- |
| [C# OpenAPI](openapi/csharp.openapi.json) | Consulta privada /api/sonora/v1; somente GET |
| [Java OpenAPI](openapi/soa.openapi.json) | Ingestão /api/ingestion/v1, observações e batches Sonora |
| [database.json](database.json) | PostgreSQL, ownership SOA, roles e views publicadas para C# |
| [Schema ML](schemas/ml-summary.schema.json) | Artefato summary.json, importado administrativamente pelo Java |
| [fixtures/](fixtures/) | Exemplos sintéticos de formatos; nunca dado real/resultado de treino |

OpenAPI contém requests/responses, validações estruturais, escopos e erros. SQL usa nomes snake_case em inglês, HTTP usa camelCase. database.json define interface e permissões esperadas, **não** implementa migrations/GRANTs: Felipe mantém esses artefatos em database/ como parte de SOA; Pedro os aplica em etapa independente das aplicações. A base inicial de schemas está implementada; domínio/views/seed continuam pendentes. C# não tem rota de ingestão, migração ou entrega HTTP de lotes. Importações contam dados commitados no PostgreSQL.

## Mocks de desenvolvimento

Instalar requirements-dev.txt conforme README principal. Em terminais separados, com o Python do ambiente virtual:

```bash
python tools/mock_server.py --service csharp --port 4010
python tools/mock_server.py --service soa --port 4011
```

API_BASE_URL/SOA_BASE_URL são a origem, como http://127.0.0.1:4010; os paths OpenAPI incluem o prefixo completo. Exemplos:

```bash
curl -H "X-Api-Key: mock-consumer-key" "http://127.0.0.1:4010/api/sonora/v1/locations"
curl -H "X-Api-Key: mock-soa-operator-key" "http://127.0.0.1:4011/api/ingestion/v1/sonora/batches"
```

Documentação dos mocks: /api/sonora/v1/openapi.json com operador C# e /api/ingestion/v1/openapi.json com operador Java. /dashboard é somente HTML vazio. Para cenário sem observação, o mock aceita scenario=empty na consulta do perfil; esse parâmetro não existe no backend real.

Header X-Api-Key. Valores **públicos somente do mock**, definidos em mock-credentials.json:

| Chave | Serviço | Escopo |
| --- | --- | --- |
| mock-consumer-key | C# | acoustics:read |
| mock-operator-key | C# | acoustics:read e operations:read |
| mock-device-key | Java | observations:write, restrito ao deviceId da fixture |
| mock-soa-operator-key | Java | imports:manage e operations:read |

Sem chave/valor desconhecido -> 401; chave válida sem escopo/dispositivo -> 403. Os serviços reais nunca aceitam essas fixtures. Mock não grava, aplica migrations, autentica em produção ou comprova idempotência; POST tem resposta estática e não altera GET. Com origin=public_dataset, os mocks não fabricam dados reais e respondem ausência. Não implantar o mock como produto.

## Validação e evolução

```bash
python tools/validate_contracts.py
python -m unittest discover -s tools -p "test_*.py" -v
```

Verificações cobrem formas OpenAPI/exemplos, schema ML, mapeamento das views/roles e consistência da divisão Java/C#. Aplicar PostgreSQL/GRANTs e executar os serviços/testes de integração reais continuam responsabilidade das entregas. O read model expõe deviceId ausente quando o banco for nulo; estado do dispositivo e distância são calculados pelo C#, não campos obrigatórios da view. Resumo ML devolve o payload validado, sem achatar colunas internas.

Mudança incompatível de HTTP ou view atualiza a versão, fixtures e consumidores no mesmo PR; não criar documentos paralelos de contrato. O histórico anterior está no Git. Migrations/seed locais de database/ devem permitir C# standalone sem manter o Java ativo.
