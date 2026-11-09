# Testing / QA — critérios e testes da API de ruído

**Responsável:** Felipe Soares Xavier, RM556931. **Dependências:** escopo/contrato; pode começar antes de código. Features abaixo são propostas a transferir e detalhar no padrão de aula.

## Exigência do professor

PDF p. 39 e tarefa coletada em 06/11: Features com descrição/critérios de aceite e Test Cases funcionais de caixa-preta positivos e negativos no Azure. Cada caso contém objetivo, preparação, inputs, outputs e passos. Professor Admin; PDF com link e capturas da relação/detalhes de todas as Features e Test Cases. Pontuação 50% Features / 50% Test Cases.

Pitch geral: YouTube até 4 minutos, identificado como VIDEO PITCH GS na entrega de Testing. Conferir canal de entrega atual; a tarefa coletada informa que a nota não será lançada pelo Teams.

## Features propostas

| ID | Feature | Descrição | Critérios iniciais |
| --- | --- | --- | --- |
| F01 | Consultar locais | Listar pontos e buscar por coordenada | Lista paginada e distância; parâmetros geográficos válidos; vazio não é erro. |
| F02 | Consultar perfil acústico | Ver valores com cobertura | Agregação energética correta, período/fuso/fonte explícitos; no_data com valor nulo. |
| F03 | Comparar dois locais | Comparar observações compatíveis | Mesmo período/origem/método; avisar incompatibilidade ou insuficiência, sem ranking universal. |
| F04 | Manter favoritos offline | Guardar e reabrir favoritos | SQLite persiste após reinício; cache com data fica legível sem rede. |
| F05 | Receber observação IoT | Persistir leitura simulada autorizada | Chave vinculada ao dispositivo, validação e idempotência; origem não é escolhida pelo cliente. |
| F06 | Importar observações públicas | Acompanhar lote SOA e resultado | Fonte/hash, contagens corretas, erros visíveis, reenvio sem duplicação. |
| F07 | Mostrar disponibilidade | Distinguir sensor recente de histórico | stale por receivedAt; importação histórica não torna sensor online; falha de API é comunicada. |
| F08 | Consultar resumo experimental ML | Mostrar resultado versionado | Cidade/período/versão/limitações explícitos; ausência do resumo não inventa grupos. |

Cada critério precisa ser verificável e refletir o software entregue. Completar com as regras do [contrato](../03-integracao.md), sem cadastrar funcionalidade futura como se estivesse pronta.

## Casos para organizar no Azure

Cada seção abaixo contém os campos pedidos. Objetivo: verificar o comportamento descrito no resultado esperado da Feature associada. “−” indica cenário negativo/alternativo, não teste necessariamente falhando.

### TC01 — F01 (+)

- **Objetivo:** verificar 200 paginado; apenas pontos no raio; sem afirmar cobertura de toda a área.
- **Preparação:** Pontos A e B cadastrados; API disponível.
- **Entrada:** GET /locations com coordenadas próximas e raio permitido.
- **Passos:** Consultar lista; conferir itens e distâncias.
- **Saída esperada:** 200 paginado; apenas pontos no raio; sem afirmar cobertura de toda a área.

### TC02 — F01 (−)

- **Objetivo:** verificar 400 com código/explicação sanitizada; sem lista enganosa.
- **Preparação:** API disponível.
- **Entrada:** latitude sem longitude.
- **Passos:** Consultar lista com apenas latitude.
- **Saída esperada:** 400 com código/explicação sanitizada; sem lista enganosa.

### TC03 — F02 (+)

- **Objetivo:** verificar aproximadamente 67,40 dB; 2 observações e 10 s; fonte/período explícitos.
- **Preparação:** A com duas janelas de 5 s: 60 e 70 dB, mesma origem/método, sem sobreposição.
- **Entrada:** Perfil de A no intervalo que contém ambas, origin=simulated.
- **Passos:** Consultar perfil; conferir nível, amostras e segundos.
- **Saída esperada:** Aproximadamente 67,40 dB; 2 observações e 10 s; fonte/período explícitos.

### TC04 — F02 (−)

