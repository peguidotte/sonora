# Contratos compartilhados v0.2.0

- [OpenAPI C#](openapi/csharp.openapi.json): rotas, campos, status e exemplos.
- [OpenAPI SOA](openapi/soa.openapi.json): lotes e histórico de importação.
- [Schema de resumo ML](schemas/ml-summary.schema.json).
- [Fixtures compartilhadas](fixtures/) — todas sintéticas.
- [Regras de negócio](../docs/regras-de-negocio.md).
- [Integração, propriedade dos dados e deployment handoff](../docs/03-integracao.md).

Formato OpenAPI 3.1 em JSON; pode ser carregado em ferramentas Swagger/Scalar compatíveis. Exemplos são acordo de interface, não prova de backend implementado. As implementações devem exportar OpenAPI equivalente e executar seus próprios testes de regras e persistência.

## Mock HTTP de desenvolvimento

Instalar requirements-dev.txt no ambiente virtual, conforme CONTRIBUTING.md. Em terminais separados:

```bash
python tools/mock_server.py --service csharp --port 4010
python tools/mock_server.py --service soa --port 4011
```

Ativar o venv antes ou usar seu executável Python. C# mock: http://127.0.0.1:4010/openapi.json e /painel; SOA mock: http://127.0.0.1:4011/openapi.json.

Para aparelho/emulador, configure host acessível; se usar --host 0.0.0.0, limite a rede ao laboratório. Não fazer deploy público do mock como produto. Escritas verificam somente presença de credencial fictícia e formato; **não** autenticação real, persistência, idempotência ou integração de negócio. Respostas de POST são estáticas e não alteram GET.

Perfil exige from/to/origin. Exemplo:

```
http://127.0.0.1:4010/api/v1/pontos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/perfil?from=2026-11-08T15:00:00Z&to=2026-11-08T15:01:00Z&origin=simulated
```

Somente no mock, scenario=empty seleciona o exemplo de ausência. Para origin=public_dataset, o mock retorna sem dados, preservando a distinção de origem. Esses controles auxiliares não são parâmetros da API real.

Use fixtures locais no Mobile, mocks HTTP no SOA e o mock de C# para formato de envio do circuito. A demonstração acadêmica final de cada backend exige sua implementação própria e seu banco; este servidor não a substitui.

## Validação

```
python tools/validate_contracts.py
python -m unittest discover -s tools -p "test_*.py" -v
```

O validador confere os documentos e exemplos, incluindo o schema de ML. Não valida cálculos ou regras relacionais por si só; elas precisam de testes nas implementações. Especificações docentes prevalecem sobre decisões técnicas do contrato.
