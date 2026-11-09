# Provisionamento e monitoramento

Responsável: **Pedro Visconti Guidotte, RM556630**. [Equipe completa](../README.md#equipe).

[Especificação da matéria](../docs/disciplinas/linux.md) · [Arquitetura](../docs/arquitetura.md) · [Contratos](../contracts/README.md).

Reprodução esperada: VM/WSL, PostgreSQL e C# real com setup/seed; sem conta Azure obrigatória.

Scripts em desenvolvimento: provision.sh prepara Ubuntu 24.04/PostgreSQL/Java/Caddy/systemd; monitor.sh acompanha CPU/RAM/disco; deploy-release.py instala releases privados e verifica saúde. [Infraestrutura e CI/CD](../deploy/azure/README.md) define execução Azure e contrato de publicação. Schema/views/seed continuam sendo entrega do SOA.

## Reprodução local

Em VM Ubuntu 24.04 descartável com systemd, a partir da raiz do clone:

```bash
sudo install -d -m 0755 /opt/sonora/bootstrap
sudo install -m 0700 linux/provision.sh linux/monitor.sh linux/deploy-release.py /opt/sonora/bootstrap/
sudo bash /opt/sonora/bootstrap/provision.sh sonora.localhost --local
```

Modo local usa HTTP; no Azure o cloud-init passa FQDN real e HTTPS. Backends/migrations precisam ser fornecidos pelos responsáveis. Não executar provisionamento no host pessoal ou em servidor com dados/serviços de outros projetos.

## Verificação e falhas

```bash
systemctl status postgresql caddy sonora-monitor
journalctl -u sonora-monitor --since '5 minutes ago'
sudo systemctl kill --kill-whom=main --signal=SIGKILL sonora-monitor
systemctl show sonora-monitor -p MainPID -p NRestarts
```

Comprovar novo PID/reinício e logs após crash e reboot. Aplicações só ficam ativas após deploy real. Provisionamento registra /var/log/sonora-provision.log; serviços usam journald. Reexecução deve preservar banco, chaves e dados. Limiares/intervalo: /etc/sonora/monitor.env; sem segredos nas evidências.

Ainda é necessário demonstrar aplicação de outra disciplina, configuração/verificação de rede/DNS/IP, alertas sob carga limitada, recuperação, reprodução completa e vídeo até 7 minutos. Infraestrutura disponível não conclui a rubrica. Estado em component.json.
