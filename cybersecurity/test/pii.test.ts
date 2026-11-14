import { test } from "node:test";
import assert from "node:assert/strict";
import { scanPayload, maskPayload } from "../src/pii/parser.js";

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

// Regressão: achado de auditoria (Pedro, PR #13) — "***" solto numa senha real desligava
// a guarda de "já mascarado" e deixava o valor cru passar sem achado.
test("senha crua contendo '***' por acaso ainda é detectada (regressão: guarda de máscara frouxa)", () => {
  const findings = scanPayload({ password: "SYNTHETIC***CREDENTIAL-NOT-MASKED" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "credential");
  assert.equal(findings[0].maskedValue, "********");
});

// Regressão: achado de auditoria — strings primitivas dentro de arrays nunca passavam pelas
// regras (só objetos aninhados eram testados), então documentos/senhas em lista vazavam.
test("detecta PII em strings primitivas dentro de arrays (regressão: folhas de array ignoradas)", () => {
  const findings = scanPayload({
    documents: ["529.982.247-25"],
    password: ["SYNTHETIC-ARRAY-SECRET"],
  });
  assert.equal(findings.length, 2);
  assert.deepEqual(
    findings.map((finding) => finding.category).sort(),
    ["cpf", "credential"],
  );
});

// Regressão: o CPF só era achado se o campo inteiro fosse exatamente o documento; um CPF
// embutido numa mensagem de log/texto livre passava direto.
test("detecta CPF embutido dentro de uma mensagem de texto livre (regressão: só campo inteiro)", () => {
  const findings = scanPayload({ message: "O CPF informado foi 529.982.247-25 durante o cadastro" });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "cpf");
  assert.equal(findings[0].maskedValue, "O CPF informado foi ***.982.***-25 durante o cadastro");
});

test("não marca uma sequência de 11 dígitos sem checksum válido embutida em texto (caso negativo)", () => {
  const findings = scanPayload({ message: "Protocolo gerado: 123.456.789-10 para acompanhamento" });
  assert.equal(findings.length, 0);
});

test("maskPayload também mascara strings primitivas dentro de arrays (regressão)", () => {
  const masked = maskPayload({ password: ["SYNTHETIC-ARRAY-SECRET"], documents: ["529.982.247-25"] }) as {
    password: string[];
    documents: string[];
  };
  assert.equal(masked.password[0], "********");
  assert.equal(masked.documents[0], "***.982.***-25");
});
