# Contratos de integração — API de ruído v0.3.0

**Proposta de implementação em 08/11/2026.** Este é o acordo inicial entre responsáveis; não existe API implementada. Mudanças devem ser registradas aqui antes de alterar consumidores. Os responsáveis podem ajustar o contrato em conjunto; não alterar campos silenciosamente.

## Componentes e propriedade

| Componente | Stack proposta | Propriedade |
| --- | --- | --- |
| API principal | .NET 10, EF Core + SQLite | C#: catálogo, dispositivos, medições e resumo ML |
| Importador SOA | Linguagem usada em aula; SQLite próprio | SOA: lotes, validação e entrega via HTTP à API principal |
| App | React Native, TypeScript, Expo Router, SQLite | Mobile: favoritos/cache |
| Dispositivo | ESP32/Wokwi, Arduino C++ | Physical: leituras simuladas |
| Experimento | Python, scikit-learn | ML: dados tratados, avaliação e resumo versionado |
| Servidor | Ubuntu Server 24.04 LTS em VM, systemd | Linux: execução do C#, banco em arquivo e monitor |

Versões são propostas, não exigências docentes. Fixar SDK, pacotes e lockfiles no início de cada implementação. .NET 10 é [LTS suportado](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support); alinhar com a versão exigida em aula caso exista. SQLite permite persistência e migrations sem administrar outro servidor de banco. Não compartilhar um arquivo SQLite pela rede.

## Vocabulário e origem

- **Ponto:** local cadastrado, coordenadas fixas e nome de exibição.
- **Dispositivo:** produtor simulado associado a um ponto; chave de ingestão vinculada a esse dispositivo.
- **Observação:** janela acústica com início, duração, valor equivalente, localização e proveniência.
- **Fonte:** conjunto/versionamento que explica de onde vieram dados e limitações.
- **Perfil temporal:** agregações das janelas observadas; não representa horários não medidos.
- **Análise ML:** resultado experimental sobre um conjunto real de sessões, distinto do perfil temporal de um ponto.

IDs internos UUID; coordenadas WGS84 em graus. Datas da API em ISO 8601 UTC, com sufixo Z. Agrupamento por dia/hora em America/Sao_Paulo, devolvendo esse fuso na resposta. O importador respeita offset/epoch da fonte; nunca troca timezone apenas substituindo texto.

Origem enum: `simulated` ou `public_dataset`. Método enum inicial: `wokwi_linear_demo` ou `noisecapture_1s`. A origem é derivada pelo servidor da credencial/fluxo: um dispositivo não pode se declarar real. Usar `calibrationStatus: unknown|simulated|documented`; gain disponível não é prova de calibração certificada.

## Entidades mínimas

| Entidade | Campos mínimos |
| --- | --- |
| Source | id, name, sourceUrl, snapshotDate, license, origin, limitations |
| Location | id, name, city, latitude, longitude, isDemo |
| Device | id, locationId, name, enabled, lastReceivedAt, secretHash |
| Observation | id, sourceId, locationId, deviceId opcional, sessionId, externalId, observedAt, durationSeconds, laeqDbA, method, calibrationStatus, receivedAt |
| MlSummary | id, modelVersion, city, dataPeriod, sampleCount, groups, metrics, limitations, createdAt |
| ImportBatch — banco SOA | id, sourceId, fileSha256, status, acceptedCount, duplicateCount, rejectedCount, deliveryStatus, createdAt |

Leituras públicas devem corresponder ao entorno do ponto cadastrado: importador usa ponto amostral selecionado com critério explícito de distância, proposto até 50 m; registra distância e regra no manifesto. Não deslocar todas as medições da cidade para um ponto fictício. Dados sintéticos e reais nunca se agregam juntos.

## Rotas da API C#

| Método/rota | Contrato mínimo |
| --- | --- |
| GET /health/live | 200 se processo ativo, sem segredos |
| GET /health/ready | 200 se banco acessível; 503 caso contrário |
| GET /api/v1/locations | Lista paginada: items, page, pageSize, total; pageSize até 100 |
| GET /api/v1/locations/{locationId} | Nome, coordenadas, cidade, isDemo; 404 inexistente |
| GET /api/v1/locations/{locationId}/noise-profile | Janela from/to, origin obrigatória, agregação por hora/dia; cobertura e fonte |
| GET /api/v1/locations/{locationId}/observations | Registros paginados, mesmos filtros temporais e de origem |
| POST /api/v1/observations | Ingestão de dispositivo, uma observação simulada, com X-Api-Key e observations:write |
| POST /api/v1/imports/observations | Lote administrativo de até 100 observações reais, com X-Api-Key e imports:write |
| GET /api/v1/devices | Estado de dispositivos de demonstração, sem hashes/chaves |
| GET /api/v1/analytics/summary | Resumo ML ou 204 enquanto não importado |
| GET /dashboard | Página simples: pontos, leituras, origem e disponibilidade; Swagger não substitui esta visão |

