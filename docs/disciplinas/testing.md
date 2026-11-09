# Testing / QA — aceitação do Sonora

**Responsável:** Felipe Soares Xavier, RM556931. Pasta testing/; branch felipe/testing.

## Exigência do professor

PDF p. 39 e tarefa coletada em 06/11: Features com descrição/critérios de aceite e Test Cases funcionais de caixa-preta positivos e negativos no Azure. Cada caso contém objetivo, preparação, inputs, outputs e passos. Professor Admin; PDF com link e capturas da relação/detalhes de todas as Features e Test Cases. Pontuação 50% Features / 50% Test Cases.

Pitch geral: YouTube até 4 minutos, identificado como VIDEO PITCH GS na entrega de Testing. Conferir canal de entrega atual; a tarefa coletada informa que a nota não será lançada pelo Teams.

## Features e cobertura funcional

| Feature | Aceite principal | Negativos relevantes |
| --- | --- | --- |
| F01 Consultar locais | C# lista/filtra locais cadastrados com paginação | Coordenada incompleta, chave inválida, vazio |
| F02 Consultar perfil | Fonte/período/cobertura e agregação energética corretos | Sem dados -> no_data/nulo; intervalo inválido |
| F03 Comparar locais | Mesma origem/método/período com limitações visíveis | Cobertura incompatível ou insuficiente |
| F04 Favoritos offline | SQLite mantém favoritos/cache após reabrir | Sem rede, com data e mensagem de cache |
| F05 Ingestão IoT | Java autoriza/persiste; C# lê a nova observação no banco | Chave/escopo/deviceId inválidos, valor inválido, retry/conflito |
| F06 Importação | Java importa arquivo permitido e informa contagens commitadas | Arquivo desconhecido, dado rejeitado, rollback ou duplicação |
| F07 Disponibilidade | Estado de sensor usa recebimento IoT; falha é comunicada | Histórico não coloca sensor online; banco indisponível |
| F08 Resumo ML | C# devolve artefato real validado/versão/limitações | Sem resumo -> 204; fixture não é resultado real |

Criar casos positivos e negativos por Feature no Azure, incluindo permissões 401/403 e revogação. Usar URLs/status do OpenAPI e interface de banco atual. Não testar repasse HTTP Java -> C#: o aceite integrado é dado commitado no PostgreSQL pelo Java e consultável pelo C#.

## Formato de caso

Cada Test Case precisa de objetivo, preparação, entradas, passos e saídas esperadas no padrão de aula. Exemplo durável:

- Objetivo: verificar cálculo do perfil de um local.
- Preparação: PostgreSQL com seed de duas janelas de 5 s, 60/70 dB, mesma origem/método/sessão; C# ativo e chave de leitura válida.
- Entrada: GET do noise-profile no período dessas janelas, origin=simulated.
- Passos: consultar; comparar nível, quantidade, segundos e procedência.
- Esperado: aproximadamente 67,40 dB, duas observações, 10 s observados e fonte explícita.
- Negativo associado: mesmo endpoint em janela sem observações -> no_data, valor nulo, fontes/séries vazias.

## Organização e entrega

Detalhes dos casos, execuções/datas/bugs ficam no Azure; não manter cópia divergente em Markdown. Associar casos às Features, registrar resultados reais e gerar PDF legível com visão geral/detalhes e link. Confirmar identidade do professor antes de conceder Admin. Pitch apresenta problema/público, solução demonstrada, fontes, limites e impacto a medir, sem inventar entrevista/venda/precisão.

Artefatos finais: PDF/links e pitch, conforme rubrica. Mock é preparação de teste, não comprovação de persistência/integração. Referências: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md).
