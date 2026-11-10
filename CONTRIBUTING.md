# Contribuição e auditoria

Começar pelo [README/equipe](README.md), [arquitetura](docs/arquitetura.md), [contratos](contracts/README.md) e [ficha da matéria](docs/disciplinas/README.md).

## Branch e revisão

Exemplo para a entrega C# de Leonardo; os demais usam a própria branch da tabela de equipe:

```bash
git clone https://github.com/peguidotte/sonora.git
cd sonora
git fetch origin
git switch leo/csharp
git merge origin/main
```

Usar a branch da própria entrega ou uma branch curta derivada dela. Não fazer push/force-push direto na main. Abrir PR cedo, com escopo, comandos, resultados reais e limites. Pedro coordena auditoria e responsáveis afetados revisam mudanças de contrato. Confirmar o estado das proteções no GitHub: uma política escrita não bloqueia push tecnicamente. Não inferir usuários GitHub dos colegas nem conceder acesso a homônimos.

## Aceite de uma entrega

- README com equipe/link, versões, configuração e comandos reais, sem depender da IDE.
- Standalone e integrado conforme arquitetura, seed/mock identificados e autenticação local preservada.
- Testes reais do componente, contratos compatíveis e tratamento de indisponibilidade.
- Evidências e artefatos da rubrica; component.json reflete o estado real.
- Sem dados pessoais reais, segredos, áudio, arquivos privados do Teams ou dataset bruto no Git.

A CI compartilhada valida a fundação, não comprova as oito matérias. Cada componente adiciona seu build/testes ao ser implementado. Mocks estáticos não são aplicação pronta, integração real ou fonte de treino ML.

Build/testes/publicação de C#, SOA e Mobile seguem o [contrato de CI/CD](deploy/azure/README.md#contrato-das-aplicações) e os caminhos/toolchains em [pipeline.json](deploy/pipeline.json). Mudança desses caminhos deve atualizar a configuração da CI no mesmo PR. Antes de integrar, verificar os jobs efetivamente executados e suas evidências; um job pulado não é um teste aprovado.

## Auditoria de Pedro com apoio do assistente

Identificar autor, branch/commit e ambiente; ler rubrica/ficha; confrontar arquitetura, OpenAPI e database.json; executar standalone e integração quando possível; conferir persistência, erros, segurança e evidências. Para C#, verificar leitura sem poder gravar; para SOA, commit/idempotência/views/migrations; Mobile, SQLite/offline/acessibilidade; IoT, simulação e envio Java; ML, dados reais/split/CV/hiperparâmetros/métricas; Linux, app/rede/monitor/crash/boot/logs; Cyber, parsing/taint/LLM/painel; Testing, Azure/Features/casos/PDF/pitch.

Registrar resultado no PR: atendido/parcial/ausente/não verificável, reprodução, comandos executados, achados com arquivo/evidência e prioridade. Concluir pronto para integrar, pronto com limites, precisa de correção ou não verificável. Não inventar nota, teste passado ou correção. Revalidar os pontos afetados em novos commits. Resultados datados e cronogramas ficam nos PRs/Azure Boards, não em arquivos de documentação permanentes.

Mudanças de interface atualizam contratos, fixtures, consumidores e testes juntos. SOA mantém migrations/views no módulo independente database/; C# não cria uma sequência concorrente. Revisar SQL publicado com os dois consumidores. Detalhes de implementação ficam no código e comandos no README do componente; não duplicar arquitetura/rubricas em vários arquivos.

## Comunicação e privacidade

Não enviar mensagens, convites ou submissões sem solicitação explícita. PII de Cyber é sintética. Conversas locais/fontes privadas/dados brutos ficam ignorados; registrar uso publicável de IA em docs/uso-de-ia.md. O repositório tem leitura pública; escrita exige colaboração autorizada. Isso não substitui o Admin no Azure Boards de Testing.
