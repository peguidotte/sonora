# Execução independente e integrada

São dois critérios de aceite separados. A disponibilidade da Azure não deve impedir o professor de reproduzir a parte de cada disciplina localmente.

## Estado inicial

Hoje existe a fundação: contratos, fixtures, mock HTTP e validações. **Os oito componentes ainda não estão implementados.** Cada responsável completa os comandos em seu README/component.json, registra versões e recolhe evidência de execução. O CI inicial não executa código inexistente.

## Standalone obrigatório para cada entrega

| Componente | Como deverá demonstrar sozinho | Dependência substituída |
| --- | --- | --- |
| C# | Migrations + seed SQLite, API/painel locais, dados sintéticos marcados | Sem SOA, ML ou IoT ativos; resumo ML opcional/indisponível |
| SOA | SQLite de lotes, pequeno arquivo permitido e receptor HTTP controlado | C# substituído pelo mock de contrato; entrega real ao receptor não pode ser alegada |
| Mobile | Fixture local, SQLite de favoritos e estados de erro/offline | Backend substituído por adaptador mock |
| IoT | Circuito Wokwi/serial e saídas visuais; envio ao mock quando acessível | API real substituída; conectividade/replay declarado |
| ML | Notebook, dados reais adquiridos de fonte documentada e requirements | Sem backend; **não** substituir base real por dados sintéticos |
| Linux | VM/WSL reproduzível e versão mínima real do C# com SQLite | Sem Azure, SOA/ML/Mobile; aplicação de outra disciplina continua obrigatória |
| Cyber | Motor de aula + protótipo/fixtures auditáveis coerentes com domínio | Sem nuvem; diagnóstico/LLM deve declarar fallback de demonstração, sem inventar chamada real |
| Testing | Documentos/casos legíveis localmente | O Azure Boards e acesso do professor continuam exigidos; PDF não elimina cadastro |

Standalone não significa instalação sem internet: registrar downloads/dependências e fornecer instrução para preparar o ambiente. Não incluir pacotes proprietários ou datasets grandes sem licença.

## Modo integrado

1. C# é dono do catálogo, dispositivos e observações; SQLite próprio.
2. SOA tem banco próprio de lotes e entrega observações via HTTP administrativo ao C#.
3. Mobile usa API_BASE_URL; frontend nunca recebe chave administrativa.
4. Wokwi envia dados simulados ao C# com credencial limitada ao dispositivo.
5. ML exporta resumo validado para importação; API de inferência contínua não é necessária no MVP.
6. Linux hospeda serviços e dados; monitor fica separado e é demonstrado conforme rubrica.
7. Cyber audita a mesma versão integrada; Testing registra os comportamentos efetivos.

Não compartilhar arquivos SQLite entre serviços nem acessar tabelas do colega diretamente. Dados reais históricos e IoT simulado coexistem com origem separada, sem virar uma série falsamente contínua.

## Configuração

Usar .env.example por componente sem segredo; URLs de localhost diferentes das de aparelho/VM/nuvem. Proposta local: C# 8080; SOA 8082; mocks 4010/4011; Mobile via Expo. Em deploy, backend externo usa HTTPS e portas internas não ficam públicas.

O mock compartilhado tem POST estático, não grava nem autentica de verdade. Ele ajuda navegação e formato, não comprova regra de negócio. Testes de ingestão/idempotência/persistência devem apontar para implementação real.

## Critério de versão integrada

Registrar commits das partes, contratos, seed, fonte real importada, estado do experimento e URLs usadas. Demonstrar um percurso IoT -> C# -> painel/Mobile e SOA -> C# com idempotência. Fazer o smoke de leitura de tools/smoke_integration.py e adicionar testes de escrita próprios. Se alguma parte usar mock, dizer exatamente qual e por quê.
