# Sonora

Monorepo da **Global Solution FIAP 2026.2**, turma **3ESPV-2026**. Produto de contexto acústico para plataformas imobiliárias: ajuda a comparar observações do entorno, com fonte, período e cobertura explícitos. **Sonora** é o nome aprovado do produto acústico desta GS. A marca da empresa/plataforma continua em discussão. [Marca e produtos](docs/marca-e-produtos.md).

## Equipe

| Integrante | RM | Responsabilidade |
| --- | --- | --- |
| Leonardo Correa de Mello | 555573 | C# e IoT |
| Felipe Soares Xavier | 556931 | SOA e Testing/QA |
| Pedro Visconti Guidotte | 556630 | Operating Systems, integração e auditoria |
| Herbert de Sousa Vilela | 555701 | Cybersecurity e Mobile |
| Gabriel Figueira Flora | 556476 | IA/ML |

## Comece por aqui

1. [Oito especificações e primeiros resultados](docs/disciplinas/README.md).
2. [Solução e escopo](docs/02-proposta-de-solucao.md).
3. [Contratos HTTP e fixtures](contracts/README.md), [integração](docs/03-integracao.md) e [regras de negócio](docs/regras-de-negocio.md).
4. [Trabalho em branches/PRs](CONTRIBUTING.md), [equipe](docs/equipe.md) e [auditoria por Pedro](docs/auditoria.md).
5. [Standalone versus integrado](docs/modos-de-execucao.md) e [plano Azure](deploy/azure/README.md).
6. [Requisitos acadêmicos](docs/01-contexto-e-requisitos.md) e [metas/pendências](docs/04-plano-de-execucao.md).

## Estrutura

```
api/             C#/.NET, banco principal e painel — Leonardo
soa/             Importação HTTP, banco de lotes — Felipe
mobile/          React Native/Expo, favoritos locais — Herbert
iot/             ESP32/Wokwi, leituras simuladas — Leonardo
ml/              Dados reais, notebook e resumo — Gabriel
linux/           Bash, serviços e monitor — Pedro
cybersecurity/   Parsing, taint, LLM e Risco Cidadão — Herbert
testing/         Azure Boards, Test Cases, PDF e pitch — Felipe
contracts/       OpenAPI C#/SOA, JSON Schema e fixtures
tools/           Mock HTTP, validação e smoke integrado
deploy/          Plano de deploy Azure
docs/            Especificações, regras e auditoria
```

Mesmo repositório, entregas independentes. C# e SOA não escrevem no mesmo banco: integram-se por HTTP. Cada professor recebe o link/pasta e artefato de sua matéria; a nuvem não substitui reprodução local.

## O que já funciona

Fundação do projeto: dois contratos OpenAPI 3.1, schema de resumo ML, fixtures, mocks HTTP e verificações automatizadas. **Os componentes das disciplinas ainda estão planejados**, não são aplicações concluídas. Veja component.json de cada pasta.

### Preparar e conferir a fundação

```bash
python -m venv .venv
# Linux/macOS:
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python tools/validate_contracts.py
.venv/bin/python -m unittest discover -s tools -p 'test_*.py' -v
.venv/bin/python tools/check_delivery_manifests.py
```

No Windows, use `.venv/Scripts/python.exe` no lugar de `.venv/bin/python`. CI verde neste estágio significa que a fundação foi conferida; não que as oito rubricas estão atendidas.

### Mocks para trabalhar sem os backends

Em terminais separados, usando o Python do ambiente virtual:

```bash
python tools/mock_server.py --service csharp --port 4010
python tools/mock_server.py --service soa --port 4011
```

Mock C#: http://127.0.0.1:4010/painel e /openapi.json. Mock SOA: http://127.0.0.1:4011/openapi.json. São exemplos estáticos, sem persistência ou autenticação real; [limites e exemplos](contracts/README.md). O responsável implementa banco/seed e funcionamento real da própria matéria.

## Integração e deploy

C# recebe IoT simulado e lotes reais do SOA, serve Mobile/painel e importa resumo ML. Fonte real, histórico e simulação ficam separados; ausência não é 0 dB. Nenhum áudio é armazenado.

Destino provável indicado pelo grupo: **Azure**, inicialmente VM Linux com serviços C#/SOA independentes, HTTPS e dados persistentes. Aplicações e provisionamento ainda serão implementados. Assinatura, região, recursos/créditos e acesso precisam ser definidos; nenhum recurso Azure foi criado nesta etapa.

## Dados reais

NoiseCapture do município de São Paulo: 1.894 sessões e 282.021 pontos antes de limpeza, no snapshot inspecionado em 08/11. Isso não comprova cobertura contínua, calibração ou representatividade. [Auditoria](docs/dados/noisecapture-auditoria-inicial.json), [origem/obtenção](ml/dados/README.md). ZIP bruto fora do Git; ML ainda não treinado. Todas as fixtures do contrato são sintéticas.

## Fluxo de colaboração e entrega

Branches por entrega -> pull request -> revisão de Pedro e responsáveis afetados -> main -> build/teste dos componentes -> deploy integrado -> evidências. Branches iniciais e usuários conhecidos em docs/equipe.md. Respeitar o estado real das proteções descrito em docs/governanca-github.md.

Prazo conservador do PDF: **19/11/2026 às 23h55**. Integração alvo até 16/11; revisão/vídeos em 17–18/11. Metas internas não alteram as datas oficiais.

Materiais privados do Teams, conversas locais, bancos/segredos e dados brutos não são versionados. Registrar usos de IA em [docs/uso-de-ia.md](docs/uso-de-ia.md). Não há entrevistas, implantação física, venda, resultado científico ou entrega acadêmica presumidos.
