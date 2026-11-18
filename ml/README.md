# ML: perfis acústicos de São Paulo (KMeans + PCA)

Responsável: **Gabriel Figueira Flora, RM556476**. A análise completa está no [RELATORIO_ML.md](RELATORIO_ML.md) e a descrição da fonte em [dados/README.md](dados/README.md).

[Vídeo da entrega](https://youtu.be/3-1f9XAvlZY) · [Notebook executado](sonora_clusters.ipynb) · [Relatório em PDF (3 páginas)](RELATORIO_ML.pdf) · [Resumo servido pela API](summary.json)

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `sonora_clusters.py` | Fonte do pipeline completo, com células `# %%` |
| `sonora_clusters.ipynb` | Notebook executado (entregável), gerado a partir do `.py`, com saídas e gráficos |
| `requirements.txt` | Versões fixas usadas na execução |
| `dados/raw/` | Dump do NoiseCapture. Não vai para o Git; é baixado pelo comando abaixo |
| `figuras/` | Gráficos 01 a 08 citados no relatório |
| `output/` | `limpeza.csv`, `busca_hiperparametros.csv`, `metricas_treino_teste.csv`, `perfil_grupos.csv`, `summary.json` e `execucao.txt` |

## Como executar

Pré-requisito: Python 3.12 ou mais recente (testado com 3.14.6). Os comandos abaixo rodam a partir da raiz do repositório, num shell bash (no Windows, Git Bash). O `--create-dirs` cria `ml/dados/raw/`, que não existe num clone limpo. No Windows PowerShell, `curl` é um apelido do `Invoke-WebRequest`; use `curl.exe` com os mesmos argumentos.

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r ml/requirements.txt   # Linux/macOS: .venv/bin/python
curl --create-dirs -L -o ml/dados/raw/noisecapture-brazil.zip https://data.noise-planet.org/dump/Brazil.zip
.venv/Scripts/python.exe -X utf8 ml/sonora_clusters.py
```

Para regenerar o notebook executado depois de alterar o `.py`:

```bash
cd ml
../.venv/Scripts/python.exe -m jupytext --to ipynb sonora_clusters.py
../.venv/Scripts/python.exe -m jupyter nbconvert --to notebook --execute --inplace sonora_clusters.ipynb
```

O script interrompe a execução se o SHA-256 do ZIP for diferente do snapshot documentado. A execução leva de 1 a 2 minutos e regenera tudo o que está em `figuras/` e `output/`. A semente fixa é 42.

O `summary.json` segue o schema `contracts/schemas/ml-summary.schema.json` e é validado automaticamente quando o schema está presente.
