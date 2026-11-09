# SOA — serviço de importação acústica

**Responsável:** Felipe Soares Xavier, RM556931. **Dependências:** linguagem/framework de aula; pode usar mock HTTP da API principal até ela existir.

## Exigência do professor

PDF p. 27: backend em qualquer linguagem, domínio estruturado, banco, migrations, documentação automática e testes automatizados. GitHub, README com execução/integrantes e evidências.

| Critério | Pontos | Aplicação proposta |
| --- | --- | --- |
| Domínio | 3,0 | Lote, fonte, validação e estados de entrega |
| Banco | 3,0 | Histórico de importações e resultados persistidos |
| Migrations | 1,5 | Preparar schema a partir de banco vazio |
| Documentação | 1,5 | OpenAPI automática dos endpoints de lote |
| Testes | 1,0 | Regras e integração com persistência/receptor |

## Proposta de implementação

Backend separado do C#, na linguagem usada em aula; SQLite próprio. Pasta proposta soa/. Não escolher framework sem conhecer a base que o colega domina.

Esse serviço transforma um subconjunto do NoiseCapture em observações aceitas pela API principal, valida e registra o resultado. É uma responsabilidade útil para a plataforma e permite entrega independente. A rubrica não exige microserviços: a separação é nossa estratégia de organização, que pode ser revista com os professores.

Domínio mínimo: DatasetFile (arquivo permitido), ImportBatch e ImportItemResult. Estados propostos: created, validated, delivering, completed, failed e completed_with_errors. Guardar hash, fonte, contagens e erro sanitizado; não registrar o GeoJSON completo nos logs.

## Fluxo e endpoints

1. Selecionar pequeno arquivo local de exemplo derivado de dados públicos, preservando atribuição. Cadastrar fileId e caminho pela configuração do operador.
2. POST /api/v1/batches com fileId cria lote e valida entrada; o mapeamento aprovado de locais fica na configuração do arquivo.
3. Ler coordenadas/timestamps/nível/duração, transformar UTC e marcar public_dataset.
4. Associar cada observação a ponto amostral documentado por critério de proximidade; sem correspondência, rejeitar/contabilizar em vez de deslocar coordenadas.
5. Dividir em lotes de até 100 e enviar ao C# por HTTP administrativo.
6. Persistir resultado por item e contagens; GET /api/v1/batches e /{id} mostram o resultado.
7. Reiniciar e comprovar histórico preservado.

Não aceitar URL arbitrária ou caminho livre na requisição. Envio com timeout e poucas tentativas limitadas. Reprocessamento usa externalId estável, sem duplicar no destino. Uma falha parcial deve distinguir recebido, aceito e entregue: marcar lote criado não comprova entrega.

## Aceite e testes

- Arquivo permitido e válido produz observações compatíveis com o contrato.
- ID de arquivo desconhecido, formato inválido, data ou coordenada inválida não provocam importação silenciosa.
- Repetição não duplica histórico lógico nem observações no receptor.
- API principal indisponível gera estado de falha/retry visível, com timeout limitado.
- Rejeição parcial do receptor mantém contagens e detalhes consistentes.
- Migrations executam em banco vazio; reinício mantém lote consultável.
- OpenAPI mostra requests, responses e erros; testes automatizados usam receptor HTTP controlado e SQLite temporário.

## Handoff e entrega

**Meta 10/11:** OpenAPI de lotes, migrations e validador com um pequeno fixture público documentado. **Meta 13/11:** envio real ao C# e reenvio idempotente.

Entregar README, nomes/RMs, .env.example com API_BASE_URL e CORE_API_IMPORT_KEY sem valor, comandos, migrations, evidências e relatório de lote. Informar ao responsável C# os campos normalizados; fornecer ao Testing um lote válido e outro com erros.

O objetivo do grupo é hospedar C# e SOA integrados na Azure. Pela rubrica de Linux, hospedar C# continua o mínimo obrigatório; o deploy SOA também será planejado e coordenado com Pedro. SOA mantém execução local com banco próprio e receptor mock para contingência.

## Pendências

Linguagem/framework de aula. Se os professores autorizarem backend comum, o grupo pode simplificar sem perder evidências específicas; não presumir essa autorização.

## Organização no monorepo

Pasta `soa/`; branch `felipe/soa`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.3.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.

## Contratos privados

X-Api-Key do operador SOA: imports:manage para /api/v1/batches e operations:read para readiness/docs. A requisição POST /api/v1/batches recebe somente fileId; mapeamento geográfico permitido fica na configuração do arquivo, não em campo HTTP livre. Para enviar ao C#, usar CORE_API_IMPORT_KEY com imports:write, diferente da chave SOA. Rotas/JSON/erros em inglês, contrato v0.3.0. Testar 401/403 e não publicar OpenAPI operacional sem proteção no deploy.
