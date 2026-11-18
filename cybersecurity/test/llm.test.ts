import { test } from "node:test";
import assert from "node:assert/strict";
import { translateDiagnostic } from "../src/llm/translate.js";

test("sem ANTHROPIC_API_KEY, usa fallback declarado e não inventa chamada real", async () => {
  const result = await translateDiagnostic({ code: "TAINT_SINK_BLOCKED", sink: "log", category: "cpf", source: "java-ingestion:operatorCpf" });
  assert.equal(result.usedLlm, false);
  assert.equal(result.declaredFallback, true);
  assert.match(result.citizenMessage, /document/i);
});

test("mensagem nunca inclui o valor sensível original, só a categoria", async () => {
  const result = await translateDiagnostic({ code: "TAINT_SINK_BLOCKED", sink: "log", category: "health", source: "java-ingestion:observacoes" });
  assert.doesNotMatch(result.citizenMessage, /laudo de exame recente/);
});

test("com apiKey e fetch simulado, usa o caminho de LLM real e marca usedLlm=true", async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ content: [{ text: "Mensagem traduzida pela IA simulada." }] }), { status: 200 })) as unknown as typeof fetch;
  const result = await translateDiagnostic(
    { code: "TAINT_SINK_BLOCKED", sink: "log", category: "credential", source: "csharp-config:apiKey" },
    { apiKey: "test-key", fetchImpl: fakeFetch },
  );
  assert.equal(result.usedLlm, true);
  assert.equal(result.declaredFallback, false);
  assert.equal(result.citizenMessage, "Mensagem traduzida pela IA simulada.");
});

test("se a chamada ao LLM falhar, cai no fallback declarado em vez de quebrar", async () => {
  const failingFetch = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;
  const result = await translateDiagnostic(
    { code: "TAINT_SINK_BLOCKED", sink: "log", category: "rg", source: "csharp-config:operatorRg" },
    { apiKey: "test-key", fetchImpl: failingFetch },
  );
  assert.equal(result.usedLlm, false);
  assert.equal(result.declaredFallback, true);
});
