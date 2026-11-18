# Cybersecurity — auditoria do Sonora

**Responsável:** Herbert de Sousa Vilela, RM555701. Pasta `cybersecurity/`; branch `herbert/cybersecurity`.

## Exigência do professor

PDF pp. 28–29: evoluir regras de parsing de PII, rastrear dados por taint analysis e bloquear saídas inseguras, usar LLM para traduzir falhas e atualizar dashboard Risco Cidadão. ZIP com código atualizado, evidências da auditoria, vídeo de atividade e print do painel.

| Critério | Pontos | Evidência proposta |
| --- | --- | --- |
| Parsing de PII | 3,0 | Regras para CPF, saúde, senhas e casos positivos/negativos |
| Taint analysis | 3,0 | Fonte, propagação, sink, sanitização e bloqueio demonstrados |
| IA na remediação | 2,0 | Explicação clara a partir de diagnóstico sanitizado |
| Dashboard | 2,0 | Risco Cidadão com cálculo explicado e comparação |

Esclarecimento do Prof. Vitor Lasse (documento "Explicação: Global Solutions", Teams da turma): não existe uma ferramenta/base pronta para localizar. A entrega é um middleware/interceptador implementado do zero pelo grupo, em qualquer linguagem (C#, Python, Node etc.), cobrindo os quatro pontos da rubrica sobre dados sintéticos; não substituir por scanner genérico ou checklist.

## Responsabilidade

Implementar o middleware/interceptador e o dashboard descritos no esclarecimento do professor, cobrindo as quatro entregas da rubrica (parsing de PII, taint analysis, tradução via LLM, dashboard Risco Cidadão), em Node/TypeScript, de forma standalone na pasta `cybersecurity/`. Auditar com fixtures sintéticas representando payloads de Java, C#, Mobile e configuração. Não adicionar coleta real de CPF/saúde ao produto nem substituir os quatro itens da rubrica por login.

## Cenários e aceite

- Parsing: CPF, saúde e credenciais com casos positivos/negativos e discussão de falsos positivos.
- Taint: fonte -> propagação -> sink -> sanitizador/bloqueio verificável em trecho executável. Regex na saída sozinha não demonstra análise de fluxo.
- Credenciais: header X-Api-Key, configuração, log/erro/prompt; verificar isolamento de escopo e dispositivo, revogação e ausência de segredo no bundle/cache.
- Banco: runtime C# somente SELECT nas views, sem dados de autenticação; conta migradora fora dos runtimes. Java não expõe chaves em views ou respostas.
- LLM: explicar diagnóstico sanitizado, sem enviar PII/segredo/payload bruto; explicação corresponde à falha e à correção real.
- Dashboard: indicador Risco Cidadão com cálculo explicado e evidência antes/depois, sem fingir classificação oficial.

Localização de ponto público não é automaticamente dado de pessoa: justificar classificação/contexto. Demonstrar fluxo inseguro controlado e fluxo seguro; não introduzir vulnerabilidade de laboratório na versão implantada. Identificar commit auditado e revalidar correções conforme CONTRIBUTING.

## Entrega

Código do middleware/interceptador implementado, fixtures, instruções, evidências de parsing/taint/bloqueio, vídeo e print do painel. ZIP final sem .env/segredos. Se depender de protótipo mínimo, explicitar o que ele cobre; auditar fixture não certifica o sistema inteiro. Uso real/fallback de LLM precisa ser declarado.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
