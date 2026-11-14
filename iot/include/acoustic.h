// Lógica pura do nó acústico simulado: sem Arduino, testável no computador (iot/test/host).
#pragma once

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <ctime>

namespace sonora {

// Regra de demonstração (method wokwi_linear_demo): o potenciômetro NÃO é um microfone.
// ADC 0..4095 vira linearmente 30..100 dB(A) sintéticos. Não há calibração física.
constexpr float kMinDemoDb = 30.0f;
constexpr float kMaxDemoDb = 100.0f;
constexpr int kAdcMax = 4095;

inline float adcToDemoDb(int raw) {
  if (raw < 0) raw = 0;
  if (raw > kAdcMax) raw = kAdcMax;
  return kMinDemoDb + (kMaxDemoDb - kMinDemoDb) * static_cast<float>(raw) / kAdcMax;
}

// Média energética de amostras com a mesma duração: LAeq = 10·log10(média(10^(L/10))).
// É a mesma regra usada pela API C#; média aritmética de dB seria incorreta.
class EnergyWindow {
 public:
  void add(float levelDb) {
    energy_ += std::pow(10.0, levelDb / 10.0);
    ++count_;
  }
  int count() const { return count_; }
  bool empty() const { return count_ == 0; }
  double laeq() const { return count_ == 0 ? NAN : 10.0 * std::log10(energy_ / count_); }
  void reset() {
    energy_ = 0;
    count_ = 0;
  }

 private:
  double energy_ = 0;
  int count_ = 0;
};

// Faixas apenas visuais/didáticas para os LEDs. Não são limites legais.
enum class Band { Quiet, Moderate, Loud };

constexpr float kModerateFromDb = 55.0f;
constexpr float kLoudFromDb = 70.0f;

inline Band classify(double levelDb) {
  if (levelDb >= kLoudFromDb) return Band::Loud;
  if (levelDb >= kModerateFromDb) return Band::Moderate;
  return Band::Quiet;
}

// Relógio só é confiável depois do NTP; antes disso nada é enviado (nunca datas inventadas).
constexpr time_t kMinimumValidEpoch = 1700000000;  // 2023-11-14

inline bool formatIsoUtc(time_t instant, char* out, size_t size) {
  if (instant < kMinimumValidEpoch) return false;
  std::tm utc{};
#if defined(_WIN32)
  gmtime_s(&utc, &instant);
#else
  gmtime_r(&instant, &utc);
#endif
  return std::strftime(out, size, "%Y-%m-%dT%H:%M:%SZ", &utc) == 20;
}

// Corpo do POST /api/ingestion/v1/sonora/observations (ObservationIngest do contrato SOA).
// Origem, método e calibração NÃO são enviados: a ingestão os resolve pela credencial.
inline int buildObservationJson(char* out, size_t size, const char* externalId, const char* deviceId,
                                const char* sessionId, const char* observedAt, double durationSeconds,
                                double laeqDbA) {
  return std::snprintf(out, size,
                       "{\"externalId\":\"%s\",\"deviceId\":\"%s\",\"sessionId\":\"%s\","
                       "\"observedAt\":\"%s\",\"durationSeconds\":%.0f,\"laeqDbA\":%.1f}",
                       externalId, deviceId, sessionId, observedAt, durationSeconds, laeqDbA);
}

// O que fazer com uma observação conforme a resposta HTTP da ingestão.
enum class SendOutcome {
  Accepted,     // 201: gravada
  Duplicate,    // 200 duplicate=true: reenvio idempotente já gravado antes
  Retry,        // rede/timeout/5xx/429: manter na fila com o mesmo externalId
  Drop,         // 400/409/422: conteúdo rejeitado; reenviar igual não adianta
  AuthBlocked   // 401/403: credencial inválida ou sem escopo; parar envios até corrigir
};

inline SendOutcome classifyResponse(int status) {
  if (status == 201) return SendOutcome::Accepted;
  if (status == 200) return SendOutcome::Duplicate;
  if (status == 401 || status == 403) return SendOutcome::AuthBlocked;
  if (status == 400 || status == 409 || status == 422) return SendOutcome::Drop;
  return SendOutcome::Retry;  // <= 0 (falha de conexão), 408, 429, 5xx e demais
}

// Espera exponencial limitada entre tentativas: 2, 4, 8, ... até 60 s.
inline uint32_t retryDelaySeconds(int attempts) {
  if (attempts < 1) return 0;
  if (attempts >= 6) return 60;
  return 1u << attempts;
}

}  // namespace sonora
