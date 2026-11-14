import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createApp } from "../src/server/app.js";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = createApp();
  const server: Server = createServer((req, res) => void app.handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("endereço inesperado");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await run(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("GET /health/ready responde ok", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("POST /api/cybersecurity/v1/analyze detecta PII, mascara o payload e atualiza o risco", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "test-source", payload: { operatorCpf: "529.982.247-25" } }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.equal(body.findings.length, 1);
    assert.equal(body.findings[0].category, "cpf");
    assert.equal(body.findings[0].maskedValue, "***.982.***-25");
    assert.equal(body.sanitizedPayload.operatorCpf, "***.982.***-25");
    assert.equal(body.events.length, 2); // bloqueado + permitido
    assert.equal(body.risk.level, "amarelo"); // peso 2 (cpf)
    assert.ok(!("originalValue" in body.findings[0])); // nunca devolve o valor bruto
  });
});

// Regressão: achado de auditoria (Pedro, PR #13) — `source` era texto livre interpolado sem
// validação no prompt da IA e nos eventos; alguém podia embutir um segredo nesse campo (ex:
// source: "password=segredo-real") e fazê-lo vazar pro prompt/eventos sem passar pelo motor de PII.
test("POST /api/cybersecurity/v1/analyze rejeita source com formato de texto livre (regressão: fonte não validada)", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "password=SYNTHETIC-SOURCE-SECRET", payload: { password: "demo" } }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as any;
    assert.equal(body.code, "invalid_source");
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 0); // nada foi registrado, o segredo não chegou a lugar nenhum
  });
});

test("POST /api/cybersecurity/v1/analyze aceita source no formato de identificador (caso positivo)", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "java-ingestion:operatorCpf", payload: { note: "sem pii aqui" } }),
    });
    assert.equal(response.status, 200);
  });
});

test("POST /api/cybersecurity/v1/analyze rejeita corpo sem source/payload", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "x" }),
    });
    assert.equal(response.status, 400);
  });
});

test("POST /api/cybersecurity/v1/analyze rejeita JSON inválido", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ não é json",
    });
    assert.equal(response.status, 400);
  });
});

test("GET /api/cybersecurity/v1/events e /risk refletem o estado acumulado", async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "a", payload: { apiKey: "demo-key" } }),
    });
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 2);
    const risk = await (await fetch(`${baseUrl}/api/cybersecurity/v1/risk`)).json();
    assert.equal(risk.level, "amarelo"); // peso 3 (credential) -> na verdade >=5? 3<=4 => amarelo
  });
});

test("POST /api/cybersecurity/v1/reset limpa o log", async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "a", payload: { apiKey: "demo-key" } }),
    });
    const resetResponse = await fetch(`${baseUrl}/api/cybersecurity/v1/reset`, { method: "POST" });
    assert.equal(resetResponse.status, 204);
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 0);
  });
});

test("GET /dashboard renderiza o farol e a tabela a partir do log real", async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/api/cybersecurity/v1/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "manual", payload: { operatorCpf: "529.982.247-25" } }),
    });
    const html = await (await fetch(`${baseUrl}/dashboard`)).text();
    assert.match(html, /Risco Cidadão: AMARELO/);
    assert.match(html, /manual/);
  });
});

test("POST /dashboard/run-custom aceita qualquer payload JSON digitado e redireciona para /dashboard", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard/run-custom`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source: "teste-livre", payload: JSON.stringify({ campoQualquer: "valor aleatório sem PII" }) }).toString(),
      redirect: "manual",
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/dashboard");
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 0); // valor aleatório sem PII não dispara nenhum evento
  });
});

test("POST /dashboard/run-custom com PII dispara eventos reais", async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/dashboard/run-custom`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source: "teste-livre", payload: JSON.stringify({ operatorCpf: "529.982.247-25" }) }).toString(),
    });
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 2);
  });
});

test("POST /dashboard/run-custom com JSON inválido mostra erro no painel em vez de quebrar", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard/run-custom`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source: "teste-livre", payload: "{ não é json" }).toString(),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /não é um JSON válido/);
  });
});

test("POST /dashboard/run-custom rejeita fonte em texto livre (regressão: fonte não validada)", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/dashboard/run-custom`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source: "password=SYNTHETIC-SOURCE-SECRET", payload: JSON.stringify({ password: "demo" }) }).toString(),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /[Ff]onte inválida/);
    const events = await (await fetch(`${baseUrl}/api/cybersecurity/v1/events`)).json();
    assert.equal(events.events.length, 0);
  });
});

test("GET /dashboard lista os exemplos prontos (presets) a partir das fixtures", async () => {
  await withServer(async (baseUrl) => {
    const html = await (await fetch(`${baseUrl}/dashboard`)).text();
    assert.match(html, /Preencher: Vazamento de usuário/);
    assert.match(html, /Preencher: Usuário mascarado/);
    assert.match(html, /Preencher: Credenciais no meio de envs/);
    assert.match(html, /Preencher: Credenciais mascaradas/);
  });
});

test("rota desconhecida responde 404", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/nope`);
    assert.equal(response.status, 404);
  });
});
