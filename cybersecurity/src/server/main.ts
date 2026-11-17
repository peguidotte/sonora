// Entrypoint do microserviço: node dist/src/server/main.js
import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";

// Auditoria local, sem autenticação própria: nunca escutar em outra interface além do loopback.
export const HOST = "127.0.0.1";

export function startServer(port: number): Server {
  const app = createApp();
  return createServer((req, res) => {
    void app.handle(req, res);
  }).listen(port, HOST, () => {
    console.log(`Sonora Cybersecurity (avaliação de segurança) ouvindo em http://${HOST}:${port}`);
    console.log(`API:       POST http://${HOST}:${port}/api/cybersecurity/v1/analyze`);
    console.log(`Dashboard: GET  http://${HOST}:${port}/dashboard`);
  });
}

// Só sobe o servidor de verdade quando este arquivo é o entrypoint (node dist/src/server/main.js),
// nunca quando é apenas importado (ex: pelos testes, para reaproveitar startServer/HOST).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(Number(process.env.CYBERSECURITY_PORT ?? 8090));
}
