# IA e ML — perfis de observações acústicas

**Responsável:** Gabriel Figueira Flora, RM556476. **Dependências:** diagnóstico/limpeza dos dados; não depende de API, sensor ou app prontos.

## Exigência do professor

PDF pp. 31–33: dados reais e públicos sobre a cidade; XGBoost, Random Forest, MLP, LSTM ou KMeans + PCA; pelo menos 10 combinações de 3 hiperparâmetros, validação cruzada apenas no treino, resultados de treino/teste, gráficos, discussão de overfitting e interpretação cidadã.

Entregar ml/ com notebook executado, dados/README.md, requirements.txt, RELATORIO_ML.md (planejar duas páginas) e vídeo não listado até 5 minutos; links GitHub/vídeo.

| Critério | Pontos | Evidência proposta |
| --- | --- | --- |
| Problema e dados reais | 2,0 | Fonte, hash, cidade, período e diagnóstico |
| Modelo justificado | 1,0 | Por que agrupar observações, sem rótulo artificial |
| Preparação/divisão | 2,0 | Unidade amostral, grupos e pipeline sem vazamento |
| Treino/parâmetros | 2,0 | 12 combinações, CV só em treino |
| Treino/teste | 2,0 | Métricas comparáveis e gráficos reais |
| Leitura para cidadão | 1,0 | O que os grupos mostram e o que não demonstram |

## Pergunta e dados propostos

**Pergunta:** sessões de medição reais de São Paulo podem ser agrupadas em padrões acústicos com características interpretáveis, como intensidade e variação durante a coleta?

Usar KMeans + PCA. **Não prever amanhã, não diagnosticar fonte do som e não inventar classes “bom/ruim” a partir de um limiar.** Um grupo descreve observações; não certifica um endereço ou todo o bairro.

Já baixado em 08/11: [Brazil.zip](https://data.noise-planet.org/dump/Brazil.zip), 45.844.212 bytes, SHA-256 540aef978fd95a0fcb9e09a2a59bf91ba0ee98b2a85d771f3d7f6580181df9aa. Caminho local ignorado pelo Git: ml/dados/raw/noisecapture-brazil-2026-11-08.zip.

Arquivos: Brazil_São Paulo_São Paulo.tracks.geojson e .points.geojson. Contagem inicial: 1.894 sessões e 282.021 pontos; 322 datas distintas, de 2017 a 2025. [Auditoria inicial](../dados/noisecapture-auditoria-inicial.json) não é limpeza nem treino.

O [dicionário oficial](https://noise-planet.org/noisecapture_exploit_data.html) descreve pontos por segundo, relação pk_track e metadados de sessão. Juntar pontos e sessões dentro do mesmo snapshot; pk_track pode mudar entre dumps, track_uuid é estável na fonte. Não publicar identificadores desnecessários de trajetórias; usar IDs derivados quando exportar exemplos.

## Preparação e divisão

1. Inspecionar esquema, faltantes, timestamps, coordenadas, accuracy, níveis zero e extremos. Não afirmar que todos os números finitos são válidos.
2. Propor e justificar filtros técnicos: remover coordenadas/datas inválidas, pontos duplicados, níveis não positivos e registros incompatíveis; GPS <=50 m e pelo menos 30 pontos válidos por sessão são parâmetros iniciais a avaliar, não normas acústicas.
3. Construir **uma linha por sessão** com pelo menos cinco características: LAeq energético, p10, p50, p90 e desvio padrão dos níveis. Duração, quantidade, data e localização ficam como metadados de qualidade. Documentar percentil numérico para não confundir p90 com a convenção acústica L90.
4. Não tratar segundos consecutivos como milhares de exemplos independentes. Considerar viés de aparelho/calibração, datas, locais e campanhas.
5. Fixar teste de aproximadamente 20% dos grupos espaciais, antes de ajustar qualquer transformador/modelo. Grupo proposto: célula de aproximadamente 1 km pela posição representativa da sessão, com critério documentado para trajetos que cruzam células. Examinar correlação residual entre células vizinhas; se necessário, separar campanhas/períodos ou aplicar afastamento espacial.
6. CV com GroupKFold, até 5 folds, somente nos 80% de treino; ajustar número se faltarem grupos. Não usar o teste para escolher recorte, filtro ou hiperparâmetro.
7. Em cada fold, ajustar imputação (se necessária), StandardScaler, PCA e KMeans somente na parcela de treino. Aplicar transformações e predict à validação/teste.

## Busca, avaliação e interpretação

Grade inicial de **12 combinações** com três hiperparâmetros de KMeans:
- n_clusters: 2, 3, 4;
- init: k-means++ ou random;
- n_init: 10 ou 20.

PCA inicialmente com 2 componentes, justificado pela variância explicada; semente fixa documentada. Usar pipeline e bibliotecas fixadas em requirements. Ver [documentação de clustering](https://scikit-learn.org/stable/modules/clustering.html).

Avaliar silhouette, Davies–Bouldin e distância média ao centro, com treino e conjunto reservado lado a lado, na mesma representação transformada. Selecionar pela CV e interpretação, não apenas menor inércia (que favorece mais grupos). Se um conjunto tiver só um grupo ou amostras insuficientes, registrar métrica como não calculável e explicar; não inventar zero ou acurácia.

Mostrar tabela das 12 configurações, média/variação de CV, gráfico PCA, tamanhos dos grupos, características em unidades originais e discrepância treino/teste. Discutir concentração espacial/temporal, estabilidade em sementes e limitações. Nomes descritivos dos grupos só após analisar os resultados; não antecipar “silencioso/noturno” sem evidência.

## Integração e entrega

Exportar ml/output/resumo.json conforme [contrato](../03-integracao.md): versão, cidade, fonte/hash, período, sessões válidas, grupos, métricas e limitações. Nenhuma inferência Python online é necessária. O painel mostra resumo da cidade, em seção separada; não aplicar rótulo de uma sessão a todo o entorno.

**Meta 09/11:** diagnóstico e amostra tabular limpa. **Meta 11/11:** divisão e pipeline reproduzíveis. **Meta 14/11:** busca/avaliação e resumo. **Meta 17/11:** relatório, notebook executado e vídeo.

Vídeo até 5 min: pergunta/dados; limpeza/divisão; modelo/grade/CV; treino e teste; interpretação e limites. Não usar leituras Wokwi no experimento nem esconder métricas ruins.

## Pendências

Licença/atribuição no artefato redistribuído, filtros e quantidade final de sessões/grupos. Dataset da cidade já foi localizado e baixado, mas a viabilidade estatística final depende da limpeza. Se o recorte falhar, documentar e ajustar o experimento com o professor; não substituir por dados simulados.

## Organização no monorepo

Pasta `ml/`; branch `gabriel/ia`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.2.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.
