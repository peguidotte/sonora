// Utilitários HTTP mínimos (sem framework), no mesmo espírito do tools/mock_server.py do monorepo.
import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 262_144;

export class BodyTooLargeError extends Error {}
export class InvalidJsonError extends Error {}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new BodyTooLargeError(`corpo acima do limite de ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const raw = await readRawBody(req);
  if (raw.trim().length === 0) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new InvalidJsonError("corpo não é um JSON válido");
  }
}

export async function readFormBody(req: IncomingMessage): Promise<URLSearchParams> {
  const raw = await readRawBody(req);
  return new URLSearchParams(raw);
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const raw = Buffer.from(JSON.stringify(body), "utf-8");
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": raw.length });
  res.end(raw);
}

export function sendHtml(res: ServerResponse, status: number, html: string): void {
  const raw = Buffer.from(html, "utf-8");
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "content-length": raw.length });
  res.end(raw);
}

export function redirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { location });
  res.end();
}
