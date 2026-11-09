# Acompanhamento individual de água e gestão do condomínio

**Estado: candidata aprofundada a pedido do usuário em 07/11/2026.** Moradores acompanham a própria unidade; condomínio acompanha total e áreas comuns. A implantação pode ser contratada pelo prédio, com uso individual pelo aplicativo. Água é o recorte inicial; gás é possível extensão, não parte já implementada.

## Quem usaria e por quê

O morador quer saber quanto consumiu ontem, como o consumo evolui no mês e se existe uma mudança que merece investigação. O síndico quer acompanhar o prédio e as áreas comuns. Uma administradora pode acompanhar a carteira de imóveis sob sua responsabilidade.

Cliente pagante proposto: condomínio ou administradora, por unidade/ponto monitorado, com instalação e integração conforme a infraestrutura. Em uma casa, o próprio morador pode contratar um ponto. Beneficiários: moradores e responsáveis pela gestão. Um vazamento específico não é confirmado somente por consumo elevado.

## Ação concreta

Exemplo fictício: o aplicativo informa 380 litros consumidos ontem e mostra comparação com o próprio histórico. Mais tarde, detecta fluxo persistente em uma janela que costuma ter pouco consumo. O morador verifica usos legítimos, torneiras ou descarga e registra se resolveu ou precisa de manutenção. Não identificar qual aparelho consumiu apenas pelo medidor da unidade.

O software reduz o tempo entre uma anomalia e sua investigação. O conserto continua físico. No protótipo, não há fechamento automático de válvula nem promessa de localizar um cano rompido.

## O que precisa existir para medir por apartamento

O consumo individual precisa vir de medição da própria unidade. O medidor geral sozinho não permite atribuir consumo medido a cada apartamento. Rateio por moradores, área ou média é estimativa e não pode ser mostrado como leitura real.

| Situação do prédio | Possibilidade |
| --- | --- |
| Medidores individuais com telemetria e acesso autorizado aos dados | Integrar fornecedor/gateway, conferindo frequência e interface |
| Medidores individuais lidos manualmente | Investigar adaptador compatível ou troca; uma leitura mensal não fornece consumo diário real |
| Somente medidor geral | Mostrar total; individualizar exige instrumentação das entradas das unidades |
| Várias entradas por apartamento | Medir e somar as entradas pertinentes, com cadastro correto |

Não foi conferida a instalação do prédio do usuário. Compatibilidade de equipamentos e acesso à interface dos fornecedores continuam pendentes.

## Visão do morador

- Consumo de ontem, dia atual e mês, com unidade, período e última leitura.
- Histórico e comparação com períodos equivalentes do próprio apartamento.
- Meta mensal opcional e aviso de tendência de ultrapassagem.
- Alerta de consumo persistente, com explicação e confirmação de usos legítimos.
- Estimativa de custo separada de cobrança oficial e com parâmetros identificados.
- Estado de atualização; falha de envio não é consumo zero.

Dados em dinheiro dependem da regra de cobrança, período, tarifa e eventual rateio de áreas comuns. A primeira versão pode priorizar litros e metros cúbicos para não confundir estimativa com fatura.

## Permissões propostas

| Perfil | Acesso inicial proposto |
| --- | --- |
| Morador | Leituras e alertas das unidades às quais está vinculado |
| Síndico | Total do condomínio, áreas comuns e indicadores agregados |
| Síndico com permissão adicional | Detalhamento das unidades explicitamente permitido na política do condomínio |
| Administradora | Somente condomínios contratados e nos limites concedidos |
| Técnico | Estado de medidor e informações necessárias à manutenção |

O usuário levantou tanto acesso geral quanto por unidade para o síndico. A proposta inicial prioriza agregado e torna o acesso individual uma decisão explícita, não uma consequência automática do cargo.

O backend valida vínculo, condomínio, unidade e operação em toda consulta. Ocultar uma tela não protege a API. A [OWASP recomenda verificar autorização por objeto](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/), relevante para impedir que trocar o identificador de uma unidade revele dados de outra. A troca de morador precisa encerrar o vínculo anterior; a política de acesso a histórico da ocupação anterior fica a definir.

## Como construir

Ler pulsos de medidor compatível ou receber integração autorizada de telemetria. Fluxo: medidor por unidade → gateway/ESP32 → API → banco → agregações → app do morador e painel do condomínio. Uma residência pode ter um único ponto e compartilhar a mesma plataforma.

