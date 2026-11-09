# Sonora

API privada de contexto acústico para apoiar decisões imobiliárias. Projeto CitizenTech da FIAP, turma 3ESPV-2026. A marca da empresa continua em aberto; a entrega atual é Sonora.

## Referências do projeto

- [Arquitetura](docs/arquitetura.md): responsabilidades, banco compartilhado, segurança, regras e execução.
- [Contratos](contracts/README.md): OpenAPI C#/Java, interface de banco, exemplos e mocks.
- [Entregas por disciplina](docs/disciplinas/README.md) e [requisitos oficiais](docs/01-contexto-e-requisitos.md).
- [Contribuição e auditoria](CONTRIBUTING.md): branches, revisão e evidências.
- [Dados reais](ml/dados/README.md) e [registro de IA](docs/uso-de-ia.md).

## Equipe

| Integrante | RM | Responsabilidade | Branch |
| --- | --- | --- | --- |
| Leonardo Correa de Mello | 555573 | C# e IoT | leo/csharp; leo/iot |
| Felipe Soares Xavier | 556931 | SOA e Testing | felipe/soa; felipe/testing |
| Pedro Visconti Guidotte | 556630 | Operating Systems e coordenação de auditoria | pedro/operating-systems |
| Herbert de Sousa Vilela | 555701 | Cybersecurity e Mobile | herbert/cybersecurity; herbert/mobile |
| Gabriel Figueira Flora | 556476 | IA/ML | gabriel/ia |

## Arquitetura aprovada

```text
NoiseCapture (arquivos) ─┐
                        ├─> Java / SOA ──grava──> PostgreSQL
ESP32 / Wokwi ──HTTP─────┘                            ▲
                                                     │ consulta
Mobile / clientes ──HTTPS──> C# Sonora ────────────────┘
```

Java possui a captura e as migrations; C# lê views publicadas e calcula perfis. A integração é pelo banco, sem repasse HTTP Java -> C#. PostgreSQL é compartilhado entre os backends; SQLite é usado somente no Mobile para favoritos/cache. Deploy inicial: serviços independentes numa VM Linux, com proxy HTTPS e banco interno; Azure é o destino provável.

Pastas: api/ (C#), soa/ (Java), mobile/, iot/, ml/, linux/, cybersecurity/, testing/, contracts/ e tools/. Backends e app devem ser implementados pelos responsáveis. [Infraestrutura e CI/CD](deploy/azure/README.md) define Terraform, provisionamento e publicação; Linux continua em desenvolvimento para cumprir toda a rubrica. Os mocks são apenas ferramentas de desenvolvimento, sem persistência ou autenticação de produção.

## Conferir a fundação

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python tools/validate_contracts.py
.venv/bin/python -m unittest discover -s tools -p 'test_*.py' -v
.venv/bin/python tools/check_delivery_manifests.py
```

No Windows, usar .venv/Scripts/python.exe. [Execução dos mocks](contracts/README.md); a reprodução real de cada entrega fica no README da respectiva pasta, quando implementada. Os contratos usam inglês e X-Api-Key com escopos.

Prazo conservador: **19/11/2026 às 23h55**, conforme PDF. Resultados de testes, tarefas diárias e revisão de código ficam em PRs/Azure Boards; esta documentação registra somente acordos duráveis. Materiais privados, segredos e dados brutos ficam fora do Git.
