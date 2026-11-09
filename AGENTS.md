# Instruções do projeto

- Usar UTF-8 em arquivos PT-BR, preservando acentuação. Usar LF em Bash.
- Esta é a pasta principal da GS 2026/02 da FIAP, turma 3ESPV-2026.
- Ler README.md e docs/01-contexto-e-requisitos.md antes de trabalhar.
- Pedro executa Linux. As outras disciplinas recebem especificações; não implementar todas por inferência.
- Distinguir exigência do professor, proposta do grupo e pendência.
- Bairro Fresco foi retirado da lista ativa por orientação do usuário. Os exemplos antigos são históricos.
- Em 08/11/2026 o usuário escolheu a ideia 1, API de ruído. Esta é a solução ativa. Ler docs/02-proposta-de-solucao.md, docs/03-integracao.md e docs/disciplinas/README.md antes de implementar.
- Consultar docs/solucoes/README.md para a comparação atual, fontes, dados reais e triagem. Não reativar Bairro Fresco sem solicitação do usuário.
- As quatro ideias e imagens de 07/11 são histórico de comparação. Não acrescentar inundação, água, gás ou Oásis ao escopo acústico sem nova orientação. Integração futura de ruído/inundação não é decisão de implementação.
- Propostas técnicas v0.1: C# como API principal com SQLite; SOA importador separado com banco próprio e linguagem de aula a confirmar; Mobile de consulta/comparação; ESP32/Wokwi simulado; ML KMeans + PCA com sessões reais. Não presumir autorização para reutilizar a mesma entrega C#/SOA.
- Dados NoiseCapture do Brasil foram baixados em 08/11; auditoria inicial de São Paulo em docs/dados/noisecapture-auditoria-inicial.json e ml/dados/README.md. Não confundir inspeção com limpeza/treino ou dados históricos com telemetria atual. ZIP bruto permanece ignorado pelo Git.
- Preservar separação entre simulated e public_dataset; nunca agregar as duas origens ou fazer média aritmética de dB. Não gravar áudio ou afirmar calibração/limite legal a partir da simulação.
- Consumo individual medido depende de medição por unidade; não inferir leituras individuais a partir do total do prédio. Síndico pode ter visão agregada; detalhe depende de política explícita. Não presumir medição individual ou acesso à telemetria no prédio do usuário.
- Ao propor alternativas, identificar usuário, comprador, ação possível, ganho sobre a alternativa atual, dados, dependências físicas e viabilidade para a GS. Não chamar benefício genérico de solução validada.
- Nunca inventar entrevista, dado real, teste executado, evidência, publicação ou entrega.
- Manter os prompts de trabalho em prompts.md.
- Não publicar fontes privadas do Teams, segredos ou dados pessoais no repositório.
- Não enviar mensagens ou entregas acadêmicas sem instrução explícita do usuário.

## Equipe, monorepo e auditoria (08/11/2026)

- Leonardo (RM555573): api/ e iot/; Felipe (RM556931): soa/ e testing/; Herbert (RM555701): cybersecurity/ e mobile/; Gabriel (RM556476): ml/; Pedro (RM556630): linux/, integração e auditoria. Ver docs/equipe.md.
- Usuário autorizou repositório GitHub privado, monorepo, branches por entrega, integração via PR/main e planejamento de deploys na Azure. Não transformar isso em autorização para implementar todas as matérias dos colegas ou enviar mensagens.
- Contratos verificáveis v0.2.0 em contracts/; regras em docs/regras-de-negocio.md. Mudanças de interface exigem atualizar consumidores/fixtures e validar contratos.
- Todos os componentes devem ter modo standalone e integrado conforme docs/modos-de-execucao.md. Mock não é prova de implementação real; ML usa dados reais.
- Pedro usará o assistente para auditar entregas contra solução, rubrica, código e evidências. Seguir docs/auditoria.md; identificar commit e comandos realmente executados. Não inventar resultado/nota.
- Não fazer push direto na main após bootstrap; usar branches e PRs. Conferir se proteções realmente estão ativas; políticas documentadas não são proteção técnica.
- Fontes privadas, prompts locais, output/ e dataset bruto ficam fora do Git. Registro publicável de IA em docs/uso-de-ia.md, sem conversas privadas.
