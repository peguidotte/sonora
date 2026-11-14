# Microserviço de avaliação de segurança (PII, taint analysis, LLM e dashboard Risco Cidadão)

Responsável: **Herbert de Sousa Vilela, RM555701**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/cybersecurity.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

## Proposta

Conforme o esclarecimento do Prof. Vitor Lasse ("Explicação: Global Solutions", Teams da turma): não existe uma ferramenta pronta de aula a estender — a entrega é um middleware/interceptador implementado do zero. Este componente embala essa lógica como um **microserviço HTTP standalone**, pensado para uma aplicação chamar como camada de segurança antes de logar/persistir um payload: ela manda o payload bruto, recebe de volta a versão sanitizada e o diagnóstico. Node/TypeScript puro (`node:http`, sem framework), no mesmo espírito do `tools/mock_server.py` do monorepo — sem nuvem obrigatória.

1. **Parsing de PII** (`src/pii/`): regras para CPF (com checksum), RG, termos de saúde/laudo e credenciais (senha/token/apiKey), aplicadas recursivamente a um payload JSON (`scanPayload`), com mascaramento (`maskPayload`).
2. **Taint analysis** (`src/taint/`): um valor é marcado `Tainted` na fonte (`taint()`), propaga a marca através de transformações (`propagate()`) e só perde a marca de bloqueio quando passa por `sanitize()`. Os sinks (`safeLog`, `safeHttpResponse`) bloqueiam qualquer valor contaminado não sanitizado.
3. **Tradução via LLM** (`src/llm/translate.ts`): recebe só o evento já sanitizado (código, sink, categoria, fonte — nunca o valor bruto) e traduz para linguagem acessível. Sem `ANTHROPIC_API_KEY` configurada, usa um **fallback determinístico declarado** (`declaredFallback: true` no resultado); com a chave presente, chama a API de mensagens da Anthropic de verdade.
4. **Dashboard Risco Cidadão** (`src/risk/score.ts`, `src/dashboard/render.ts`): calcula um farol verde/amarelo/vermelho a partir dos eventos reais do log (peso por categoria: CPF=2, RG=1, saúde=3, credencial=3; score 0=verde, 1–4=amarelo, ≥5=vermelho).

Os quatro pontos vivem atrás de **um único endpoint de análise** (`src/middleware.ts` orquestra pii → taint → llm, chamado pelo servidor em `src/server/`): a rubrica pede quatro entregáveis, não necessariamente quatro rotas, e cada chamada já precisa passar pelas quatro etapas em sequência — múltiplos endpoints separados forçariam o chamador a orquestrar isso por fora sem ganho real.

Fixtures sintéticas em `fixtures/requests/` cobrem dois pares vazado/mascarado (ver tabela abaixo). Nenhum dado é real; o produto Sonora não coleta CPF/saúde.

## Pré-requisitos

- Node.js 22+ (usa o runner de testes nativo `node --test`, sem dependência de framework de teste).

## Instalação

```bash
cd cybersecurity
npm install
```

## Comandos

```bash
npm run build   # compila TypeScript para dist/
npm test        # roda os testes (node:test) sobre dist/test/**/*.test.js — 48 casos
npm run demo    # processa as fixtures via chamada direta às regras, imprime evidência
                 # antes/depois no terminal e gera output/cybersecurity-dashboard.html (fora do Git)
npm start       # sobe o microserviço em http://127.0.0.1:8090 (porta via CYBERSECURITY_PORT)
```

Para demonstrar a tradução via LLM real em vez do fallback, exportar `ANTHROPIC_API_KEY` com uma chave própria antes de `npm run demo`/`npm start`; sem a variável, o fallback declarado é usado (comportamento padrão e seguro para CI, sem segredo necessário).

## Endpoints do microserviço

