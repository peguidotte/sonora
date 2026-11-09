# Pesquisa de problemas cotidianos em São Paulo

Pesquisa em 07/11/2026 para substituir a escolha de ideias apenas pelo encaixe nas disciplinas. Nenhuma proposta abaixo foi escolhida ou validada com usuários.

## O que conta como abrangência na GS

O briefing CitizenTech permite iniciativas com empresas e comunidades (p. 6), inclui empreendedores entre os cidadãos beneficiados (p. 7) e pede um problema próximo que possa ser investigado (pp. 17–19). Um piloto em uma escola é compatível com essa orientação quando o benefício ao cidadão e a possibilidade de aplicação em outros locais são demonstrados.

A escola de dança da mãe do Pedro é uma possibilidade de acesso, informada por ele. Os problemas de gerenciamento ainda não foram detalhados. Não há evidência de que existam problemas de ruído, acessibilidade ou outros temas específicos na escola.

## Método e limites

Foram cruzados relatórios municipais, jornalismo e relatos públicos. Reclamações demonstram problemas relatados, mas não comprovam demanda por um produto. Uma ocorrência online não substitui a conversa com alguém exigida no briefing.

Distinguir manifestações da Ouvidoria, solicitações do SP156, pessoas e ocorrências físicas. Não somar números de canais ou períodos diferentes como se fossem a mesma população. Quantidade de protocolos também depende do acesso e hábito de reclamar.

O portal municipal já disponibiliza relatório de setembro de 2026. O documento tem inconsistências internas em percentuais e em partes do ranking; esta análise não utiliza esses percentuais nem constrói ranking numérico a partir dele.

## Ônibus e incerteza na espera

