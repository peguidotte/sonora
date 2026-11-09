# Azure — plano de implantação revisável

Pedro informou que a equipe tem conta Azure e provavelmente realizará os deploys lá; a configuração na máquina ainda será feita. A sessão da CLI nesta máquina lista apenas acesso ao tenant, sem assinatura utilizável. Nenhum recurso foi criado ou contratado.

## Topologia proposta

- Uma VM Ubuntu Server 24.04 LTS no resource group do projeto, escolhida conforme créditos/orçamento e região disponível.
- C# em 127.0.0.1:8080, como serviço systemd; dados em /var/lib/gs-ruido/ruido.db.
- SOA em 127.0.0.1:8082, como serviço próprio; banco separado em /var/lib/gs-ruido-soa/batches.db.
- Proxy HTTPS: endpoint /api/v1 e /dashboard para C#; prefixo externo /soa para SOA, removido no proxy. API_BASE_URL de SOA aponta para C# interno quando estiver na mesma VM.
- Somente HTTPS público; HTTP apenas se necessário ao certificado/redirecionamento. SSH limitado ao IP/rede administrativa e autenticação por chave.
- Mobile usa URL HTTPS pública; Expo/build de distribuição é uma entrega própria de Herbert. Banco local de favoritos não depende da nuvem.
- Wokwi usa endpoint público com chave descartável limitada a simulated. SOA usa X-Api-Key com imports:write somente no servidor; não publicá-la no sketch/app.
- ML é tarefa offline: resumo importado; dataset bruto não vai para a imagem/VM por padrão.

## O que precisa ser definido antes de provisionar

Preencher plan.example.json numa cópia local ignorada (plan.local.json): assinatura, região, resource group existente ou novo, créditos/orçamento, tamanho/disco da VM, chave pública SSH, IP administrativo e DNS/TLS. Não colocar chave privada/token no JSON.

Com assinatura correta autenticada, inventariar recursos existentes antes de criar novos. Não selecionar automaticamente uma assinatura escolar ou de outra empresa. A escolha da VM gera custo; validar o plano concreto de recursos antes da criação. O usuário já autorizou usar Azure, mas ainda não informou assinatura, região ou orçamento.

## Dependências de implementação

Leonardo fornece publish/runtime/migrations/seed/healthchecks e versão C#. Felipe fornece runtime/start/migrations/healthchecks de SOA. Pedro prepara scripts/systemd/rede e a implantação, com arquivos persistentes fora do diretório de publicação. Fixar commit/artefato e documentar rollback antes de ativar atualização automática.

Preparar versões antigas e backup do SQLite consistente antes de migrations/redeploy. Rollback de binário não desfaz automaticamente migration; descrever estratégia e evitar rollback destrutivo em piloto.

## Configuração GitHub

Depois de URLs reais existirem: variables API_BASE_URL e SOA_BASE_URL; secrets API_READ_KEY, API_OPERATOR_KEY e SOA_OPERATOR_KEY para smoke manual somente da main. Não inserir credenciais Azure em PRs ou logs; preferir identidade federada/OIDC quando automatizar deploy.

Workflow integration-smoke.yml já pode ser usado quando configurado. Ele rejeita o cabeçalho de mock e verifica apenas leitura/contratos, não escrita ou todos os requisitos. Não há workflow de deploy ativo enquanto faltam aplicação e destino.

## Evidências esperadas

URL HTTPS funcional, build/commit, serviços/bancos separados, seed funcional, observação simulada ponta a ponta, lote real importado sem duplicação, teste de indisponibilidade, persistência após reinício, monitor e logs sanitizados. Versão local deve continuar reproduzível sem conta Azure.

Referências: [VM Linux com Bicep](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-bicep), [environments GitHub](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments). Disponibilidade de proteções/environments em repo privado depende do plano; não presumir que estão aplicadas.

API de dados autenticada por padrão, inclusive GET. Documentação operacional/readiness também são privadas. Proxy não deve registrar X-Api-Key. /dashboard só pode ser anônimo enquanto for HTML vazio sem dados; solicita credencial em memória para chamadas privadas. Não usar query string para chave.
