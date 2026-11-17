# Relatório de IA & ML: perfis acústicos de São Paulo

**CitizenTech:** Sonora, contexto acústico para quem está escolhendo onde morar. **Responsável:** Gabriel Figueira Flora (RM556476); equipe no README principal. **Código:** [`sonora_clusters.ipynb`](sonora_clusters.ipynb), notebook executado gerado a partir de [`sonora_clusters.py`](sonora_clusters.py).

## 1. Problema e dados reais

Quem procura imóvel não tem como saber, antes da mudança, se a rua é barulhenta. Ruído urbano afeta sono e saúde (ODS 3) e a qualidade de vida na cidade (ODS 11).

**Pergunta de ML:** as medições de ruído feitas por cidadãos em São Paulo formam perfis acústicos distintos e interpretáveis?

**Dados:** NoiseCapture (Univ. Gustave Eiffel / CNRS), medições voluntárias feitas pelo app de celular, licença ODbL. Arquivo [Brazil.zip](https://data.noise-planet.org/dump/Brazil.zip), recorte do município de São Paulo, SHA-256 `540aef97…9aa`. São 282.021 pontos (cada um é o nível de 1 s em dB(A)) em 1.894 sessões. Depois da limpeza, o período vai de 26/10/2017 a 10/07/2025, com 87% das sessões em 2023–2024. Os detalhes estão em [`dados/README.md`](dados/README.md).

## 2. Escolha do modelo: KMeans + PCA

Não existe um rótulo confiável de "lugar bom" ou "lugar ruim". Por isso descartei os modelos supervisionados da lista (XGBoost, Random Forest e MLP): treiná-los exigiria inventar um alvo. Também descartei a LSTM, porque as sessões são curtas e espalhadas no tempo, sem uma série contínua por local. Sobra o agrupamento.

As 5 features por sessão são muito correlacionadas (de 0,87 a 0,98 entre os níveis), e o PCA as resume em dois eixos interpretáveis: **PC1, a intensidade** (76% da variância), e **PC2, a variação** (23%; peso de 0,92 no desvio-padrão). O KMeans é fácil de explicar ("sessões parecidas ficam juntas") e seus centros podem ser lidos em dB.

## 3. Preparação e divisão treino/teste

| Filtro (contagens em `output/limpeza.csv`) | Sessões restantes |
| --- | ---: |
| Dados brutos | 1.894 |
| Coordenadas fora do município ou datas implausíveis (nenhum ponto removido) | 1.894 |
| Nível ≤ 0 dB, GPS pior que 50 m e duplicados | 1.823 |
| Sessões marcadas `indoor` ou `test` (o foco é ruído externo) | 1.522 |
| Menos de 30 pontos válidos | 1.230 |
| Desvio < 0,5 dB (nível constante, sensor travado) | **1.185** |

**Unidade amostral: uma linha por sessão.** Os segundos de uma mesma sessão são correlacionados, então não podem contar como amostras independentes. As features são:

- **LAeq**, a média energética: 10·log10(média(10^(L/10)));
- **p10, p50 e p90**, os percentis dos níveis;
- **desvio-padrão** dos níveis.

Local, hora e tags ficam fora do modelo e servem só para interpretar os grupos.

**Divisão sem vazamento.** O teste reúne células inteiras de ~500 m, sorteadas com semente 42 até somar 20% das sessões:

- treino: 948 sessões em 130 células;
- teste: 237 sessões em 69 células;
- nenhuma célula aparece nos dois conjuntos.

A maior célula (30% dos dados, perto da Cidade Universitária) ficou no treino, então o teste mede a generalização para **regiões novas**. O pipeline StandardScaler → PCA → KMeans é ajustado só na parte de treino de cada etapa.

## 4. Treino com diferentes hiperparâmetros

A grade testou **16 combinações de 3 hiperparâmetros**:

- `n_clusters`: 2, 3, 4 e 5;
- `n_components` do PCA: 2 e 3;
- `whiten` do PCA: não e sim.

A validação cruzada foi `GroupKFold(5)` por célula, **só no treino**. As métricas foram silhouette (↑) e Davies–Bouldin (↓), calculadas no espaço padronizado das 5 features. A tabela completa está em `output/busca_hiperparametros.csv` e nas figuras 03 e 04.

| k | PCA | whiten | Silhouette na CV | Davies–Bouldin na CV |
| ---: | ---: | :---: | :---: | :---: |
| **2** | **2** | **não** | **0,407 ± 0,117** | **0,919** |
| 2 | 2 | sim | 0,373 ± 0,090 | 1,030 |
| 4 | 2 | não | 0,345 ± 0,058 | 0,936 |
| 5 | 3 | sim | 0,253 ± 0,060 | 1,312 |

O PC3 explica menos de 1% da variância. Por isso, usar 3 componentes sem whiten dá o mesmo resultado que usar 2, e usar 3 com whiten piora, porque amplia um eixo que é só ruído. Grupos a mais fragmentam um contínuo de intensidade. **A configuração escolhida foi k=2, PCA com 2 componentes, sem whiten.**

## 5. Resultados em treino e teste

| Métrica | Treino | Teste |
| --- | ---: | ---: |
| Silhouette (↑) | 0,401 | 0,338 |
| Davies–Bouldin (↓) | 0,954 | 0,940 |
| Distância média ao centro (↓) | 1,398 | 1,321 |

**Overfitting.** A silhouette cai pouco no teste, e as outras métricas quase não mudam: neste recorte, o modelo aprendido no treino separa as sessões das células reservadas com qualidade parecida. O resultado também não depende da semente de inicialização (ARI = 1,00 entre 10 sementes), o que mostra estabilidade do ajuste, não dos grupos em outros lugares.

Há, porém, um limite. Um KMeans ajustado **só** com o teste concorda pouco com o modelo de treino (ARI = 0,17). O teste tem mais sessões ruidosas (59%, contra 37% no treino), o que desloca o limiar entre os grupos. Os dois perfis aparecem no treino e no teste deste recorte, mas a fronteira entre eles (~60 dB) muda com a região medida, e a evidência disponível não basta para afirmar que esses perfis se repetem em outras áreas da cidade.

Também não analisei a proximidade entre células vizinhas nem os trajetos que atravessam mais de uma célula: cada sessão entra pela sua posição mediana. Células de treino e teste vizinhas podem ter ruído parecido, o que tornaria o teste menos independente do que parece. Não há evidência de vazamento, mas essa verificação não foi feita.

## 6. Leitura para o cidadão

| Perfil | Sessões | LAeq mediana | Mediana do p90 das sessões | Tags mais declaradas |
| --- | ---: | ---: | ---: | --- |
| **G0, ambiente moderado** | 698 | 54,9 dB(A) | 56,9 | animais, vegetação, via |
| **G1, ambiente ruidoso** | 487 | 68,0 dB(A) | 70,6 | via, conversa |

O ruído medido pela população se divide em dois perfis separados por cerca de 13 dB, o que equivale a cerca de 20 vezes mais energia sonora.

- O **G0** fica perto de 55 dB(A), o limite diurno que a NBR 10151 usa para áreas mistas predominantemente residenciais.
- O **G1** é dominado por tráfego e fica bem acima da recomendação da OMS para esse tipo de ruído (53 dB Lden).

O Sonora pode dizer a quem procura imóvel "as medições perto daqui se parecem com o perfil ruidoso", sempre mostrando quantas sessões, de quando e de que fonte vêm esses dados.

**O que os dados não mostram:**

- Celulares sem calibração não fazem medição legal.
- Sessões de minutos não equivalem ao Lden, então a comparação com as normas é só uma ordem de grandeza.
- A cobertura está concentrada em poucas regiões, e não foi verificado se os perfis se repetem fora delas.
- Os valores dos perfis são medianas entre sessões. Como as sessões têm durações muito diferentes (de 30 a mais de 6.000 s), eles não dizem quanto do tempo total ficou abaixo de um nível.
- Um perfil **não classifica** um endereço sem medições.

O resultado é exportado em `output/summary.json`, no contrato `ml-summary`, para a API C# exibir.
