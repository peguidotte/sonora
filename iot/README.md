# Sonora — nó acústico simulado (ESP32/Wokwi)

Responsável: **Leonardo Correa de Mello, RM555573** (Physical Computing: IoT & IoB). [Equipe completa](../README.md#equipe) · [integrantes (TXT da entrega)](INTEGRANTES.txt).

[Especificação da matéria](../docs/disciplinas/physical.md) · [Arquitetura](../docs/arquitetura.md) · [Contrato da ingestão Java](../contracts/openapi/soa.openapi.json)

## Papel na solução

O Sonora informa a imobiliárias e a quem procura moradia como o ruído de um local varia por dia e horário. Este circuito mostra como um sensor de rua alimentaria o produto: o ESP32 mede (aqui, simula) o nível sonoro, calcula o nível equivalente de cada janela de 5 s e envia a observação para a **ingestão Java**. O Java grava no PostgreSQL e a **API C#** mostra o perfil no painel com `origin=simulated`.

```text
Potenciômetro ──> ESP32 (LAeq 5 s, LCD, LEDs) ──HTTP(S) + X-Api-Key──> Java /api/ingestion/v1 ──> PostgreSQL ──> C# /api/sonora/v1 ──> painel
```

Limites honestos: o potenciômetro **não é um microfone** nem um sonômetro calibrado; o firmware não grava áudio; os valores são sintéticos (`method=wokwi_linear_demo`, calibração `simulated`, definidos pela ingestão) e **não** servem como dado real para ML. As faixas dos LEDs são didáticas, não limites legais.

## Circuito ([diagram.json](diagram.json))

| Componente | Ligação | Função |
| --- | --- | --- |
| ESP32 DevKitC v4 | — | Amostragem, cálculo, Wi-Fi, HTTP |
| Potenciômetro | SIG → GPIO34 (ADC1), VCC → 3V3, GND | Nível sonoro simulado |
| LCD 16x2 I2C (0x27) | SDA → GPIO21, SCL → GPIO22, VCC → 5V | Nível instantâneo, LAeq da janela e estado do envio |
| LEDs verde/amarelo/vermelho + 220 Ω | GPIO25/26/27 | Faixa: < 55, 55–70, ≥ 70 dB(A) |

## Funcionamento ([src/main.cpp](src/main.cpp), [include/acoustic.h](include/acoustic.h))

- **Duas tarefas (FreeRTOS):** a de **amostragem** tem prioridade maior e período fixo (`vTaskDelayUntil`, 100 ms); lê o potenciômetro, fecha a janela e atualiza LEDs e LCD (o LCD 2 vezes por segundo, para a escrita I2C não atrasar a leitura). O `loop()` cuida de Wi-Fi, NTP e HTTP. Elas trocam apenas janelas fechadas por uma fila do FreeRTOS (8 posições, cerca de 40 s), então um POST lento ou em timeout **não atrasa nem reduz as leituras**.
- **Leitura:** 10 amostras por segundo. Regra de mapeamento: ADC 0–4095 → 30–100 dB(A) linear.
- **Janela de 5 s fechada pelo relógio** (`millis`), não por contagem: `durationSeconds=5` é a duração real. LAeq por média energética (`10·log10(média(10^(L/10)))`), a mesma regra da API C#; média aritmética de dB seria incorreta.
- **Perda de amostras:** janela com menos de 90% das 50 leituras esperadas (por exemplo, atraso da tarefa) sai como **incompleta**, aparece no serial/LCD e **não é enviada**: um LAeq de 5 s não pode vir de 2 s de leitura. `observedAt` de janelas consecutivas é encadeado a cada 5 s; após um salto de relógio, recomeça no instante real.
- **Relógio:** sincroniza por NTP em UTC. Sem relógio válido, a janela aparece no LCD/serial mas **não é enviada** (nunca data inventada).
- **Identificadores:** `sessionId` aleatório a cada boot (`esp32-xxxxxxxx`); `externalId = sessionId-sequência`. Reenvios usam o mesmo `externalId`, então a ingestão responde `200 duplicate=true` em vez de duplicar.
- **Envio:** `POST {SOA_BASE_URL}/api/ingestion/v1/sonora/observations` com `X-Api-Key`. Corpo com exatamente os campos do contrato (`externalId`, `deviceId`, `sessionId`, `observedAt`, `durationSeconds`, `laeqDbA`). Origem/método/calibração não são enviados.
- **Falhas:** fila de até 24 janelas (cerca de 2 min). Rede/timeout/5xx → reenvio com espera exponencial (2 s até 60 s). 400/409/422 → descarta e registra. 401/403 → suspende envios e mostra `AUTH ERR` (sem insistir com credencial ruim). Wi-Fi é reconectado a cada 10 s sem bloquear a medição.
- **HTTPS:** com URL `https://`, exige a CA em `SONORA_ROOT_CA_PEM`. `SONORA_ALLOW_INSECURE_TLS=1` desliga a verificação apenas para demonstração e nunca deve ser usado com chave real.

## Ambiente de desenvolvimento

Pré-requisitos: VS Code com as extensões **PlatformIO IDE** e **Wokwi Simulator** (licença gratuita do Wokwi para VS Code), ou PlatformIO CLI (`pip install platformio`).

1. Configuração: copiar [include/config.example.h](include/config.example.h) para `include/config.h` (ignorado pelo Git) e ajustar URL, `deviceId` e chave. Sem `config.h`, o build usa o exemplo com as credenciais públicas do mock.
2. Compilar, na pasta `iot/`:

```bash
pio run
```

3. Simular: abrir a pasta `iot/` no VS Code e executar **Wokwi: Start Simulator** (usa [wokwi.toml](wokwi.toml) e o firmware em `.pio/build/esp32dev/`). Girar o potenciômetro altera LCD, LEDs e o LAeq no monitor serial.

### Conectividade: o que o simulador consegue alcançar

| Modo | Alcança | Uso |
| --- | --- | --- |
| Wokwi for VS Code (gateway privado embutido) | Internet e a própria máquina via `host.wokwi.internal` | Desenvolvimento com mock ou Java local |
| wokwi.com (gateway público, gratuito) | Somente endereços públicos da internet | Link de entrega apontando para a ingestão publicada na VM |

O Wokwi público **não** acessa `localhost` nem a rede privada. Antes de gravar o vídeo, conferir que o endpoint configurado é alcançável; nunca apresentar log serial como envio real.

**Standalone com mock** (resposta estática, não grava): na raiz do clone, com o ambiente Python do projeto,

```bash
python tools/mock_server.py --service soa --port 4011
```

e `SONORA_SOA_BASE_URL "http://host.wokwi.internal:4011"` com a chave pública `mock-device-key`. O mock responde 201 sem persistir; não comprova integração.

**Integrado com a ingestão Java real** (local, sem nuvem), na raiz do clone:

1. Banco com migrations e seed, e o serviço Java na porta 8082, conforme o [README do SOA](../soa/README.md): `docker compose ... up`, `migrate`, `migrate seed` com `SONORA_ALLOW_DEV_SEED=1`, gerar `output/dev/soa-keys.json` e iniciar o JAR. O dispositivo `11111111-1111-4111-8111-111111111111` do seed já está cadastrado e habilitado.
2. `include/config.h` (ignorado pelo Git) com `SONORA_SOA_BASE_URL "http://host.wokwi.internal:8082"` e `SONORA_DEVICE_KEY` igual ao conteúdo de `output/dev/soa-device-demo-a.key` (credencial descartável, `observations:write`, vinculada ao `deviceId`). A chave pública `mock-device-key` é recusada pelo Java (401).
3. `pio run` e **Wokwi: Start Simulator**. O serial mostra `-> 201` e, num reenvio da mesma janela, `-> 200` (`duplicate`).
4. Conferir no painel C# (`/dashboard`, origem **Simulada**, local Demo location A) ou em `GET /api/sonora/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/observations?origin=simulated&from=...&to=...`.

Para provar o reenvio sem perda: parar o Java por alguns segundos (o serial mostra `-> -1`, o LCD `reenvio` e a fila cresce, enquanto as janelas seguem saindo a cada 5 s) e iniciá-lo de novo; a fila esvazia em ordem com `201`. O `200 duplicate` só ocorre quando o Java gravou mas a resposta se perdeu (por exemplo, timeout depois do commit): o reenvio usa o mesmo `externalId` e não duplica. Não mostrar `config.h`, chaves ou o arquivo `output/dev/` no vídeo nem nas evidências.

### Projeto no wokwi.com

Criar um projeto ESP32, substituir `diagram.json` por [diagram.json](diagram.json), colar `src/main.cpp` em `sketch.ino`, adicionar os arquivos `acoustic.h` e `config.h` (a partir do exemplo, com URL pública) e manter [libraries.txt](libraries.txt). Não publicar o projeto com chave real: o projeto público usa o `config.example.h` (chave fictícia do mock) e, sem ingestão pública, o envio fica em reenvio. A integração real é demonstrada pelo Wokwi for VS Code, acima.

## Testes

Lógica pura do firmware (mapeamento, LAeq, faixas, data UTC, payload byte a byte igual à fixture do contrato, política de resposta/reenvio, janela fechada pelo relógio, regra de perda e encadeamento do `observedAt`), executada no computador, na raiz do clone:

```bash
c++ -std=c++17 -Wall -Wextra -I iot/include iot/test/host/test_acoustic.cpp -o output/iot-host-tests && output/iot-host-tests
```

Inclui o cenário da revisão: 60 s de leitura geram 600 amostras e 12 janelas de 50; uma leitura atrasada fecha a janela pelo relógio como incompleta, sem declarar 5 s de dados que não existem.

**Servidor lento (Wokwi):** a separação em tarefas depende do FreeRTOS e é conferida no simulador. Com `SONORA_SOA_BASE_URL "http://host.wokwi.internal:4012"` no `config.h` e

```bash
python iot/test/slow_ingest.py --port 4012 --delay 8
```

cada POST fica preso até o timeout de 5 s e entra em reenvio, enquanto o serial continua mostrando uma janela a cada 5 s com `amostras=50 em 4900 ms`.

Build do firmware: `pio run` em `iot/`. Comportamento elétrico, Wi-Fi e envio precisam ser demonstrados no simulador.

## Entrega da matéria

- Projeto Wokwi: https://wokwi.com/projects/480800721533486081 (circuito e firmware desta pasta; no wokwi.com o gateway público não alcança a ingestão local, então o envio fica em reenvio).
- Vídeo (até 4 minutos): https://youtu.be/YdfbrvcihVM — circuito, potenciômetro alterando LCD/LEDs e envio ao **mock** da ingestão Java (resposta estática, sem persistência), executado no Wokwi for VS Code.
- [INTEGRANTES.txt](INTEGRANTES.txt).
