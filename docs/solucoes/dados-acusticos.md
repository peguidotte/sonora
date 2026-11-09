# Plataforma de dados acústicos

**Estado: solução escolhida pelo usuário em 08/11/2026.** Proposta desenvolvida com o usuário: rede de sensores, histórico sonoro por local/dia/horário, API comercial para outras plataformas e painel interno de operação. Escopo ativo e especificações: [proposta](../02-proposta-de-solucao.md), [contratos](../03-integracao.md) e [disciplinas](../disciplinas/README.md).

O usuário propôs combinar esta frente com inundação. A [candidata integrada de contexto do imóvel](contexto-do-imovel.md) organiza os dois módulos; esta ficha preserva os detalhes acústicos.

## Problema e usuário

Quem escolhe onde morar tem pouca informação sobre a variação do ruído no entorno durante a semana. Uma visita curta não mostra necessariamente o período noturno ou os fins de semana.

Cliente pagante proposto: portal imobiliário, imobiliária ou outra plataforma que incorpora informação sobre uma localização. Beneficiário: pessoa comparando imóveis. Operador interno: equipe responsável pelos sensores e qualidade dos dados.

## Decisão que o software melhora

Comparar endereços e escolher quando investigar presencialmente um local. A API entrega perfil do entorno, cobertura e origem da informação. O produto não promete conforto acústico dentro de um apartamento nem elimina fontes de barulho.

## Produto proposto

- API para consulta geográfica, séries históricas e perfis por horário/dia.
- Painel com mapa, filtros, gráficos, sensores offline e qualidade dos dados.
- App Expo para consulta de locais e/ou inspeção de dispositivos, cobrindo a disciplina Mobile.
- Possível cobrança por assinatura ou volume de consultas; preço e disposição de compra ainda não validados.

## Como funcionaria

O sensor processa o sinal localmente e transmite indicadores, timestamp, localização cadastrada e estado do dispositivo. A plataforma valida, armazena e agrega as leituras. API e painel consultam a mesma base.

Registrar ponto, janela e método de medição, calibração e cobertura temporal. Distinguir medições, simulações, estimativas e reclamações. Não inferir silenciosamente o interior de um imóvel a partir de um sensor externo. Não guardar áudio ou conversas como parte do desenho inicial.

## Viabilidade e limites

O fluxo de ingestão, banco, API e visualização é implementável como protótipo. A implantação comercial acrescenta hardware adequado, calibração, proteção ambiental, energia, conectividade, manutenção e acesso autorizado aos locais. Instalação em postes é possibilidade futura; não é pré-requisito para demonstrar a GS.

Um sensor isolado tem cobertura local e não descreve automaticamente uma rua inteira. Eventos temporários, falta de amostras e alterações no ambiente precisam aparecer no resultado. Não preencher áreas sem informação com uma certeza inventada.

## Protótipo para a GS

Simular poucos dispositivos no ESP32/Wokwi, enviar dados identificados como simulados e demonstrar consultas no backend e nas interfaces. A entrada do circuito representa um sinal de demonstração; não alegar calibração acústica no simulador.

O projeto de Linux provisiona backend e banco, configura serviços, monitora recursos, registra auditoria e demonstra recuperação. C#/SOA implementam ingestão e consulta. Testing verifica os fluxos e Cybersecurity analisa a proteção de dados e saídas.

ML deve usar dados reais públicos. Em 08/11 foi baixado o dump brasileiro do NoiseCapture e inspecionado o recorte de São Paulo: 1.894 sessões e 282.021 pontos antes de limpeza. A auditoria inicial está em [dados](../dados/noisecapture-auditoria-inicial.json); suficiência após filtros e adequação estatística ainda precisam ser verificadas. Leituras Wokwi não atendem a esse requisito. Analisar padrões só permite conclusões compatíveis com o local, período e método de coleta.

## Evidências e validação pendente

O NoiseCapture disponibiliza indicadores acústicos e metadados de medições, além de documentar calibração. É precedente técnico, não prova de demanda comercial pela nossa API.

Precisamos validar: cobertura de dados para ML; interesse de uma plataforma consumidora; pergunta que ela quer responder; custo por ponto; diferença para bases gratuitas; utilidade de uma resposta com cobertura limitada.

Critério proposto de sucesso do piloto: um consumidor integra a API em uma demonstração e consegue comparar dois locais com origem, período e cobertura explícitos. Isso valida a integração e compreensão, não uma venda efetiva.

## Fontes

- [Dados e indicadores do NoiseCapture](https://noise-planet.org/noisecapture_exploit_data.html).
- [Calibração do NoiseCapture](https://onomap-gs.noise-planet.org/noisecapture_calibration.html).
- [Processamento sem gravação de áudio no NoiseCapture](https://noise-planet.org/NoiseCapture_privacy_policy.html).
