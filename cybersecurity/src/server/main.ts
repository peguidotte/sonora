// Entrypoint do microserviço: node dist/src/server/main.js
import { createServer } from "node:http";
import { createApp } from "./app.js";

const port = Number(process.env.CYBERSECURITY_PORT ?? 8090);
const app = createApp();

createServer((req, res) => {
  void app.handle(req, res);
}).listen(port, () => {
  console.log(`Sonora Cybersecurity (avaliação de segurança) ouvindo em http://127.0.0.1:${port}`);
  console.log(`API:       POST http://127.0.0.1:${port}/api/cybersecurity/v1/analyze`);
  console.log(`Dashboard: GET  http://127.0.0.1:${port}/dashboard`);
});
