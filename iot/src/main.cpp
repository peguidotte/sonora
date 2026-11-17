// Sonora — nó acústico simulado (ESP32 no Wokwi).
// Potenciômetro representa o nível sonoro; a cada 5 s o ESP32 calcula o LAeq da janela,
// mostra no LCD/LEDs e envia a observação à ingestão Java (POST /api/ingestion/v1/sonora/observations).
// Não é sonômetro calibrado, não grava áudio e não gera dados para o ML.
//
// Duas tarefas: a de amostragem (prioridade maior, período fixo de 100 ms) lê o potenciômetro, fecha a
// janela pelo relógio e atualiza LCD/LEDs; o loop() cuida de Wi-Fi, NTP e HTTP. Elas só se comunicam
// por uma fila do FreeRTOS, então um POST lento ou em timeout não atrasa nem reduz as leituras.

#include <Arduino.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_random.h>
#include <time.h>

#include <atomic>

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
constexpr uint32_t kRenderEverySamples = 5;   // LCD 2x/s: escrever no I2C a cada leitura atrasava a amostragem
constexpr uint32_t kWindowSeconds = 5;        // janela de demonstração da ficha
constexpr uint32_t kHttpTimeoutMs = 5000;
constexpr uint32_t kWifiRetryMs = 10000;
constexpr size_t kQueueCapacity = 24;         // ~2 min de janelas guardadas sem rede
constexpr UBaseType_t kWindowQueueLength = 8; // janelas fechadas aguardando o loop (até 40 s bloqueado)
constexpr uint32_t kSamplerStackBytes = 4096;
constexpr UBaseType_t kSamplerPriority = 2;   // acima do loopTask (1): a leitura não espera o HTTP
constexpr const char* kIngestPath = "/api/ingestion/v1/sonora/observations";

LiquidCrystal_I2C lcd(0x27, 16, 2);

struct Pending {
  char externalId[48];
  char observedAt[24];
  float laeqDbA;
  int attempts;
  uint32_t nextTryMs;
};

// ---- Estado da tarefa de envio (loop): só ela toca na fila de reenvio, no Wi-Fi e no HTTP. ----
Pending queue[kQueueCapacity];
size_t queueHead = 0;
size_t queueSize = 0;

char sessionId[32];
uint32_t sequence = 0;
bool authBlocked = false;
bool clockReady = false;
uint32_t lastWifiAttemptMs = 0;

// ---- Compartilhado entre as tarefas ----
QueueHandle_t closedWindows = nullptr;      // amostragem -> envio
std::atomic<uint32_t> droppedWindows{0};    // fila cheia (envio parado por mais de 40 s)

enum Status : uint8_t { kStarting, kNoWifi, kNoNtp, kSent, kRepeated, kRejected, kAuthError, kTlsConfig, kRetrying,
                        kIncomplete };
constexpr const char* kStatusText[] = {"iniciando", "sem WiFi", "sem NTP", "enviado", "repetido",
                                       "rejeit.", "AUTH ERR", "TLS CFG", "reenvio", "incompl."};
std::atomic<uint8_t> status{kStarting};    // escrito pelo envio, exibido pela amostragem

// ---- Estado da tarefa de amostragem: só ela lê o ADC e escreve no LCD/LEDs. ----
sonora::TimedWindow window(kWindowSeconds * 1000, kSampleIntervalMs);
float lastLevel = 0;
double lastLaeq = NAN;

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
  const char* text = kStatusText[status.load()];
  if (std::isnan(lastLaeq))
    snprintf(line, sizeof line, "%-16s", text);
  else
    snprintf(line, sizeof line, "5s %4.1f %-8s", lastLaeq, text);
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
    Serial.printf("[fila] cheia, descartando %s\r\n", queue[queueHead].externalId);
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
  const int code = http.POST(reinterpret_cast<uint8_t*>(body), strlen(body));
  Serial.printf("[http] %s laeq=%.1f -> %d\r\n", item.externalId, item.laeqDbA, code);
  http.end();
  return code;
}

