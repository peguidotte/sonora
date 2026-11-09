# Acesso privado — Sonora v0.3.0

Decisão do usuário: API de dados privada, com rotas, campos JSON, enums e erros em inglês. Documentação explicativa e conteúdo de interface podem ser PT-BR. Dados de fonte pública continuam identificados como public_dataset; isso não torna o endpoint anônimo.

## Autenticação e autorização

Um único header: **X-Api-Key**. Chave opaca identifica consumidor, dispositivo ou serviço e suas permissões. Cada serviço valida suas próprias credenciais; chave do SOA não é reutilizada no C#.

| Permissão | Serviço | Operações |
| --- | --- | --- |
| acoustics:read | C# | Locations, noise profile, observations e analytics summary |
| observations:write | C# | POST /api/v1/observations, vinculado a um deviceId |
| imports:write | C# | POST /api/v1/imports/observations, usado pelo SOA |
| operations:read | C# | Devices, readiness e documentação operacional |
| imports:manage | SOA | Criar/listar/consultar batches |
| operations:read | SOA | Readiness e documentação operacional |

As permissões não são hierarquia automática: uma chave de operador pode receber acoustics:read e operations:read, mas não ganha escrita por ser operador. Consumidor não pode importar, alterar origem ou enviar pelo dispositivo.

- Ausente, inválida, revogada ou expirada: **401 Unauthorized**.
- Válida, mas sem permissão ou fora do dispositivo autorizado: **403 Forbidden**.
- Autenticar/autorizar antes de processar payload ou revelar detalhes internos.
- Credenciais em headers, nunca em URL/query string, log, resposta, fixture de produção ou bundle do app.
- HTTPS no ambiente implantado; API privada significa acesso autenticado, não necessariamente rede sem acesso externo. Wokwi e clientes podem acessar HTTPS com permissões limitadas.

O OpenAPI usa ApiKeyAuth global e x-required-scopes por operação. Essas extensões devem ser traduzidas em políticas reais no backend; documentá-las não implementa a proteção.

## Exceções sem dados privados

GET /health/live retorna somente estado mínimo do processo. GET /dashboard pode servir uma página vazia de aplicação: nenhum dado, chave, versão sensível ou estado de sensores embutido no HTML. Os dados vêm de chamadas privadas autenticadas. Esses dois caminhos não tornam /api/v1 público.

Readiness, dados de negócio e documentação operacional não são anônimos. O mock expõe /openapi.json com chave de operador. Swagger/Scalar equivalente da implementação deve seguir a mesma restrição ou ficar disponível somente no ambiente de desenvolvimento.

## Gestão mínima para a GS

Provisionar credenciais fora do Git e armazenar somente hash/verificação segura no backend. Metadados: id, principalId, scopes, enabled, expiresAt opcional e deviceId quando aplicável. Gerar chaves aleatórias no setup local; não fornecer uma chave de produção padrão no código. Desabilitar/rotacionar credencial deve impedir novas chamadas. O MVP não precisa de portal de assinatura, pagamento ou endpoint público de emissão de chave.

Modo standalone continua possível: setup local gera credenciais de laboratório e seed; o professor não precisa de conta Azure. Documentar obtenção e uso sem colocar segredo no README. Não desabilitar autenticação ao usar seed.

## Mobile e painel

No app demonstrativo, o usuário informa URL e sua chave de leitura na conexão. Manter a chave somente em memória durante a sessão; não salvar em SQLite, favoritos, logs ou no binário. Favoritos/cache continuam consultáveis offline, identificados como cache; uma nova sessão online pede a credencial novamente. Não há cadastro de morador obrigatório no MVP.

O painel solicita uma chave de leitura/operador e usa somente a memória da página, sem query string ou armazenamento persistente. Chave de importação/administração nunca vai para Mobile/painel/Wokwi. Um produto público final precisará avaliar autenticação de usuários ou backend intermediário; não distribuir chave mestra num frontend.

## Mocks

contracts/fixtures/mock-credentials.json contém **valores públicos apenas de demonstração**. O mock verifica credencial conhecida, escopo e vínculo ao dispositivo, mas não é serviço de identidade de produção e não persiste dados. Essas chaves nunca podem autenticar em um serviço implantado.

Referências de desenho: [Security Scheme no OpenAPI](https://spec.openapis.org/oas/v3.1.0#security-scheme-object), [autenticação e autorização por padrão no ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0) e [OWASP sobre credenciais embutidas](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password).
