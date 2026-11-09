# Sonora — APIs em uma visão

**Contrato v0.3.0, ainda a implementar por Leonardo e Felipe.** Rotas/JSON/erros em inglês. Dados privados por X-Api-Key; health/live e HTML vazio de dashboard são as exceções sem dados de negócio.

## C# — Leonardo

A API principal guarda locais, dispositivos e observações, calcula o perfil sonoro e atende clientes/Mobile/painel.

| Método | Rota | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | /api/v1/locations | acoustics:read | Locais cadastrados, paginação e busca por coordenada |
| GET | /api/v1/locations/{locationId} | acoustics:read | Detalhes do local |
| GET | /api/v1/locations/{locationId}/noise-profile | acoustics:read | Perfil, fontes, período e cobertura |
| GET | /api/v1/locations/{locationId}/observations | acoustics:read | Histórico paginado |
| POST | /api/v1/observations | observations:write | Leitura de dispositivo simulado |
| POST | /api/v1/imports/observations | imports:write | Lote real normalizado pelo SOA |
| GET | /api/v1/analytics/summary | acoustics:read | Resumo ML versionado; 204 se ausente |
| GET | /api/v1/devices | operations:read | Estado operacional, sem credenciais |
| GET | /health/ready | operations:read | Dependências disponíveis ou 503 |
| GET | /health/live | Anônimo | Processo ativo, sem detalhes internos |
| GET | /dashboard | HTML vazio | Interface que consome as rotas privadas |

Busca de locais: latitude/longitude em par, radiusMeters até 1000, page e pageSize até 100. Busca é proximidade de ponto cadastrado, não garantia de cobertura do bairro.

Perfil/histórico exigem from, to e origin=simulated ou public_dataset; from inclusivo, to exclusivo, até 31 dias. Perfil aceita aggregation=hour ou day. Para comparar, mostrar fonte, método e tempo observado; dados escassos não viram índice confiável de um imóvel.

### IoT -> C#

POST /api/v1/observations com chave de dispositivo no header:

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

O servidor decide locationId, sourceId e origin pela credencial/dispositivo; o cliente não envia origin. Novo: 201; retry idêntico: 200 com duplicate=true; conflito: 409.

## SOA — Felipe

Serviço privado de importação: lê arquivo permitido, valida/coordenadas/horários, mantém histórico em banco próprio e entrega ao C# por HTTP. Nenhum acesso direto ao SQLite do colega.

| Método | Rota | Permissão | Resultado |
| --- | --- | --- | --- |
| POST | /api/v1/batches | imports:manage | Cria/processa lote de arquivo permitido |
| GET | /api/v1/batches | imports:manage | Histórico paginado |
| GET | /api/v1/batches/{batchId} | imports:manage | Estado, entrega e contagens |
| GET | /health/ready | operations:read | Dependências ou 503 |
| GET | /health/live | Anônimo | Processo ativo |

### Operador -> SOA

POST /api/v1/batches com sua chave SOA:

```json
{"fileId": "sp-noisecapture-subset-v1"}
```

fileId referencia um arquivo/mapeamento permitido na configuração do servidor; não aceitar caminho livre ou URL arbitrária.

Resposta com id, fileId, sourceId, fileSha256, status, acceptedCount, duplicateCount, rejectedCount, deliveryStatus e createdAt. Estados de processamento: created, validated, delivering, completed, failed, completed_with_errors. Entrega: pending, delivering, delivered ou failed.

### SOA -> C#

POST /api/v1/imports/observations com **chave do C# que tenha imports:write**, diferente da chave do operador SOA:

```json
{
  "sourceId": "22222222-2222-4222-8222-222222222222",
  "items": [{
    "externalId": "track-point-001",
    "sessionId": "track-001",
    "locationId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "observedAt": "2025-07-10T15:00:00Z",
    "durationSeconds": 1,
    "laeqDbA": 63.0,
    "method": "noisecapture_1s",
    "calibrationStatus": "unknown"
  }]
}
```

Até 100 itens; envelope inválido: 400. Envelope válido: 200, contagens accepted/duplicates/rejected e resultado por item (accepted, duplicate ou rejected). Reenvio preserva externalId. completed não pode esconder uma falha de entrega: manter deliveryStatus e contagens reais.

## Contratos compartilhados

| Objeto | Campos centrais |
| --- | --- |
| Location | id, name, city, latitude, longitude, isDemo |
| Observation | id, locationId, sourceId, deviceId opcional, sessionId, externalId, observedAt, receivedAt, durationSeconds, laeqDbA, origin, method, calibrationStatus |
| Noise profile | locationId, from, to, timezone, origin, aggregation, status, laeqDbA, sources, series, limitations |
| Import batch | id, fileId, sourceId, fileSha256, status, acceptedCount, duplicateCount, rejectedCount, deliveryStatus, createdAt |
| Error | code, message e traceId opcional |

Sem dados: status=no_data, valor nulo e séries/fontes vazias. Decibéis se agregam por energia/duração, nunca média aritmética simples. Fontes simuladas e reais ficam separadas. Erros e mensagens técnicas em inglês.

Documentos completos: [C# OpenAPI](../contracts/openapi/csharp.openapi.json), [SOA OpenAPI](../contracts/openapi/soa.openapi.json), [acesso privado](api-security.md), [regras](regras-de-negocio.md) e [integração](03-integracao.md).
