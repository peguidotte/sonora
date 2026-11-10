# SOA — ingestão Java

**Responsável:** Felipe Soares Xavier, RM556931. Pasta `soa/`; branch `felipe/soa`.

## Exigência do professor

PDF p. 27: backend em qualquer linguagem, domínio estruturado, banco, migrations, documentação automática e testes automatizados. GitHub, README com execução/integrantes e evidências.

| Critério | Pontos | Aplicação proposta |
| --- | --- | --- |
| Domínio | 3,0 | Fonte, dispositivo, observação, validação e estados da importação |
| Banco | 3,0 | Histórico de importações e resultados persistidos |
| Migrations | 1,5 | Preparar schema a partir de banco vazio |
| Documentação | 1,5 | OpenAPI automática dos endpoints de observações, lotes e operação |
| Testes | 1,0 | Regras, endpoints REST, idempotência e integração com PostgreSQL |

## Responsabilidade

Backend Java independente da API C#. Receber observações do ESP32/Wokwi, importar arquivos públicos NoiseCapture, validar/normalizar/deduplicar e persistir no PostgreSQL. Administrar jobs de importação. Sem envio de lote HTTP ao C# ou banco intermediário SQLite.

Domínio mínimo: fonte, local, dispositivo, observação, arquivo permitido e importação. Serviço de ingestão modular permite adaptadores futuros, mas apenas Sonora entra nesta GS. O framework deve ser compatível com a aula; caminhos e toolchain de build/publicação seguem [pipeline.json](../../deploy/pipeline.json) e o [contrato de deploy](../../deploy/azure/README.md#contrato-das-aplicações). Fixar dependências no projeto e alinhar qualquer mudança à CI no mesmo PR.

## Banco e contratos

A entrega de SOA inclui autoria, evolução e testes das migrations do schema sonora e publicação de sonora_read conforme database.json, incluindo grants e seed sintético. Esses artefatos ficam no [módulo database/](../../database/README.md), com Flyway CLI e comando independente dos builds/runtimes Java/C#. Felipe deve demonstrar banco vazio -> migrations -> backend funcional e relacionar esse código à rubrica. O C# prepara o banco pelo mesmo módulo. Conta migradora é separada do runtime.

POST de observação resolve origem/local/fonte pela credencial e dispositivo; protege com observations:write. API de batches usa imports:manage. fileId referencia caminho/fonte/mapeamento permitido no servidor; não aceitar URL/caminho arbitrário no corpo. Importação real preserva origem e coordenadas; nunca deslocar toda a cidade para ponto fictício.

## Sequência e aceite

1. Criar domínio, PostgreSQL, migrations, views/grants e seed.
2. Implementar ingestão privada, validação, unicidade source_id + external_id e idempotência.
3. Implementar criação/consulta de batches. acceptedCount conta linhas commitadas; erro/rejeição parcial e completedAt são visíveis. Não existe deliveryStatus.
4. Publicar OpenAPI real e testar regras, autenticação e persistência usando PostgreSQL.
   Validar limites/obrigatoriedade reais via HTTP (no limite, acima dele e Unicode) e manter writeModels conforme o armazenamento; executar o checker API/banco de database/ contra as migrations. Declarar transformação de dados e cobri-la por teste, sem truncamento silencioso.
5. Fornecer importação administrativa de summary.json validado pelo schema ML para armazenamento/publicação na view; não executar pickle/modelo Python.

Aceite: retry idêntico não duplica e conflito é 409; dispositivo alheio é 403; 401 sem chave válida; origem não pode ser escolhida por dispositivo; arquivo desconhecido/falho não é sucesso silencioso; erro/rollback não incrementa acceptedCount; reinício preserva dados; view e grants correspondem ao contrato; C# não precisa estar ativo para concluir a importação.

## Entrega

README com runtime/build/start, conexão/grants, migrations/seed, configuração de credenciais sem segredo, arquivo de exemplo atribuído à fonte e evidências de persistência. Entregar a Leonardo/Pedro o setup de banco e o contrato publicado. Aplicação local usa o mesmo PostgreSQL do desenho integrado, sem dependência da nuvem.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
