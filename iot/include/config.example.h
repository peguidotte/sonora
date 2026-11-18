// Modelo de configuração. Copiar para include/config.h (ignorado pelo Git) e preencher.
// Nunca versionar chaves reais. Os valores abaixo são as credenciais PÚBLICAS do mock,
// que só funcionam com tools/mock_server.py e nunca autenticam no serviço Java real.
#pragma once

// Rede simulada do Wokwi: aberta, canal 6.
#define SONORA_WIFI_SSID "Wokwi-GUEST"
#define SONORA_WIFI_PASSWORD ""
#define SONORA_WIFI_CHANNEL 6

// Origem da ingestão Java (scheme://host:porta, sem o prefixo). O firmware acrescenta
// /api/ingestion/v1/sonora/observations, como no contrato SOA.
// - Wokwi for VS Code + mock local:            "http://host.wokwi.internal:4011"
// - Wokwi for VS Code + ingestão Java local:    "http://host.wokwi.internal:8082" (soa/README.md)
// - Deploy público com HTTPS:                  "https://<dominio-da-vm>"
#define SONORA_SOA_BASE_URL "http://host.wokwi.internal:4011"

// Credencial descartável com escopo observations:write, restrita a este deviceId.
// Com o Java real, usar a chave de dispositivo gerada fora do Git (soa/README.md, output/dev/soa-device-demo-a.key);
// mock-device-key é recusada (401) pelo Java.
#define SONORA_DEVICE_KEY "mock-device-key"
#define SONORA_DEVICE_ID "11111111-1111-4111-8111-111111111111"

// Para HTTPS: certificado raiz (PEM) da autoridade que assina o servidor.
// Deixe vazio para HTTP local. Sem CA, conexões HTTPS são recusadas,
// salvo se SONORA_ALLOW_INSECURE_TLS for 1 (somente demonstração, nunca com chave real).
#define SONORA_ROOT_CA_PEM ""
#define SONORA_ALLOW_INSECURE_TLS 0
