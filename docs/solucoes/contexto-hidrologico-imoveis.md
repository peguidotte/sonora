# API de contexto hidrológico para avaliação de imóveis

**Estado: candidata de produto com dependências de dados, pesquisada em 07/11/2026.** Não é previsão operacional de enchente nem avaliação garantida de um imóvel.

A pedido do usuário, esta frente passa a compor a [candidata integrada de contexto do imóvel](contexto-do-imovel.md), junto de dados acústicos. As limitações das camadas permanecem válidas.

## Quem usaria e por quê

Uma imobiliária, plataforma de locação ou consultoria de localização precisa conferir muitas coordenadas em fontes cartográficas diferentes antes de apresentar opções ou recomendar investigação adicional.

Cliente pagante proposto: empresa por consulta ou carteira de imóveis. Beneficiário: pessoa ou negócio que avalia onde morar ou instalar uma atividade. A decisão é comparar locais e saber quais exigem verificação adicional.

## Ação concreta

A empresa envia coordenadas e recebe um resultado com interseção com áreas mapeadas, fonte, data, resolução e cobertura. Pode solicitar verificação presencial ou documentação antes de avançar.

A tecnologia organiza uma verificação repetitiva e permite integração no fluxo existente. Não evita chuva ou inundação. Um mapa gratuito pode bastar para uma consulta eventual; a hipótese de valor comercial está na integração, escala e rastreabilidade.

## Como construir

Ingerir camadas oficiais selecionadas, padronizar projeção e armazenar em banco geográfico. Implementar consulta ponto-em-polígono e relatórios com evidências. API retorna categorias distintas: área coberta com interseção, coberta sem interseção e cobertura desconhecida. Painel permite revisar as fontes; app Expo consulta locais e registra verificação de campo com dados fictícios no protótipo.

A [Fathom oferece uma API de dados de risco de inundação](https://api-docs.fathom.global/), demonstrando precedente de integração comercial. A proposta acadêmica não tem equivalência ao modelo, à cobertura nem à validação dessa empresa.

## Fontes e limite de cobertura

O [Serviço Geológico do Brasil disponibiliza cartografia de suscetibilidade](https://www.sgb.gov.br/pt/web/guest/cartografia-de-suscetibilidade). O [GeoSampa disponibiliza camadas para download](https://novogeosampa.prefeitura.sp.gov.br/).

A camada municipal de [Risco Hidrológico](https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/cefffc6d-8d1d-419b-a267-8d87a37b9e0e) cobre assentamentos precários próximos a córregos. Isso não equivale a uma avaliação de todo endereço de São Paulo. Fora do mapeamento, responder cobertura desconhecida em vez de risco baixo.

Os metadados foram consultados; geometria, campos, disponibilidade do recorte e condições de reuso ainda precisam ser conferidos.

## Viabilidade para a GS

API e painel geográfico são prototipáveis em um recorte pequeno. O encaixe de ML e Physical Computing é mais difícil do que em refrigeração e água:

- ML depende de uma pergunta com dados reais e alvo justificável. Classificar o risco copiando a categoria da mesma camada para os atributos seria vazamento de informação.
- Um ESP32 pode demonstrar leitura local de nível de água, mas essa leitura tem função operacional distinta de uma carta de suscetibilidade. Só integrar o circuito se existir um fluxo coerente de acompanhamento do local.
- Não inserir sensores apenas para preencher a disciplina. Se esse fluxo não fizer sentido, a candidata perde prioridade acadêmica.

A primeira versão pode mostrar somente cruzamento de dados oficiais, sem inventar um índice proprietário ou probabilidades de inundação.

## O que pode inviabilizar

Cobertura insuficiente para os imóveis do comprador, geocodificação incorreta, resolução inadequada, restrições de reuso, dados antigos e concorrentes mais completos. Criar uma API sobre dados abertos não comprova disposição de pagamento.

O escopo da demonstração é uma consulta rastreável às fontes cartográficas selecionadas.

## Primeiro teste de utilidade

Comparar o tempo de uma verificação manual com uma consulta da API em um pequeno conjunto de pontos cobertos e não cobertos. Perguntar à empresa que recebe o resultado qual decisão mudaria e qual fonte é necessária para confiar nele.
