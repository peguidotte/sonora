# Auditoria dos contratos privados v0.3.0

Base: main bbfdcb6. Alterações na branch pedro/english-private-contracts, solicitadas pelo usuário para contratos/rotas em inglês e API privada.

## Verificações executadas

- Dois documentos OpenAPI 3.1 e 63 exemplos de entrada/resposta validados localmente.
- JSON Schema de resumo ML e fixture sintética compatíveis.
- Todas as operações /api/v1 e readiness têm autenticação, permissão e erros 401/403 documentados.
- 17 testes locais passaram, incluindo leitura sem chave/inválida, escopo insuficiente, vínculo de dispositivo, rejeição de credencial na query, origem não autodeclarada, ausência de dados e remoção de rota antiga.
- Manifests de oito componentes conferidos; continuam planned, sem alegação de implementação das matérias.
- Links locais e UTF-8 conferidos sem arquivo ausente/caractere inválido nas referências ativas.

## Limites

Os testes exercitam mocks estáticos, schemas e ferramentas da fundação. Não comprovam autenticação, armazenamento seguro, revogação, persistência ou integração em backend de produção. Credenciais em contracts/fixtures/mock-credentials.json são públicas e exclusivamente sintéticas. A CI remota já tinha falha de startup registrada; resultado local não é apresentado como resultado de Actions.

## Migração

Location/locationId, rotas em inglês e X-Api-Key único substituem os contratos anteriores. Sem aliases legados. C#, SOA, Mobile, IoT, Linux e Testing devem usar v0.3.0. Documentação explicativa permanece PT-BR; identificadores/erros técnicos em inglês. Histórico de análises anteriores foi preservado.