Cadastrar condomínio, unidade, medidor, fator de conversão e vínculos de acesso. Guardar leituras com timestamp e origem, tratar duplicidade e troca/reset do medidor. Em contadores cumulativos, calcular diferença entre leituras válidas. O recorte de ontem precisa respeitar o fuso e a cobertura do período; não dividir consumo mensal por 30 e chamar de diário medido.

Se houver totalizador e medidores de unidades, comparar volumes em janelas alinhadas e considerar reservatórios, áreas comuns, cobertura e tolerâncias. A diferença não comprova sozinha um vazamento.

As regras precisam considerar horário de funcionamento, reservatórios, limpeza e usos legítimos. Falta de comunicação é falha de telemetria, não prova de ausência de consumo.

Há precedente comercial: a [Techem descreve consulta de consumo diário pelo morador](https://www.techem.com/br/pt/informacoes-sobre-os-servicos/chame-a-techem-para-sua-assembleia), e a [CAS anuncia telemetria, leitura diária e aplicativo de consumo individual](https://mi.castecnologia.com.br/individualizacao-de-agua/). Portanto, mostrar consumo diário sozinho não diferencia nossa proposta.

Hipóteses de diferenciação: integrar fornecedores distintos quando houver acesso, apresentar origem e atualização claramente, explicar anomalias e acompanhar resolução, além de separar a experiência do morador da administração. Ainda precisam ser comparadas aos produtos existentes. Não presumir que o fornecedor disponibilize API pública nem que qualquer medidor seja compatível.

A [Wint](https://wint.ai/frequently-asked-questions/) continua como precedente de monitoramento de edifícios; suas afirmações de desempenho não foram adotadas como metas.

## Extensão para gás

A arquitetura pode receber gás como outro recurso, usando leituras de medidor compatível, unidade própria e regras específicas. Isso não decorre do medidor de água. No escopo da GS, começar por água; uma série de gás de demonstração pode representar integração futura, identificada como simulação, sem intervenção física no sistema do prédio.

## Dados e ML

O [AMPds2 é descrito pelos autores como medições de eletricidade, água e gás em uma residência canadense durante dois anos](https://www.nature.com/articles/sdata201637.pdf). A [listagem do IEEE](https://ieee-pes-data-sharing.org/datasets/detail/8a4fd91f-a155-43b0-939b-48d36ba2740a) o classifica como dado real, público e com amostras de um minuto.

Experimento proposto: prever consumo agregado na próxima janela com Random Forest e comparar com um baseline temporal. Alertas por desvio precisam ser avaliados separadamente. Não transformar desvio de previsão em diagnóstico confirmado de vazamento.

É um único imóvel de outro país; o resultado não demonstra desempenho em condomínios brasileiros. Conferir variáveis, unidade, distribuição de consumo, acesso aos arquivos e licença antes de adotar.

Foi descartado o uso automático do benchmark [BattLeDIM/L-Town](https://battledim.ucy.ac.cy/?page_id=30): sua descrição apresenta uma cidade hipotética. Não tratar esse benchmark como coleta real para atender à disciplina sem verificar a procedência e obter alinhamento.

## Protótipo da GS

- ESP32/Wokwi representa pulsos e fluxo de três unidades e um ponto comum, com origem simulada.
- Alteração do fluxo produz consumo, alerta e recuperação.
- Backend C#/SOA, banco e regra temporal.
- App Expo para dois moradores fictícios; painel para o síndico com visão geral e permissões configuradas.
- Linux instala serviços, monitora recursos e coleta logs.
- ML usa dados reais públicos em experimento independente e explicitamente limitado.

Aceite: reproduzir consumo habitual, fluxo persistente e interrupção da comunicação; mostrar consumo diário e confirmação. O morador A não acessa a unidade B nem manipulando o identificador da API. O síndico acessa agregado e só obtém detalhe quando houver permissão. Medidores sem amostras suficientes não produzem consumo zero fictício.

## O que pode inviabilizar

Instalação do medidor, acesso ao encanamento, compatibilidade de pulsos, alcance da rede, falhas do sensor e ausência de alguém para investigar. Um simples alarme comercial pode ser suficiente em imóveis pequenos; a plataforma precisa justificar o acompanhamento de histórico ou múltiplos pontos.

## Primeiro teste de utilidade

Validar duas jornadas: morador entendendo consumo e possível anomalia, e administração acompanhando atualização e áreas comuns. Conferir o acesso real aos medidores antes de prometer implantação. Comparar clareza e capacidade de ação ao produto já utilizado. Não atribuir litros economizados ao protótipo sem medição.