A [reportagem da Folha de 21/04/2026](https://www1.folha.uol.com.br/cotidiano/2026/04/linha-de-onibus-da-zona-norte-lidera-queixas-de-passageiros-em-sao-paulo.shtml), com dados da SPTrans, registra 19.310 queixas de espera excessiva em 2025, cerca de 40% das reclamações de ônibus daquele ano. A matéria inclui passageiros descrevendo discrepâncias entre intervalos anunciados e observados.

**Hipótese de problema:** quem depende diariamente de uma linha não consegue avaliar com confiança quanto vai esperar e quando a operação está fora do padrão.

**Recorte de produto a investigar:** acompanhamento de poucas linhas com irregularidade observada, horário da última atualização e alerta quando o intervalo foge do padrão. Comparar com as opções existentes antes de desenvolver.

A [SPTrans oferece GTFS e API Olho Vivo](https://www.sptrans.com.br/desenvolvedores/), sendo a API voltada a dados em tempo real e sujeita a chave de acesso. Isso não comprova disponibilidade de histórico suficiente para treinamento. Não confundir GTFS estático com viagens efetivamente realizadas.

**Riscos para a GS:** dependência de API, histórico para ML e contribuição útil de Physical Computing. Um display em local de espera pode ser hipótese para ESP32, mas exige justificar local e usuário.

## Barulho e decisão sobre o uso de espaços

Uma [reportagem do g1 disponibilizada no Globoplay](https://globoplay.globo.com/v/14337100/?s=0s) informa quase 50 mil queixas ao PSIU em 2025, com alta de 14% sobre 2024.

Um [relato público do criador do Mapa do Silêncio](https://www.reddit.com/r/saopaulo/comments/1qv5omd/criei_um_mapa_pra_voc%C3%AA_n%C3%A3o_cair_em_cilada_de/) apresenta um mapa que usa registros de reclamações para apoiar a escolha de um endereço. É precedente de solução e sinal qualitativo de interesse; não foram verificados usuários ativos, retenção ou eficácia.

Duas hipóteses diferentes merecem ser avaliadas:

- Morador que vai alugar um imóvel quer identificar histórico de reclamações na região antes de decidir.
- Responsável por escola, estúdio ou espaço cultural quer acompanhar episódios de ruído para ajustar sua operação e reduzir incômodo ao entorno.

A primeira tem um momento de uso claro, mesmo que pouco frequente. A segunda oferece uma rotina operacional e conexão mais direta com sensor. A eventual aplicação na escola depende de descobrir se esse problema realmente existe ali.

**Dados e ML:** investigar o detalhe dos dados públicos do SP156 e analisar padrões de reclamações por região e período. Esses registros não medem decibéis e não demonstram que um endereço específico é silencioso. Um modelo de reclamações não valida acusticamente uma sala.

**IoT:** simulação de entrada de nível sonoro e sinalização no ESP32, explicitamente identificada como simulação. Um dispositivo real precisaria de validação de medição. Não apresentar protótipo como medição oficial nem registrar conversas.

## Lixo que volta depois da limpeza

A [justificativa do PL municipal 1126/2025](https://www.saopaulo.sp.leg.br/iah/fulltext/justificativa/JPL1126-2025.pdf) cita 79.632 reclamações de lixo e limpeza urbana no primeiro semestre de 2025. O documento remete ao SP156; o número não foi recalculado a partir da base nesta pesquisa.

Em um [relato público de moradora](https://www.reddit.com/r/saopaulo/comments/1jiutn3/prefeito_pelo_amor_de_deus_retire_o_lixo_da_minha/), ela descreve solicitações de remoção que funcionam pontualmente, mas o descarte retorna no mesmo dia. O relato ajuda a formular a hipótese de reincidência; não permite medir sua frequência na cidade.

**Hipótese de problema:** registros tratam episódios isolados e não ajudam moradores ou responsáveis a enxergar a repetição no mesmo local.

**Recorte a investigar:** linha do tempo de um conjunto pequeno de pontos, com registros de limpeza, reincidência e evidências. Avaliar quem usaria esse histórico para agir.

O [SP156 já oferece solicitação e acompanhamento](https://prefeitura.sp.gov.br/web/inovacao/w/acesso_a_informacao/350229). Reproduzir esse formulário sem melhorar uma decisão concreta tem pouca justificativa. A utilidade do painel depende de alguém capaz de agir; software não substitui a coleta.

**Riscos para a GS:** validação com usuário que toma providências, dependência de serviço público e encaixe natural do sensor. Um sensor de lixeira não representa necessariamente descarte em terreno ou calçada.

## Comparação preliminar

| Caminho | Situação de uso | O que já sustenta a investigação | O que falta |
| --- | --- | --- | --- |
| Ônibus | Planejar deslocamento diário | Queixas quantificadas, entrevistas publicadas e API oficial | Diferencial, acesso e histórico de dados; papel de ESP32 |
| Barulho antes de alugar | Avaliar um endereço | Reclamações recorrentes e precedente de mapa | Qualidade do dado espacial e vantagem sobre a solução existente |
| Monitoramento de espaços | Ajustar operação ao longo do dia | Problema urbano de ruído e possibilidade de piloto local | Confirmar dor do responsável e decisão acionável |
| Reincidência de lixo | Acompanhar um ponto e decidir providências | Estatística municipal citada e relatos de retorno do lixo | Usuário com capacidade de ação e contribuição do sensor |

## Próxima investigação proposta

Comparar ônibus e barulho, em vez de manter Bairro Fresco como preferência técnica. Para cada um, conferir um arquivo real de dados, examinar a alternativa existente e formular uma jornada com decisão e resultado observáveis.

Se houver interesse na escola, começar pelos problemas de gestão que a mãe do Pedro já relata e investigar seus efeitos sobre alunos, responsáveis e professores. Não escolher ruído apenas porque combina com sensores.

A pesquisa pública traz precedência, mas a validação local continua pendente. A solução final e a arquitetura não foram alteradas por esta pesquisa.

## Fontes adicionais consultadas

- [Relatórios mensais da Ouvidoria em 2026](https://prefeitura.sp.gov.br/web/ouvidoria/w/relatorios_mensais/144782).
- [Relatório de setembro de 2026](https://prefeitura.sp.gov.br/documents/d/ouvidoria/relatorioogm_resumoexecutivo_setembro-pdf).
- [Relatório integrado SPTrans 2024](https://www.sptrans.com.br/relatorio-integrado-da-administracao-2024/).
- [Catálogo SP156](https://apilib.prefeitura.sp.gov.br/store/apis/info?name=SP156&provider=admin&version=v1).
