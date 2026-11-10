# Consulta acústica .NET e painel

Responsável: **Leonardo Correa de Mello, RM555573**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/csharp.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: PostgreSQL + schema/seed comum, sem Java HTTP ativo.

Build, configuração e publicação devem seguir o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações); caminhos e toolchain ficam em [pipeline.json](../deploy/pipeline.json). Preparar o banco com o [módulo database/](../database/README.md), sem criar schema concorrente no C#.

Esta pasta ainda não contém implementação executável da matéria. Ao implementar, registrar aqui pré-requisitos/versões, instalação, configuração sem segredos, comandos standalone/integrado, testes e artefatos. Estado verificável em component.json; mocks compartilhados não substituem a entrega real.
