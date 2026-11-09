# Dificuldade das quatro ideias por disciplina

**Atualização de 08/11:** o usuário escolheu API de ruído. A comparação abaixo é histórica; [especificações de execução](disciplinas/README.md).

Análise em 07/11/2026 para comparar **protótipos da GS**, com base nas rubricas já coletadas do PDF oficial e do Teams em 06/11. Os níveis são estimativas nossas, não notas dos professores nem garantia de prazo. Nenhuma solução foi escolhida.

**Leitura principal:** Oásis SP tem a implementação mais previsível; as duas APIs têm maior incerteza de dados e integração; água acrescenta isolamento por unidade e dependência de medição individual. Isso não determina a melhor oportunidade comercial nem valida a adoção pelo público.

## Como ler a escala

- **Baixa:** poucos componentes conhecidos, regras simples e demonstração direta.
- **Média:** integração, persistência, tratamento de erros e testes, com escopo delimitado.
- **Alta:** dados ainda incertos, integração especializada ou regras que exigem cuidado maior para provar o funcionamento.

O esforço geral considera as dependências e incertezas, não uma média matemática dos níveis. Não estimamos dias sem conhecer disponibilidade do grupo e familiaridade com as ferramentas.

## Comparação rápida

| Disciplina | Ruído | Inundação | Água por unidade | Oásis SP |
| --- | --- | --- | --- | --- |
| C# / .NET | Média | Média | Alta | Média |
| SOA / Web Services | Média | Alta | Média | Média |
| Mobile | Média | Média | Média | Média |
| Physical Computing / IoT | Média | Média | Média | Baixa |
| IA / Machine Learning | Alta | Alta | Alta | Alta |
| Operating Systems / Linux | Média | Média | Média | Média |
| Cybersecurity | Alta | Alta | Alta | Alta |
| Testing / QA | Média | Média | Média | Média |
| **Esforço geral** | **Alto** | **Alto** | **Alto** | **Médio** |

## 1. API de ruído

Perfil sonoro por local e horário para plataformas imobiliárias.

| Disciplina | Complexidade | O que construiríamos |
| --- | --- | --- |
| C# / .NET | Média | API de locais, sensores e medições; consultas por horário e perfil sonoro. |
| SOA / Web Services | Média | Ingestão, histórico e agregação de medições; banco, migrations, documentação e testes. |
| Mobile | Média | App Expo para consultar locais e horários; favoritos em banco local. |
| Physical Computing / IoT | Média | ESP32 no Wokwi simula intensidade sonora, mostra o nível e envia leituras. |
| IA / Machine Learning | Alta | Agrupar perfis acústicos com dados reais; validar cobertura, amostras e avaliação. |
| Operating Systems / Linux | Média | Bash: rede, app e banco; systemd, CPU/RAM/disco, logs e recuperação do monitor. |
| Cybersecurity | Alta | Evoluir o motor de parsing: PII, taint analysis, explicação por LLM e painel Risco Cidadão. |
| Testing / QA | Média | Features e testes positivos/negativos no Azure; PDF com evidências e pitch. |

**Atenção:** Gargalo: dados acústicos reais com cobertura útil. Sensor simulado não mede decibéis calibrados; a rede física fica fora do protótipo.

**Escopo:** Recorte: poucos locais; sem prometer cobertura de toda São Paulo.

[Imagem para compartilhar](../output/complexidade-ideias/01-api-ruido.png).

## 2. API de inundação

Contexto de inundação por coordenada para avaliar localizações.

| Disciplina | Complexidade | O que construiríamos |
| --- | --- | --- |
| C# / .NET | Média | API por coordenada: áreas mapeadas, registros, fontes e limites de cobertura. |
| SOA / Web Services | Alta | Importar mapas, ajustar projeções e consultar interseções geográficas no banco. |
| Mobile | Média | App Expo para consultar endereços, ver contexto e salvar locais em banco local. |
| Physical Computing / IoT | Média | ESP32 no Wokwi simula nível da água em um ponto e envia alerta local. |
| IA / Machine Learning | Alta | Agrupar perfis de exposição com dados urbanos reais; integrar bases e avaliar os grupos. |
| Operating Systems / Linux | Média | Bash: rede, app e banco; systemd, CPU/RAM/disco, logs e recuperação do monitor. |
| Cybersecurity | Alta | Evoluir o motor de parsing: PII, taint analysis, explicação por LLM e painel Risco Cidadão. |
| Testing / QA | Média | Features e testes positivos/negativos no Azure; PDF com evidências e pitch. |

