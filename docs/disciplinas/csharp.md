# C# — API principal de ruído

**Responsável:** Leonardo Correa de Mello, RM555573. **Dependências:** contrato v0.1; pode começar sem SOA, Mobile, IoT ou ML prontos.

## Exigência do professor

PDF p. 30 e tarefa coletada em 06/11: Web API/Minimal API .NET, POO, interfaces, DI, EF Core + LINQ, async/await, testes unitários, Swagger/Scalar, README com descrição, nomes/RMs e evidências; enviar GitHub.

| Critério | Pontos | Aplicação/evidência proposta |
| --- | --- | --- |
| POO | 3,0 | Entidades encapsuladas, regras de observação e serviços com responsabilidade clara |
| Web API | 2,5 | Rotas documentadas, DTOs, status e tratamento de erros |
| EF Core + LINQ | 1,5 | Persistência, filtros, paginação, relações e restrição de unicidade |
| Async/await | 1,0 | I/O assíncrono com cancelamento e sem bloqueio desnecessário |
| Qualidade | 2,0 | DI, interfaces úteis, organização, testes e ausência de segredos |

## Proposta de implementação

Stack: .NET 10 + EF Core/SQLite, SDK e dependências fixados. Confirmar versão de aula antes de criar o projeto. Pasta proposta: api/; não existe implementação ainda.

Implementar as entidades Source, Point, Device, Observation e MlSummary do [contrato](../03-integracao.md). A API principal é a fonte de verdade do catálogo e das medições. Usar interfaces como IObservationRepository e IAcousticProfileService onde houver função concreta; não criar camadas vazias só para demonstrar conceitos.

POO pode aparecer em regras polimórficas para entrada de dispositivo e importação pública, que validam procedência diferente. Herança não deve permitir que um cliente altere a origem de um registro. Migrations criam banco vazio; seed idempotente cria três pontos explicitamente fictícios, dispositivos e histórico sintético para comparar dois pontos. Uma simulação Wokwi efetiva pode usar apenas um deles.

## Passos de trabalho

1. Criar projeto, migrations, seed e health/live e health/ready.
2. Implementar listagem/detalhe de pontos e filtros geográficos limitados.
3. Implementar ingestão com autenticação vinculada ao dispositivo e deduplicação.
4. Implementar observações/perfil com período, origem e cobertura explícitos.
5. Implementar recepção de lote administrativo real; respeitar resultados por item.
6. Servir /painel com tabela/lista de pontos, gráficos simples ou valores por período, dispositivos stale e proveniência. Não exigir outro projeto frontend.
7. Implementar importação por comando do resumo ML e consulta do resumo.
8. Fechar OpenAPI, testes e pacote hospedável para Pedro.

Pode usar SQLite em desenvolvimento e na VM; banco fora da pasta publicada. Leitura pública só em modo demonstração, sem PII. Escritas protegidas, chaves fora de Git/logs. Não implementar faturamento, cadastro de moradores ou geocoding.

## Critérios de aceite e testes

| Cenário | Resultado |
| --- | --- |
| Ingestão autorizada válida | 201 e registro consultável |
| Reenvio idêntico / conflitante | 200 duplicate=true / 409, sem duplicação |
| Chave inválida / dispositivo de outro escopo | 401 / 403 |
| Campo inválido, NaN ou duração inválida | Rejeição documentada, sem persistência |
| Dois níveis 60/70, mesma duração | Perfil aproximadamente 67,40, não 65 |
| Perfil sem observações | no_data, métrica nula, não 0 dB |
| Origens distintas | Nunca combinadas num mesmo agregado |
| Horários, bordas de bin e sobreposição | Duração correta e séries separadas quando necessário |
| Reinício | Banco, pontos e observações preservados |
| Falha de banco | ready=503; resposta sem stack trace/segredo |

Cobrir regras de domínio com testes unitários; integração HTTP/EF com banco temporário SQLite real valida persistência e unicidade. Mostrar LINQ e async em trechos reais, além do resultado. Não chamar endpoint de integração validado antes da execução.

## Handoff e entrega

**Meta 10/11:** commit compilável com banco, seed, healthchecks, /pontos e ingestão, runtime/porta, .env.example e procedimento de migrations. Não esperar o produto inteiro para destravar Linux.

**Meta 13/11:** perfil e lote compatíveis com Mobile/SOA. **Meta 16/11:** painel e resumo ML integrados quando disponíveis.

Entregar api/README.md, build/publish e execução fora da IDE, especificação OpenAPI, testes, evidências e nomes/RMs. Seguir o [handoff para Linux](../03-integracao.md). Responsabilidade de C# inclui a página web de demonstração; Swagger sozinho não substitui a visualização proposta.

## Pendências

Versão de aula e confirmação dos endpoints pelo grupo. Reaproveitamento com SOA não foi autorizado; esta ficha não depende disso.

## Organização no monorepo

Pasta `api/`; branch `leo/csharp`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.2.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.
