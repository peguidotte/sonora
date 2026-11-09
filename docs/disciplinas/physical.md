# Physical Computing — nó acústico simulado

**Responsável:** Leonardo Correa de Mello, RM555573. Pasta `iot/`; branch `leo/iot`.

## Exigência do professor

PDF p. 38: ESP32 funcional no Wokwi, integrado à CitizenTech; link do projeto, vídeo até 4 minutos apresentando solução/circuito e TXT de integrantes. Pesos não detalhados no material coletado; conferir tarefa atual antes do envio.

## Responsabilidade

ESP32 no Wokwi com potenciômetro representando nível acústico, display/serial e LEDs. Não é microfone/sonômetro calibrado, não grava áudio e não substitui dados reais de ML. Faixas visuais são didáticas, não limites legais.

Enviar diretamente à API Java de ingestão, conforme OpenAPI SOA. Credencial descartável com observations:write e vínculo a deviceId; nunca chave comercial, de importação ou migradora. NoiseCapture é fonte externa de arquivos, não este circuito.

## Aceite

1. Variar entrada altera leitura e saída visual. Janela de demonstração de 5 s; mapear potenciômetro a valor sintético e documentar a regra.
2. Emitir externalId, deviceId, sessionId, observedAt, durationSeconds e laeqDbA. SessionId distingue boot; retries preservam o externalId da mesma observação.
3. Sincronizar relógio e não enviar data inventada; conexão falha sem loop infinito.
4. Demonstrar envio Java e consulta posterior no C#/painel com origin=simulated. No modo isolado, usar mock Java e declarar que POST é estático.
5. Tratar 401/403, perda/reconexão e reenvio sem duplicação na implementação real.

Wokwi público não acessa automaticamente localhost/rede privada. Validar endpoint/gateway acessível antes de prometer transmissão; se usar replay, identificar a reprodução e confirmar aceitação docente. Nunca chamar serial/replay de ingestão ao vivo.

## Entrega

Sketch, diagram.json, bibliotecas quando necessárias, README de circuito/conectividade e evidências; link Wokwi, TXT de integrantes e vídeo no limite oficial. A instalação física de sensores não é requisito deste protótipo.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
