# Sonora

API privada de contexto acústico para apoiar decisões imobiliárias. Projeto CitizenTech da FIAP, turma 3ESPV-2026. A marca da empresa continua em aberto; a entrega atual é Sonora.

## Referências do projeto

- [Arquitetura](docs/arquitetura.md): responsabilidades, banco compartilhado, segurança, regras e execução.
- [Contratos](contracts/README.md): OpenAPI C#/Java, interface de banco, exemplos e mocks.
- [Entregas por disciplina](docs/disciplinas/README.md) e [requisitos oficiais](docs/01-contexto-e-requisitos.md).
- [Contribuição e auditoria](CONTRIBUTING.md): branches, revisão e evidências.
- [Dados reais](ml/dados/README.md) e [registro de IA](docs/uso-de-ia.md).

## Equipe

| Integrante | RM | GitHub | Responsabilidade | Branch |
| --- | --- | --- | --- | --- |
| Leonardo Correa de Mello | 555573 | [leocorreamello](https://github.com/leocorreamello) | C# e IoT | leo/csharp; leo/iot |
| Felipe Soares Xavier | 556931 | [felipexaviersz](https://github.com/felipexaviersz) | SOA e Testing | felipe/soa; felipe/testing |
| Pedro Visconti Guidotte | 556630 | [peguidotte](https://github.com/peguidotte) | Operating Systems e coordenação de auditoria | pedro/operating-systems |
| Herbert de Sousa Vilela | 555701 | [herbertdesousa](https://github.com/herbertdesousa) | Cybersecurity e Mobile | herbert/cybersecurity; herbert/mobile |
| Gabriel Figueira Flora | 556476 | [gabrielfe1202](https://github.com/gabrielfe1202) | IA/ML | gabriel/ia |

## Começar uma entrega

1. Ler os [requisitos docentes e pendências](docs/01-contexto-e-requisitos.md) e a [ficha da própria disciplina](docs/disciplinas/README.md): definem rubrica, aceite e artefatos acadêmicos.
2. Ler a [arquitetura](docs/arquitetura.md): define responsabilidades, regras de negócio e integração. Os [contratos verificáveis](contracts/README.md) definem os formatos HTTP, SQL e do resumo ML; exemplos são sintéticos.
3. Seguir o README da própria pasta para reprodução. Para C#, SOA e Mobile, conferir o [contrato de build/publicação](deploy/azure/README.md#contrato-das-aplicações); [pipeline.json](deploy/pipeline.json) centraliza caminhos e toolchains usados pela CI.
4. Trabalhar na branch da entrega e abrir PR conforme [CONTRIBUTING.md](CONTRIBUTING.md). Agentes devem seguir [AGENTS.md](AGENTS.md). Divergências entre código e especificação precisam ser resolvidas nas fontes correspondentes, sem criar contratos paralelos.

`component.json` declara o estado de cada entrega; código executável e evidências sustentam essa declaração. CI verde comprova somente os jobs executados: componentes ausentes podem ser pulados, e mocks não comprovam a aplicação real. Resultados de execução e auditoria ficam nos PRs/Actions.

## Arquitetura aprovada

```text
NoiseCapture (arquivos) ─┐
                        ├─> Java / SOA ──grava──> PostgreSQL
ESP32 / Wokwi ──HTTP─────┘                            ▲
                                                     │ consulta
Mobile / clientes ──HTTPS──> C# Sonora ────────────────┘
```

Java possui a captura; [database/](database/README.md) executa migrations independentes, mantidas na entrega de SOA; C# lê views publicadas e calcula perfis. A integração é pelo banco, sem repasse HTTP Java -> C#. PostgreSQL é compartilhado entre os backends; SQLite é usado somente no Mobile para favoritos/cache. Deploy inicial: serviços independentes numa VM Linux na Azure, com proxy HTTPS e banco interno.

Pastas: api/ (C#), soa/ (Java), mobile/, iot/, ml/, linux/, cybersecurity/, testing/, contracts/, database/ e tools/. Backends e app devem ser implementados pelos responsáveis. [Infraestrutura e CI/CD](deploy/azure/README.md) define Terraform, provisionamento e publicação; Linux continua em desenvolvimento para cumprir toda a rubrica. Os mocks são apenas ferramentas de desenvolvimento, sem persistência ou autenticação de produção.

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
