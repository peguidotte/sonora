# API de contexto do imóvel

**Estado em 07/11/2026: candidata aprofundada a pedido do usuário.** Reúne os módulos de [ruído](dados-acusticos.md) e [contexto hidrológico](contexto-hidrologico-imoveis.md), com API para empresas e painel de consulta/operação. A solução final da GS continua aberta.

## Problema e situação de uso

Uma pessoa compara imóveis por preço, localização e características internas, mas uma visita pode não revelar a rotina sonora e o contexto de inundação do entorno. Uma plataforma imobiliária precisa reunir essas informações para muitos endereços com origem e cobertura conhecidas.

Cliente proposto: plataforma imobiliária, imobiliária ou consultoria de localização. Beneficiário: quem escolhe onde morar ou instalar uma atividade. A tecnologia facilita consulta e comparação; não decide universalmente se um lugar é bom.

## Produto e jornada

1. Uma empresa envia coordenadas de um imóvel à API.
2. A API consulta os módulos disponíveis e devolve dimensões separadas.
3. O sistema do cliente apresenta perfil sonoro e evidências hidrológicas.
4. A pessoa compara dois locais e identifica pontos para investigar.
5. O painel interno mostra fontes, atualizações, cobertura e dispositivos offline.

A primeira versão usa coordenadas, evitando depender de uma geocodificação de endereços ainda não contratada ou validada. O app Expo permite comparar locais favoritos e consultar os mesmos dados.

## Dimensões entregues

| Dimensão | Informação proposta | Limite |
| --- | --- | --- |
| Ruído | Indicadores por ponto, janela, dia e horário, com metadados de medição | Exterior não descreve automaticamente o interior do imóvel |
| Inundação | Interseção com áreas mapeadas, fonte, versão e contexto disponível | Mapa estrutural não é previsão de uma ocorrência amanhã |
| Cobertura | Local/período amostrado, distância da leitura e atualização | Falta de dados aparece como desconhecida |
| Origem | Medição real, simulação de demonstração, estimativa ou camada oficial | Não misturar categorias no mesmo resultado sem identificação |

Não construir um índice único de bom lugar na primeira versão. Preferências variam: o usuário pode comparar dimensões sem receber uma conclusão que os dados não sustentam.

## API e arquitetura propostas

Um endpoint conceitual de consulta por latitude/longitude responde com módulos independentes. Cada módulo inclui status de cobertura, fonte, data, indicador e limitações pertinentes. Consultas em lote permitem comparar carteiras de imóveis.

O backend C#/SOA usa banco geográfico para camadas e séries temporais para medições acústicas. A ingestão de sensor é separada do acesso comercial. O painel pode administrar fontes e sensores; chaves de clientes identificam consumo da API. Cobrança real fica fora do protótipo inicial.

Exemplo de resultado em linguagem de produto: o ponto possui medições sonoras apenas em dias úteis à tarde e não tem cobertura hidrológica adequada. A resposta deve expor isso; não atribuir silêncio noturno ou baixa exposição por ausência de observações.

## Fontes verificadas

O [NoiseCapture disponibiliza indicadores e metadados acústicos](https://noise-planet.org/noisecapture_exploit_data.html). É candidato para o experimento, dependendo da distribuição dos pontos e horários.

O [GeoSampa descreve sua camada de Risco Hidrológico como mapeamento em assentamentos precários próximos a córregos](https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/cefffc6d-8d1d-419b-a267-8d87a37b9e0e). Não representa toda localização de São Paulo. O [SGB disponibiliza cartografia de suscetibilidade](https://www.sgb.gov.br/pt/web/guest/cartografia-de-suscetibilidade) para investigar cobertura complementar. As geometrias do recorte ainda não foram inspecionadas.

Ausência de interseção só informa que o ponto não intersecta os polígonos consultados. Mesmo em uma área mapeada, isso não garante ausência de alagamento, especialmente se a camada descreve outro processo ou população.

## Por que uma empresa pagaria

Hipóteses comerciais: integração no fluxo de busca, padronização de fontes, consulta em lote e atualização rastreável. Só há justificativa para cobrança se isso reduzir trabalho ou melhorar uma decisão que o cliente valoriza. Um mapa gratuito pode bastar para quem consulta poucos locais.

Os módulos poderiam ser contratados separadamente ou em pacote, mas preço, licenciamento de reuso e interesse de comprador não foram validados. Não tratar acesso público como autorização irrestrita de qualquer redistribuição.

## Protótipo da GS

Recorte de uma região com cobertura conferida, duas localizações comparáveis e poucos dispositivos de demonstração. Um ESP32/Wokwi representa a estação sonora; não produz medição acústica calibrada real. O módulo hidrológico inicial utiliza camadas públicas e informa sua cobertura, sem exigir instalar sensores de água.

ML pode estudar padrões acústicos em dados reais públicos, escolhendo pergunta e divisão de treino/teste após conferir o conjunto. Não é necessário ter um modelo distinto em cada módulo. Não usar uma camada de risco como atributo e alvo ao mesmo tempo.

Linux provisiona API, banco e tarefas de ingestão, monitora recursos e serviços e demonstra recuperação. Mobile consulta e compara locais. Testing verifica resultados com cobertura completa, parcial e ausente, incluindo falha independente de um módulo.

## Critérios para avançar

- Confirmar dados reais suficientes para ML e os dois módulos no recorte.
- Mostrar a um potencial consumidor da API uma comparação com fontes e lacunas.
- Verificar se ele precisa de API ou se a consulta manual já basta.
- Demonstrar integração por um cliente de exemplo, sem tratá-lo como comprador real.
- Não iniciar uma rede urbana de sensores para conseguir concluir a GS.