| Rota | Método | Descrição |
| --- | --- | --- |
| `/api/cybersecurity/v1/analyze` | POST | Corpo `{ "source": string, "payload": object }`. `source` é um identificador curto (letras, números, `.`, `_`, `:` ou `-`, até 64 chars) — não é dado do payload, não passa pelo motor de PII, e vai direto pro prompt da IA e pros eventos; por isso precisa ser previsível, não texto livre. `source` fora desse formato -> 400. Roda pii → taint → llm sobre o payload, registra os eventos no log em memória e devolve `{ findings, sanitizedPayload, events, risk }`. `findings` nunca inclui o valor bruto, só a máscara. |
| `/api/cybersecurity/v1/events` | GET | Lista completa dos eventos (bloqueados e permitidos) acumulados desde que o processo subiu. |
| `/api/cybersecurity/v1/risk` | GET | Snapshot atual do farol Risco Cidadão (`calculateRisk` sobre o log inteiro). |
| `/api/cybersecurity/v1/reset` | POST | Limpa o log em memória (uso de demonstração/teste). |
| `/health/ready`, `/health/live` | GET | Liveness mínimo, anônimo, igual à convenção dos demais serviços do monorepo. |
| `/dashboard` | GET | Painel HTML interativo, em duas colunas: **esquerda** um formulário genérico (campo "fonte" livre + textarea de JSON livre) para testar qualquer payload contra o log ao vivo, mais quatro botões "Preencher: ..." que só preenchem o formulário com um exemplo pronto — não enviam sozinhos, a análise só roda quando a pessoa clica "Analisar"; **direita** a lista real de eventos, mais recentes primeiro. Botão "Reiniciar log" limpa o estado. |
| `/dashboard/run-custom` | POST | Form `source=<texto livre>` + `payload=<JSON livre>`; roda a mesma análise da API e redireciona (303) para `/dashboard`. JSON inválido ou que não seja objeto volta para o painel com mensagem de erro, sem quebrar o processo. |
| `/dashboard/reset` | POST | Limpa o log e redireciona para `/dashboard`. |

O formulário da esquerda aceita literalmente qualquer chave/valor — não há lista fixa de campos aceitos. É assim que o painel demonstra que o motor de PII decide pelo conteúdo/nome dos campos, não por um catálogo fechado de exemplos: um valor aleatório sem PII (ex: `{"cor":"azul"}`) não dispara nenhum evento; um valor que bate numa regra (ex: `{"password":"..."}`, um CPF válido, um termo de saúde) dispara o par bloqueado/permitido e move o farol.

Exemplo de uso como camada de segurança por outra aplicação:

```bash
curl -X POST http://127.0.0.1:8090/api/cybersecurity/v1/analyze \
  -H "content-type: application/json" \
  -d '{"source":"java-ingestion","payload":{"operatorCpf":"529.982.247-25","apiKey":"demo"}}'
```

O log vive só na memória do processo (reinicia com o serviço) — adequado à auditoria local da disciplina; persistência durável não faz parte desta entrega.

## Os quatro exemplos do painel

| Botão | Fixture | Demonstra |
| --- | --- | --- |
| Vazamento de usuário | `fixtures/requests/user-record-leaked.json` | Documento (CPF, com checksum válido), RG e nota de saúde crus — as três categorias disparam. |
| Usuário mascarado | `fixtures/requests/user-record-masked.json` | Exatamente os mesmos campos, já com a máscara que o próprio motor geraria — **zero achados**: a API só identifica dado não mascarado, não repete o alarme em cima do que ela mesma (ou outra camada) já sanitizou. |
| Credenciais no meio de envs | `fixtures/requests/credential-in-log-leaked.json` | Uma entrada de log estruturado (timestamp/level/service/...) com uma senha crua no meio dos outros campos — mostra que a posição não importa, só a chave/conteúdo. |
| Credenciais mascaradas | `fixtures/requests/credential-in-log-masked.json` | O mesmo log com a senha já como `********` — **zero achados**, mesmo motivo do par anterior. |

Os botões só preenchem o formulário (`fillPreset()` em `src/dashboard/render.ts`, JS vanilla sem framework); quem decide enviar é a pessoa, clicando "Analisar". Isso deixa claro que a lista de exemplos é só conveniência — o campo de texto aceita qualquer JSON digitado à mão.

## Casos positivos/negativos e discussão de falsos positivos

