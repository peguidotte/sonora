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

- **Leitura:** 10 amostras por segundo. Regra de mapeamento: ADC 0–4095 → 30–100 dB(A) linear.
- **Janela de 5 s:** LAeq por média energética (`10·log10(média(10^(L/10)))`), a mesma regra da API C#; média aritmética de dB seria incorreta.
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

**Integrado:** apontar para a ingestão Java real (local via `host.wokwi.internal:8082` ou HTTPS público da VM) com uma credencial descartável de dispositivo (`observations:write`, restrita ao `deviceId`) gerada fora do Git. Depois conferir no painel C# (`/dashboard`, origem simulada) ou em `GET /api/sonora/v1/locations/{id}/observations?origin=simulated`.

### Projeto no wokwi.com

Criar um projeto ESP32, substituir `diagram.json` por [diagram.json](diagram.json), colar `src/main.cpp` em `sketch.ino`, adicionar os arquivos `acoustic.h` e `config.h` (a partir do exemplo, com URL pública) e manter [libraries.txt](libraries.txt). Não publicar o projeto com chave real: usar credencial descartável e revogá-la após a demonstração.

## Testes

Lógica pura do firmware (mapeamento, LAeq, faixas, data UTC, payload byte a byte igual à fixture do contrato, política de resposta/reenvio), executada no computador, na raiz do clone:

```bash
c++ -std=c++17 -Wall -Wextra -I iot/include iot/test/host/test_acoustic.cpp -o output/iot-host-tests && output/iot-host-tests
```

Build do firmware: `pio run` em `iot/`. Comportamento elétrico, Wi-Fi e envio precisam ser demonstrados no simulador.

## Entrega da matéria

- Link do projeto Wokwi (com circuito e firmware desta pasta).
- Vídeo de até 4 minutos: solução Sonora, papel do circuito, potenciômetro alterando LCD/LEDs, envio à ingestão e o dado aparecendo no painel C#.
- [INTEGRANTES.txt](INTEGRANTES.txt).