Filtro geográfico proposto de GET /locations: latitude/longitude em par e radiusMeters (padrão 500; 1–1000), calculando distância entre pontos cadastrados e coordenada consultada. É busca de pontos próximos; o raio não certifica cobertura acústica da área. Sem coordenadas, listar catálogo. Endereço textual/geocoding fica fora do MVP.

Janela de consulta: from inclusivo, to exclusivo; ambos obrigatórios e from < to; até 31 dias por requisição. Origin obrigatória nas consultas de observações/noise-profile. Perfil sem dados responde 200 com `status: no_data`, métricas nulas e lista vazia; ponto inexistente responde 404. Não devolver zero dB para representar ausência.

API de dados privada: todas as rotas /api/v1 exigem X-Api-Key e a permissão definida no OpenAPI. Chaves de cliente, dispositivo, importador e operador têm escopos distintos. GET /health/live só revela estado mínimo; /dashboard pode servir HTML vazio, com consultas privadas posteriores. Readiness/documentação operacional exigem operations:read. Chaves fora do Git, URLs e logs; credenciais comerciais reais nunca são embutidas em app/sketch. No Wokwi, usar credencial descartável vinculada ao dispositivo e revogar após a demonstração. Regras completas em [acesso privado](api-security.md). Cobrança e quotas comerciais continuam futuras.

## Exemplo de ingestão simulada

```json
{
  "externalId": "demo-a-000001",
  "deviceId": "11111111-1111-4111-8111-111111111111",
  "sessionId": "demo-a-boot-001",
  "observedAt": "2026-11-08T15:00:00Z",
  "durationSeconds": 5,
  "laeqDbA": 62.5
}
```

A requisição não decide ponto/fonte/origem: a API resolve pelo dispositivo autorizado. O valor é representação de demonstração, não conversão física calibrada do potenciômetro.

sessionId identifica a mesma coleta/inicialização do dispositivo e deve permanecer nos retries; na importação pública, deriva da sessão da fonte. Não é identificador de morador. Usá-lo para contar sessões distintas, sem tratar cada segundo como uma sessão independente.

Validações: device habilitado/conhecido, números finitos, duração > 0 e até 3600 s, nível entre 0 e 140 dB(A) **como faixa de entrada técnica**, não limite legal, data válida e até 5 minutos no futuro. Dado histórico é permitido no fluxo de importação. Credencial ausente/inválida: 401; dispositivo fora de seu escopo: 403; domínio inexistente no corpo: 422; JSON/tipos/parâmetros inválidos: 400. Para não criar enumeração, não detalhar dispositivo a quem não autenticou.

Chave única: sourceId + externalId. Primeira gravação 201; repetição idêntica 200 com duplicate=true e mesmo id; repetição com conteúdo diferente 409. Idempotência não se baseia só no timestamp.

Lote: envelope `sourceId, items`, itens validados com o mesmo núcleo de regras e ponto explícito. JSON inválido ou >100 itens: 400 sem gravação; envelope válido: 200 com resultado individual `externalId,status,observationId?,code?` e accepted/duplicates/rejected. Definir status por item como accepted/duplicate/rejected; registrar erros sem corpo bruto/segredos.

## Cálculo e cobertura do perfil

Para janelas válidas não sobrepostas e comparáveis:
`LAeq = 10 * log10(sum(durationSeconds * 10^(laeqDbA/10)) / sum(durationSeconds))`.

Não fazer média aritmética de dB. Exemplo de aceite: 60 e 70 dB(A), janelas de mesma duração, resultam em aproximadamente 67,40 dB(A). Não misturar métodos/origens/calibrações incompatíveis sem separação explícita.

