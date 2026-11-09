# Consulta e favoritos

Responsável: **Herbert de Sousa Vilela, RM555701**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/mobile.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: Mock local e SQLite; integrado consulta C# privado.

Build e distribuição devem seguir o [contrato das aplicações](../deploy/azure/README.md#contrato-das-aplicações); caminhos e toolchain ficam em [pipeline.json](../deploy/pipeline.json). Mock local, API integrada e cache offline devem permanecer cenários distintos, sem embutir credencial privada no aplicativo.

Esta pasta ainda não contém implementação executável da matéria. Ao implementar, registrar aqui pré-requisitos/versões, instalação, configuração sem segredos, comandos standalone/integrado, testes e artefatos. Estado verificável em component.json; mocks compartilhados não substituem a entrega real.
