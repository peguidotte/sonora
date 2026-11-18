# Dados acústicos reais: NoiseCapture, São Paulo

## Fonte

- **Projeto:** [NoiseCapture](https://noise-planet.org/noisecapture_exploit_data.html), da Université Gustave Eiffel e do CNRS. Os dados são medições de ruído feitas por voluntários com o app de celular.
- **Arquivo:** [Brazil.zip](https://data.noise-planet.org/dump/Brazil.zip), salvo localmente como `raw/noisecapture-brazil.zip`. Tem 45.844.212 bytes e SHA-256 `540aef978fd95a0fcb9e09a2a59bf91ba0ee98b2a85d771f3d7f6580181df9aa`. Foi baixado em 08/11/2026 e conferido de novo em 13/11/2026.
- **Recorte usado:** `Brazil_São Paulo_São Paulo.points.geojson`, com um ponto por segundo (nível em dB(A), GPS e precisão), e `.tracks.geojson`, com metadados da sessão (tags e calibração).
- **Licença:** ODbL. É preciso manter a atribuição. O ZIP e as trajetórias brutas não são versionados no Git.

A contagem bruta inicial (campos, horários e totais antes da limpeza) está em [noisecapture-auditoria-inicial.json](../../docs/dados/noisecapture-auditoria-inicial.json). A data do download não é a data das medições. Depois da limpeza, o período coberto vai de 26/10/2017 a 10/07/2025.

## Filtros aplicados

As contagens de cada etapa estão em `../output/limpeza.csv`.

1. **Coordenadas ausentes ou fora do município:** caixa envolvente aproximada de São Paulo (lat -24,01 a -23,35; lon -46,83 a -46,36). Neste snapshot não sai nenhum ponto: tudo fica entre lat -23,83 e -23,44 e lon -46,79 e -46,38.
2. **Datas ausentes ou implausíveis:** antes de 2016 ou depois do download (08/11/2026). Neste snapshot não sai nenhum ponto: as datas brutas vão de 12/04/2017 a 11/07/2025.
3. **Nível ≤ 0 dB:** é um valor sentinela de falha, não silêncio. Saem 75 pontos.
4. **Precisão de GPS pior que 50 m:** sem uma posição confiável, não dá para associar a medição a um local.
5. **Duplicados por (sessão, segundo):** 2.590 pontos.
6. **Sessões com as tags `indoor` ou `test`:** o produto trata de ruído ambiente externo, e sessões de teste não são medições reais.
7. **Sessões com menos de 30 pontos válidos:** cerca de 30 s não bastam para os percentis.
8. **Sessões com desvio-padrão < 0,5 dB:** são 45 sessões com nível constante perto de 93 dB, o que indica sensor travado ou saturado e não som real.

Resultado: **1.185 sessões e 228.444 pontos**.

## Features por sessão

Cada sessão vira uma linha com as seguintes colunas:

- **Usadas no modelo:** `laeq` (média energética), `p10`, `p50`, `p90` (percentis numéricos; o p90 corresponde aos níveis altos, ao contrário da convenção acústica L90) e `std`.
- **Metadados de interpretação, fora do modelo:** posição mediana, hora de início em America/Sao_Paulo, tags e quantidade de pontos.

## Divisão

As células espaciais têm cerca de 500 m (0,0045°). O teste reúne células inteiras sorteadas com semente 42, somando 20,0% das sessões:

- treino: 948 sessões em 130 células;
- teste: 237 sessões em 69 células.

Uma única célula, perto da Cidade Universitária, concentra 30% das sessões e ficou no treino.

## Limitações conhecidas

- Os celulares não são calibrados (`gain_calibration` varia), então os valores servem para comparar perfis e não são medições legais.
- A cobertura é concentrada no espaço e no tempo: 87% das sessões são de 2023–2024.
- As tags são declaradas pelos voluntários e são usadas apenas para descrever os grupos.
