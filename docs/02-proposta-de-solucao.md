# API de ruído — solução escolhida

**Decisão do usuário em 08/11/2026:** executar a ideia 1, API de ruído. Este documento substitui a antiga proposta de Bairro Fresco. As alternativas e imagens anteriores permanecem como histórico.

## Problema, público e valor

Uma visita curta a um imóvel não revela como o ruído do entorno varia entre horários e dias. Plataformas imobiliárias podem incorporar dados acústicos para ajudar uma pessoa a comparar locais e planejar uma visita mais informada.

**Produto:** API de consulta acústica com fonte, período, amostragem e limites de cobertura, acompanhada de painel operacional. **Cliente proposto:** imobiliárias e portais de imóveis. **Beneficiário:** pessoa avaliando onde morar. Modelo comercial futuro: assinatura/volume de chamadas; cobrança e preço não entram no protótipo.

O software reúne e contextualiza observações; não elimina barulho, não determina conforto dentro do apartamento e não certifica conformidade legal. Não prometemos classificação oficial de “bairro silencioso”.

## Recorte de implementação proposto

- Cidade: São Paulo. Piloto de demonstração no entorno da Paulista, sujeito a validação de campo.
- Três pontos fictícios identificados como demonstração; um ESP32 simulado basta para comprovar o fluxo. Dois pontos com dados comparáveis para demonstrar a jornada.
- Dados reais públicos históricos do NoiseCapture, separados das simulações. Importar apenas um subconjunto documentado para a aplicação.
- Mobile de consulta e comparação de pontos, com favoritos locais; sem conta de morador.
- Painel web simples servido pelo backend C#, com leituras, origem, período e estado dos dispositivos. Não criar outro frontend completo.
- ML: agrupamento de **observações acústicas**, KMeans + PCA, usando sessões reais da cidade. Não será previsão de ruído futuro nem diagnóstico da fonte do som.
- Infra Linux: hospedar a API C# com banco SQLite e monitor próprio em systemd. Hospedar SOA no mesmo servidor é extensão, não dependência para Linux.

As escolhas técnicas são propostas executáveis para organizar o trabalho; os requisitos dos professores estão separados nas fichas. Nome comercial pode esperar: usar “API de ruído” nos documentos.

## O que cada parte faz

| Parte | Responsabilidade |
| --- | --- |
| C# | Catálogo de pontos, dispositivos, ingestão, consultas acústicas, painel simples e contrato para Linux |
| SOA | Backend de importação/validação de dados públicos, histórico de lotes e envio à API C# |
| Mobile | Consultar e comparar pontos, mostrar qualidade/cobertura e persistir favoritos |
| Physical | ESP32 no Wokwi com potenciômetro representando nível sonoro, display/LED e envio de leituras |
| ML | Analisar dados reais, agrupar observações e exportar resumo versionado de resultados |
| Linux | Provisionar, executar, monitorar e recuperar API e monitor; evidenciar rede, persistência e falhas |
| Cybersecurity | Evoluir motor de parsing e auditar protótipo, com PII, taint, LLM e painel Risco Cidadão |
| Testing | Features, critérios de aceite e casos no Azure; documentação e pitch |

C# é a única aplicação que escreve no banco principal. SOA tem banco próprio para importações e comunica-se por HTTP; não compartilha tabelas com C#. Este desenho permite duas entregas independentes sem presumir autorização de reaproveitamento. Simplificar para uma base comum só após confirmação dos professores.

## Fluxo demonstrável

1. Usuário consulta dois pontos no app e vê origem, período e número de observações.
2. Compara somente dados da mesma natureza/período; falta de dados aparece como indisponibilidade.
3. Salva favorito e consegue reabrir o resumo em cache sem rede, com data da consulta.
4. Operador altera o potenciômetro no Wokwi e acompanha leitura simulada na API e no painel.
5. SOA importa pequeno lote real e comprova validação, deduplicação e rastreabilidade.
6. Resumo de ML real aparece na API/dashboard em seção separada, com cidade, versão e limitações.
7. Linux inicia a aplicação e o monitor; uma falha controlada demonstra recuperação.

## Dados já inspecionados

Em 08/11 foi baixado o [pacote brasileiro do NoiseCapture](https://data.noise-planet.org/dump/Brazil.zip), com 45.844.212 bytes. Os arquivos de São Paulo contêm 1.894 sessões distintas e 282.021 pontos, antes de limpeza. Timestamps observados vão de abril de 2017 a julho de 2025. São observações históricas, não uma rede ativa hoje.

Uma caixa exploratória em longitude -46,67 a -46,63 e latitude -23,58 a -23,54 contém 5.385 pontos vinculados a 85 sessões. Não é fronteira oficial de bairro nem comprovação de cobertura contínua.

Contagens e hash: [auditoria inicial](dados/noisecapture-auditoria-inicial.json). Método: leitura dos GeoJSON no ZIP, contagem de features, timestamps e interseção dos pontos com o retângulo. Ainda não se aplicaram filtros de GPS, duração, duplicidade ou valores sentinela. Nenhum modelo foi treinado.

A [documentação da fonte](https://noise-planet.org/noisecapture_exploit_data.html) descreve campos, períodos e licença ODbL. Preservar atribuição e conferir obrigações antes de redistribuir dados derivados. Não publicar o ZIP bruto por padrão.

## Impacto e validação

ODS propostos: 11.3 (informação para planejamento urbano) e 16.10 (acesso à informação); explicar a contribuição limitada do protótipo, sem alegar atingir metas por si só.

Indicador de piloto: em uma tarefa de comparação, verificar se o participante identifica qual local precisa de nova visita e percebe quando faltam dados. Medir sucesso/tempo e registrar observações reais. Entrevistar ao menos uma pessoa que convive com o problema e observar o território conforme briefing. Interesse comercial e benefício ainda não foram validados.

## Fora do escopo inicial

API de inundação, pagamento/assinatura, rede real em postes, compra de sensores, gravação de áudio, coleta de CPF/saúde, previsão contínua, mapas de toda a cidade e inferência do interior de imóveis.

Próximos passos: [índice das especificações](disciplinas/README.md), [contratos](03-integracao.md) e [decisões/cronograma](04-plano-de-execucao.md).

## Organização aprovada em 08/11

O usuário pediu monorepo, branches e revisão antes da main, execução independente com mocks/seed e integração com deploys na Azure. Equipe: Leonardo C#/IoT, Felipe SOA/Testing, Herbert Cyber/Mobile, Gabriel IA e Pedro Operating Systems/coordenação de auditoria. A execução individual de cada matéria continua responsabilidade do respectivo integrante. [Equipe](equipe.md), [execução](modos-de-execucao.md) e [auditoria](auditoria.md).
