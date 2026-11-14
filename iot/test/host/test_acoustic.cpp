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

  std::printf("OK: %d verificações da lógica do firmware.\n", checks);
  return 0;
}
