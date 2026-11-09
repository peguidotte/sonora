# Operating Systems — hospedagem da API de ruído

**Responsável:** Pedro Visconti Guidotte, RM556630. **Dependência obrigatória:** API web funcional de outra disciplina, proposta C#.

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

## Arquitetura proposta

Ubuntu Server 24.04 LTS em VM local, API C# .NET 10 + SQLite. Versões devem corresponder ao pacote real recebido do colega. Sem Kubernetes, obrigação de nuvem paga ou banco remoto. WSL com systemd é alternativa se Pedro preferir; script de rede precisa ser adaptado ao ambiente, não copiado sem ajustes.

API em /opt/gs-ruido/app, banco em /var/lib/gs-ruido/ruido.db, configuração em /etc/gs-ruido/app.env e auditoria em /var/log/gs-ruido. Usuário de serviço gs-ruido com menor privilégio. Porta interna proposta 8080, healthchecks do contrato e /painel para mostrar a solução no navegador.

SOA e ML não precisam rodar continuamente no servidor: SOA entrega lotes por HTTP e ML entrega resumo por importação. A API mínima real do C# deve estar pronta cedo; uma página estática que sempre responde 200 não conclui a matéria.

## Arquivos a implementar

| Arquivo | Função |
| --- | --- |
| linux/scripts/provision-infra.sh | Validar ambiente, hostname, IP/rota/DNS, usuário, diretórios e permissões |
| linux/scripts/provision-app.sh | Instalar runtime/dependências, publicar versão, migrations, seed e serviço |
| linux/scripts/monitor.sh | Loop de amostragem e alertas |
| linux/scripts/verify.sh | Configuração, serviços, saúde e consulta funcional |
| linux/scripts/test-failure.sh | Falhas limitadas no laboratório, coleta de resultado e limpeza |
| linux/config/gs.env.example | Parâmetros sem segredos |
| linux/systemd/gs-ruido-app.service | App no boot e recuperação |
| linux/systemd/gs-ruido-monitor.service | Monitor no boot e recuperação |
| linux/evidencias/ | Saídas/capturas reais |

Esses arquivos são planejamento; ainda não foram implementados.

## Passos de execução

1. Escolher VM/WSL, distribuição e interface/IP/prefixo/gateway/DNS reais. Configurar console/recuperação antes de mudar a rede; salvar configuração anterior.
2. Bash valida parâmetros, instala dependências, cria usuário/diretórios e registra resultado. Segredos são configurados fora do Git; logs não imprimem variáveis sensíveis.
3. Receber commit, SDK/runtime, publish/entrypoint, migrations e seed do C#. Provisionar sem abrir IDE, inicializar banco persistente e serviço.
4. Habilitar app e monitor no boot. Reexecutar scripts: não duplicar seed, usuário ou units, nem apagar banco.
5. Monitor a cada 30 s, parametrizável; CPU por diferença de /proc/stat, RAM por MemAvailable, disco pelo filesystem de dados. Limiares iniciais CPU/RAM 80%, disco 85%, ajustáveis e não exigidos pelo professor.
6. Gravar recurso/uso/limiar/estado, alertar no log e registrar retorno ao normal. Journald para serviços, auditoria estruturada e rotação para scripts.
7. Testar falhas e comprovar funcionamento completo.

## Critérios de aceite

- Instalação inicial e reexecução convergem; falha retorna exit code não zero com etapa registrada.
- Hostname, IP, rota e DNS correspondem ao perfil configurado.
- Criar observação simulada, consultar /painel e reiniciar API; dado continua no banco.
- Reiniciar máquina: app e monitor voltam.
- Encerrar abruptamente o processo principal do **monitor**: systemd recupera, novo PID e logs comprovam. Testar app também é útil, mas não substitui o monitor.
- Usar Restart=on-failure com política de tentativas documentada. systemctl stop é parada administrativa, não crash; não deve ser a única prova.
- Carga limitada e com limpeza gera alerta e posterior recuperação; evitar encher o disco do host ou travar a máquina pessoal.
- Sem banco disponível, readiness responde 503 e logs permitem diagnóstico sem segredo.

## Handoff, metas e vídeo

**Meta 09/11:** VM/perfil definido. **10/11:** receber C# mínimo. **12/11:** provisionamento e persistência. **14/11:** monitor/falhas/reexecução. **16/11:** evidências e integração. **17–18/11:** vídeo e conferência.

Roteiro até 7 min: problema/papel da infra (30 s); provisionamento (1m30); rede/app/banco (1 min); monitor/logs (1 min); falha e recuperação (1m30); reboot/reexecução e reprodução (1 min); conclusão/repositório (30 s). Usar resultados reais, declarando cortes/time-lapse quando houver.

Pendências: ambiente e parâmetros reais de rede, versão e pacote C#. Nenhum Linux foi instalado ou provisionado nesta etapa. A inspeção antiga de WSL não deve ser tratada como inventário atualizado da máquina.
