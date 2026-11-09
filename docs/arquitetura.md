# Arquitetura do Sonora

Decisão aprovada pelo usuário: ingestão Java, PostgreSQL compartilhado e API de consulta C#. Esta é a referência de arquitetura; OpenAPI e interface SQL ficam em [contracts/](../contracts/README.md). As [fichas acadêmicas](disciplinas/README.md) definem evidências e entregas, sem redefinir a arquitetura.

## Produto e limite

Sonora oferece contexto acústico a plataformas imobiliárias e pessoas comparando onde morar. Informa observações, período, fonte e cobertura; não garante conforto dentro de imóveis, silêncio contínuo, conformidade legal ou ausência de ruído onde faltam amostras. Não armazena áudio. Inundação é possibilidade futura; não integra a entrega atual.

## Responsabilidades

| Componente | Faz | Integração |
| --- | --- | --- |
| Java / SOA | Recebe IoT, importa arquivos públicos, valida, normaliza, deduplica e persiste; administra importações | Escreve no PostgreSQL; publica views de leitura |
| PostgreSQL | Mantém observações, fontes, locais, dispositivos, importações e resumo ML | Contrato entre ingestão e consulta |
| C# Sonora | Consulta com EF Core/LINQ, calcula perfis/comparações, aplica acesso privado e serve dados/painel | Somente leitura no banco; sem ingestão ou chamada ao Java |
| Mobile | Consulta C#, compara locais, mantém favoritos/cache | API privada; SQLite local |
| ESP32 / Wokwi | Simula entrada acústica e transmite observações identificadas como simuladas | Chama somente a ingestão Java |
| NoiseCapture | Fonte externa de arquivos históricos públicos | Java importa; não hospedamos a fonte nem contamos com push automático |
| ML | Agrupa observações reais em notebook e exporta artefato versionado | Java valida/importa o JSON administrativamente; C# consulta o resultado |
| Linux | Provisiona serviços/banco/rede, monitora recursos, audita e recupera falhas | Execução local e, posteriormente, nuvem |

O fluxo de dados é fontes -> Java -> PostgreSQL -> C# -> clientes. Java não encaminha lotes ao C# por HTTP. C# não grava dados acústicos nem cria migrations de captura. Regras de captura ficam no Java; interpretação acústica fica no C#.

## Banco como contrato

Usar PostgreSQL também nos testes de integração e na reprodução local; não compartilhar arquivo SQLite entre serviços. [database.json](../contracts/database.json) define ownership, schemas, roles, nomes/tipos das views e mapeamento JSON.

- Schema sonora: armazenamento e histórico de captura, sob responsabilidade do SOA.
- Schema sonora_read: views versionadas publicadas pelas migrations do SOA para consumo do C#.
- sonora_migrator: conta de setup/deploy, autorizada a aplicar migrations e GRANTs; não é credencial do runtime.
- sonora_ingest: runtime Java com escrita necessária no armazenamento, sem administração de roles/DDL.
- sonora_query: runtime C# com SELECT nas views publicadas; sem gravação, DDL ou acesso a credenciais.

Não são dois bancos que trocam lotes: os backends acessam o mesmo PostgreSQL com papéis diferentes. Java mantém o schema físico; a interface de leitura é combinada com Leonardo. Mudança incompatível de view exige versão/migração coordenada e ajuste de fixtures/consumidor no mesmo PR. Detalhes internos de armazenamento podem evoluir preservando a interface publicada.

Felipe entrega migrations, publicação/grants das views e seed sintético com comando local reutilizável. Pedro aplica esses artefatos no provisionamento. C# usa o setup comum e não depende do processo HTTP Java estar ativo para consultar. Compartilhar banco cria acoplamento de schema e capacidade: não garante escalabilidade automática.

## HTTP e autenticação

| Serviço | Prefixo | Responsabilidade |
| --- | --- | --- |
| C# | /api/sonora/v1 | Locations, noise-profile, observations de leitura, devices e analytics/summary |
| Java | /api/ingestion/v1 | /sonora/observations de escrita e /sonora/batches de importação |

Health/live, health/ready e openapi.json são relativos ao prefixo de cada serviço, evitando colisão no proxy. C# também serve /dashboard, somente um shell HTML sem dados privados embutidos. Paths completos e schemas são os OpenAPI; não há aliases das versões anteriores.

