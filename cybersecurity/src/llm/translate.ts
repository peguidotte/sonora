// Tradução do diagnóstico técnico sanitizado para linguagem acessível (Risco Cidadão).
// Nunca recebe PII/segredo/payload bruto: só o evento já sanitizado pelo taint analysis.
import type { PiiCategory } from "../pii/rules.js";

export interface DiagnosticEvent {
  code: "TAINT_SINK_BLOCKED" | "TAINT_SINK_ALLOWED";
  sink: string;
  category: PiiCategory;
  source: string;
}

export interface TranslationResult {
  citizenMessage: string;
  usedLlm: boolean;
  model?: string;
  declaredFallback: boolean;
}

const CATEGORY_LABEL: Record<PiiCategory, string> = {
  cpf: "documento (CPF)",
  rg: "documento (RG)",
  health: "dado de saúde",
  credential: "senha ou credencial de acesso",
};

function buildPrompt(event: DiagnosticEvent): string {
  return [
    `Traduza a falha técnica a seguir para um cidadão leigo, em até 2 frases, tom acolhedor:`,
    `Código: ${event.code}`,
    `Sink: ${event.sink}`,
    `Categoria de dado envolvida: ${CATEGORY_LABEL[event.category]}`,
    `Fonte da contaminação: ${event.source}`,
    `Não cite valores, nomes de variáveis internas ou termos técnicos como "taint" ou "sink".`,
  ].join("\n");
}

/** Stub determinístico, declarado como fallback — não é chamada real de LLM. */
function fallbackTranslate(event: DiagnosticEvent): TranslationResult {
  const label = CATEGORY_LABEL[event.category];
  const citizenMessage =
    event.code === "TAINT_SINK_BLOCKED"
      ? `Tentaram expor uma informação sensível sua (${label}), mas nosso sistema bloqueou a ação antes de qualquer registro ou exibição. Sua informação continua protegida.`
      : `Uma informação sensível sua (${label}) foi tratada com segurança: o sistema removeu a parte sensível antes de qualquer registro.`;
  return { citizenMessage, usedLlm: false, declaredFallback: true };
}

interface LlmClientOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Traduz o diagnóstico sanitizado. Usa uma API de LLM real quando ANTHROPIC_API_KEY está
 * configurada; caso contrário usa o fallback determinístico declarado explicitamente no
 * resultado (declaredFallback=true), conforme exigido pela ficha da disciplina.
 */
export async function translateDiagnostic(event: DiagnosticEvent, options: LlmClientOptions = {}): Promise<TranslationResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackTranslate(event);
  }

  const model = options.model ?? "claude-haiku-5-5";
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const response = await doFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [{ role: "user", content: buildPrompt(event) }],
      }),
    });
    if (!response.ok) {
      return fallbackTranslate(event);
    }
    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      return fallbackTranslate(event);
    }
    return { citizenMessage: text, usedLlm: true, model, declaredFallback: false };
  } catch {
    return fallbackTranslate(event);
  }
}
