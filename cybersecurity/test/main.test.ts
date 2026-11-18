import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer, HOST } from "../src/server/main.js";

// Regressão: achado de auditoria (Pedro, PR #13) — listen(port, callback) sem host escutava em
// todas as interfaces (0.0.0.0/::), contradizendo a premissa de "sem autenticação porque é só
// local" do README. Precisa ficar restrito ao loopback.
test("o servidor escuta só em 127.0.0.1, nunca em todas as interfaces (regressão: bind amplo)", async () => {
  assert.equal(HOST, "127.0.0.1");
  const server = startServer(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("endereço inesperado");
  assert.equal(address.address, "127.0.0.1");
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