Header único X-Api-Key. Cada serviço valida suas próprias credenciais; não compartilha chave comercial com outro serviço. Escopos: acoustics:read (consultas C#), observations:write (dispositivo no Java), imports:manage (importações no Java) e operations:read (dispositivos/readiness/documentação operacional do respectivo serviço).

Autenticar/autorizar antes de processar payload. Ausente, inválida, expirada ou revogada -> 401; válida sem escopo ou fora do deviceId -> 403. Somente liveness mínimo e shell HTML são anônimos. Implementar proteção por padrão; OpenAPI não protege código por si só.

Gerar credenciais reais fora do repositório, armazenar verificação segura/hash, permitir revogação/rotação e nunca registrar segredo em URL, log, resposta ou banco de leitura. Migrations/rotinas administrativas usam conta apropriada e não o usuário read-only do C#. Cobrança, emissão pública de chave e portal de assinaturas não entram no MVP.

No app/painel demonstrativo, usuário informa URL e chave de leitura, mantida em memória por sessão, fora do bundle/SQLite/armazenamento persistente. Favoritos e cache offline não guardam segredo. Chaves de dispositivo/importação nunca vão para Mobile. Wokwi usa credencial descartável restrita ao deviceId. Fixtures públicas de mock jamais autenticam em um deploy.

## Regras de dados

- IDs UUID, coordenadas WGS84, timestamps HTTP em UTC/ISO 8601 com Z; PostgreSQL timestamptz. Agrupar por America/Sao_Paulo e informar o fuso.
- Origem simulated ou public_dataset é determinada pela ingestão, nunca autodeclarada pelo dispositivo. Calibração unknown, simulated ou documented; não inventar calibração física para Wokwi.
- Credencial resolve dispositivo/local/fonte. Dispositivo habilitado envia valor finito 0–140 dB(A), duração >0 até 3600 s e data até 5 min no futuro. Esses intervalos são validações técnicas, não limites legais.
- source_id + external_id é único. Novo registro -> 201; repetição idêntica -> 200 duplicate=true; conteúdo conflitante -> 409. SessionId identifica coleta/boot e permanece nos retries.
- Importação recebe fileId permitido na configuração do Java, nunca URL/caminho arbitrário. Coordenadas/timestamps mantêm procedência. Mapear observações a locais somente por critério geográfico explícito, inicialmente até 50 m; rejeitar/contabilizar ausência de correspondência.
- acceptedCount significa observações efetivamente persistidas/commitadas no PostgreSQL. duplicateCount não aumenta o total. Estados: created, processing, completed, completed_with_errors ou failed; completedAt informa término. Não existe deliveryStatus ou repasse HTTP a outro backend.
- Consulta exige from inclusivo/to exclusivo e origin; intervalo até 31 dias. Filtros por latitude/longitude em par e raio até 1000 m encontram locais cadastrados; raio não representa cobertura acústica garantida.
- Sem observação: status=no_data, nível nulo e séries/fontes vazias. Nunca 0 dB como ausência. Mostrar método, origem, quantidade, período e segundos observados.
- Não misturar origens, métodos/calibrações incompatíveis ou produtores simultâneos num agregado. Não contar sobreposição como tempo adicional; fatiar janelas nos limites dos bins preservando duração.
- Para janelas comparáveis, LAeq = 10 log10(sum(duracao * 10^(nivel/10)) / sum(duracao)). Duas janelas iguais a 60/70 dB resultam aproximadamente 67,40 dB. Topo do perfil é nulo quando há múltiplas séries incompatíveis; valores ficam nos bins das séries.
- Estado de dispositivo usa recebimento IoT, não data de importação histórica; stale após 60 s configuráveis. C# calcula o estado na consulta.
- ML exporta ml/output/summary.json segundo o schema compartilhado. Java fornece comando administrativo local (CLI) para validar/importar o arquivo em ml_summaries; sem rota HTTP adicional, sem escrita do notebook no banco e sem executar modelos/pickle. C# lê o payload da view, sem serviço Python online. Sem artefato real, 204; fixture de modelo não é resultado científico nem classifica todo endereço.

## Execução e deploy

| Componente | Standalone | Integrado |
| --- | --- | --- |
| Java | PostgreSQL local + migrations + arquivo/seed; sem C# | Recebe Wokwi/importa fonte e grava banco compartilhado |
| C# | PostgreSQL local + setup/seed comum; sem Java ativo | Consulta views do mesmo banco de ingestão |
| Mobile | Mock e SQLite local | Consulta somente C# |
| IoT | Wokwi/serial e mock Java quando acessível | Envia ao Java via HTTPS |
| ML | Notebook com base real documentada | Entrega summary.json ao processo administrativo Java |

Mock substitui dependência no desenvolvimento, não persistência, autenticidade da base ML ou execução acadêmica. Setup/seed local gera credenciais de laboratório sem desativar a proteção. Cada responsável documenta comandos reais no README de seu componente. Configuração API_BASE_URL/SOA_BASE_URL é a origem (scheme/host/porta); o adaptador acrescenta o prefixo do contrato.

Deploy inicial: uma VM Linux, preferencialmente na Azure, com Java 127.0.0.1:8082, C# 127.0.0.1:8080 e PostgreSQL 5432 interno. Proxy expõe HTTPS/443 e encaminha os prefixos completos, sem removê-los. Banco e portas internas não ficam públicos; SSH restrito à administração. systemd mantém aplicações e monitor em serviços independentes. Mobile roda no aparelho, não como backend da VM. NoiseCapture não é implantação nossa.

Migrations executam antes de iniciar a nova versão do SOA; artefatos, dados e segredos ficam em diretórios separados. Atualizações preservam dados e fazem backup antes das migrations; retorno ao binário anterior não reverte automaticamente schema/dados. O teste Linux inclui crash do monitor e recuperação, além de boot, logs, recursos e aplicação de outra disciplina. [Terraform e CI/CD](../deploy/azure/README.md) definem provisionamento, autenticação OIDC, artefatos por componente e distribuição do Mobile. Infraestrutura usa somente créditos estudantis com limite de gastos ativo; configuração de ambiente não altera esta topologia.

## Extensão

Um serviço Java de ingestão pode ganhar adaptadores e réplicas; cada produto pode ter sua API/deployment, como /api/flood/v1 no futuro. Separar schemas e permissões por domínio. Implementar apenas Sonora nesta GS; filas, novos produtos e novas VMs dependem de necessidade concreta.

Referências técnicas: [schemas PostgreSQL](https://www.postgresql.org/docs/current/ddl-schemas.html), [GRANT](https://www.postgresql.org/docs/current/sql-grant.html) e [views de leitura no EF Core](https://learn.microsoft.com/en-us/ef/core/modeling/keyless-entity-types). A arquitetura é decisão do projeto; requisitos docentes ficam no documento próprio.
