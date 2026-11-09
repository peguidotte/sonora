# C# — API de consulta

**Responsável:** Leonardo Correa de Mello, RM555573. Pasta `api/`; branch `leo/csharp`.

## Exigência do professor

PDF p. 30 e tarefa coletada em 06/11: Web API/Minimal API .NET, POO, interfaces, DI, EF Core + LINQ, async/await, testes unitários, Swagger/Scalar, README com descrição, nomes/RMs e evidências; enviar GitHub.

| Critério | Pontos | Aplicação/evidência proposta |
| --- | --- | --- |
| POO | 3,0 | Objetos de janela/procedência/perfil encapsulados, regras de cálculo e serviços com responsabilidade clara |
| Web API | 2,5 | Rotas documentadas, DTOs, status e tratamento de erros |
| EF Core + LINQ | 1,5 | Mapeamento das views e consultas ao PostgreSQL com filtros, projeções e paginação via LINQ |
| Async/await | 1,0 | I/O assíncrono com cancelamento e sem bloqueio desnecessário |
| Qualidade | 2,0 | DI, interfaces úteis, organização, testes e ausência de segredos |

## Responsabilidade

Implementar API .NET com EF Core/Npgsql, LINQ e consultas assíncronas às views sonora_read. Calcular perfis, cobertura e comparações, tratar ausência de dados e servir o painel. Java é dono da gravação; a evolução SQL fica no módulo database/, sob responsabilidade de SOA; C# não recebe IoT, não importa lotes e não executa migrations de captura.

Domínio com objetos de janela, procedência e perfil; interfaces e DI nos limites de persistência/cálculo. Não criar herança ou camadas sem função só para pontuar. DTOs HTTP seguem o OpenAPI C#; nomes/tipos SQL e permissões seguem database.json. Credencial de runtime somente leitura, distinta da de setup.

## Sequência e aceite

1. Usar setup/migrations/seed comuns de database/ para preparar PostgreSQL local, sem iniciar Java HTTP.
2. Mapear views em EF Core, implementar healthchecks, consultas paginadas e filtros do contrato.
3. Implementar cálculo energético, separação de séries/origens, no_data, intervalos/fuso e cobertura; não representar falta de amostra como silêncio.
4. Proteger consultas e operação por escopo; servir somente shell vazio sem autenticação. Painel busca dados privados.
5. Testar regras de cálculo e validação; integração HTTP/EF em PostgreSQL verifica filtros, paginação, persistência do seed e impossibilidade de escrita com sonora_query.
6. Documentar build/publish/entrypoint, configuração sem segredo, porta e healthchecks para Pedro; API deve executar fora da IDE.

Aceite mínimo: 60/70 dB em janelas iguais -> aproximadamente 67,40; fonte/origem explícitas; no_data nulo; chave ausente/inválida 401, escopo errado 403; consulta funciona com Java parado e dados persistidos; ready acusa indisponibilidade do banco. Resumo ML é leitura de payload validado ou 204.

## Entrega

Projeto, README de execução, testes, OpenAPI e evidências reais. Relacionar POO/EF/LINQ/async/DI aos trechos implementados. Handoff de deploy inclui versão/runtime fixados, publish, comando de início, variáveis e permissões. Bootstrap do domínio é fornecido pelo módulo database/, mantido na entrega de SOA; não criar uma segunda definição do schema.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
