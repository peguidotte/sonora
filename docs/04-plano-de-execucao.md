# Decisões e execução — API de ruído

**Atualização: 08/11/2026.** A ideia 1, API de ruído, foi escolhida explicitamente pelo usuário. As oito matérias estão distribuídas: Leonardo C#/IoT, Felipe SOA/Testing, Herbert Cyber/Mobile, Gabriel IA e Pedro Linux/coordenação de auditoria. O grupo escolheu monorepo e pretende deploy integrado na Azure. Não implementar as matérias dos colegas por inferência.

## O que está decidido e o que é proposta

| ID | Tema | Estado | Encaminhamento |
| --- | --- | --- | --- |
| D01 | Solução: API de ruído | Decisão do usuário | Ativa; inundação, água e Oásis ficam como alternativas históricas |
| D02 | API para plataformas imobiliárias, painel e consulta demonstrativa | Proposta detalhada | Mantém o público e modelo discutidos; monetização fora do protótipo |
| D03 | São Paulo; piloto no entorno da Paulista | Proposta de recorte | Confirmar território de campo e pessoa a ouvir |
| D04 | C# .NET 10 + EF Core/SQLite | Proposta técnica | Alinhar versão de aula e fixar dependências ao criar projeto |
| D05 | SOA importador separado, banco de lotes próprio | Proposta técnica | Linguagem de aula pendente; não depende de aceitar backend comum |
| D06 | ESP32 simulado; sem instalação física | Proposta técnica | Um circuito, três pontos de demonstração; validar rede Wokwi/API cedo |
| D07 | ML KMeans + PCA sobre sessões reais de São Paulo | Proposta com fonte inspecionada | Limpeza e suficiência final pendentes; não é previsão temporal |
| D08 | Linux VM Ubuntu 24.04, app e monitor systemd | Proposta técnica | Pedro escolhe VM/perfil; WSL com systemd é alternativa |
| D09 | Nome comercial | Em discussão | Nome técnico do repositório é provisório |
| D10 | Monorepo privado, branches e PR/main | Decisão do usuário | Repositório criado; consultar README/governança para estado atual |
| D11 | Deploys Azure | Decisão de destino | Assinatura/recursos/custo pendentes; nenhum recurso criado |
| D12 | Equipe e responsabilidades | Definidos pelo usuário | Ver docs/equipe.md; usernames dos outros membros pendentes |

Essas propostas permitem iniciar protótipos e organização. Decisões que mudem o contrato devem ser combinadas com os responsáveis afetados; não há necessidade de esperar por nome, logotipo ou preço.

## Pendências prioritárias

| Pendência | Quem resolve | Até quando, como meta | Impacto |
| --- | --- | --- | --- |
| Usuários GitHub dos outros membros | Pedro/grupo | Quando informados | Acesso, CODEOWNERS e revisões automáticas |
| Linguagem/framework de SOA e versão de C# de aula | Responsáveis | 09/11 | Criação dos projetos |
| Motor/dashboard Cyber utilizado em aula | Responsável Cyber | 09/11 | Extensão exigida pela rubrica |
| Filtros, grupos e divisão ML após limpeza | Responsável ML | 09–11/11 | Experimento final |
| Território observado e pessoa para conversa | Grupo | 10/11 | Ficha, problema e validação |
| VM/interface/parâmetros de rede | Pedro | 09/11 | Provisionamento Linux |
| Backend mínimo hospedável | Responsável C# | 10/11 | Destrava conclusão de Linux |
| Conectividade Wokwi/API | Physical + Pedro/C# | 12/11 | Evita falsa promessa de transmissão ao vivo |
| Azure Boards/professor Admin e tarefas atualizadas | Felipe/demais | 12/11 | Evidências e envio correto |
| Assinatura/região/recursos Azure e orçamento | Pedro/grupo | Antes de provisionar | Deploy real; sessão local ainda não tem assinatura utilizável |

Datas são **metas internas propostas em 08/11**, não novos prazos dos professores.

## Sequência de trabalho

| Meta | Resultado |
| --- | --- |
| 08–09/11 | Distribuir fichas, confirmar bases de aula, observar/planejar território; diagnóstico ML |
| 10/11 | C# mínimo com migrations/seed/ingestão/healthchecks e handoff; Mobile mock; circuito serial |
| 11–12/11 | Linux provisionando; ML com split/pipeline; SOA validando lote; Cyber com fluxo de taint |
| 13–14/11 | Perfil/painel e lote integrados; SQLite Mobile; monitor e testes Linux; resultados ML |
| 15–16/11 | Integração final, limitações claras, testes e evidências reais |
| 17–18/11 | Vídeos, READMEs, relatório ML, ZIP Cyber e PDF Azure; revisar acessos |
| 19/11 | Enviar com margem antes de 23h55 e guardar confirmações |

## Regras para o grupo

- Cada responsável começa pelo primeiro resultado indicado no [índice](disciplinas/README.md), informa versão e bloqueios.
- C# publica contrato real/OpenAPI cedo; Mobile/SOA/IoT não criam nomes de campos próprios.
- Dados públicos e simulados são separados; sensor simulado não entra em ML.
- Arquivos e resultados são responsabilidade de cada disciplina; evidência de uma parte não conclui outra.
- Integração final precisa demonstrar o percurso real dos dados, não apenas o mesmo nome nos projetos.
- Ambiente comum/pasta de repositório não determina formato de envio: se houver repositórios separados, levar consigo README, configuração e contrato necessários. Cada matéria envia o link/formato correto.
- Não criar remoto público nem subir materiais privados/segredos automaticamente. Registrar prompts conforme briefing.

## Estado verificável

Concluídos: fontes acadêmicas, escolha da API de ruído, equipe, oito fichas, monorepo privado criado, contratos OpenAPI/JSON Schema e mocks com testes de fundação, download público e auditoria inicial de São Paulo. Estado de branches, CI e proteções no README/docs/governanca-github.md.

Ainda não executados: entrevista/observação de campo, limpeza/treino ML, implementações das matérias, testes funcionais dessas aplicações, provisionamento Linux/Azure, Azure Boards, gravações e submissões. Testes de contrato/mocks são distintos e já foram executados.

Pasta canônica: C:/Users/Usuario/Documents/FIAP/GS-2026-02. Não presumir associação desta conversa a projeto na barra do aplicativo.

## Conferência final

Nomes/RMs, links acessíveis, versão dos fontes, duração de vídeo, evidências próprias e correspondência com rubrica/tarefa atual. Prazo conservador do PDF: 19/11/2026 às 23h55; tarefas coletadas mostram 23h59. Pitch em Testing com identificação VIDEO PITCH GS. Nenhuma mensagem ou submissão é enviada por esta especificação.
