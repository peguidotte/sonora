# Azure Boards, PDF e pitch

Responsável: **Felipe Soares Xavier, RM556931**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/testing.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

## Entrega

| Item da rubrica | Onde está |
| --- | --- |
| Features com descrição e critérios de aceite (50%) | Azure Boards: <https://dev.azure.com/sonona-gs/Sonora> (8 Features, F01 a F08) |
| Test Cases funcionais de caixa-preta, positivos e negativos (50%) | Azure Boards: 53 Test Cases (18 positivos, 35 negativos), vinculados às Features por *Tested By* |
| Professor como administrador | Project settings → Permissions → Project Administrators |
| PDF com link e prints | [Sonora-Testing-RM556931.pdf](Sonora-Testing-RM556931.pdf) (prints em [evidencias/](evidencias/)) |
| VIDEO PITCH GS | Link do YouTube na capa do PDF |

## Features

| Código | Feature | Casos |
| --- | --- | --- |
| F01 | Consultar locais monitorados | 8 |
| F02 | Consultar perfil acústico de um local | 7 |
| F03 | Comparar dois locais no aplicativo | 3 |
| F04 | Favoritos e consulta offline no aplicativo | 6 |
| F05 | Receber leituras do sensor IoT | 10 |
| F06 | Importar dados públicos do NoiseCapture | 8 |
| F07 | Disponibilidade dos serviços e estado dos sensores | 6 |
| F08 | Disponibilizar o resumo do modelo de ML | 5 |

Cada Feature traz história de usuário (Como / quero / para), regras de negócio e critérios de aceite no formato **Dado / Quando / Então**. No processo Agile a Feature não tem campo próprio de critérios de aceite; eles ficam na seção "Critérios de aceite" da Description.

Cada Test Case traz objetivo, tipo, preparação (pré-condições), entradas, saída esperada e passos com resultado esperado. Títulos seguem `F0X-CTnn [Positivo|Negativo] título`; tags: `Sonora GS`, código da Feature, tipo, `Caixa-preta` e canal (API, Mobile, IoT).

Os casos derivam dos contratos em [contracts/](../contracts/README.md) e das regras de [docs/arquitetura.md](../docs/arquitetura.md). O Azure é a fonte oficial dos casos; [azure/conteudo.py](azure/conteudo.py) é o texto usado no cadastro.

## Reproduzir

Pré-requisitos: Python 3.11+; para o PDF, `pip install reportlab`. O token do Azure (escopos Work Items R/W, Test Management R/W, Project and Team Read) fica somente em `output/dev/azure-pat.txt`, fora do Git.

```bash
python testing/azure/publicar_azure.py https://dev.azure.com/sonona-gs Sonora --dry-run   # confere sem enviar
python testing/azure/publicar_azure.py https://dev.azure.com/sonona-gs Sonora             # cadastra; reexecutar não duplica
python testing/azure/gerar_pdf.py --video <link do YouTube>                               # gera o PDF com os prints de evidencias/
```
