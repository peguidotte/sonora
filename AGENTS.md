# Instruções do projeto

- Pasta principal: C:/Users/Usuario/Documents/FIAP/GS-2026-02. Usá-la explicitamente; não presumir associação da conversa no aplicativo.
- Ler README.md, docs/arquitetura.md, contracts/README.md e a especificação da disciplina antes de alterar interfaces.
- Sonora é o produto escolhido. Marca da empresa em aberto. Inundação é expansão futura, fora do escopo atual.
- Arquitetura aprovada: Java/SOA recebe IoT e importa NoiseCapture; grava PostgreSQL; C# consulta views somente leitura e calcula regras acústicas. Sem HTTP Java -> C#, sem SQLite entre backends. SQLite apenas no Mobile.
- SOA possui migrations de captura e publicação das views. Contrato em contracts/database.json; C# não altera o schema nem executa migrations próprias de captura.
- Namespaces: /api/sonora/v1 e /api/ingestion/v1. Rotas, DTOs, erros e nomes técnicos em inglês; JSON camelCase. Explicações PT-BR em UTF-8, preservando acentuação; Bash em LF.
- API privada por X-Api-Key e escopo; credenciais fora de Git/URLs/logs/bundle/cache. Mock usa somente credenciais públicas fictícias, nunca de produção.
- NoiseCapture é fonte de arquivos públicos históricos, distinta do ESP32/Wokwi simulado. Separar public_dataset e simulated; nunca agregar as origens nem fazer média aritmética de dB. Não armazenar áudio.
- ML usa dados reais públicos, não Wokwi. Fonte e inspeção em ml/dados/README.md; não confundir inspeção com limpeza/treino.
- Responsáveis: Leonardo api/iot; Felipe soa/testing; Herbert cybersecurity/mobile; Gabriel ml; Pedro linux e coordenação/auditoria. Nomes/RMs no README principal.
- Implementar somente o trabalho solicitado. Ter especificações das outras matérias não autoriza executá-las integralmente por inferência.
- Trabalho em branch/PR, sem push direto na main. Mudanças de interface atualizam OpenAPI, banco, fixtures, ferramentas e consumidores juntos.
- Distinguir requisito do professor, decisão do projeto e implementação real. Nunca inventar entrevista, medição, teste, resultado, nota, deploy ou entrega.
- Documentação mínima: arquitetura central; contratos verificáveis; rubricas nas oito fichas; comandos reais nos READMEs dos componentes. Não criar cronogramas, snapshots ou documentos duplicados; histórico no Git e resultados de revisão nos PRs.
- Preservar materiais privados, prompts locais, output e dataset bruto fora do Git. Registrar prompts em prompts.md local e resumo publicável em docs/uso-de-ia.md.
- Não enviar mensagens a colegas/professores, convites ou submissões sem instrução explícita. Pedro autoriza auditoria de código conforme CONTRIBUTING.md.