**Atenção:** Gargalo: mapas e dados compatíveis. Sensor local complementa a API; não valida todo o mapa. Sem registro não significa local seguro.

**Escopo:** Recorte: uma região; contexto histórico, sem prever uma inundação específica.

[Imagem para compartilhar](../output/complexidade-ideias/02-api-inundacao.png).

## 3. Água por unidade

Consumo diário e alertas para moradores, com visão geral do condomínio.

| Disciplina | Complexidade | O que construiríamos |
| --- | --- | --- |
| C# / .NET | Alta | API de prédios, unidades e leituras; permissões por morador e regras de alertas. |
| SOA / Web Services | Média | Ingerir leituras, calcular consumo por período e tratar falhas; banco e testes. |
| Mobile | Média | App Expo: consumo diário, histórico e alertas; cada morador acessa sua unidade. |
| Physical Computing / IoT | Média | ESP32 no Wokwi simula pulsos de hidrômetros de poucas unidades e envia leituras. |
| IA / Machine Learning | Alta | Modelar consumo com base real pública; confirmar aderência da base à exigência de dados da cidade. |
| Operating Systems / Linux | Média | Bash: rede, app e banco; systemd, CPU/RAM/disco, logs e recuperação do monitor. |
| Cybersecurity | Alta | Evoluir o motor de parsing: PII, taint analysis, explicação por LLM e painel Risco Cidadão. |
| Testing / QA | Média | Features e testes positivos/negativos no Azure; PDF com evidências e pitch. |

**Atenção:** Gargalos: medição por unidade e base real para ML. Medidor geral não revela consumo individual. Síndico vê o agregado; detalhe exige política.

**Escopo:** Recorte: poucas unidades simuladas; gás fica para uma extensão futura.

[Imagem para compartilhar](../output/complexidade-ideias/03-agua-por-unidade.png).

## 4. Oásis SP

Avisos de calor, pontos de apoio e totem para trabalhadores de rua e idosos.

| Disciplina | Complexidade | O que construiríamos |
| --- | --- | --- |
| C# / .NET | Média | API de pontos de apoio, reportes dos usuários e avisos por região. |
| SOA / Web Services | Média | Ingerir dados climáticos, calcular indicador de calor e manter histórico e testes. |
| Mobile | Média | App Expo acessível: calor do dia, pontos e reportes; persistência local em SQLite. |
| Physical Computing / IoT | Baixa | ESP32 + DHT22 no Wokwi; display, LEDs e botão para reportar falta de água. |
| IA / Machine Learning | Alta | Prever calor no dia seguinte com INMET real; separar dados por tempo e evitar vazamento. |
| Operating Systems / Linux | Média | Bash: rede, app e banco; systemd, CPU/RAM/disco, logs e recuperação do monitor. |
| Cybersecurity | Alta | Evoluir o motor de parsing: PII, taint analysis, explicação por LLM e painel Risco Cidadão. |
| Testing / QA | Média | Features e testes positivos/negativos no Azure; PDF com evidências e pitch. |

**Atenção:** Caminho técnico mais previsível. Ainda exige justificar os níveis de calor, manter pontos atualizados e validar se o público usaria.

**Escopo:** Recorte: Paulista/Bela Vista; pontos cadastrados, sem promessa clínica personalizada.

[Imagem para compartilhar](../output/complexidade-ideias/04-oasis-sp.png).

## Por que os maiores riscos mudam

