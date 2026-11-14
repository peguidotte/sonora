// Regras sintéticas de detecção de PII (CPF, RG, saúde, credenciais).
// Fixtures de teste e demonstração; não há coleta real de CPF/saúde no produto Sonora.

export type PiiCategory = "cpf" | "rg" | "health" | "credential";

export interface PiiField {
  key: string;
  value: string;
}

export interface PiiRule {
  category: PiiCategory;
  description: string;
  matches(field: PiiField): boolean;
  mask(value: string): string;
}

const CPF_DIGITS = /^\d{11}$/;
const CPF_FORMATTED = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

function isValidCpfChecksum(digits: string): boolean {
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais não é CPF válido
  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const dv1 = calc(9);
  const dv2 = calc(10);
  return dv1 === Number(digits[9]) && dv2 === Number(digits[10]);
}

const RG_FORMATTED = /^\d{1,2}\.\d{3}\.\d{3}-[\dXx]$/;

const HEALTH_KEYWORDS = [
  "laudo",
  "diagnostico",
  "diagnóstico",
  "cid-10",
  "cid10",
  "prontuario",
  "prontuário",
  "doenca",
  "doença",
  "medicamento",
  "receita medica",
  "receita médica",
  "condicao de saude",
  "condição de saúde",
];

const HEALTH_KEY_HINTS = ["saude", "saúde", "health", "laudo", "diagnostic"];

const CREDENTIAL_KEYS = ["senha", "password", "secret", "token", "apikey", "pin"];

function maskKeepEdges(value: string, visibleStart: number, visibleEnd: number): string {
  if (value.length <= visibleStart + visibleEnd) return "*".repeat(value.length);
  return value.slice(0, visibleStart) + "*".repeat(value.length - visibleStart - visibleEnd) + value.slice(-visibleEnd);
}

/**
 * Um valor que já passou pela máscara deste próprio motor (contém "***" ou o marcador de
 * texto omitido, ou é só asteriscos) não deve ser marcado de novo. Sem isso, reenviar um
 * payload já sanitizado dispararia PII "fantasma" — e é exatamente o que diferencia os
 * exemplos de demonstração "vazamento" dos exemplos "já mascarado".
 */
function isAlreadyMasked(value: string): boolean {
  return value.includes("***") || value.includes("sensível omitido") || /^\*+$/.test(value.trim());
}

export const PII_RULES: PiiRule[] = [
  {
    category: "cpf",
    description: "CPF formatado (000.000.000-00) ou 11 dígitos, com checksum válido. Falso positivo evitado: número de 11 dígitos sem checksum válido (ex: contador sequencial) não é marcado. Caso negativo: valor já mascarado não dispara de novo.",
    matches({ value }) {
      if (isAlreadyMasked(value)) return false;
      const digits = value.replace(/\D/g, "");
      if (!(CPF_FORMATTED.test(value) || CPF_DIGITS.test(value))) return false;
      return isValidCpfChecksum(digits);
    },
    mask(value) {
      const digits = value.replace(/\D/g, "");
      return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`;
    },
  },
  {
    category: "rg",
    description: "RG formatado (00.000.000-0). Falso positivo possível: outro identificador com o mesmo formato (ex: matrícula) seria marcado também — discutido no README como limite aceito da heurística. Caso negativo: valor já mascarado não dispara de novo.",
    matches({ value }) {
      if (isAlreadyMasked(value)) return false;
      return RG_FORMATTED.test(value);
    },
    mask(value) {
      return maskKeepEdges(value, 0, 2);
    },
  },
  {
    category: "health",
    description: "Chave do campo (ex: condicaoSaude) ou termos de laudo/diagnóstico no texto. Falso positivo evitado: palavra 'saudação' não contém os termos de saúde da lista. Caso negativo: valor já mascarado (mesmo com chave de saúde) não dispara de novo.",
    matches({ key, value }) {
      if (isAlreadyMasked(value)) return false;
      const lowerKey = key.toLowerCase();
      if (HEALTH_KEY_HINTS.some((hint) => lowerKey.includes(hint))) return true;
      const lowerValue = value.toLowerCase();
      return HEALTH_KEYWORDS.some((keyword) => lowerValue.includes(keyword));
    },
    mask(value) {
      return value.length > 12 ? `${value.slice(0, 6)}… (conteúdo sensível omitido)` : "*** (conteúdo sensível omitido)";
    },
  },
  {
    category: "credential",
    description: "Chave do campo é senha/password/secret/token/apiKey/pin, qualquer valor não vazio é sensível. Falso positivo evitado: chave 'tokenDeAcesso' usada só como rótulo de UI (sem valor) não é marcada. Caso negativo: valor já mascarado (ex: \"********\") não dispara de novo.",
    matches({ key, value }) {
      if (isAlreadyMasked(value)) return false;
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
      const isCredentialKey = CREDENTIAL_KEYS.some((candidate) => normalizedKey.includes(candidate));
      return isCredentialKey && value.trim().length > 0;
    },
    mask() {
      return "********";
    },
  },
];
