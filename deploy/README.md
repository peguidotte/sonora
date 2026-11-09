# Deploy integrado

**Destino provável indicado pelo usuário: Azure.** Plano inicial: uma VM Linux para hospedar C# e SOA, bancos SQLite separados, proxy HTTPS e serviços systemd. A implantação é do mesmo código executável localmente.

Leia [plano Azure](azure/README.md), [modos de execução](../docs/modos-de-execucao.md) e [Linux](../docs/disciplinas/linux.md).

Esta pasta ainda não contém implantação funcional dos backends: eles serão entregues por Leonardo/Felipe e o provisionamento por Pedro. Não criar workflow que declara deploy bem-sucedido sem aplicação disponível.

Pipeline alvo: PR -> testes dos componentes/contratos -> integração na main -> artefatos versionados -> deploy de staging -> smoke -> evidência e rollback documentado. No bootstrap há CI da fundação e smoke manual preparado; faltam builds reais e destino configurado.
