// Sonora — nó acústico simulado (ESP32 no Wokwi).
// Potenciômetro representa o nível sonoro; a cada 5 s o ESP32 calcula o LAeq da janela,
// mostra no LCD/LEDs e envia a observação à ingestão Java (POST /api/ingestion/v1/sonora/observations).
// Não é sonômetro calibrado, não grava áudio e não gera dados para o ML.

#include <Arduino.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_random.h>
#include <time.h>

#include "acoustic.h"

#if __has_include("config.h")
#include "config.h"
#else
#warning "include/config.h ausente: usando config.example.h (credenciais públicas do mock)."
#include "config.example.h"
#endif

namespace {

// Pinos (ver diagram.json). GPIO34 é ADC1: funciona junto com o Wi-Fi.
constexpr int kPotPin = 34;
constexpr int kGreenLed = 25;
constexpr int kYellowLed = 26;
constexpr int kRedLed = 27;

constexpr uint32_t kSampleIntervalMs = 100;   // 10 leituras por segundo
constexpr uint32_t kWindowSeconds = 5;        // janela de demonstração da ficha
constexpr uint32_t kHttpTimeoutMs = 5000;
constexpr uint32_t kWifiRetryMs = 10000;
constexpr size_t kQueueCapacity = 24;         // ~2 min de janelas guardadas sem rede
constexpr const char* kIngestPath = "/api/ingestion/v1/sonora/observations";

LiquidCrystal_I2C lcd(0x27, 16, 2);

struct Pending {
  char externalId[48];
  char observedAt[24];
  float laeqDbA;
  int attempts;
  uint32_t nextTryMs;
};

Pending queue[kQueueCapacity];
size_t queueHead = 0;
size_t queueSize = 0;

char sessionId[32];
uint32_t sequence = 0;
bool authBlocked = false;
bool clockReady = false;
uint32_t lastWifiAttemptMs = 0;
uint32_t lastSampleMs = 0;
time_t windowStart = 0;
sonora::EnergyWindow window;
float lastLevel = 0;
double lastLaeq = NAN;
const char* lastStatus = "iniciando";

void showBand(double level) {
  const auto band = sonora::classify(level);
  digitalWrite(kGreenLed, band == sonora::Band::Quiet);
  digitalWrite(kYellowLed, band == sonora::Band::Moderate);
  digitalWrite(kRedLed, band == sonora::Band::Loud);
}

void render() {
  char line[17];
  lcd.setCursor(0, 0);
  snprintf(line, sizeof line, "Agora %5.1f dBA ", lastLevel);
  lcd.print(line);
  lcd.setCursor(0, 1);
  if (std::isnan(lastLaeq))
    snprintf(line, sizeof line, "%-16s", lastStatus);
  else
    snprintf(line, sizeof line, "5s %4.1f %-8s", lastLaeq, lastStatus);
  lcd.print(line);
}

// SessionId muda a cada boot e permanece nos reenvios; externalId identifica a janela.
void newSession() {
  snprintf(sessionId, sizeof sessionId, "esp32-%08lx", static_cast<unsigned long>(esp_random()));
  sequence = 0;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  const uint32_t now = millis();
  if (lastWifiAttemptMs != 0 && now - lastWifiAttemptMs < kWifiRetryMs) return;  // sem laço bloqueante
  lastWifiAttemptMs = now;
  Serial.println("[wifi] conectando...");
  WiFi.begin(SONORA_WIFI_SSID, SONORA_WIFI_PASSWORD, SONORA_WIFI_CHANNEL);
}

void updateClock() {
  if (clockReady) return;
  if (time(nullptr) >= sonora::kMinimumValidEpoch) {
    clockReady = true;
    Serial.println("[ntp] relógio sincronizado");
  }
}

void enqueue(const char* observedAt, double laeq) {
  if (queueSize == kQueueCapacity) {
    Serial.printf("[fila] cheia, descartando %s\n", queue[queueHead].externalId);
    queueHead = (queueHead + 1) % kQueueCapacity;
    --queueSize;
  }
  Pending& item = queue[(queueHead + queueSize) % kQueueCapacity];
  snprintf(item.externalId, sizeof item.externalId, "%s-%06lu", sessionId, static_cast<unsigned long>(++sequence));
  snprintf(item.observedAt, sizeof item.observedAt, "%s", observedAt);
  item.laeqDbA = static_cast<float>(laeq);
  item.attempts = 0;
  item.nextTryMs = millis();
  ++queueSize;
}

void dropHead() {
  queueHead = (queueHead + 1) % kQueueCapacity;
  --queueSize;
}

int post(const Pending& item) {
  char body[320];
  sonora::buildObservationJson(body, sizeof body, item.externalId, SONORA_DEVICE_ID, sessionId, item.observedAt,
                               kWindowSeconds, item.laeqDbA);
  const String url = String(SONORA_SOA_BASE_URL) + kIngestPath;
  HTTPClient http;
  http.setTimeout(kHttpTimeoutMs);
  http.setConnectTimeout(kHttpTimeoutMs);
  WiFiClient plain;
  WiFiClientSecure secure;
  bool ready;
  if (url.startsWith("https://")) {
    if (strlen(SONORA_ROOT_CA_PEM) > 0) {
      secure.setCACert(SONORA_ROOT_CA_PEM);
    } else if (SONORA_ALLOW_INSECURE_TLS) {
      secure.setInsecure();  // somente demonstração; o README explica o risco
    } else {
      Serial.println("[http] HTTPS sem CA configurada: envio recusado");
      return -1000;
    }
    ready = http.begin(secure, url);
  } else {
    ready = http.begin(plain, url);
  }
  if (!ready) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", SONORA_DEVICE_KEY);
  const int status = http.POST(reinterpret_cast<uint8_t*>(body), strlen(body));
  Serial.printf("[http] %s laeq=%.1f -> %d\n", item.externalId, item.laeqDbA, status);
  http.end();
  return status;
}

// Envia no máximo uma observação por volta do loop para não travar a amostragem.
void flushOne() {
  if (queueSize == 0 || authBlocked || WiFi.status() != WL_CONNECTED) return;
  Pending& item = queue[queueHead];
  if (static_cast<int32_t>(millis() - item.nextTryMs) < 0) return;
  const int status = post(item);
  if (status == -1000) {
    authBlocked = true;  // configuração insegura: parar até corrigir
    lastStatus = "TLS CFG";
    return;
  }
  switch (sonora::classifyResponse(status)) {
    case sonora::SendOutcome::Accepted:
      lastStatus = "enviado";
      dropHead();
      break;
    case sonora::SendOutcome::Duplicate:
      lastStatus = "repetido";
      dropHead();
      break;
    case sonora::SendOutcome::Drop:
      lastStatus = "rejeit.";
      Serial.printf("[http] %s rejeitada (%d), descartada\n", item.externalId, status);
      dropHead();
      break;
    case sonora::SendOutcome::AuthBlocked:
      authBlocked = true;
      lastStatus = "AUTH ERR";
      Serial.println("[http] credencial recusada (401/403): envios suspensos até corrigir config.h e reiniciar");
      break;
    case sonora::SendOutcome::Retry:
      ++item.attempts;
      item.nextTryMs = millis() + sonora::retryDelaySeconds(item.attempts) * 1000;
      lastStatus = "reenvio";
      break;
  }
}

void closeWindow() {
  lastLaeq = window.laeq();
  showBand(lastLaeq);
  char observedAt[24];
  if (clockReady && sonora::formatIsoUtc(windowStart, observedAt, sizeof observedAt)) {
    enqueue(observedAt, lastLaeq);
    Serial.printf("[janela] %s LAeq=%.1f dB(A) amostras=%d fila=%u\n", observedAt, lastLaeq, window.count(),
                  static_cast<unsigned>(queueSize));
  } else {
    Serial.printf("[janela] LAeq=%.1f dB(A) sem relógio NTP: não enviada\n", lastLaeq);
    lastStatus = "sem NTP";
  }
  window.reset();
}

}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(kGreenLed, OUTPUT);
  pinMode(kYellowLed, OUTPUT);
  pinMode(kRedLed, OUTPUT);
  analogReadResolution(12);
  lcd.init();
  lcd.backlight();
  newSession();
  Serial.printf("[boot] Sonora nó simulado, deviceId=%s sessionId=%s\n", SONORA_DEVICE_ID, sessionId);
  WiFi.mode(WIFI_STA);
  connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.google.com");  // UTC; o C# agrupa em America/Sao_Paulo
}

void loop() {
  connectWifi();
  updateClock();

  const uint32_t now = millis();
  if (now - lastSampleMs >= kSampleIntervalMs) {
    lastSampleMs = now;
    if (window.empty()) windowStart = time(nullptr);
    lastLevel = sonora::adcToDemoDb(analogRead(kPotPin));
    window.add(lastLevel);
    if (window.count() >= static_cast<int>(kWindowSeconds * 1000 / kSampleIntervalMs)) closeWindow();
    if (WiFi.status() != WL_CONNECTED && !authBlocked) lastStatus = "sem WiFi";
    render();
  }

  flushOne();
}
