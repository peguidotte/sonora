// Sinks guardados: saídas inseguras (log, resposta HTTP) que recusam dado contaminado não sanitizado.
import { isTainted, type Tainted } from "./taint.js";

export class TaintBlockedError extends Error {
  constructor(public readonly sink: string, public readonly source: string) {
    super(`Taint sink blocked: valor da fonte "${source}" alcançou o sink "${sink}" sem sanitização`);
    this.name = "TaintBlockedError";
  }
}

export interface SinkResult<T> {
  blocked: boolean;
  value?: T;
  error?: TaintBlockedError;
}

/**
 * Sink genérico: só deixa um valor passar se ele não estiver contaminado, ou se já tiver
 * sido sanitizado. Caso contrário bloqueia e devolve o erro para a camada de tradução/IA.
 */
function guardedSink<T>(sinkName: string, input: T | Tainted<T>): SinkResult<T> {
  if (!isTainted(input)) {
    return { blocked: false, value: input };
  }
  if (!input.sanitized) {
    return { blocked: true, error: new TaintBlockedError(sinkName, input.source) };
  }
  return { blocked: false, value: input.value };
}

/** Sink de log (equivalente a console.log/logger.info em um backend real). */
export function safeLog<T>(input: T | Tainted<T>): SinkResult<T> {
  const result = guardedSink("log", input);
  if (!result.blocked) {
    // eslint-disable-next-line no-console
    console.log("[log]", result.value);
  }
  return result;
}

/** Sink de resposta HTTP não autenticada (ex: corpo de erro devolvido ao app/dispositivo). */
export function safeHttpResponse<T>(input: T | Tainted<T>): SinkResult<T> {
  return guardedSink("http-response", input);
}