**Ruído:** um endpoint de consulta é viável; o difícil é ter observações suficientes para representar dia, horário e localização. Para IoT, um controle analógico no Wokwi pode representar intensidade e acionar display/LED, com envio de leitura. É demonstração de fluxo, não sonômetro calibrado. Para ML, a proposta é KMeans + PCA para agrupar observações reais por perfil acústico; não prometer previsão noturna com amostras esparsas. O [NoiseCapture disponibiliza indicadores e metadados](https://noise-planet.org/noisecapture_exploit_data.html), mas ainda precisamos verificar arquivos, volume e cobertura no território escolhido. Se não houver base adequada, essa parte precisa mudar antes de fechar a proposta.

**Inundação:** consultar interseção entre uma coordenada e um polígono é delimitável; a importação de formatos, projeções, qualidade e cobertura aumenta a dificuldade. Uma opção é banco com suporte geográfico. Para IoT, um sensor de distância/nível simulado representa a água em um ponto, com alerta e timestamp; ele não comprova a exposição de todos os imóveis. Para ML, KMeans + PCA pode agrupar áreas por características reais de terreno, chuva e ocupação; são perfis para análise, não probabilidade validada de inundação. Falta selecionar e compatibilizar essas bases. A [camada de risco hidrológico do GeoSampa](https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/cefffc6d-8d1d-419b-a267-8d87a37b9e0e) tem recorte de assentamentos precários junto a cursos d'água; não representa cobertura completa de toda a cidade. Outras fontes, como a [cartografia de suscetibilidade do SGB](https://www.sgb.gov.br/pt/web/guest/cartografia-de-suscetibilidade), precisam ser avaliadas conforme o recorte. A API deve devolver fonte, data e ausência de cobertura explicitamente.

**Água:** o valor ao morador é direto, mas a API precisa impedir acesso à unidade alheia, lidar com leituras duplicadas/ausentes e diferenciar volume acumulado de consumo por período. Simular poucas unidades mantém o IoT controlável; não precisamos comprar ou instalar hidrômetros para demonstrar a GS. O produto real depende de medição individual e acesso à telemetria. Para ML, uma proposta é Random Forest para estimar consumo esperado com histórico e marcar desvios como sinais para investigação. Sem ocorrências rotuladas, não se pode afirmar detecção validada de vazamentos. A [base AMPds2](https://www.nature.com/articles/sdata201637.pdf) é uma candidata real de uma residência canadense, mas não resolve automaticamente a exigência de dados públicos sobre a cidade e precisa de confirmação de aderência com o professor. Sua granularidade e contexto também não comprovam desempenho em apartamentos brasileiros. **Hoje, a base de ML de água ainda é uma pendência impeditiva para considerar o plano fechado.**

**Oásis:** cadastro de pontos, reportes e consulta do clima são fluxos mais conhecidos, e ESP32 + DHT22 é uma demonstração simples de sensor, saída visual e botão. Para ML, Random Forest ou XGBoost pode estimar a condição de calor do dia seguinte com o [histórico público do INMET](https://portal.inmet.gov.br/dadoshistoricos). Precisamos escolher estação/período, limpar ausências e justificar a classificação de calor; dados do dia previsto não podem entrar nas variáveis disponíveis no dia anterior. A maior previsibilidade técnica não comprova que as pessoas usarão o app nem garante que os pontos de apoio estejam abertos. Manutenção dos pontos e validação com usuários continuam necessárias.

## Requisitos comuns que as imagens resumem

Estas são **exigências das rubricas**, independentemente da ideia escolhida. Os exemplos e divisões de responsabilidade acima são **propostas do grupo**.

| Disciplina | O que precisa aparecer na entrega |
| --- | --- |
| C# | API .NET, POO, interfaces, injeção de dependência, EF Core + LINQ, async/await, testes unitários, Swagger/Scalar, README e evidências. Não basta expor consultas sem demonstrar os critérios. |
| SOA | Domínio estruturado, banco, migrations, documentação automática, testes e evidências. Dividir a responsabilidade lógica entre clima, telemetria ou importação é sugestão; um segundo microserviço não é exigência. Confirmar com os professores o reaproveitamento de base/repositório entre C# e SOA. |
| Mobile | React Native com TypeScript e Expo Router, banco/persistência, acessibilidade, ficha/README, prints e vídeo de até 3 minutos. API ou mock é permitido. Uma API B2B com dashboard web ainda precisa de app para atender esta matéria. |
| Physical Computing | ESP32 funcional no Wokwi, integrado à solução; link, vídeo de até 4 minutos e TXT de integrantes. Leituras podem ser simuladas nesta parte. |
| IA / ML | Dados reais e públicos sobre a cidade, modelo permitido, ao menos 10 combinações de 3 hiperparâmetros, validação cruzada somente no treino, comparação treino/teste, gráficos, análise de overfitting e interpretação cidadã. Notebook executado, fonte/período dos dados, requirements, relatório e vídeo de até 5 minutos. Dados do Wokwi não substituem essa base. |
| Linux | Bash para rede/IP/DNS/hostname, usuários/permissões, dependências, ambiente/banco e aplicação de outra matéria; monitor de CPU/RAM/disco com alertas, monitor como serviço systemd resiliente, logs de auditoria e falhas controladas. GitHub, README, evidências e vídeo de até 7 minutos. |
| Cybersecurity | Evoluir o motor de parsing usado em aula: detecção de PII, taint analysis com bloqueio de saídas indevidas, tradução das falhas por LLM e dashboard Risco Cidadão. ZIP, evidências de auditoria, vídeo e print. A base de aula ainda precisa ser identificada. Login e permissões são adicionais, não substituem esse módulo. Usar fixtures sintéticas de PII, sem coletar saúde/CPF reais. |
| Testing | Features com critérios de aceite e Test Cases funcionais de caixa-preta positivos e negativos no Azure, com objetivo, preparação, entradas, saídas e passos. Professor Admin e PDF com link/capturas. Pitch geral no YouTube, até 4 minutos, identificado na entrega de Testing. |

Em ML, a estratégia de avaliação deve acompanhar a tarefa: separação temporal para previsão de séries; separação por local/dispositivo quando amostras correlacionadas puderem vazar entre conjuntos; para agrupamento, métricas e estabilidade adequadas, sem inventar acurácia supervisionada. A proposta KMeans + PCA também precisa cumprir a busca de hiperparâmetros e a avaliação da rubrica. Nenhum dataset foi baixado ou modelo treinado nesta análise.

## Dependências e decisão prática

1. **Validar o recorte e os dados de ML antes de escolher.** Ruído: cobertura/amostras; inundação: compatibilidade das camadas e variáveis; água: base aceita pela rubrica; Oásis: estação, período e definição do alvo.
2. **Ter uma API mínima cedo.** Ela destrava a hospedagem em Linux e fornece código para Cybersecurity. Mobile pode avançar com mock respeitando o contrato.
3. **Manter IoT conectado ao problema.** Telemetria deve ter dispositivo, local/unidade, horário e leitura; não adicionar sensor sem uso definido.
4. **Para o trabalho de Pedro em Linux, as quatro opções são próximas.** Um backend e um banco em VM/WSL com systemd mantêm o escopo controlável. Dois backends independentes ou infraestrutura extra aumentam a configuração; não são obrigatórios por inferência. A demonstração deve incluir falha e recuperação do serviço de monitoramento, não apenas reinício da aplicação.
5. **Testing começa com escopo e critérios de aceite**, sem esperar todo o código ficar pronto. Exemplo de caso negativo: unidade alheia em água; coordenada sem cobertura em inundação; local sem amostras em ruído; ponto fechado/reportado em Oásis.

Minha leitura para a discussão é: **Oásis reduz a incerteza de execução acadêmica; ruído e inundação preservam a proposta B2B de contexto do imóvel; água tem uma jornada clara, com mais cuidado em medição, permissões e dados de ML.** A escolha deve combinar esse esforço com a utilidade que o grupo conseguir validar. Ruído e inundação permanecem opções separadas; combiná-los agora amplia o escopo.

Fontes acadêmicas: [contexto e requisitos consolidados](01-contexto-e-requisitos.md), PDF oficial pp. 27–39 e tarefas registradas em [fontes/INVENTARIO.md](../fontes/INVENTARIO.md). Não houve nova consulta ao Teams nesta análise.

## Arquivos e geração

As quatro fichas estão em [output/complexidade-ideias](../output/complexidade-ideias/). O conteúdo estruturado está em [conteudo.json](../output/complexidade-ideias/conteudo.json), junto aos quatro prompts completos, um por imagem. Geradas com a ferramenta imagegen integrada, em modo padrão, e conferidas visualmente quanto a texto, presença das oito disciplinas e cortes. Nenhum software da solução foi implementado nem teste funcional foi executado nesta etapa.

Prompts finais: [ruído](../output/complexidade-ideias/prompt-01-api-ruido.txt), [inundação](../output/complexidade-ideias/prompt-02-api-inundacao.txt), [água](../output/complexidade-ideias/prompt-03-agua-por-unidade.txt) e [Oásis](../output/complexidade-ideias/prompt-04-oasis-sp.txt).
