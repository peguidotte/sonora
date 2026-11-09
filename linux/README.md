# Provisionamento e monitoramento

Responsável: **Pedro Visconti Guidotte, RM556630**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/linux.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: VM/WSL, PostgreSQL e C# real com setup/seed; sem conta Azure obrigatória.

`provision.sh` prepara Ubuntu 24.04/PostgreSQL/Java/Caddy/systemd e retenção de logs; `network.sh` verifica/configura rede; `monitor.sh` acompanha CPU/RAM/disco com alerta e recuperação por recurso; `verify.sh` verifica a VM e executa testes limitados de falha/carga; `deploy-release.py` instala releases privados e verifica saúde. [Infraestrutura e CI/CD](../deploy/azure/README.md) define execução Azure e contrato de publicação. Schema/views/seed continuam sendo entrega do SOA.

## Reprodução local

Em VM Ubuntu 24.04 descartável com systemd, a partir da raiz do clone:

```bash
sudo install -d -m 0755 /opt/sonora/bootstrap
sudo install -m 0700 linux/*.sh linux/deploy-release.py /opt/sonora/bootstrap/
sudo bash /opt/sonora/bootstrap/provision.sh sonora.localhost --local
```

Modo local usa HTTP; no Azure o cloud-init passa FQDN real e HTTPS. `SONORA_HOSTNAME` permite escolher o hostname, padrão `sonora`. Backends/migrations precisam ser fornecidos pelos responsáveis. Não executar provisionamento no host pessoal ou em servidor com dados/serviços de outros projetos.

## Rede

Na Azure, manter o DHCP e a configuração de rede fornecidos pela plataforma; o provisionamento configura o hostname e verifica endereço IPv4, rota e resolução DNS. `network.sh check [interface]` é somente leitura. O DNS de verificação pode ser definido por `DNS_CHECK_NAME`.

Para uma VM Ubuntu dedicada com uma única interface e console interativo, copiar `network.example.json` para um arquivo local e ajustar interface/DNS ao ambiente. O exemplo usa DNS da Azure, que não serve como DNS de uma VM fora dela. `mode=dhcp` não recebe IP/rota fixos. Para `mode=static`, incluir `address` com prefixo (ex.: `192.168.50.20/24`) e `gateway` da mesma sub-rede, respeitando a rede real do laboratório.

```bash
bash linux/network.sh render network.local.json
sudo bash linux/network.sh configure network.local.json
```

O script valida os parâmetros e o Netplan, salva a configuração anterior em `/var/backups/sonora/network/` e usa `netplan try` com confirmação em até 60 s. Essa operação assume o controle dos arquivos Netplan da VM de uma interface. Em falha, restaura os arquivos anteriores e tenta reaplicá-los; conferir a recuperação pelo console. `configure` recusa execução sem terminal e não é chamado automaticamente no deploy Azure. [Netplan try](https://netplan.readthedocs.io/en/stable/cli/) não dispensa verificação da rede após rollback.

## Verificação e falhas

```bash
# Verifica infraestrutura, mata somente o monitor e comprova reinício/novo PID.
sudo bash linux/verify.sh --infrastructure-only --fault-test
# CPU real em unidade isolada: duração limitada, quota de 75% de um core, RAM até 64 MB.
sudo bash linux/verify.sh --infrastructure-only --load-test
# Inclui as aplicações reais; retorna 3 enquanto faltarem releases.
sudo bash linux/verify.sh
python -m unittest discover -s tools -p 'test_linux.py' -v
```

`verify.sh` retorna 0 se o modo escolhido passar, 1 em falha, 2 em uso inválido e 3 se faltarem aplicações. `--infrastructure-only` é validação parcial declarada. Testes de carga/falha são explícitos e não fazem parte do deploy automático. Carga usa monitor de laboratório com limiar CPU de 10%, sem alterar o monitor principal; exige alerta e recuperação medidos. Os testes automatizados usam amostras controladas para verificar também memória/disco e entradas inválidas, sem encher disco/esgotar RAM da VM.

Monitor: `INTERVAL_SECONDS` de 1 a 3600; `CPU_THRESHOLD`, `MEMORY_THRESHOLD`, `DISK_THRESHOLD` de 1 a 100 em `/etc/sonora/monitor.env`. `DISK_PATH` seleciona o filesystem (padrão `/var/lib/postgresql`). `SAMPLE_COUNT=0` monitora continuamente; valor positivo limita amostras. `PROC_ROOT` é ponto de injeção para testes com fixtures; manter `/proc` na VM real. Reiniciar o serviço depois de editar a configuração.

Comprovar novo PID/reinício e logs após crash e reboot. Aplicações só ficam ativas após deploy real. Scripts registram etapas/timestamp/resultado em `/var/log/sonora-*.log`, com rotação; serviços usam journald persistente limitado a 100 MB/14 dias. Reexecução deve preservar banco, chaves e dados. Para evidências, salvar saída real e metadados de ambiente/commit em `output/` local ou anexar ao PR, sem segredos. Um reboot precisa ser executado e verificado de fato; `is-enabled` sozinho não comprova recuperação pós-boot.

Para fechar a entrega: demonstrar aplicação de outra disciplina com banco/migrations reais, persistência e falhas da aplicação/banco; configuração de rede e rollback em laboratório; reprodução completa e vídeo até 7 minutos. Usar a [rubrica](../docs/disciplinas/linux.md) para organizar essas evidências. Infraestrutura disponível não conclui a matéria; `component.json` permanece em desenvolvimento até comprovar tudo.
