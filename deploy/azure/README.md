# Infraestrutura e entrega contínua

Terraform prepara uma VM Ubuntu 24.04, rede/NSG, DNS público, Blob Storage privado e identidade de deploy. O estado remoto fica em outro Storage Account, criado pelo bootstrap. Somente Azure for Students com `spendingLimit=On` é aceita; não remover esse limite nem migrar para cobrança por uso. SKU/região dependem de quota/disponibilidade. A VM é protegida contra destruição pelo Terraform; redeploys preservam o disco/banco.

O [provisionamento Linux](../../linux/README.md) instala PostgreSQL, Java 21, dependências do executável .NET autocontido, Caddy/HTTPS, usuários, serviços e monitor. Somente 80/443 são públicos. SSH é opcional com `admin_cidr` IPv4 /32; a automação usa Azure Run Command.

## Bootstrap e configuração

Pré-requisitos: Python 3.12+, Azure CLI, Terraform 1.17.1, OpenSSH e `gh` autenticado. Autenticar interativamente na Azure CLI, sem senha no script. Usar `AZURE_CONFIG_DIR` fora do repositório para isolar a conta escolar.

```bash
python deploy/pipeline.py bootstrap --subscription <ID> --location centralus --vm-size Standard_B2pls_v2 --architecture arm64
terraform -chdir=deploy/azure init -backend-config=backend.tfbackend
terraform -chdir=deploy/azure plan -out=apply.tfplan
terraform -chdir=deploy/azure apply apply.tfplan
python deploy/pipeline.py configure
```

No PowerShell, colocar argumentos com `=` e nome de arquivo entre aspas: `'-backend-config=backend.tfbackend'`. Bootstrap cria grupo dedicado, storage de estado e identidade da infraestrutura; Terraform gerencia os recursos da aplicação. Não adotar grupos de outros trabalhos. Antes do apply, conferir créditos, quota/região/SKU e eventuais substituições/destruições do plano.

`terraform.tfvars.json`, `backend.tfbackend`, estado/planos e `runtime.local.json` ficam locais/ignorados; `terraform.tfvars.example` mostra os parâmetros. Chave SSH privada fica no perfil do administrador. O bootstrap não publica tokens/senhas. Grupo/storage de estado são externos ao destroy; limpeza exige planejamento separado com preservação de backup.

## Pipelines e identidade

| Workflow | PR | Main |
| --- | --- | --- |
| contracts.yml | Contratos/mocks/ferramentas | Mesmas verificações |
| infrastructure.yml | Terraform fmt/validate e sintaxe Linux/Python | Plan/apply e atualização do provisionamento |
| delivery.yml | Contratos, testes e builds dos componentes presentes | Publica SOA/migrations antes de C#; gera APK Mobile |
| integration-smoke.yml | — | Smoke manual com credenciais configuradas separadamente |

OIDC aceita somente `repo:peguidotte/sonora:ref:refs/heads/main`; PRs não recebem identidade Azure. A identidade de infraestrutura tem Contributor, administração de RBAC e acesso aos blobs no grupo dedicado. A de deploy acessa somente a VM/container de releases; a VM apenas lê esses releases. Não instalar runner de PR no servidor da aplicação.

`configure` registra apenas IDs e parâmetros públicos nas variables do GitHub: tenant/subscription, client IDs, grupo/VM/storage, origem HTTPS, RID .NET e configuração Terraform. Não exporta senhas/chaves. Workflow validado localmente não comprova execução remota; Actions precisa estar disponível para a conta.

## Contrato das aplicações

[pipeline.json](../pipeline.json) centraliza caminhos/toolchains; ajustar quando o responsável definir seu projeto. Projeto ausente é declarado como não implementado. Código presente com caminho incompatível falha, sem publicar um mock como aplicação.

- **C#:** projeto e projeto de testes; SDK inicial 10.0.x, executável Sonora.Api. `dotnet test` e publish autocontido para o RID da VM; não precisa de SDK no servidor.
- **Java:** Maven/Java 21, `mvn verify`, um JAR executável em target/. Fornecer `soa/deploy/migrate.sh`, executável na raiz do release com `app/sonora.jar` disponível. Ele recebe `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` e `SONORA_DB_*` e prepara migrations/views/grants/catálogo sem manter HTTP ativo. Conta de runtime não aplica DDL.
- **Mobile:** Expo gerenciado/TypeScript, package-lock e suporte a prebuild Android. CI executa npm ci, tsc, Expo prebuild e Gradle assembleDebug. APK de demonstração fica nos artefatos privados por 14 dias; sem publicação em loja ou assinatura de produção. Somente a URL pública da API entra no build; nenhuma chave privada.

Backends devem consumir `SONORA_DB_*`, host/porta e `SONORA_KEYS_FILE`. .NET/Spring também recebem suas variáveis convencionais. O arquivo de credenciais contém `keys[]` com `id`, `sha256` hexadecimal, `scopes[]` e `deviceId` quando restrito. Backend implementa validação/hash/autorização/rotação; arquivo configurado não implementa autenticação. As chaves em texto ficam em `/etc/sonora/admin`, root-only, fora de Git, state e logs. Não recuperá-las imprimindo-as pelo Azure Run Command.

## Publicação e recuperação

Releases identificam commit/run/attempt, manifesto e SHA-256. GitHub envia ao Blob privado via OIDC; VM baixa por identidade gerenciada, verifica procedência/hash e rejeita traversal/links. SOA faz backup antes de migrations com usuário separado. Migrations precisam preservar consumidores existentes. Deploy troca link simbólico e verifica saúde autenticada; falha tenta restaurar o binário anterior. Não existe rollback automático de schema/dados.

VM única não oferece alta disponibilidade. Backups locais não protegem contra perda da VM/disco; exportação protegida para outro armazenamento é necessária antes de uso com dados importantes. Serviços só são ativados com artefatos reais; indisponibilidade anterior é declarada, não uma aplicação fictícia.
