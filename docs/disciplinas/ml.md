# IA/ML — observações acústicas

**Responsável:** Gabriel Figueira Flora, RM556476. Pasta ml/; branch gabriel/ia.

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

## Experimento

Pergunta: sessões reais de São Paulo podem ser agrupadas em padrões acústicos interpretáveis de intensidade/variação? Proposta: KMeans + PCA, uma linha por sessão, sem rótulo inventado de imóvel bom/ruim e sem previsão de amanhã. Um grupo descreve observações, não todo bairro.

Fonte, snapshot/hash e diagnóstico inicial em [dados/README](../../ml/dados/README.md); o dump bruto permanece fora do Git. Usar somente dados reais públicos; simulação do Wokwi e fixtures do contrato não entram no treino.

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

Exportar ml/output/summary.json conforme o schema compartilhado, com versão, fonte/hash, período, quantidade, grupos, métricas e limites. Java oferece importação administrativa validada ao PostgreSQL; C# lê o payload publicado. Não há servidor ML contínuo ou escrita direta do notebook no banco de produção.

Sem resultado real, a API apresenta ausência (204); fixtures com NOT-TRAINED não são experimento concluído. A análise da cidade não atribui automaticamente grupo a um endereço. README documenta aquisição/limpeza/divisão e comandos reproduzíveis; notebook executado e relatório mostram resultados efetivos, inclusive limitações e métricas ruins. Vídeo apresenta pergunta/dados, preparação, busca/CV, treino/teste e interpretação, no limite oficial.

Referências: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md).
