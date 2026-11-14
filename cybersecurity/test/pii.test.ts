import { test } from "node:test";
import assert from "node:assert/strict";
import { scanPayload } from "../src/pii/parser.js";

test("detecta CPF formatado válido (caso positivo)", () => {
  const findings = scanPayload({ operatorCpf: "529.982.247-25" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "cpf");
  assert.equal(findings[0].maskedValue, "***.982.***-25");
});

test("não marca número de 11 dígitos sem checksum de CPF válido (caso negativo)", () => {
  const findings = scanPayload({ contactPhone: "11987654321" });
  assert.equal(findings.length, 0);
});

test("detecta RG formatado (caso positivo)", () => {
  const findings = scanPayload({ operatorRg: "12.345.678-9" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "rg");
});

test("detecta termo de saúde no valor mesmo com chave neutra (caso positivo)", () => {
  const findings = scanPayload({ observacoes: "paciente apresenta laudo de exame recente" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "health");
});

test("não marca 'saudação' como termo de saúde (falso positivo evitado)", () => {
  const findings = scanPayload({ greeting: "Tenha uma boa saudação ao abrir o app" });
  assert.equal(findings.length, 0);
});

test("detecta credencial pela chave do campo (caso positivo)", () => {
  const findings = scanPayload({ apiKey: "mock-operator-key-demo-0001" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "credential");
  assert.equal(findings[0].maskedValue, "********");
});

test("não marca chave de credencial vazia (falso positivo evitado)", () => {
  const findings = scanPayload({ password: "" });
  assert.equal(findings.length, 0);
});

test("varre objetos aninhados e arrays", () => {
  const findings = scanPayload({
    device: { auth: { apiKey: "abc123" } },
    history: [{ operatorCpf: "529.982.247-25" }],
  });
  assert.equal(findings.length, 2);
});

test("registro de usuário com documento/RG/saúde vazados é totalmente detectado", () => {
  const findings = scanPayload({
    document: "529.982.247-25",
    rg: "12.345.678-9",
    healthNotes: "Paciente com laudo médico recente, em tratamento contínuo",
  });
  assert.equal(findings.length, 3);
  assert.deepEqual(
    findings.map((finding) => finding.category).sort(),
    ["cpf", "health", "rg"],
  );
});

test("o mesmo registro já mascarado não gera nenhum achado (caso negativo central da demo)", () => {
  const findings = scanPayload({
    document: "***.982.***-25",
    rg: "**********-9",
    healthNotes: "Pacien… (conteúdo sensível omitido)",
  });
  assert.equal(findings.length, 0);
});

test("credencial no meio de um log estruturado é detectada", () => {
  const findings = scanPayload({ timestamp: "2026-11-13T10:00:00Z", level: "INFO", password: "SuperSecreta123", requestId: "req-88213" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "credential");
});

test("credencial já mascarada no mesmo log não é marcada de novo (caso negativo central da demo)", () => {
  const findings = scanPayload({ timestamp: "2026-11-13T10:00:00Z", level: "INFO", password: "********", requestId: "req-88213" });
  assert.equal(findings.length, 0);
});
