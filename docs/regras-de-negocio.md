# Regras de negócio — contrato v0.2.0

Fonte de verdade da proposta: este arquivo, docs/03-integracao.md e contracts/openapi/. Sem implementação real neste bootstrap. Divergências devem ser resolvidas por PR com os consumidores.

| ID | Regra | Aceite mínimo |
| --- | --- | --- |
| RN01 | Origem é determinada pelo fluxo e credencial do servidor | IoT sempre simulated; importação pública não aceita origem autodeclarada pelo dispositivo |
| RN02 | Origem, método e calibração incompatíveis não se agregam | API devolve séries separadas e Mobile mostra limites |
| RN03 | Ausência de observação não é 0 dB nem local silencioso | status=no_data, métrica nula, séries vazias |
| RN04 | Agregação de dB é energética e ponderada por duração | 60/70 com mesma duração -> aproximadamente 67,40, não 65 |
| RN05 | Cobertura corresponde ao tempo observado, sem dupla contagem | Segundos sobrepostos não viram tempo adicional; bins nas bordas preservam duração |
| RN06 | Observação não representa interior de imóvel, rua inteira ou horário sem coleta | Fonte, local, período, quantidade e limitações em API/UI |
| RN07 | Coordenadas de consulta servem para achar pontos cadastrados | Raio de busca não vira afirmação de cobertura; latitude/longitude em par |
| RN08 | Consulta usa from inclusivo/to exclusivo, UTC; até 31 dias | Intervalo inválido 400; agrupamento em America/Sao_Paulo |
| RN09 | Ingestão exige dispositivo habilitado e autorizado | 401 sem chave válida; 403 para dispositivo fora do escopo |
| RN10 | sourceId + externalId é chave idempotente | 201 novo, 200 repetição igual, 409 conteúdo conflitante |
| RN11 | Leitura é finita, duração >0 até 3600 s, nível de entrada 0–140 | Validação estrutural 400; referência de domínio inválida 422; limites não são norma legal |
| RN12 | observedAt pode ser histórico; futuro até 5 min | Não usar timestamp de recebimento como data observada |
| RN13 | Lote administrativo limita 1–100 itens e admite rejeição parcial | Envelope inválido 400; envelope válido 200 e status/contagens por item |
| RN14 | Envio SOA não é entregue até confirmação do receptor | Estado/contagens persistidos, timeout e retry limitados |
| RN15 | Estado de dispositivo usa lastReceivedAt de envio IoT | stale após 60 s configuráveis; lote histórico não coloca sensor online |
| RN16 | Favorito/cache persiste e informa data/offline | Reabrir app sem API não inventa dados atuais |
| RN17 | ML exige dado real; fixture de resultado não é resultado científico | modelVersion fixture-NOT-TRAINED nunca é evidência de modelo treinado |
| RN18 | Resumo ML da cidade não classifica automaticamente um imóvel | Cidade, período, origem, versão e limitações visíveis |
| RN19 | Sem gravação de áudio ou cadastro de saúde/CPF no fluxo normal | Fixtures de PII isoladas e sintéticas em Cyber |
| RN20 | Interfaces operacionais não expõem segredo ou stack trace | Erro estável code/message/traceId opcional; logs sanitizados |

## Autoridade e versionamento

O OpenAPI define os campos/status estruturais; regras relacionais e cálculos exigem testes no código de cada responsável. Mudança incompatível exige atualizar versão/contrato, fixtures e consumidores no mesmo PR, ou migração coordenada. Não basta atualizar Swagger gerado para mudar um acordo do grupo.

## Mocks e dados reais

Todos os arquivos em contracts/fixtures/ são exemplos sintéticos, inclusive os que ilustram o formato de importação pública. O arquivo ml-summary.mock.json contém resultados inexistentes explicitamente marcados, métricas nulas e hash de demonstração. Usá-los em treinamento ou como evidência de resultado é incorreto. A base real fica fora do Git e segue ml/dados/README.md.
