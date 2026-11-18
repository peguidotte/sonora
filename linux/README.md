# Operating Systems · Linux

[Capturas da execução](evidencias/) · [Painel na Azure](https://sonora-gs-58403f1647.centralus.cloudapp.azure.com/dashboard)

O servidor hospeda a ingestão Java, o PostgreSQL e a API C#. O monitor acompanha CPU, RAM e disco. O laboratório demonstra provisionamento do zero, mudança de rede com rollback e recuperação do serviço após falha.

**Vídeo para a entrega:** Pedro vai gravar a demonstração de até sete minutos. As [capturas do laboratório](evidencias/) mostram o provisionamento, a configuração de rede, o monitor e sua recuperação. Para mostrar a aplicação de outra disciplina, siga a [consulta no painel da Azure](#consultar-uma-medição-pública-no-painel).

Responsável: **Pedro Visconti Guidotte, RM556630**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/linux.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: VM/WSL, PostgreSQL e C# real com setup/seed; sem conta Azure obrigatória.

`provision.sh` prepara Ubuntu 24.04/PostgreSQL/Java/Caddy/systemd e retenção de logs; `network.sh` verifica/configura rede; `monitor.sh` acompanha CPU/RAM/disco com alerta e recuperação por recurso; `verify.sh` verifica a VM e executa testes limitados de falha/carga; `deploy-release.py` instala releases privados e verifica saúde. [Infraestrutura e CI/CD](../deploy/azure/README.md) define execução Azure e contrato de publicação. Schema/views/seed continuam sendo entrega do SOA no [módulo database/](../database/README.md), com artefato independente das aplicações.

## Reprodução local

Em VM Ubuntu 24.04 descartável com systemd, a partir da raiz do clone:

```bash
sudo install -d -m 0755 /opt/sonora/bootstrap
sudo install -m 0700 linux/*.sh linux/deploy-release.py /opt/sonora/bootstrap/
sudo bash /opt/sonora/bootstrap/provision.sh sonora.localhost --local
```

Modo local usa HTTP; no Azure o cloud-init passa FQDN real e HTTPS. `SONORA_HOSTNAME` permite escolher o hostname, padrão `sonora`. Para instalar as releases compiladas, siga o [procedimento de publicação](../deploy/azure/README.md). Não executar provisionamento no host pessoal ou em servidor com dados/serviços de outros projetos.

### Laboratório isolado no Windows

`lab.py` cria uma VM nova no VirtualBox 7.2, a partir de uma imagem oficial Ubuntu 24.04 amd64 com SHA-256 fixado. Requer Python 3.12+, VirtualBox com virtualização disponível, aproximadamente 1,5 GB de RAM livre para a VM e espaço para o disco dinâmico de até 16 GB. Na raiz do clone:

```powershell
.venv/Scripts/python.exe -m pip install pycdlib==1.14.0
.venv/Scripts/python.exe linux/lab.py prepare
.venv/Scripts/python.exe linux/lab.py run
```

O padrão é `output/lab/linux-repro`; usar `--directory output/lab/outro-ensaio` nos dois comandos para uma reprodução nova. O controlador recusa sobrescrever um laboratório existente. A imagem fica no cache do usuário; disco/ISO/identidade da VM ficam em `output/lab/`, fora do Git. `pycdlib` serve apenas para criar a ISO NoCloud e não é dependência da aplicação, do servidor ou da CI.

A VM usa um vCPU e uma única interface NAT, sem encaminhar portas; o proxy DNS usa o resolvedor do host. O laboratório configura APT via HTTPS/IPv4 com timeouts e sem traduções; padrão `https://azure.archive.ubuntu.com/ubuntu`, substituível por `--apt-mirror` no prepare. Esse espelho público não cria recursos nem usa a conta Azure. O console serial por named pipe local permite aplicar/restaurar a rede sem depender de SSH. O autologin de root existe somente nesse console de laboratório; senha e login SSH de root não são habilitados. Os scripts de laboratório não integram o artefato Azure.

`lab.sh` comprova a ausência inicial do Sonora/PostgreSQL, executa o provisionamento real e seus testes, confere reexecução preservando credenciais/OID do banco/arquivo, aplica IP estático, deixa uma tentativa expirar para conferir rollback em disco e runtime, retorna a DHCP e verifica reboot real. IPs `10.0.2.15/24`, `10.0.2.20/24`, gateway `10.0.2.2` e DNS `10.0.2.3` são exclusivos do NAT padrão desse laboratório VirtualBox.

Cada execução gera um diretório próprio em `output/evidence/linux/lab-<id>/`: abrir `index.html` para localizar ambiente, hashes dos fontes/imagem, logs por etapa, gravação `terminal.cast`, resultados e seleção sugerida para o vídeo. O ZIP ao lado desse diretório contém somente as evidências, sem discos/ISO/segredos. `sourceCommit` é a base Git; `sourceWorktreeDirty`, hashes dos arquivos copiados e `execution.json` identificam o código efetivamente ensaiado. O controlador solicita desligamento ao terminar e registra se a VM desligou; mantém VM/disco para consulta posterior. Uma execução incompleta não comprova as etapas restantes. O resultado `infrastructure-only-passed` cobre rede, sistema e monitor. A [demonstração na Azure](#reproduzir-a-demonstração-na-vm) cobre as aplicações e o banco com as migrations aplicadas.

## Rede

Na Azure, manter o DHCP e a configuração de rede fornecidos pela plataforma; o provisionamento configura o hostname e verifica endereço IPv4, rota e resolução DNS. `network.sh check [interface]` é somente leitura. O DNS de verificação pode ser definido por `DNS_CHECK_NAME`.

Para uma VM Ubuntu dedicada com uma única interface e console interativo, copiar `network.example.json` para um arquivo local e ajustar interface/DNS ao ambiente. O exemplo usa DNS da Azure, que não serve como DNS de uma VM fora dela. `mode=dhcp` não recebe IP/rota fixos. Para `mode=static`, incluir `address` com prefixo (ex.: `192.168.50.20/24`) e `gateway` da mesma sub-rede, respeitando a rede real do laboratório.

```bash
bash linux/network.sh render network.local.json
sudo bash linux/network.sh configure network.local.json
```

O script valida os parâmetros e o Netplan, salva a configuração anterior em `/var/backups/sonora/network/` e usa `netplan try` com confirmação em até 60 s. Essa operação assume o controle dos arquivos Netplan da VM de uma interface. Em falha, restaura os arquivos anteriores e tenta reaplicá-los; conferir a recuperação pelo console. `configure` recusa execução sem terminal e não é chamado automaticamente no deploy Azure. [Netplan try](https://netplan.readthedocs.io/en/stable/cli/) não dispensa verificação da rede após rollback.

O código zero de `netplan try` não comprova aceitação: o script também exige a mensagem explícita `Configuration accepted.` em locale C. Sem essa confirmação, retorna erro e restaura o backup. A saída Python não é bufferizada para que o prompt continue visível durante a auditoria por `tee`; o ensaio verifica arquivo e estado real da interface após o timeout.

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

## Reproduzir a demonstração na VM

Com as migrations e as releases instaladas, execute na raiz do clone:

```bash
sudo bash linux/demo.sh
sudo bash linux/verify.sh
```

O primeiro comando cadastra o local identificado como demonstração e usa a credencial de dispositivo da VM para enviar uma janela sintética ao Java. O reenvio retorna o registro anterior. O C# lê o perfil pelo PostgreSQL. No painel, selecione **Laboratório Sonora (simulado)**, origem simulada e um intervalo que inclua **17/11/2026 às 12h de São Paulo**. A janela registrada tem cinco segundos e 63,4 dB(A).

O cadastro usa a identidade de dispositivo da instalação padrão. Se já estiver vinculada a outro local, o script interrompe a transação. As credenciais ficam na VM.

O [smoke integrado manual](https://github.com/peguidotte/sonora/actions/workflows/integration-smoke.yml) usa o modo `azure` para conferir serviços e consultar a janela de demonstração com `demo.sh --check`. Esse modo lê o perfil existente e mantém as chaves na VM.

### Consultar uma medição pública no painel

No [painel da Azure](https://sonora-gs-58403f1647.centralus.cloudapp.azure.com/dashboard), use a chave de leitura da sua equipe e escolha **Paulista B — amostra real NoiseCapture**. Selecione a origem de dados públicos, preencha as duas datas com **22/08/2018** e agrupe por hora. A faixa das **23h de São Paulo** mostra **73,1 dB(A)**, calculados a partir de 24 segundos de medição entre 23h50min26s e 23h50min49s. A cobertura daquele dia se limita a esses 24 segundos.

Essa amostra veio do [arquivo histórico NoiseCapture](../ml/dados/README.md), sob licença ODbL 1.0. O serviço Java importou 24 observações e o C# consultou o resultado no banco. A simulação de 63,4 dB(A) está em outro local e período.