Referência técnica: o [manual de medição de ruído da FHWA](https://www.fhwa.dot.gov/Environment/noise/measurement/handbook.cfm) explica a escala logarítmica e o equivalente energético. A fórmula aqui é para o protótipo, não declaração de conformidade com norma brasileira.

Para cada bin devolver início/fim, amostras, sessões, segundos observados, primeira/última observação, fontes e laeqDbA. A janela deve ser fatiada nas bordas dos bins preservando duração. **Não somar durações sobrepostas como tempo adicional:** eliminar duplicidade e, no MVP, não combinar séries simultâneas de diferentes dispositivos/sessões; devolver série separada por produtor/método. A comparação exige origem, método, período e cobertura visíveis.

Um “dia medido” significa que existe observação; não que houve coleta por 24 h. Não calcular percentual representativo da semana a partir do número de pontos. Quando faltarem dados comparáveis, resposta e UI dizem “dados insuficientes para comparar”.

O laeqDbA no topo do perfil é resumo apenas quando houver uma única série compatível; com várias séries/produtores, manter esse campo nulo e valores nos bins de cada série, sem inventar um índice único. status=available indica que existe observação, não que os locais são comparáveis. status=no_data exige valor nulo e séries/fontes vazias.

Estado operacional: dispositivo fica stale após 60 s sem recebimento, valor configurável da demonstração. Idade de recebimento é diferente da data observada; importar histórico não põe sensor online.

## Integração SOA e ML

SOA: POST /api/v1/batches cria importação de arquivo local previamente cadastrado; GET /api/v1/batches e GET /api/v1/batches/{batchId} consultam estado/contagens. Sem download de URL arbitrária nem caminho livre enviado pelo usuário. SQLite com migrations persiste lotes/erros sanitizados. Envio à API principal usa POST /imports/observations; tentativas repetidas mantêm externalId. Não criar filas distribuídas.

ML entrega `ml/output/summary.json` com schemaVersion=1, city, modelVersion, sourceUrl, datasetSha256, dataPeriod (início/fim), sampleCount, groups (id, count, description), metrics (nome, treino, teste), limitations. Backend importa por comando administrativo documentado, validando schema antes da gravação. Não executar pickle de terceiros. GET /analytics/summary expõe o resumo, sem necessidade de serviço Python online.

A análise da cidade não atribui automaticamente um grupo a cada endereço. Só ligar uma análise a um ponto se houver correspondência de observação/local/período comprovada; isso é extensão do MVP.

## Handoff para Linux

Responsável C# fornece até a meta de 10/11: commit, runtime/SDK fixados, comando de build/publish, entrypoint DLL, `.env.example`, porta 8080, endpoints de saúde, migrations, seed idempotente de demonstração, procedimento de importação ML e evidência de persistência.

Caminhos propostos: /opt/gs-ruido/app (artefatos), /var/lib/gs-ruido/ruido.db (dados), /etc/gs-ruido/app.env (segredos), /var/log/gs-ruido (auditoria). Executar como usuário gs-ruido, sem login. Migrations com ferramenta/bundle/comando explícito; não depender de IDE. Não colocar banco na pasta de publicação para evitar perda em redeploy.

## Aceite entre responsáveis

1. Circuito gera leitura; API persiste e painel/app consultam com origem simulated.
2. Lote SOA real é importado; reenvio não duplica; consultas public_dataset ficam separadas.
3. Perfil calcula agregação corretamente e informa no_data sem inventar valor.
4. Favorito sobrevive ao reinício do app; offline informa que é cache.
5. Linux reinicia API com banco persistido; monitor recupera de crash.
6. Resumo ML validado aparece com versão e limitações.
7. Erros/logs não expõem chaves, payloads sensíveis ou stack trace.

Schemas e exemplos serão conferidos contra o OpenAPI real antes da integração. Os contratos v0.3.0 em contracts/openapi/ e o schema ML são verificáveis. Continuam sendo especificação; os exemplos não são evidência da implementação.

## Monorepo, contratos e deploy

Componentes na mesma main, com entregas/persistências independentes; monorepo não significa um backend para duas rubricas. OpenAPI: contracts/openapi/csharp.openapi.json e soa.openapi.json. Erro estrutural é code/message/traceId opcional. Autenticação usa X-Api-Key nos dois serviços; operador SOA tem imports:manage, enquanto a chamada SOA -> C# exige outra credencial com imports:write. Não reutilizar a mesma chave entre serviços nem devolver segredos em resposta.

Destino planejado: Azure, C# e SOA hospedados como serviços independentes numa VM; base externa SOA pode usar prefixo /soa removido no proxy. Modo local preservado. [Plano de deploy](../deploy/azure/README.md) e [regras RN01–RN20](regras-de-negocio.md).

Rotas, nomes de campos, enums, tipos de contrato e erros técnicos usam inglês; documentação explicativa permanece PT-BR. Location substitui Point, locationId substitui pointId e ml/output/summary.json substitui o nome anterior. Sem aliases das rotas antigas no MVP. [Visão rápida das APIs](api-overview.md).
