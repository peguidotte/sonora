import { test } from "node:test";
import assert from "node:assert/strict";
import { taint, sanitize, propagate, isTainted } from "../src/taint/taint.js";
import { safeLog, safeHttpResponse, TaintBlockedError } from "../src/taint/sinks.js";

test("valor contaminado não sanitizado é bloqueado no sink de log (fluxo inseguro)", () => {
  const tainted = taint("529.982.247-25", "java-ingestion:operatorCpf");
  const result = safeLog(tainted);
  assert.equal(result.blocked, true);
  assert.ok(result.error instanceof TaintBlockedError);
  assert.equal(result.error?.sink, "log");
});

test("valor contaminado e sanitizado alcança o sink (fluxo seguro)", () => {
  const tainted = taint("529.982.247-25", "java-ingestion:operatorCpf");
  const sanitized = sanitize(tainted, (value) => `***.${value.slice(4, 7)}.***-${value.slice(-2)}`, "pii-mask");
  const result = safeLog(sanitized);
  assert.equal(result.blocked, false);
  assert.equal(result.value, "***.982.***-25");
});

test("propagação mantém a contaminação após transformação", () => {
  const tainted = taint("abc123", "mobile-form:apiKey");
  const propagated = propagate(tainted, (value) => `token=${value}`);
  assert.equal(isTainted(propagated), true);
  assert.equal(propagated.sanitized, false);
  const result = safeHttpResponse(propagated);
  assert.equal(result.blocked, true);
});

test("valor não contaminado passa direto pelo sink", () => {
  const result = safeLog("valor-publico-sem-pii");
  assert.equal(result.blocked, false);
  assert.equal(result.value, "valor-publico-sem-pii");
});