- **Objetivo:** verificar 200, status=no_data, nível nulo; UI diz sem dados.
- **Preparação:** Ponto C existe e não tem observações.
- **Entrada:** Perfil de C no período válido, origin=simulated.
- **Passos:** Consultar perfil sem dados.
- **Saída esperada:** 200, status=no_data, nível nulo; UI diz sem dados.

### TC05 — F03 (+)

- **Objetivo:** verificar valores, fonte e cobertura lado a lado; sem prometer qualidade dentro do imóvel.
- **Preparação:** A e B com séries compatíveis; app online.
- **Entrada:** Mesmo período/origem/método para A e B.
- **Passos:** Selecionar dois locais; abrir Comparar.
- **Saída esperada:** Valores, fonte e cobertura lado a lado; sem prometer qualidade dentro do imóvel.

### TC06 — F03 (−)

- **Objetivo:** verificar aviso de dados insuficientes; ausência não exibida como 0 dB/local silencioso.
- **Preparação:** A com dados e C sem dados no período.
- **Entrada:** Comparar A/C.
- **Passos:** Selecionar A/C e abrir Comparar.
- **Saída esperada:** Aviso de dados insuficientes; ausência não exibida como 0 dB/local silencioso.

### TC07 — F04 (+)

- **Objetivo:** verificar a persiste no SQLite sem duplicação.
- **Preparação:** App instalado e detalhe de A carregado.
- **Entrada:** Favoritar A.
- **Passos:** Favoritar; fechar completamente; reabrir; abrir Favoritos.
- **Saída esperada:** A persiste no SQLite sem duplicação.

### TC08 — F04 (−)

- **Objetivo:** verificar cache legível com data e aviso offline; sem alegar atualização ao vivo.
- **Preparação:** A favoritado com resumo previamente carregado; API inacessível.
- **Entrada:** Abrir favorito sem rede.
- **Passos:** Desativar rede; reabrir app; abrir A.
- **Saída esperada:** Cache legível com data e aviso offline; sem alegar atualização ao vivo.

### TC09 — F05 (+)

- **Objetivo:** verificar primeiro 201; repetição 200 duplicate=true; somente um registro.
- **Preparação:** Dispositivo habilitado; chave correta; externalId novo.
- **Entrada:** Observação simulada válida do contrato.
- **Passos:** Enviar POST; consultar observações; repetir POST idêntico.
- **Saída esperada:** Primeiro 201; repetição 200 duplicate=true; somente um registro.

### TC10 — F05 (−)

- **Objetivo:** verificar 401; nenhuma gravação; segredo não aparece em erro/log público.
- **Preparação:** Dispositivo conhecido; observação válida.
- **Entrada:** Chave inválida.
- **Passos:** Enviar POST e consultar contagem por via autorizada.
- **Saída esperada:** 401; nenhuma gravação; segredo não aparece em erro/log público.

### TC11 — F06 (+)

- **Objetivo:** verificar lote completo, contagens coerentes; mesma origem/fonte; sem duplicar observações.
- **Preparação:** SOA com arquivo permitido e receptor disponível; lote pequeno com correspondência geográfica documentada.
- **Entrada:** fileId válido.
- **Passos:** Criar lote; consultar estado; reenviar o mesmo conteúdo.
- **Saída esperada:** Lote completo, contagens coerentes; mesma origem/fonte; sem duplicar observações.

### TC12 — F06 (−)

- **Objetivo:** verificar falha de entrega/retry visível; recebido não é declarado entregue; sem loop infinito.
- **Preparação:** SOA disponível e API principal indisponível.
- **Entrada:** Importar lote válido.
- **Passos:** Criar lote; aguardar timeout limitado; consultar estado.
- **Saída esperada:** Falha de entrega/retry visível; recebido não é declarado entregue; sem loop infinito.

### TC13 — F07 (+)

- **Objetivo:** verificar recente primeiro, stale depois; horário e condição explícitos.
- **Preparação:** Dispositivo tem leitura recém-recebida em relógio controlado da demonstração.
- **Entrada:** Atualizar painel/dispositivos.
- **Passos:** Enviar leitura atual; consultar; aguardar mais de 60 s sem envio.
- **Saída esperada:** Recente primeiro, stale depois; horário e condição explícitos.

