# Ingestão Java, migrations e views

Responsável: **Felipe Soares Xavier, RM556931**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/soa.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: PostgreSQL + migrations/seed/arquivos locais, sem API C# ativa.

Build, configuração e publicação devem seguir o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações); caminhos e toolchain ficam em [pipeline.json](../deploy/pipeline.json). Manter migrations/views/seed no [módulo database/](../database/README.md), parte da entrega de SOA, com execução independente dos projetos Java/C# e reutilizável por CI/Linux.

Esta pasta ainda não contém implementação executável da matéria. Ao implementar, registrar aqui pré-requisitos/versões, instalação, configuração sem segredos, comandos standalone/integrado, testes e artefatos. Estado verificável em component.json; mocks compartilhados não substituem a entrega real.
