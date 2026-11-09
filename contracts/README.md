# Contratos compartilhados v0.3.0

- [OpenAPI C#](openapi/csharp.openapi.json): rotas, campos, status e exemplos.
- [OpenAPI SOA](openapi/soa.openapi.json): lotes e histórico de importação.
- [Schema de resumo ML](schemas/ml-summary.schema.json).
- [Fixtures compartilhadas](fixtures/) — todas sintéticas.
- [Regras de negócio](../docs/regras-de-negocio.md).
- [Visão rápida das duas APIs](../docs/api-overview.md) e [acesso privado](../docs/api-security.md).
- [Integração, propriedade dos dados e deployment handoff](../docs/03-integracao.md).

Formato OpenAPI 3.1 em JSON; pode ser carregado em ferramentas Swagger/Scalar compatíveis. Exemplos são acordo de interface, não prova de backend implementado. As implementações devem exportar OpenAPI equivalente e executar seus próprios testes de regras e persistência.

## Mock HTTP de desenvolvimento

Instalar requirements-dev.txt no ambiente virtual, conforme CONTRIBUTING.md. Em terminais separados:

```bash
python tools/mock_server.py --service csharp --port 4010
python tools/mock_server.py --service soa --port 4011
```

Ativar o venv antes ou usar seu executável Python. C# mock: http://127.0.0.1:4010/dashboard (HTML vazio) e /openapi.json (credencial de operador); SOA mock: http://127.0.0.1:4011/openapi.json (operador SOA).

Para aparelho/emulador, configure host acessível; se usar --host 0.0.0.0, limite a rede ao laboratório. Não fazer deploy público do mock como produto. O mock valida somente credenciais públicas da fixture, escopo, dispositivo e formato; não oferece autenticação de produção, persistência ou idempotência. Respostas de POST são estáticas e não alteram GET.

Header único: X-Api-Key. Credenciais **apenas do mock**, sem validade em deploy:

| Chave fictícia | Serviço | Permissões |
| --- | --- | --- |
| mock-consumer-key | C# | acoustics:read |
| mock-device-key | C# | observations:write, somente dispositivo da fixture |
| mock-import-key | C# | imports:write |
| mock-operator-key | C# | acoustics:read e operations:read |
| mock-soa-operator-key | SOA | imports:manage e operations:read |

GET de dados sem chave retorna 401; chave válida sem permissão retorna 403. Liveness e HTML vazio são exceções sem dados. Não enviar chave por query string. Em produção/local real, gerar credenciais fora do código e rejeitar estas fixtures.

Perfil exige from/to/origin. Exemplo:

```bash
curl -H "X-Api-Key: mock-consumer-key" "http://127.0.0.1:4010/api/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated"
```

Somente no mock, scenario=empty seleciona o exemplo de ausência. Para origin=public_dataset, o mock retorna sem dados, preservando a distinção de origem. Esses controles auxiliares não são parâmetros da API real.

Use fixtures locais no Mobile, mocks HTTP no SOA e o mock de C# para formato de envio do circuito. A demonstração acadêmica final de cada backend exige sua implementação própria e seu banco; este servidor não a substitui.

## Validação

```
python tools/validate_contracts.py
python -m unittest discover -s tools -p "test_*.py" -v
```

O validador confere documentos, exemplos, schema ML e presença de autenticação/escopo/401/403 em cada operação privada. Não valida cálculos ou regras relacionais por si só; elas precisam de testes nas implementações. Especificações docentes prevalecem sobre decisões técnicas do contrato.

## Alterações incompatíveis em v0.3.0

Rotas/contratos técnicos padronizados em inglês, Location/locationId substituindo Point/pointId, resultados ML em ml/output/summary.json e remoção dos caminhos antigos. O header X-Api-Key substitui os headers específicos antigos. Todas as leituras de dados passam a ser privadas. Atualizar consumidores antes de integrar; não depender de alias legado.
