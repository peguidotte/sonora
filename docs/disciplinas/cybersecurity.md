# Cybersecurity — proteção da plataforma acústica

**Responsável:** Herbert de Sousa Vilela, RM555701. **Dependências:** motor de parsing/dashboard usado em aula e código auditável do protótipo.

## Exigência do professor

PDF pp. 28–29: evoluir regras de parsing de PII, rastrear dados por taint analysis e bloquear saídas inseguras, usar LLM para traduzir falhas e atualizar dashboard Risco Cidadão. ZIP com código atualizado, evidências da auditoria, vídeo de atividade e print do painel.

| Critério | Pontos | Evidência proposta |
| --- | --- | --- |
| Parsing de PII | 3,0 | Regras para CPF, saúde, senhas e casos positivos/negativos |
| Taint analysis | 3,0 | Fonte, propagação, sink, sanitização e bloqueio demonstrados |
| IA na remediação | 2,0 | Explicação clara a partir de diagnóstico sanitizado |
| Dashboard | 2,0 | Risco Cidadão com cálculo explicado e comparação |

Primeiro localizar e executar a base de aula. O contrato/README dessa ferramenta determina extensão e linguagem; não substituir por scanner genérico ou checklist.

## Aplicação proposta

A API de ruído não precisa coletar CPF ou saúde de moradores. Fixtures sintéticas demonstram essas detecções em ambiente de teste. Pontos/sensores não armazenam áudio. Inspecionar código e saídas C#, importador e logs; foco nas credenciais, mensagens de erro e possíveis identificadores/trajetórias.

Mapear fluxos:
- Fonte: header X-Ingest-Key/X-Admin-Key, config de ambiente, payload e campo de teste sensível.
- Propagação: DTO -> serviço -> tratamento de erro/log/resposta.
- Sinks: logs de request, erro HTTP, dashboard e prompt de LLM.
- Controles: allowlist de campos, máscara/remoção, separação de chaves, resposta sanitizada e bloqueio.

Não marcar todo campo “latitude” como vazamento automaticamente: coordenada de ponto público difere da localização de uma pessoa. Definir contexto/escopo na metodologia e discutir falsos positivos.

## Demonstração mínima

1. Executar motor original e documentar o ponto de extensão.
2. Criar regras e fixtures positivas/negativas para CPF, saúde e senha/credencial.
3. Auditar trecho executável do protótipo com uma saída insegura controlada em fixture/branch de laboratório.
4. Mostrar caminho de propagação, correção/sanitizador e bloqueio efetivo.
5. Auditar fluxo seguro e comprovar ausência do dado na saída.
6. Enviar ao LLM somente diagnóstico sanitizado: tipo de falha, componente e orientação. Não mandar senha, CPF, segredo ou payload bruto.
7. Dashboard calcula Risco Cidadão segundo metodologia explícita, apresenta falhas abertas/corrigidas, severidade e evidência antes/depois.

Exemplos de tradução: “uma credencial de envio poderia aparecer nos registros; ela foi removida dessa saída”. A explicação precisa corresponder à falha real; não transformar recomendação em correção já aplicada.

## Aceite

- Detecção de PII com positivos e negativos, sem usar pessoas reais.
- Caminho de taint demonstrado até sink, não apenas regex no texto final.
- Saída insegura bloqueada e fluxo seguro permitido; análise de falsos positivos.
- Nenhum segredo na resposta HTTP, log ou prompt.
- Relatório liga diagnóstico a trecho/versão do protótipo acústico.
- Indicador do painel tem fórmula e limitações; não é classificação oficial.
- Módulo de auditoria separado da aplicação normal; não introduzir coleta de CPF/saúde só para testar.

## Entregáveis e organização

Pasta cybersecurity/ com módulo/base adaptada conforme aula, fixtures, instruções, evidências e relatório. ZIP final inclui código e o que a tarefa pede, sem .env/segredos. Incluir vídeo e print; conferir limite de duração/canal na tarefa atual, pois o material coletado não fixa duração aqui.

**Meta 09/11:** base de aula rodando e mapa de fluxos. **12/11:** regras/taint contra C# mínimo. **15/11:** bloqueio/LLM/dashboard. **17/11:** evidências e pacote.

Se C# atrasar, usar protótipo mínimo coerente com o contrato acústico e identificar a versão auditada; depois revalidar os fluxos relevantes no código final. Não afirmar que auditar um fixture certifica a aplicação inteira.

## Pendências

Acesso ao motor/dashboard de aula e forma de uso do LLM sem segredo em repositório. Login/RBAC não substitui os quatro itens obrigatórios.

## Organização no monorepo

Pasta `cybersecurity/`; branch `herbert/cybersecurity`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.2.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.
