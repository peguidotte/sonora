# Sonora · Landing page

Experiência editorial/interativa em português, isolada das aplicações acadêmicas. Branco quente, preto e azul cobalto; cidade em recorte curvo e ondas animadas seguem a direção visual aprovada. A marca da empresa permanece em definição.

[Abrir o site público](https://peguidotte.github.io/sonora/) · [API Docs](https://peguidotte.github.io/sonora/api-docs.html)

## Executar

Node.js 22+ e npm:

```sh
cd landing-page
npm ci
npm run dev -- --host 127.0.0.1
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

`dist/` é estático; `base: './'` permite hospedar a pasta sem mudar os outros módulos. O GitHub Pages publica a raiz da branch `gh-pages`. Para republicar, execute `npm ci` e `npm run build` a partir da versão desejada da `main`. Em um checkout separado de `gh-pages`, substitua os arquivos pelo conteúdo de `dist/`, preserve `.nojekyll` e faça commit e push. O catálogo usa exemplos simulados e funciona sem credenciais.

## Interações e limites

- Ondas com pausa, respeito a `prefers-reduced-motion`, suspensão fora da tela e em aba oculta.
- Perfis demonstrativos por período, média energética para intervalos de mesma duração e estado sem dados explícito.
- Exploração do dispositivo conceitual e das quatro etapas do modelo: fontes → Java → PostgreSQL → C#.
- Menu móvel, navegação por âncoras, foco visível, FAQ nativa e controles com estado acessível.
- Não solicita microfone, não grava áudio, não transmite formulários e não conecta uma API. As leituras são fictícias, não medições reais.
- Dispositivo ilustrado é conceito de gabinete, não hardware fabricado/certificado. O projeto atual usa ESP32/Wokwi; dados históricos NoiseCapture mantêm origem separada.
- Sem preço, alegações de cobertura universal, promessa de silêncio ou conformidade normativa.

## Estrutura e assets

`src/main.ts`: interface e interações; `src/style.css`: tokens, layout e movimento; `src/demo.mjs`: dados e cálculo isolados; `public/images/`: cidade e dispositivo WebP gerados por IA especificamente para esta direção visual. Não são fotografias de instalações Sonora. Tipografia Manrope/DM Sans via Fontsource (licenças OFL nos pacotes), ícones Phosphor (licença MIT). Fontes/ícones empacotados localmente, sem Google Fonts em runtime.

## Validação

`npm test` valida cálculo e estados; `npm run build` valida TypeScript e bundle. `npm run test:e2e` contém jornada, larguras 320/390/768/1440/1920, motion, menu e axe WCAG. Requer Chromium instalado (`npx playwright install chromium`) ou `CHROMIUM_PATH`. Inicie o preview em 127.0.0.1:4173 antes de executar a suíte E2E.

## Evolução interativa

O dispositivo agora tem conceitos de poste público (prioritário) e tomada, com vista explodida e quatro capítulos por rolagem; os botões numéricos oferecem navegação direta. Não é especificação de hardware/instalação elétrica. `device.ts/css` isolam essa narrativa. `city-morning.webp`, `city.webp` e `city-night.webp` trocam o contexto visual conforme o período. Os cards introdutórios usam disclosure nativo por clique/teclado.

O playground lê as operações, parâmetros, escopos e exemplos diretamente de `contracts/openapi/csharp.openapi.json` no build. As nove operações têm exemplos de requisição e de cada status previsto. Os seletores oferecem janelas UTC, um local conhecido e um UUID ausente, além de origem, agrupamento, paginação e busca por coordenadas. A resposta do dashboard mostra um shell HTML ilustrativo como texto; o cenário 204 do resumo ML tem corpo vazio. O simulador funciona localmente, sem credenciais ou chamadas à API.

Princípios de revisão visual considerados: capítulos de produto/close-ups (Apple), request/response legíveis (Stripe) e hierarquia/consistência do taste-skill. Nenhum código, hook ou instalador externo dessas referências foi executado.

## Documentação independente e narrativa em camadas

A landing em `index.html` contém somente um convite para desenvolvedores. `api-docs.html` é uma segunda entrada Vite, com navegação própria, autenticação, índice de operações e playground local. Os links relativos funcionam também em hospedagem por subdiretório; não exige fallback SPA.

O dispositivo usa camadas HTML/CSS independentes (gabinete, captura, placa e suporte) com separação contínua/reversível ligada ao scroll; fotos conceituais seguem na etapa de instalação. Não é modelo CAD ou render 3D real. Em `prefers-reduced-motion`, a separação é fixa e a navegação instantânea; os capítulos continuam disponíveis por botão. Os cards têm previews e links relevantes, não apenas expansão de texto.

### Device motion (Three.js)

The device section now uses a lazy-loaded Three.js scene (`src/device-scene.ts`), not CSS planes or a bitmap sequence. Procedural rigid parts represent the shell/grille, acoustic entry, PCB and mount. `src/device-timeline.mjs` is a single paused GSAP timeline scrubbed by the section's scroll progress: assembled → cover opens → separated layers → fully reassembled. Reverse scrolling seeks the same timeline. The pole/outlet selector changes the mounting context.

- No external model account, paid animation tool, API request or recording is required.
- This is a visual product concept, **not** final CAD, electronic design, electrical instructions or a certified device.
- Dynamic import only near the device section; capped DPR (1.5); renderer only draws on progress/resize/visibility changes. No perpetual render loop, textures fetched externally, or postprocessing.
- Reduced motion or unavailable/lost WebGL keeps a static concept image and readable chapter controls. Responsive orthographic camera resizes to the canvas.
- Unit tests verify completed assembly, deterministic reverse seeking and bounded per-step transforms. `npm run test:e2e` includes a reduced-motion control test.
- Official references consulted: [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/), [GSAP skills](https://github.com/greensock/gsap-skills), [Three.js responsive rendering](https://threejs.org/manual/pages/responsive.html). External skill scripts were not installed or executed.
