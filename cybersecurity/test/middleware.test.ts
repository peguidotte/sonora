import { test } from "node:test";
import assert from "node:assert/strict";
import { interceptRequest } from "../src/middleware.js";
import { SecurityEventLog } from "../src/risk/events.js";
import { calculateRisk } from "../src/risk/score.js";

test("payload com PII gera um evento bloqueado e um evento permitido por campo sensível", async () => {
  const log = new SecurityEventLog();
  const { findings, events } = await interceptRequest(
    { operatorCpf: "529.982.247-25", apiKey: "mock-operator-key-demo-0001" },
    "csharp-config:test",
    log,
  );
  assert.equal(findings.length, 2);
  assert.equal(events.length, 4);
  assert.equal(events.filter((event) => event.blocked).length, 2);
  assert.equal(events.filter((event) => !event.blocked).length, 2);
});

test("payload sem PII não gera nenhum evento", async () => {
  const log = new SecurityEventLog();
  const { findings, events } = await interceptRequest({ latitude: -23.5, longitude: -46.6 }, "mobile-form:test", log);
  assert.equal(findings.length, 0);
  assert.equal(events.length, 0);
  assert.equal(log.all().length, 0);
});

test("ponta a ponta: payload com saúde e credencial produz farol vermelho explicado", async () => {
  const log = new SecurityEventLog();
  await interceptRequest({ apiKey: "demo-key", observacoes: "laudo de exame recente" }, "java-ingestion:test", log);
  const report = calculateRisk(log.all());
  assert.equal(report.level, "vermelho");
  assert.match(report.explanation, /score=6/);
});