// Envia no máximo uma observação por volta do loop, para continuar drenando janelas novas entre envios.
void flushOne() {
  if (queueSize == 0 || authBlocked || WiFi.status() != WL_CONNECTED) return;
  Pending& item = queue[queueHead];
  if (static_cast<int32_t>(millis() - item.nextTryMs) < 0) return;
  const int code = post(item);
  if (code == -1000) {
    authBlocked = true;  // configuração insegura: parar até corrigir
    status = kTlsConfig;
    return;
  }
  switch (sonora::classifyResponse(code)) {
    case sonora::SendOutcome::Accepted:
      status = kSent;
      dropHead();
      break;
    case sonora::SendOutcome::Duplicate:
      status = kRepeated;
      dropHead();
      break;
    case sonora::SendOutcome::Drop:
      status = kRejected;
      Serial.printf("[http] %s rejeitada (%d), descartada\r\n", item.externalId, code);
      dropHead();
      break;
    case sonora::SendOutcome::AuthBlocked:
      authBlocked = true;
      status = kAuthError;
      Serial.println("[http] credencial recusada (401/403): envios suspensos até corrigir config.h e reiniciar");
      break;
    case sonora::SendOutcome::Retry:
      ++item.attempts;
      item.nextTryMs = millis() + sonora::retryDelaySeconds(item.attempts) * 1000;
      status = kRetrying;
      break;
  }
}

// Tarefa de amostragem: período fixo (vTaskDelayUntil), independente da rede.
void samplerTask(void*) {
  TickType_t lastWake = xTaskGetTickCount();
  uint32_t sinceRender = kRenderEverySamples;
  for (;;) {
    lastLevel = sonora::adcToDemoDb(analogRead(kPotPin));
    sonora::ClosedWindow closed;
    const bool windowClosed = window.add(millis(), time(nullptr), lastLevel, closed);
    if (windowClosed) {
      lastLaeq = closed.laeq;
      showBand(closed.laeq);
      if (xQueueSend(closedWindows, &closed, 0) != pdTRUE) droppedWindows.fetch_add(1);
    }
    if (windowClosed || ++sinceRender >= kRenderEverySamples) {
      render();
      sinceRender = 0;
    }
    vTaskDelayUntil(&lastWake, pdMS_TO_TICKS(kSampleIntervalMs));
  }
}

// Tarefa de envio: decide o destino de cada janela fechada.
void handleWindow(const sonora::ClosedWindow& closed) {
  char observedAt[24];
  if (!closed.complete) {
    Serial.printf("[janela] incompleta: %d amostras em %lu ms, não enviada\r\n", closed.count,
                  static_cast<unsigned long>(closed.spanMs));
    status = kIncomplete;
  } else if (sonora::formatIsoUtc(closed.startEpoch, observedAt, sizeof observedAt)) {
    enqueue(observedAt, closed.laeq);
    Serial.printf("[janela] %s LAeq=%.1f dB(A) amostras=%d em %lu ms fila=%u\r\n", observedAt, closed.laeq,
                  closed.count, static_cast<unsigned long>(closed.spanMs), static_cast<unsigned>(queueSize));
  } else {
    Serial.printf("[janela] LAeq=%.1f dB(A) sem relógio NTP: não enviada\r\n", closed.laeq);
    status = kNoNtp;
  }
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
  Serial.printf("[boot] Sonora nó simulado, deviceId=%s sessionId=%s\r\n", SONORA_DEVICE_ID, sessionId);
  WiFi.mode(WIFI_STA);
  connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.google.com");  // UTC; o C# agrupa em America/Sao_Paulo
  closedWindows = xQueueCreate(kWindowQueueLength, sizeof(sonora::ClosedWindow));
  xTaskCreatePinnedToCore(samplerTask, "sampler", kSamplerStackBytes, nullptr, kSamplerPriority, nullptr,
                          ARDUINO_RUNNING_CORE);
}

void loop() {
  connectWifi();
  updateClock();
  if (WiFi.status() != WL_CONNECTED && !authBlocked) status = kNoWifi;

  sonora::ClosedWindow closed;
  while (xQueueReceive(closedWindows, &closed, 0) == pdTRUE) handleWindow(closed);
  if (const uint32_t lost = droppedWindows.exchange(0)) Serial.printf("[janela] %lu perdidas: envio parado\r\n",
                                                                       static_cast<unsigned long>(lost));

  flushOne();  // pode bloquear até o timeout HTTP; a amostragem segue na outra tarefa
  vTaskDelay(pdMS_TO_TICKS(20));
}
