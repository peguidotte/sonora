import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRisk } from "../src/risk/score.js";
import type { SecurityEvent } from "../src/risk/events.js";

function event(partial: Partial<SecurityEvent>): SecurityEvent {
  return {
    timestamp: new Date().toISOString(),
    source: "test",
    sink: "log",
    category: "cpf",
    blocked: false,
    citizenMessage: "",
    usedLlm: false,
    ...partial,
  };
}

test("sem eventos bloqueados, farol fica verde com score 0", () => {
  const report = calculateRisk([event({ blocked: false }), event({ blocked: false })]);
  assert.equal(report.level, "verde");
  assert.equal(report.score, 0);
});

test("um bloqueio de CPF (peso 2) fica amarelo", () => {
  const report = calculateRisk([event({ blocked: true, category: "cpf" })]);
  assert.equal(report.score, 2);
  assert.equal(report.level, "amarelo");
});

test("bloqueios de saúde e credencial (peso 3 cada) somam 6 e ficam vermelho", () => {
  const report = calculateRisk([event({ blocked: true, category: "health" }), event({ blocked: true, category: "credential" })]);
  assert.equal(report.score, 6);
  assert.equal(report.level, "vermelho");
  assert.equal(report.byCategory.health, 1);
  assert.equal(report.byCategory.credential, 1);
});

test("eventos permitidos (sanitizados) não aumentam o score", () => {
  const report = calculateRisk([event({ blocked: false, category: "health" }), event({ blocked: false, category: "credential" })]);
  assert.equal(report.score, 0);
  assert.equal(report.allowedCount, 2);
});
