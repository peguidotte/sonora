// Microserviço de avaliação de segurança: um endpoint de API que liga pii + taint + llm + risk,
// e um endpoint de dashboard que expõe o uso dessas regras de forma iterativa.
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { interceptRequest } from "../middleware.js";
import { maskPayload, type JsonValue } from "../pii/parser.js";
import { SecurityEventLog } from "../risk/events.js";
import { calculateRisk } from "../risk/score.js";
import { renderLivePage, type Preset } from "../dashboard/render.js";
import { readJsonBody, readFormBody, sendJson, sendHtml, redirect, BodyTooLargeError, InvalidJsonError } from "./http.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURES_DIR = path.join(HERE, "..", "..", "..", "fixtures", "requests");

// Ordem e rótulo de exibição dos exemplos conhecidos (par vazamento/mascarado, lado a lado).
const FIXTURE_ORDER = ["user-record-leaked", "user-record-masked", "credential-in-log-leaked", "credential-in-log-masked"];
const FIXTURE_LABELS: Record<string, string> = {
  "user-record-leaked": "Vazamento de usuário",
  "user-record-masked": "Usuário mascarado",
  "credential-in-log-leaked": "Credenciais no meio de envs",
  "credential-in-log-masked": "Credenciais mascaradas",
};

export interface App {
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
  log: SecurityEventLog;
}

export interface AppOptions {
  fixturesDir?: string;
}

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// `source` é um identificador de proveniência (nome da fonte), não dado do payload: ele entra
// direto no prompt da IA e no log de eventos sem passar pelo motor de PII. Por isso precisa
// ser um identificador curto e previsível — nunca texto livre onde alguém poderia embutir um
// segredo (ex: source: "password=segredo-real") para fazê-lo vazar pro prompt/eventos.
const SAFE_SOURCE = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/;

function isSafeSource(value: string): boolean {
  return SAFE_SOURCE.test(value);
}

async function listFixtureSources(fixturesDir: string): Promise<string[]> {
  try {
    const files = await readdir(fixturesDir);
    const discovered = files.filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, "")).sort();
    const known = FIXTURE_ORDER.filter((source) => discovered.includes(source));
    const extra = discovered.filter((source) => !FIXTURE_ORDER.includes(source));
    return [...known, ...extra];
  } catch {
    return [];
  }
}

async function loadPresets(fixturesDir: string): Promise<Preset[]> {
  const sources = await listFixtureSources(fixturesDir);
  const presets: Preset[] = [];
  for (const source of sources) {
    try {
      const raw = await readFile(path.join(fixturesDir, `${source}.json`), "utf-8");
      const parsed = JSON.parse(raw) as JsonValue;
      presets.push({ source, label: FIXTURE_LABELS[source] ?? source, payloadJson: JSON.stringify(parsed, null, 2) });
    } catch {
      // Fixture inválida: ignora, não quebra o carregamento do painel.
    }
  }
  return presets;
}

export function createApp(options: AppOptions = {}): App {
  const fixturesDir = options.fixturesDir ?? DEFAULT_FIXTURES_DIR;
  const log = new SecurityEventLog();

  async function handleAnalyze(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      const status = error instanceof BodyTooLargeError ? 413 : 400;
      sendJson(res, status, { code: error instanceof InvalidJsonError ? "invalid_json" : "body_too_large", message: (error as Error).message });
      return;
    }
    if (!isPlainObject(body) || typeof body.source !== "string" || body.source.trim().length === 0 || !isPlainObject(body.payload)) {
      sendJson(res, 400, { code: "invalid_request", message: "esperado { source: string, payload: object }" });
      return;
    }
    if (!isSafeSource(body.source)) {
      sendJson(res, 400, {
        code: "invalid_source",
        message: "source deve ser um identificador curto (letras, números, '.', '_', ':' ou '-'), não texto livre",
      });
      return;
    }

    const { findings, events } = await interceptRequest(body.payload, body.source, log);
    const sanitizedPayload = maskPayload(body.payload);
    const risk = calculateRisk(log.all());

    sendJson(res, 200, {
      findings: findings.map((finding) => ({ path: finding.path, category: finding.category, description: finding.description, maskedValue: finding.maskedValue })),
      sanitizedPayload,
      events,
      risk,
    });
  }

  /** Aceita qualquer fonte/payload JSON vindo do formulário do dashboard — nada preso a fixtures. */
  async function handleDashboardRunCustom(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const form = await readFormBody(req);
    const source = (form.get("source") ?? "").trim() || "manual-test";
    const rawPayload = form.get("payload") ?? "";

    if (!isSafeSource(source)) {
      await renderDashboard(res, {
        error: "Fonte inválida: use um identificador curto (letras, números, '.', '_', ':' ou '-'), sem espaços nem símbolos.",
      });
      return;
    }

    let payload: unknown;
    try {
      payload = rawPayload.trim().length > 0 ? JSON.parse(rawPayload) : {};
    } catch {
      await renderDashboard(res, { error: "Payload não é um JSON válido — confira vírgulas/aspas e tente de novo." });
      return;
    }
    if (!isPlainObject(payload)) {
      await renderDashboard(res, { error: "Payload precisa ser um objeto JSON, ex: {\"campo\": \"valor\"}." });
      return;
    }

    await interceptRequest(payload, source, log);
    redirect(res, "/dashboard");
  }

  async function renderDashboard(res: ServerResponse, options: { error?: string } = {}): Promise<void> {
    const presets = await loadPresets(fixturesDir);
    const events = log.all();
    const risk = calculateRisk(events);
    sendHtml(res, 200, renderLivePage(risk, events, presets, options));
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";

    try {
      if (method === "GET" && (url.pathname === "/health/ready" || url.pathname === "/health/live")) {
        sendJson(res, 200, { status: "ok" });
        return;
      }
      if (method === "POST" && url.pathname === "/api/cybersecurity/v1/analyze") {
        await handleAnalyze(req, res);
        return;
      }
      if (method === "GET" && url.pathname === "/api/cybersecurity/v1/events") {
        sendJson(res, 200, { events: log.all() });
        return;
      }
      if (method === "GET" && url.pathname === "/api/cybersecurity/v1/risk") {
        sendJson(res, 200, calculateRisk(log.all()));
        return;
      }
      if (method === "POST" && url.pathname === "/api/cybersecurity/v1/reset") {
        log.clear();
        res.writeHead(204);
        res.end();
        return;
      }
      if (method === "GET" && url.pathname === "/dashboard") {
        await renderDashboard(res);
        return;
      }
      if (method === "POST" && url.pathname === "/dashboard/run-custom") {
        await handleDashboardRunCustom(req, res);
        return;
      }
      if (method === "POST" && url.pathname === "/dashboard/reset") {
        log.clear();
        redirect(res, "/dashboard");
        return;
      }
      sendJson(res, 404, { code: "not_found", message: `rota não encontrada: ${method} ${url.pathname}` });
    } catch (error) {
      sendJson(res, 500, { code: "internal_error", message: (error as Error).message });
    }
  }

  return { handle, log };
}
