# Auditoria das entregas por Pedro e assistente

Revisão de código autorizada por Pedro em 08/11/2026. Não enviar comentários ao grupo/professores por ferramenta sem pedido explícito. Registro local de auditoria ou revisão no chat é suficiente; envio de review no GitHub deve ser solicitado.

## Fontes e ordem da revisão

1. Identificar componente, autor, branch, commit e arquivos alterados.
2. Ler requisito oficial consolidado e especificação da disciplina, conferindo atualizações da tarefa.
3. Comparar com problema/público, regras RN01–RN20, OpenAPI e contratos de integração.
4. Instalar e executar **standalone** em ambiente limpo com seed/fixtures documentadas.
5. Conferir testes e persistência reais, mensagens de falha e ausência de dados.
6. Executar modo **integrated** contra versões identificadas das dependências; demonstrar indisponibilidade também.
7. Rever evidências, nomes/RMs, fonte/licença, duração do vídeo e artefatos exigidos.

## Resultado padronizado

Registrar em docs/auditorias/AAAA-MM-DD-componente-commit.md, sem segredos:

- Componente/autor/commit e ambiente realmente usado.
- Itens da rubrica: atendido, parcial, ausente ou não verificável; referência de arquivo/evidência.
- Regras/contratos descumpridos, com reprodução e impacto.
- Comandos executados, resultados e testes que não puderam ser feitos.
- Dependências de integração e compatibilidade de versão.
- Pendências ordenadas: bloqueia entrega; bloqueia integração; melhoria desejável.
- Conclusão: pronto para integrar; pronto com limitações; precisa de correção; não verificável.

Nunca inventar nota do professor ou marcar teste não executado como aprovado. CI verde de contratos não substitui execução da matéria. Rastrear a versão auditada: correção posterior exige revalidar os pontos afetados.

## Cuidados específicos

| Componente | Conferência que não pode faltar |
| --- | --- |
| C# | POO/EF/LINQ/async/DI/testes; agregação energética, deduplicação, autorização e banco |
| SOA | Domínio/DB/migrations/OpenAPI/testes; lote parcial, timeout, replay sem duplicar no C# |
| Mobile | Expo/TS/Router, SQLite, acessibilidade, erro/offline e comparação honesta |
| IoT | ESP32 no Wokwi funcional; variação da entrada, simulação identificada e transmissão/replay declarado |
| ML | Fonte real, unidade de amostra, split sem vazamento, 10+ combinações/3 hiperparâmetros, CV só no treino, treino/teste e conclusão |
| Linux | Rede/DNS/IP, Bash, aplicação de outra matéria, logs, CPU/RAM/disco, boot e crash do monitor |
| Cyber | Motor de aula, PII, taint/bloqueio, LLM sanitizado e Risco Cidadão; não apenas login |
| Testing | Azure real, Features/casos completos, professor Admin, PDF e pitch |

## Pronto para entrega versus pronto para demo

Pronto para entrega exige a rubrica da disciplina e reprodução local; pronto para demo integrada exige também contratos e dependências funcionando. Se a nuvem falhar, o professor deve ter instruções e massa suficiente para rodar localmente. Cada README deve dizer o que é real, histórico, simulado, fixture e indisponível.
