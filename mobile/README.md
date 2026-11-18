# Sonora Mobile

Consulte um local, compare perfis acústicos e salve favoritos no celular. O app usa React Native, TypeScript e Expo Router. SQLite guarda favoritos e consultas salvas no aparelho.

[Requisitos da disciplina](../docs/disciplinas/mobile.md) · [Equipe](../README.md#equipe)

App React Native + TypeScript com Expo Router (SDK 52). Consome somente a API C# (`/api/sonora/v1`), nunca o banco ou a ingestão Java. Favoritos e cache offline ficam em SQLite local (`expo-sqlite`), sem compartilhar arquivo com outro backend.

## Versões

- Node 22, npm.
- Expo SDK 58, Expo Router 6, React Native 0.88.1, React 19.3.0.
- TypeScript 6.0 em modo `strict`.
- Testes: Jest + ts-jest.
- Build Android: Expo prebuild gerenciado + Gradle (Java 17), conforme [pipeline.json](../deploy/pipeline.json) e o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações).

## Instalação

Na raiz do clone:

```bash
cd mobile
npm ci
```

## Comandos — standalone (mock local)

Sem nenhum backend ativo, o app abre com dados sintéticos embutidos (`src/api/mockClient.ts`), nas mesmas formas do OpenAPI/`contracts/fixtures/*.json` (locations, noise-profile disponível e `no_data`). Esse modo é o padrão ao abrir o app e fica explícito na tela inicial ("Mode: Local mock data").

```bash
npx tsc --noEmit   # typecheck estrito
npx jest           # testes unitários (regras de comparação e cobertura)
npx expo start      # abre o Metro bundler; escanear com Expo Go ou emulador Android
```

Gerar e inspecionar o projeto Android nativo (o mesmo passo usado pela CI, sem executar o Gradle):

```bash
npx expo prebuild --platform android --clean --no-install
```

## Comandos — integrado (API C# real)

Sem reconstruir o app: na tela **Settings**, trocar para a aba de API, informar a **URL base** (`scheme://host:porta`, sem o prefixo do contrato) e a **chave X-Api-Key** de leitura (`acoustics:read`). A chave fica somente em memória da sessão (estado React), nunca é gravada em SQLite, log, bundle ou `AsyncStorage`. Fechar o app limpa a chave; é preciso informá-la de novo.

```text
API base URL: http://<host-do-C#>:8080
API key: <chave acoustics:read fornecida pelo operador>
```

Sem conexão (401/403/rede), o app nunca tenta retry automático: mostra mensagem compreensível (sessão inválida/sem escopo) ou, se já houver cache local daquela consulta, reaproveita o cache mostrando a data do último sucesso ("Offline — showing cached data from …").

## O que está implementado

- Navegação Expo Router: lista de locais (`app/index.tsx`) → detalhe/perfil acústico (`app/locations/[id].tsx`), comparação (`app/compare.tsx`), favoritos (`app/favorites.tsx`) e configurações (`app/settings.tsx`).
- Adaptador único (`src/api/client.ts`) com duas implementações — mock (`mockClient.ts`) e HTTP real (`httpClient.ts`) — trocadas pela tela Settings, sem alterar as telas.
- Perfil acústico: estados carregando, disponível, `no_data` (vazio), erro de rede com cache offline e erro de autenticação (401/403) tratado sem repetição automática.
- Comparação de dois locais: exige mesmo período/origem/método (`src/domain/compare.ts`, com testes) e nunca produz um ranking absoluto de conforto — só reporta incompatibilidade quando houver.
- Favoritos em SQLite (`src/storage/favorites.ts`): persistem entre aberturas do app (comprovado reabrindo o Metro/app e revisitando a tela Favorites).
- Cache do perfil acústico em SQLite com data de obtenção (`src/storage/cache.ts`), usado automaticamente quando a API está inacessível.
- Acessibilidade: escala de fonte (normal/grande/extra grande), tema de alto contraste, rótulos e `accessibilityRole`/`accessibilityState` em todos os controles, alvos de toque com no mínimo 48dp (`src/theme.ts`), e nenhum estado depende somente de cor (ícones/texto acompanham sempre).

Validado nesta máquina: `npm ci`, `npx tsc --noEmit`, `npx jest` (7/7) e `npx expo-doctor` (20/20) sem erros; `npx expo prebuild --platform android --clean --no-install` gera o projeto nativo sem falhas.

## Pendências

- Execução integrada real contra a API C# (Leonardo ainda implementando as rotas de negócio) — o adaptador HTTP está implementado e tipado conforme o OpenAPI, mas não foi exercitado contra um serviço real.
- Prints de tela, vídeo de demonstração e ficha CitizenTech preenchida (equipe/critérios) ainda não produzidos; não inventar essas evidências antes de gravá-las.
- Build de APK de debug assinado é gerado pela CI (`delivery.yml`); não há publicação em loja nem assinatura de produção.

Mock permitido e declarado acima; não é evidência de integração real. Estado verificável em `component.json`.