### TC14 — F07 (−)

- **Objetivo:** verificar histórico não coloca dispositivo online; data observada e recebida não se confundem.
- **Preparação:** Sensor stale; lote real com data antiga disponível.
- **Entrada:** Importar observações históricas.
- **Passos:** Importar; atualizar painel e estado do sensor.
- **Saída esperada:** Histórico não coloca dispositivo online; data observada e recebida não se confundem.

### TC15 — F08 (+)

- **Objetivo:** verificar 200 com cidade, período, grupos, métricas e limitações do experimento; não rotula todos os imóveis.
- **Preparação:** Resumo real do experimento importado e validado.
- **Entrada:** GET /analytics/summary.
- **Passos:** Consultar endpoint/dashboard; conferir versão e contexto.
- **Saída esperada:** 200 com cidade, período, grupos, métricas e limitações do experimento; não rotula todos os imóveis.

### TC16 — F08 (−)

- **Objetivo:** verificar 204; interface informa análise não disponível; nenhum resultado inventado.
- **Preparação:** Banco sem resumo ML importado.
- **Entrada:** GET /analytics/summary.
- **Passos:** Consultar endpoint/dashboard.
- **Saída esperada:** 204; interface informa análise não disponível; nenhum resultado inventado.

## Organização e aceite da entrega

1. Criar Features e Test Cases no projeto Azure autorizado do grupo, associando casos às Features pelo padrão de aula.
2. Preencher campos completos, não apenas o título. Desdobrar passos compostos acima em passos/expectativas individuais no Azure.
3. Confirmar identidade do professor antes de conceder Admin; não convidar endereço presumido.
4. Validar casos contra a versão implementada e registrar resultado real quando executado, sem marcar Passed antecipadamente.
5. Incluir casos adicionais de valor inválido/NaN, ponto inexistente, from >= to, lote parcial, externalId conflitante e possível acesso de dispositivo a outro escopo, conforme implementação final.
6. Gerar PDF com link, visão geral e detalhes legíveis de todas as Features/casos. Conferir acesso aos links e guardar recibo do envio.

Datas/dados dos exemplos são fixtures. Para TC13, usar relógio controlado em teste ou execução temporal real declarada; não editar evidência para simular passagem de tempo. Nos casos de importação real/ML, a evidência final deve usar dados e resultados reais; fixture serve para preparar o teste, não para afirmar que o experimento foi executado.

## Pitch e metas

Roteiro até 4 min: problema/visita ao imóvel (40 s); cliente e cidadão (30 s); consulta/comparação com cobertura (1 min); fluxo sensor/API e ML real (50 s); limites, impacto a medir e próximos passos (40 s). Não afirmar venda, entrevista, precisão ou sensor instalado sem evidência.

**Meta 09/11:** Features/casos preparados. **12/11:** Azure organizado e alinhado com C#/Mobile. **16/11:** validar versão integrada. **17–18/11:** capturas/PDF/pitch.

Artefatos propostos em testing/: README com links e rastreabilidade, especificação final, evidências e PDF. O cadastro no Azure, convite e entrega ainda não foram executados.

## Pendências

Projeto Azure, identidade do professor e confirmação de atualizações da tarefa. Os 16 casos são ponto de partida para planejamento, não execução comprovada.

## Organização no monorepo

Pasta `testing/`; branch `felipe/testing`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.3.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.

## Atualização v0.3.0 — API privada

Preparações de consultas positivas agora incluem X-Api-Key com acoustics:read; consultas de dispositivos/readiness usam operations:read. Casos SOA usam imports:manage no SOA e imports:write no receptor C#. Adequar URLs ao inglês. Adicionar casos de GET sem chave -> 401, chave inválida -> 401, cliente tentando POST -> 403, dispositivo alheio -> 403 e chave revogada -> 401. Em Mobile, chave de leitura somente em memória, fora do cache SQLite. Fixtures públicas do mock não provam proteção em produção.
