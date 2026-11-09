# Monitoramento de refrigeração para pequenos estabelecimentos

**Estado: não priorizada pelo usuário em 07/11/2026.** A ficha permanece como histórico da pesquisa. Ainda não validada com compradores. Recorte investigado: alimentos em pequenos mercados, padarias e cozinhas.

## Quem usaria e por quê

O responsável por uma loja precisa saber quando um equipamento deixa de manter o comportamento térmico esperado, inclusive fora do horário de atendimento. Uma empresa de manutenção pode acompanhar equipamentos de vários clientes.

Cliente pagante proposto: estabelecimento por equipamento/local, ou mantenedora por carteira de clientes. Beneficiários: proprietário, funcionários e consumidores. A hipótese econômica é reduzir descoberta tardia de problemas e trabalho de inspeção; economia ainda não foi medida.

## Ação concreta

Exemplo de jornada: uma temperatura permanece fora da faixa configurada por um período; o responsável recebe um incidente com tendência, duração e equipamento; confirma o recebimento e verifica porta, alimentação ou necessidade de manutenção. O sistema acompanha se a condição retorna ao normal e guarda o histórico.

A plataforma amplia a observação contínua e remota. A conservação e a manutenção física continuam com pessoas e equipamentos. Sem responsável disponível para agir, o valor do alerta diminui.

## Como construir

Sensor de temperatura e estado de porta, quando disponível, enviam telemetria. API armazena séries e aplica regras com duração e histerese, para não alertar a cada oscilação. Painel agrupa equipamentos por local; app mostra incidentes e confirmação. Webhooks permitem integração com sistemas de manutenção.

O diferencial a investigar é um fluxo simples e integração para pequenos operadores. Não alegar que gráficos e alertas são novos. O [Sitrad Pro já tem API para temperaturas, histórico e alarmes](https://sitrad.com.br/api/); a [Danfoss oferece o Alsense](https://www.danfoss.com/en-us/products/dcs/monitoring-and-services/alsense-food-retail-iot-cloud-application-for-supermarkets/) para operação de refrigeração. Esses precedentes mostram uma categoria existente, sem comprovar demanda pela nossa versão.

## Dados e ML

A [Bonneville Power Administration descreve dados reais de 17 circuitos em cinco locais, coletados durante 2017](https://www.bpa.gov/energy-and-services/conservation/emerging-technologies/portfolio/refrigeration-data-share). A frequência informada é de um minuto, com variáveis medidas e calculadas.

Candidato de experimento: Random Forest para prever uma variável térmica ou de consumo em um horizonte curto, escolhida após conferir o dicionário. Avaliar contra persistência, separar períodos e evitar misturar registros quase idênticos entre treino e teste.

O catálogo foi conferido; arquivos e colunas ainda não foram validados. Dados de circuito comercial não são automaticamente temperatura de alimento. Sem rótulos de falha, não apresentar o modelo como diagnóstico de defeito ou previsão de avaria. Alarmes iniciais podem usar regras; ML deve provar benefício em uma pergunta mensurável.

## Protótipo da GS

- Dois equipamentos simulados no Wokwi com ESP32 e entrada de temperatura.
- Um incidente por persistência fora da faixa, confirmação e recuperação.
- API C#/SOA, banco persistente, painel e app Expo.
- Linux provisiona componentes, registra auditoria e demonstra recuperação.
- Notebook executado em dados reais públicos, separado da telemetria sintética.

Aceite: mudar uma leitura no circuito produz registro no backend, incidente no app e fechamento após recuperação. Interromper o envio precisa produzir estado desconhecido/offline, sem aparentar normalidade.

## O que pode inviabilizar

Acesso a dados adequados para ML; precisão e instalação do sensor real; conectividade no local; excesso de falsos alertas; um concorrente já resolver a necessidade com custo e integração melhores. Hardware, instalação, suporte e entrega de notificações compõem o custo real.

Não prometer certificação sanitária, segurança do alimento ou percentuais de redução de perdas a partir do protótipo. A proposta precisa demonstrar telemetria e resposta a incidentes.

## Primeiro teste de utilidade

Mostrar a jornada a um responsável por equipamentos ou a uma mantenedora e comparar com a rotina atual. Medir tempo para reconhecer o incidente, entender a causa provável e registrar providência. Antes de preço, verificar se essa pessoa já enfrenta descoberta tardia e o que faria ao receber o alerta.
