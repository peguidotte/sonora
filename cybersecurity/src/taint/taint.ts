// Rastreamento de contaminação (taint analysis): fonte -> propagação -> sink.
// Um valor marcado como Tainted carrega a proveniência até ser explicitamente sanitizado.

const TAINT_TAG = Symbol("sonora.taint");

export interface Tainted<T> {
  readonly [TAINT_TAG]: true;
  readonly value: T;
  readonly source: string;
  readonly sanitized: boolean;
  readonly sanitizedBy?: string;
}

/** Marca um valor como contaminado no ponto em que ele entra no sistema (source). */
export function taint<T>(value: T, source: string): Tainted<T> {
  return { [TAINT_TAG]: true, value, source, sanitized: false };
}

export function isTainted(value: unknown): value is Tainted<unknown> {
  return typeof value === "object" && value !== null && TAINT_TAG in (value as Record<PropertyKey, unknown>);
}

/**
 * Propaga a contaminação através de uma transformação (ex: concatenar em uma mensagem,
 * copiar para outro objeto). O resultado continua contaminado com a mesma fonte.
 */
export function propagate<T, U>(tainted: Tainted<T>, transform: (value: T) => U): Tainted<U> {
  return { [TAINT_TAG]: true, value: transform(tainted.value), source: tainted.source, sanitized: tainted.sanitized, sanitizedBy: tainted.sanitizedBy };
}

/**
 * Sanitiza explicitamente um valor contaminado (ex: aplicando a máscara do motor de PII).
 * Só depois disso o valor pode alcançar um sink sem ser bloqueado.
 */
export function sanitize<T, U>(tainted: Tainted<T>, sanitizer: (value: T) => U, sanitizerName: string): Tainted<U> {
  return { [TAINT_TAG]: true, value: sanitizer(tainted.value), source: tainted.source, sanitized: true, sanitizedBy: sanitizerName };
}
