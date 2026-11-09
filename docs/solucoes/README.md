# Candidatas de solução para a GS

**Escolha em 08/11/2026: API de ruído, por orientação explícita do usuário.** A [proposta ativa](../02-proposta-de-solucao.md) e as [oito especificações](../disciplinas/README.md) substituem os exemplos antigos. A comparação abaixo preserva as quatro alternativas; inundação, água e Oásis não entram no escopo atual.

O [resumo curto para encaminhar ao grupo](../ideias-levantadas.md) tem versões em [imagem](../../output/ideias-levantadas/ideias-levantadas.png) e [PDF](../../output/ideias-levantadas/ideias-levantadas.pdf). As telas são ilustrativas.

A análise distingue precedente técnico/comercial e validação do nosso produto. Nenhuma candidata tem comprador confirmado, entrevista concluída, preço definido ou resultado de campo.

## Candidatas pesquisadas

| Candidata | Quem usaria ou pagaria | Ação melhorada | Principal barreira | Avaliação preliminar |
| --- | --- | --- | --- | --- |
| [API de ruído](dados-acusticos.md) | Plataforma imobiliária ou imobiliária | Consultar perfil sonoro de locais | Cobertura e qualidade das medições | Escolhida em 08/11/2026 |
| [API de inundação](contexto-hidrologico-imoveis.md) | Plataforma imobiliária, imobiliária ou consultoria | Consultar contexto hidrológico com fontes e cobertura | Alcance das camadas e precisão do recorte | Incluída na escolha do grupo |
| [Água por unidade](agua-em-edificios.md) | Condomínio/administradora contrata; morador e síndico usam | Acompanhar consumo diário e investigar anomalias | Medição por unidade, integração e permissões | Incluída na escolha do grupo |
| [Oásis SP](oasis-sp.md) | Trabalhadores de rua e idosos | Consultar avisos de calor e disponibilidade de pontos de apoio | Validação da utilidade e dos pontos | Proposta do colega incluída na escolha |

A [possível integração das APIs](contexto-do-imovel.md) permanece documentada sem unificar suas implementações por padrão. [Refrigeração](refrigeracao.md) saiu das prioridades por preferência do usuário e permanece como histórico. Oásis SP foi incluído por solicitação atual, com base na proposta do colega; isso não reativa automaticamente os contratos antigos de Bairro Fresco.

A avaliação é julgamento de viabilidade, não medição de mercado. Soluções de monitoramento precisam de alguém capaz de agir; o software não realiza manutenção nem corrige fisicamente o problema.

## Dados reais para ML

| Candidata | Fonte identificada | O que ainda falta |
| --- | --- | --- |
| Acústica | NoiseCapture | Conferir cobertura geográfica e temporal |
| Água | AMPds2 | Conferir arquivos; o experimento em uma residência não valida automaticamente múltiplos apartamentos brasileiros |
| Hidrológica | GeoSampa e SGB | Confirmar cobertura, alvo e validação sem copiar categoria da própria camada |
| Oásis SP | INMET, conforme proposta recebida | Conferir estação, série e critérios do experimento |

A pesquisa inicial verificou descrições e metadados públicos. Atualização de 08/11: o dump brasileiro NoiseCapture foi baixado e os arquivos de São Paulo foram contados; ver [auditoria inicial](../dados/noisecapture-auditoria-inicial.json). Não houve limpeza completa, treino ou instalação de sensores.

## Critérios e propostas não priorizadas

- [Critérios definidos com o usuário](criterios.md).
- [Triagem de outras ideias](triagem.md).

Antes de escolher, verificar um arquivo real de dados e demonstrar em poucas telas a decisão do usuário. A validação de adoção exige contato com um potencial usuário ou comprador; existência de concorrente não substitui esse contato.

## Efeito sobre os documentos anteriores

Os requisitos acadêmicos continuam válidos. Proposta, contratos e especificações foram reescritos em 08/11 para API de ruído. Exemplos e imagens anteriores permanecem históricos.

A execução principal continua sendo Linux com Pedro. As demais disciplinas já têm fichas acústicas; os responsáveis nominais ainda precisam ser definidos.

## Comparação das frentes aprofundadas

| Aspecto | Contexto do imóvel | Água individual e condomínio |
| --- | --- | --- |
| Uso principal | Comparação antes de escolher localização | Acompanhamento recorrente de consumo |
| Receita proposta | API por volume/assinatura | Contrato por condomínio/unidade, com integração/instalação |
| Mobile | Consulta e comparação de locais | Jornada do morador e acompanhamento de alertas |
| IoT | Medições sonoras de demonstração | Medidores por unidade de demonstração |
| Dependência central | Dados espaciais e temporais com cobertura suficiente | Telemetria individual com frequência e acesso adequados |
| Principal validação de produto | Plataforma precisa da API e valoriza o contexto | Experiência e investigação melhores que o sistema já utilizado |

Gás é extensão possível da frente de consumo, com medidores e regras próprios. Não houve autorização ou execução de instalação física, contratação ou integração com fornecedor real.
