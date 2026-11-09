# Operating Systems — execução e monitoramento

**Responsável:** Pedro Visconti Guidotte, RM556630. Pasta `linux/`; branch `pedro/operating-systems`.

## Exigência do professor

PDF pp. 35–37 e tarefa detalhada coletada em 06/11: Bash automatizando infraestrutura/rede, dependências, aplicação e banco; monitor de recursos como serviço resiliente; logs/auditoria; testes de falha; ambiente reproduzível. WSL com todas as configurações e systemd, VM local ou Azure são admitidos.

| Critério | Pontos | Evidência |
| --- | --- | --- |
| Rede, DNS, IP | 2,0 | Configuração e verificação por script |
| Aplicação | 2,0 | Dependências, publicação, banco e serviço |
| CPU, memória e disco | 2,0 | Amostras, alertas e recuperação |
| Monitor tolerante a falhas | 1,0 | Boot e recuperação após crash |
| Auditoria/execução | 1,0 | Logs com etapas, horários e códigos |
| Funcionamento completo | 2,0 | Aplicação de outra disciplina funcional |

GitHub com scripts/configurações/README/integrantes/evidências e vídeo até 7 minutos.

## Responsabilidade

Provisionar Linux com aplicações Java/C#, PostgreSQL e proxy HTTPS como serviços independentes. A aplicação web de outra disciplina é obrigatória; uma página que só responde 200 não a substitui. Para demonstração mínima de Linux, C# com PostgreSQL/seed pode funcionar sem Java ativo; o objetivo integrado inclui os dois backends.

SOA fornece migrations/views/grants/seed; C# fornece publish/runtime/start. O provisionamento aplica setup comum com conta migradora e inicia runtimes com usuários/credenciais distintos. C# recebe sonora_query, sem poder de escrita/DDL. Banco usa diretório de dados PostgreSQL persistente, fora dos artefatos de aplicação.

## Automação a implementar

- Infra: parâmetros de interface/IP/prefixo/rota/DNS/hostname, usuários de serviço, diretórios e permissões. Validar e salvar configuração anterior antes de alterar rede; prever console/recuperação.
- Banco: instalar/configurar PostgreSQL, aplicar migrations/grants/seed com ferramenta do SOA, sem duplicar schema no Bash.
- Apps: instalar runtimes/dependências, publicar versões fixadas, configurar ambiente fora do Git, proxy/prefixos e systemd.
- Monitor: CPU por diferença de /proc/stat, RAM por MemAvailable, disco do filesystem de dados; intervalo/limiares configuráveis, logs/alerta e retorno ao normal.
- Verificação/falha: saúde autenticada, consultas e testes controlados no laboratório, com limites/limpeza; logs de etapa, timestamp e código de saída, sem segredo.

## Aceite

Reexecução converge sem duplicar seed/usuários ou apagar banco; IP/DNS/rota/hostname conferem; aplicações e monitor iniciam no boot. Observação persistida pelo Java continua consultável após reiniciar C# e PostgreSQL. Com banco indisponível, readiness acusa falha.

Encerrar abruptamente o processo principal do monitor e comprovar recuperação pelo systemd, novo PID e logs. systemctl stop é parada administrativa e não substitui crash em Restart=on-failure. Carga limitada gera alerta e recuperação, sem encher disco/travar host pessoal. Falha de script interrompe com código não zero e log sanitizado.

## Entrega

Scripts Bash, configurações/systemd, README de reprodução e evidências reais, mais vídeo no limite oficial. Mostrar provisionamento, rede, banco, consulta funcional, monitor/logs, falha/recuperação e boot. VM local e Azure devem preservar o mesmo desenho; parâmetros de ambiente ficam em configuração, não em documentação duplicada.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
