# Design QA — 17/11/2026

**Status: BLOCKED (não aprovado visualmente).**

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
