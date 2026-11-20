// Middleware/interceptador: liga parsing de PII, taint analysis, tradução via LLM e eventos
// para o dashboard. Ponto único usado pela demo e pelos testes.
import { scanPayload, type JsonValue, type PiiFinding } from "./pii/parser.js";
import { taint, sanitize } from "./taint/taint.js";
import { safeLog, TaintBlockedError } from "./taint/sinks.js";
import { translateDiagnostic } from "./llm/translate.js";
import { SecurityEventLog, type SecurityEvent } from "./risk/events.js";

const KNOWN_SOURCES = new Set(["java-ingestion", "mobile-form", "csharp-config", "user-record-leaked",
  "user-record-masked", "credential-in-log-leaked", "credential-in-log-masked"]);

export interface InterceptResult {
  findings: PiiFinding[];
  events: SecurityEvent[];
}

/**
 * Processa um payload de entrada (fonte): detecta PII, demonstra a tentativa insegura de
 * log (bloqueada) e a tentativa segura após sanitização (permitida), e registra os dois
 * eventos no log para alimentar o dashboard Risco Cidadão.
 */
export async function interceptRequest(payload: JsonValue, source: string, log: SecurityEventLog): Promise<InterceptResult> {
  const publicSource = KNOWN_SOURCES.has(source) ? source : "manual";
  const findings = scanPayload(payload);
  const events: SecurityEvent[] = [];

  for (const finding of findings) {
    const unsafeEvent = await attemptUnsafeLog(finding, publicSource);
    const safeEvent = await attemptSanitizedLog(finding, publicSource);
    events.push(unsafeEvent, safeEvent);
    log.record(unsafeEvent);
    log.record(safeEvent);
  }

  return { findings, events };
}

async function attemptUnsafeLog(finding: PiiFinding, source: string): Promise<SecurityEvent> {
  const tainted = taint(finding.originalValue, source);
  const result = safeLog(tainted);
  if (!result.blocked) {
    // Não deveria acontecer: valor contaminado não sanitizado nunca deveria passar no sink.
    throw new Error("Fluxo inseguro não foi bloqueado pelo sink — verificar taint analysis");
  }
  const error = result.error as TaintBlockedError;
  const translation = await translateDiagnostic({ code: "TAINT_SINK_BLOCKED", sink: error.sink, category: finding.category, source });
  return {
    timestamp: new Date().toISOString(),
    source,
    sink: error.sink,
    category: finding.category,
    blocked: true,
    citizenMessage: translation.citizenMessage,
    usedLlm: translation.usedLlm,
  };
}

async function attemptSanitizedLog(finding: PiiFinding, source: string): Promise<SecurityEvent> {
  const tainted = taint(finding.originalValue, source);
  const sanitized = sanitize(tainted, () => finding.maskedValue, "pii-mask");
  const result = safeLog(sanitized);
  if (result.blocked) {
    throw new Error("Fluxo seguro foi bloqueado mesmo após sanitização — verificar sanitize()");
  }
  const translation = await translateDiagnostic({ code: "TAINT_SINK_ALLOWED", sink: "log", category: finding.category, source });
  return {
    timestamp: new Date().toISOString(),
    source,
    sink: "log",
    category: finding.category,
    blocked: false,
    citizenMessage: translation.citizenMessage,
    usedLlm: translation.usedLlm,
  };
}
