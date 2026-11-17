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

// Relógio só é confiável depois do NTP; antes disso nada é enviado (nunca datas inventadas).
constexpr time_t kMinimumValidEpoch = 1700000000;  // 2023-11-14

// Início (UTC) de uma nova janela. Janelas consecutivas ficam encadeadas a cada windowSeconds, sem
// sobreposição nem buraco por arredondamento de segundo; se o relógio pulou (NTP chegou, pausa longa),
// recomeça no instante atual. Antes do NTP devolve o próprio "agora" inválido e a janela não é enviada.
inline time_t nextWindowStart(time_t previousStart, time_t now, uint32_t windowSeconds) {
  if (previousStart >= kMinimumValidEpoch && now >= kMinimumValidEpoch) {
    const long long drift = static_cast<long long>(now) - (static_cast<long long>(previousStart) + windowSeconds);
    if (drift >= -1 && drift <= 1) return previousStart + windowSeconds;  // só arredondamento de segundo
  }
  return now;
}

// Resultado de uma janela fechada pelo relógio.
struct ClosedWindow {
  time_t startEpoch;  // observedAt
  double laeq;
  int count;
  uint32_t spanMs;    // da primeira à última amostra
  bool complete;      // amostras suficientes para representar a janela declarada
};

// Janela fechada por TEMPO (millis), não por contagem: a duração declarada (durationSeconds) é a real.
// Cada janela fica com as leituras dos instantes 0, 100, ..., 4900 ms após o início; os limites têm folga de
// meia amostra para a variação de 1–2 ms do agendador não puxar uma 51ª leitura nem deixar só 49.
// Regra de perda: se faltarem mais de 10% das amostras esperadas (atraso da tarefa, pausa), a janela é
// marcada incompleta e não é enviada — um LAeq de 5 s não pode vir de 2 s de leitura.
class TimedWindow {
 public:
  TimedWindow(uint32_t windowMs, uint32_t sampleMs)
      : windowMs_(windowMs), sampleMs_(sampleMs), minimumCount_(static_cast<int>(windowMs / sampleMs * 9 / 10)) {}

  // Registra uma amostra lida em nowMs (millis) e nowEpoch (time()). Devolve true quando uma janela
  // fechou e a preenche em closed. Uma amostra que já cai fora da janela aberta fecha essa janela e
  // inicia a próxima.
  bool add(uint32_t nowMs, time_t nowEpoch, float levelDb, ClosedWindow& closed) {
    bool didClose = false;
    if (!energy_.empty() && nowMs - startMs_ >= windowMs_ - sampleMs_ / 2) {
      closed = close();
      didClose = true;
    }
    if (energy_.empty()) {
      startMs_ = nowMs;
      startEpoch_ = nextWindowStart(lastStartEpoch_, nowEpoch, windowMs_ / 1000);
      lastStartEpoch_ = startEpoch_;
    }
    energy_.add(levelDb);
    lastMs_ = nowMs;
    if (!didClose && nowMs - startMs_ + sampleMs_ + sampleMs_ / 2 >= windowMs_) {
      closed = close();
      didClose = true;
    }
    return didClose;
  }

  int count() const { return energy_.count(); }

 private:
  ClosedWindow close() {
    ClosedWindow result{startEpoch_, energy_.laeq(), energy_.count(), lastMs_ - startMs_,
                        energy_.count() >= minimumCount_};
    energy_.reset();
    return result;
  }

  uint32_t windowMs_;
  uint32_t sampleMs_;
  int minimumCount_;
  EnergyWindow energy_;
  uint32_t startMs_ = 0;
  uint32_t lastMs_ = 0;
  time_t startEpoch_ = 0;
  time_t lastStartEpoch_ = 0;
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
