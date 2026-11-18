// Testes da lógica pura do firmware, executados no computador (sem ESP32):
//   c++ -std=c++17 -Wall -Wextra -I iot/include iot/test/host/test_acoustic.cpp -o output/iot-host-tests && output/iot-host-tests
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>

#include "acoustic.h"

using namespace sonora;

static int checks = 0;
#define CHECK(condition)                                                     \
  do {                                                                       \
    ++checks;                                                                \
    if (!(condition)) {                                                      \
      std::fprintf(stderr, "FALHOU %s:%d: %s\n", __FILE__, __LINE__, #condition); \
      return 1;                                                              \
    }                                                                        \
  } while (0)

static bool near(double a, double b, double tolerance) { return std::fabs(a - b) <= tolerance; }

int main() {
  // Mapeamento linear do potenciômetro, com saturação nas pontas.
  CHECK(near(adcToDemoDb(0), 30.0, 1e-6));
  CHECK(near(adcToDemoDb(4095), 100.0, 1e-6));
  CHECK(near(adcToDemoDb(-5), 30.0, 1e-6));
  CHECK(near(adcToDemoDb(9999), 100.0, 1e-6));
  CHECK(near(adcToDemoDb(2048), 65.0, 0.01));

  // Média energética, igual à regra da API C#: 60 e 70 dB em janelas iguais ≈ 67,40 dB.
  EnergyWindow window;
  CHECK(window.empty() && std::isnan(window.laeq()));
  window.add(60);
  window.add(70);
  CHECK(near(window.laeq(), 67.4036, 0.001));
  window.reset();
  for (int i = 0; i < 50; ++i) window.add(62.5f);
  CHECK(window.count() == 50 && near(window.laeq(), 62.5, 1e-4));

  // Faixas didáticas dos LEDs.
  CHECK(classify(54.9) == Band::Quiet);
  CHECK(classify(55.0) == Band::Moderate);
  CHECK(classify(69.9) == Band::Moderate);
  CHECK(classify(70.0) == Band::Loud);

  // Sem NTP não há data; com relógio válido o formato é UTC com Z.
  char iso[24];
  CHECK(!formatIsoUtc(0, iso, sizeof iso));
  CHECK(formatIsoUtc(1794150000, iso, sizeof iso));
  CHECK(std::strcmp(iso, "2026-11-08T15:00:00Z") == 0);

  // Payload exatamente com os campos do contrato (fixture iot-request.json).
  char body[320];
  buildObservationJson(body, sizeof body, "device-request-1", "11111111-1111-4111-8111-111111111111",
                       "demo-a-boot-001", "2026-11-08T15:00:00Z", 5, 62.5);
  CHECK(std::strcmp(body,
                    "{\"externalId\":\"device-request-1\",\"deviceId\":\"11111111-1111-4111-8111-111111111111\","
                    "\"sessionId\":\"demo-a-boot-001\",\"observedAt\":\"2026-11-08T15:00:00Z\","
                    "\"durationSeconds\":5,\"laeqDbA\":62.5}") == 0);
  CHECK(std::strstr(body, "origin") == nullptr);  // origem é resolvida pela ingestão

  // Política de resposta e reenvio.
  CHECK(classifyResponse(201) == SendOutcome::Accepted);
  CHECK(classifyResponse(200) == SendOutcome::Duplicate);
  CHECK(classifyResponse(401) == SendOutcome::AuthBlocked);
  CHECK(classifyResponse(403) == SendOutcome::AuthBlocked);
  CHECK(classifyResponse(409) == SendOutcome::Drop);
  CHECK(classifyResponse(422) == SendOutcome::Drop);
  CHECK(classifyResponse(400) == SendOutcome::Drop);
  CHECK(classifyResponse(503) == SendOutcome::Retry);
  CHECK(classifyResponse(-1) == SendOutcome::Retry);
  CHECK(retryDelaySeconds(1) == 2 && retryDelaySeconds(5) == 32 && retryDelaySeconds(6) == 60 && retryDelaySeconds(40) == 60);

  // Janela fechada pelo relógio: 60 s de amostragem a cada 100 ms -> 12 janelas de 50 amostras,
  // encadeadas a cada 5 s (observedAt sem sobreposição nem buraco).
  {
    TimedWindow timed(5000, 100);
    ClosedWindow closed{};
    int windows = 0, samples = 0;
    time_t previous = 0;
    bool chained = true, allComplete = true, spanOk = true;
    for (uint32_t ms = 0; ms < 60000; ms += 100) {
      ++samples;
      if (timed.add(ms, 1794150000 + ms / 1000, 62.5f, closed)) {
        ++windows;
        if (closed.count != 50) allComplete = false;
        if (!closed.complete || closed.spanMs != 4900) spanOk = false;
        if (previous != 0 && closed.startEpoch != previous + 5) chained = false;
        previous = closed.startEpoch;
      }
    }
    CHECK(samples == 600 && windows == 12);
    CHECK(allComplete && spanOk && chained);
  }

  // Variação de 1–2 ms do agendador (visto no Wokwi: 4899 ms em vez de 4900) não muda a contagem: sempre 50.
  {
    TimedWindow timed(5000, 100);
    ClosedWindow closed{};
    bool always50 = true;
    int windows = 0;
    for (uint32_t k = 0; k < 600; ++k) {
      const uint32_t jitter = (k % 3 == 0) ? 0 : (k % 3 == 1 ? 1 : 2);  // leituras 0–2 ms adiantadas
      const uint32_t ms = k * 100 + 10 - jitter;
      if (timed.add(ms, 1794150000 + ms / 1000, 50.0f, closed)) {
        ++windows;
        if (closed.count != 50 || !closed.complete) always50 = false;
      }
    }
    CHECK(windows == 12 && always50);
  }

  // Cenário da revisão: se a leitura atrasar (ex.: tarefa parada ~5 s), a janela NÃO se estica além de 5 s
  // nem é enviada com 5 s declarados: fecha pelo relógio, sai incompleta e a próxima recomeça no tempo real.
  {
    TimedWindow timed(5000, 100);
    ClosedWindow closed{};
    bool closedOnce = false;
    for (uint32_t ms = 0; ms <= 2000; ms += 100) closedOnce |= timed.add(ms, 1794150000, 60.0f, closed);
    CHECK(!closedOnce);
    CHECK(timed.add(7000, 1794150007, 70.0f, closed));  // primeira leitura após o atraso
    CHECK(!closed.complete && closed.count == 21 && closed.spanMs == 2000 && closed.startEpoch == 1794150000);
    CHECK(timed.count() == 1);  // a amostra atrasada abriu a próxima janela
    for (uint32_t ms = 7100; ms < 11900; ms += 100) timed.add(ms, 1794150007 + (ms - 7000) / 1000, 70.0f, closed);
    CHECK(timed.add(11900, 1794150011, 70.0f, closed));
    CHECK(closed.complete && closed.count == 50 && closed.startEpoch == 1794150007);  // 7 s depois, não 5
  }

  // Encadeamento do observedAt: segue +5 s com pequena variação; recomeça após salto ou sem NTP.
  CHECK(nextWindowStart(1794150000, 1794150005, 5) == 1794150005);
  CHECK(nextWindowStart(1794150000, 1794150006, 5) == 1794150005);
  CHECK(nextWindowStart(1794150000, 1794150020, 5) == 1794150020);
  CHECK(nextWindowStart(0, 1794150000, 5) == 1794150000);
  CHECK(nextWindowStart(1794150000, 12, 5) == 12);  // sem relógio: continua inválido, não é enviado

  std::printf("OK: %d verificações da lógica do firmware.\n", checks);
  return 0;
}
