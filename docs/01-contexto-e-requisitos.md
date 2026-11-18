# Contexto e requisitos da GS CitizenTech

Base: PDF oficial CitizenTech, 40 páginas, e leitura do Teams da turma 3ESPV-2026 em 06/11/2026. Os links de origem e a cobertura da coleta estão no inventário local em fontes/INVENTARIO.md, mantido fora do Git por conter referências privadas.

## O que a equipe precisa resolver

Uma CitizenTech deve partir de um problema real da cidade e demonstrar benefício concreto ao cidadão. O recorte do terceiro ano pede **uma única solução por equipe, com partes que se conectam entre disciplinas** (PDF, pp. 17–21). A integração é uma exigência do briefing.

A equipe deve observar um território, registrar o problema e conversar com alguém que convive com ele. A proposta precisa explicar cidadão beneficiado, problema, funcionamento, tecnologias, ecossistema e medida de impacto. Identificar os ODS e explicar a contribuição para suas metas é obrigatório (pp. 11 e 14).

O PDF permite IA como apoio para aprender e revisar, pede registro dos prompts e domínio do código pelo grupo. Não usar dados pessoais reais; para ML, a exigência específica é usar dados reais e públicos (pp. 21 e 31–33).

## Regras comuns

| Tema | Exigência ou orientação |
| --- | --- |
| Equipe | Até cinco alunos, todos da mesma turma; mesma equipe em todas as disciplinas |
| Envio | Um integrante envia cada entrega |
| Prazo no PDF | 19/11/2026, 23h55 |
| Prazo no Teams e aviso da coordenação | 19/11/2026, 23h59 |
| Planejamento | Adotar o horário mais cedo e concluir os envios com antecedência |
| Presença | Coordenação de 26/10 e 04/11 informa ausência de chamada; PDF p. 23 concorda |
| Pitch geral | YouTube, até quatro minutos, link em Testing, identificado como VIDEO PITCH GS |
| Nota | Cada disciplina avalia sua própria entrega |

A p. 24 do PDF ainda menciona chamada, em conflito com a p. 23 e os avisos da coordenação. Tratar os avisos específicos da turma como referência e registrar eventual atualização.

O título da p. 26 diz “Sete disciplinas”, mas a tabela lista **oito**. Foram especificadas as oito.

## Mapa das oito entregas

| Disciplina | Produto exigido | Entrega | Fonte |
| --- | --- | --- | --- |
| SOA e Web Services | Backend, domínio, banco, migrations, documentação automática e testes | Link GitHub e evidências | p. 27 |
| Cybersecurity | Regras PII, taint analysis, tradução de falhas com LLM e painel Risco Cidadão | ZIP com módulo, auditoria, vídeo e print do dashboard | pp. 28–29 |
| C# | API .NET, POO, interfaces, DI, EF Core, LINQ, async e testes unitários | Link GitHub, README e evidências | p. 30 e tarefa Teams |
| IA e ML | Notebook executado com dados reais públicos e avaliação de treino e teste | GitHub, relatório e vídeo até cinco minutos | pp. 31–33 |
| Mobile | React Native/TypeScript, Expo Router, API ou mock e banco | GitHub, ficha, prints e vídeo até três minutos | p. 34 |
| Linux | Infra automatizada por Bash, aplicação, systemd, monitoramento, auditoria e falhas | GitHub, evidências e vídeo até sete minutos | pp. 35–37 e tarefa Teams |
| Physical Computing | ESP32 funcional no Wokwi, integrado à solução | Link Wokwi, vídeo até quatro minutos e TXT com integrantes | p. 38 |
| Testing | Features e Test Cases funcionais no Azure | PDF com link, capturas e professor Admin; pitch geral separado e identificado | p. 39 e tarefa Teams |

## Regras que afetam a arquitetura

- Linux deve hospedar uma aplicação desenvolvida em outra disciplina. A infraestrutura precisa instalar dependências e preparar o funcionamento completo da aplicação escolhida.
- A tarefa de Linux autoriza WSL, VM local ou VM em Azure. O WSL precisa cumprir todas as configurações e usar systemd.
- Organização escolhida pelo usuário em 08/11: monorepo com aplicações/entregas C# e SOA separadas e evidências por rubrica. A eventual reutilização da mesma implementação nas duas matérias seria outra decisão e depende de confirmação docente; compartilhar o repositório não significa compartilhar a entrega.
- Mobile admite mock, mas manter contrato compatível com a API para a integração.
- A simulação ESP32 atende Physical Computing; **não** atende a exigência de dados reais de ML.
- Cybersecurity pede um motor de parsing/taint/LLM e dashboard. Esclarecimento do Prof. Vitor Lasse ("Explicação: Global Solutions", Teams): não há ferramenta pronta a localizar, a implementação é do zero, em qualquer linguagem; não substituir essa exigência por um checklist genérico.
- Testing pede Azure Boards e Test Cases completos, além do PDF de contingência. Uma lista de testes local não conclui a entrega.

## Diferenças e pendências dos enunciados

| Questão | Evidência atual | Tratamento |
| --- | --- | --- |
| Relatório de ML | p. 31: duas a quatro páginas; p. 33: duas páginas | Planejar duas páginas |
| Rubrica de Mobile | PDF remete à tarefa; tarefa estava sem instruções | Seis critérios conhecidos, pesos ainda pendentes |
| Tarefas não localizadas | IA e Physical não apareceram na lista Em breve | Requisitos extraídos do PDF; conferir Teams/Portal antes do envio |
| Linux detalhado | Tarefa especifica Bash, rede, serviços, logs e testes | Usar os requisitos adicionais na especificação de Linux |
| Vídeo de Testing | Apoio à criação de casos manuais no Azure DevOps | Arquivo baixado; não é um novo entregável |

Não foi acessado o Portal do Aluno. A coleta cobre o PDF oficial, avisos recentes nos nove canais da turma e as cinco tarefas GS visíveis em Em breve.

A implementação segue a [arquitetura aprovada](arquitetura.md). Divisão de componentes e tecnologia de banco são decisões do projeto, não novas exigências dos professores.