- **CPF**: `529.982.247-25` (checksum correto) é marcado, tanto quando é o campo inteiro quanto quando aparece embutido numa mensagem (ex: `"O CPF informado foi 529.982.247-25"`, comum em log/texto livre) — só a ocorrência válida é mascarada, o resto do texto fica intacto. Um telefone de 11 dígitos como `11987654321`, ou uma sequência no formato de CPF sem checksum válido como `123.456.789-10`, **não** é marcado — evita o falso positivo óbvio de confundir qualquer sequência de dígitos com CPF.
- **Saúde**: o texto `"...laudo de manutenção do operador, sem relação com saúde do cidadão"` **é** marcado como categoria saúde pela regra de palavra-chave (`laudo`), mesmo não sendo sobre saúde do cidadão. Isso é um falso positivo real e aceito nesta heurística baseada em palavra-chave: o custo de um falso positivo (mascarar texto administrativo) é considerado menor que o de um falso negativo (deixar passar um laudo médico real). Documentado também em `src/pii/rules.ts`.
- **Saudação vs. saúde**: `"Tenha uma boa saudação ao abrir o app"` não é marcado — a regra verifica substring exata (`saude`/`saúde`), que não ocorre em "saudação".
- **Credencial**: `apiKey` com valor não vazio é marcado; uma chave de credencial com valor vazio (`""`) não é marcada, evitando falso positivo em campos de formulário ainda não preenchidos.
- **RG**: qualquer valor no formato `00.000.000-0` é marcado, mesmo que seja outro identificador com o mesmo formato (ex: matrícula). Falso positivo aceito nesta heurística por regex simples; não há checksum de RG.
- **Valor já mascarado** (qualquer categoria): um valor no formato EXATO da máscara de uma regra (ex: `***.982.***-25` para CPF, `********` para credencial, texto terminado em "(conteúdo sensível omitido)" para saúde) não é marcado de novo, mesmo que a chave do campo ainda sugira PII (ex: `healthNotes` com o texto já mascarado). Essa checagem usa o formato canônico de cada categoria, não uma pista solta como "contém `***`" — uma senha de verdade pode ter esses caracteres por acaso (ex: `SYNTHETIC***CREDENTIAL-NOT-MASKED`), e um sinal fraco desligaria a detecção inteira. Sem essa guarda bem calibrada, reenviar um payload já sanitizado por outra camada geraria PII "fantasma" — é o que diferencia os pares vazado/mascarado acima.
- **PII dentro de arrays**: `{"password": ["segredo"]}` é detectado e mascarado como `{"password": ["********"]}` — a regra usa a chave do array (`password`) como contexto pra cada string primitiva dentro dele, não só para objetos aninhados.

## Fluxo inseguro vs. fluxo seguro (taint analysis)

`src/middleware.ts` demonstra, para cada campo de PII encontrado em um payload:

- **Fluxo inseguro**: o valor bruto é marcado (`taint`) e enviado direto ao sink de log (`safeLog`) — o sink bloqueia (`TaintBlockedError`) porque o valor contaminado nunca foi sanitizado.
- **Fluxo seguro**: o mesmo valor é marcado, depois passa por `sanitize()` com a máscara do motor de PII, e só então alcança o sink — o sink permite, pois o valor não está mais cru.

Os dois eventos (bloqueado e permitido) são registrados e usados tanto pela tradução via LLM quanto pelo cálculo do farol Risco Cidadão.

## Limites declarados

- Protótipo cobre os quatro pontos da rubrica sobre fixtures sintéticas; não varre o código real de Java/C#/Mobile nem substitui testes de segurança desses componentes.
- O farol Risco Cidadão é ilustrativo da auditoria local, sem valor de classificação oficial de risco.
- Fallback de LLM é o modo padrão (sem segredo necessário); uso real de LLM depende de `ANTHROPIC_API_KEY` fornecida pelo responsável fora do Git.
- O microserviço não implementa autenticação (sem X-Api-Key): é uma ferramenta de auditoria local/standalone, não uma rota exposta do produto Sonora. Uso em um ambiente real exigiria adicionar autenticação antes de expor a porta além de `127.0.0.1`.
- Log de eventos é em memória, por processo; não há persistência nem múltiplas réplicas.
