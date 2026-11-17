# Design QA — 17/11/2026

**Status: revisão visual manual parcial aprovada; suíte automatizada e faixas menores ainda pendentes.**

## Referência e implementação

Referência aprovada: hero editorial claro, título preto/cobalto à esquerda, imagem de cidade com recorte curvo à direita, ondas azuis. Implementado com imagem específica de cidade e canvas animado; seções seguintes extrapolam a direção para demonstração, dispositivo e modelo real do repositório. A imagem de dispositivo é conceitual e rotulada.

## Executado

- Build TypeScript/Vite: passou.
- 5 testes de domínio Node: passaram, incluindo média energética e ausência de dados.
- Imagens geradas inspecionadas visualmente antes da integração e convertidas para WebP.
- Revisão de conteúdo contra README/arquitetura/contratos: Java escreve PostgreSQL, C# consulta views; fontes distintas; demo sem API/credenciais/áudio.

## Bloqueado

- Playwright não chegou a executar testes: Chromium falhou na inicialização por restrições de socket/process singleton do ambiente.
- Preview em browser cloud retornou `upstream connect error`, inclusive após reinício; relay alternativo foi bloqueado pelo cliente. Portanto não há screenshot real da página nem evidência de contraste, overflow, font rendering ou aderência pixel a pixel.
- A suíte E2E existe, mas **não está aprovada**. Antes de merge: rodar em ambiente compatível, inspecionar screenshots desktop/mobile lado a lado com referência e corrigir qualquer diferença relevante.

## Critérios de fechamento

Hero fiel sem sobreposição; imagens nítidas; 320–1920 px sem overflow; menu/teclado/Escape funcionais; estados demo e dispositivo corretos; zero violações axe críticas/sérias; ondas pausáveis e reduced-motion; links válidos; nenhuma promessa comercial inventada. Não disparar Actions pagos para suprir QA local.

## Continuação da validação manual

A rota direta `http://127.0.0.1:4173` abriu corretamente no Chrome cloud. `terminal.local` era a rota inadequada para esse preview. Hero, tipografia, assets e hierarquia foram inspecionados renderizados no desktop e janela estreita (500 px). Estados Noite/Sem dados, dispositivo, arquitetura, FAQ, pausa, menu móvel, fechamento por link e Escape funcionaram. Em 500 px: scrollWidth 485, sem overflow horizontal.

Encontrado e corrigido rodapé comprimido: layout mobile agora usa grid e texto institucional ocupa linha completa. Revalidado visualmente após build, sem overflow. Capturas de hero desktop/estreito e rodapé foram salvas como evidência da revisão.

O relato de bloqueio anterior acima registra a tentativa inicial; não descreve mais o QA manual. Playwright continua sem iniciar Chromium (socket proibido). DevTools indisponível por política, respeitada. Ainda não executados: axe, varredura 320/390/768/1440/1920 e emulação reduced-motion. Não declarar esses critérios aprovados.

## Evolução: dispositivo, períodos e API

- Build TypeScript/Vite e 11 testes Node passaram, incluindo fixtures comparadas ao OpenAPI real.
- QA manual Chrome: seleção Noite troca imagem real e dados; cards expandem; instalação tomada troca imagem/texto; capítulos do dispositivo acompanham scroll e botões; playground retorna 200/401 e health conforme cenário.
- Desktop e larguras CSS 400 e 333 px conferidas via tamanho da janela e zoom nativo (não emulação de dispositivo). Sem overflow horizontal: 388/400 e 323/333. Corrigidos cards estreitos, corte da vista explodida e altura sticky em viewport baixo. Zoom restaurado após teste.
- API C# privada: sem conexão live testada, sem CORS externo no código/documentação. Playground local honesto, não confirmação de deploy.
- Permanecem pendentes axe e suíte Playwright por restrição de inicialização do Chromium; não alegar validação em todos os dispositivos ou cobertura total WCAG.
