# Sonora · Landing page

Experiência editorial/interativa em português, isolada das aplicações acadêmicas. Branco quente, preto e azul cobalto; cidade em recorte curvo e ondas animadas seguem a direção visual aprovada. A marca da empresa permanece em definição.

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

`dist/` é estático; `base: './'` permite hospedar a pasta sem mudar os outros módulos. Nenhum deploy ou workflow foi incluído.

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

`npm test` valida cálculo e estados; `npm run build` valida TypeScript e bundle. `npm run test:e2e` contém jornada, larguras 320/390/768/1440/1920, motion, menu e axe WCAG. Requer Chromium instalado (`npx playwright install chromium`) ou `CHROMIUM_PATH`. Ver `design-qa.md`: a revisão manual desktop/500px foi feita, incluindo correção de rodapé; a suíte automatizada e outras larguras ainda estão pendentes por restrição do ambiente. Não confundir testes preparados com executados.

## Evolução interativa

O dispositivo agora tem conceitos de poste público (prioritário) e tomada, com vista explodida e quatro capítulos por rolagem; os botões numéricos oferecem navegação direta. Não é especificação de hardware/instalação elétrica. `device.ts/css` isolam essa narrativa. `city-morning.webp`, `city.webp` e `city-night.webp` trocam o contexto visual conforme o período. Os cards introdutórios usam disclosure nativo por clique/teclado.

O playground em `playground.ts/css` simula três rotas reais do contrato C# 0.4.0, incluindo respostas disponíveis, vazias e erros de autenticação. `playground-fixtures.mjs` mantém exemplos verificados por teste contra o OpenAPI. Nunca faz fetch ou solicita chaves. Como a API não habilita CORS externo, a página não oferece URL arbitrária; mostra cURL e orienta documentação Scalar no servidor autorizado.

Princípios de revisão visual considerados: capítulos de produto/close-ups (Apple), request/response legíveis (Stripe) e hierarquia/consistência do taste-skill. Nenhum código, hook ou instalador externo dessas referências foi executado.

## Documentação independente e narrativa em camadas

A landing em `index.html` contém somente um convite para desenvolvedores. `api-docs.html` é uma segunda entrada Vite, com navegação própria, autenticação, índice de operações e playground local. Os links relativos funcionam também em hospedagem por subdiretório; não exige fallback SPA. O contrato completo continua no repositório, e esta documentação guiada cobre três rotas.

O dispositivo usa camadas HTML/CSS independentes (gabinete, captura, placa e suporte) com separação contínua/reversível ligada ao scroll; fotos conceituais seguem na etapa de instalação. Não é modelo CAD ou render 3D real. Em `prefers-reduced-motion`, a separação é fixa e a navegação instantânea; os capítulos continuam disponíveis por botão. Os cards têm previews e links relevantes, não apenas expansão de texto.
