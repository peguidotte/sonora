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

function maskCpfDigits(digits: string): string {
  return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`;
}

// Casa um CPF formatado embutido em texto livre (ex: "O CPF informado foi 529.982.247-25").
const CPF_OCCURRENCE = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;

function findCpfOccurrences(value: string): string[] {
  const matches = value.match(CPF_OCCURRENCE) ?? [];
  return matches.filter((occurrence) => isValidCpfChecksum(occurrence.replace(/\D/g, "")));
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

const CPF_MASKED = /^\*{3}\.\d{3}\.\*{3}-\d{2}$/;
const RG_MASKED = /^\*+-[\dXx]$/;
const HEALTH_MASKED_SUFFIX = "(conteúdo sensível omitido)";
const CREDENTIAL_MASKED = "********";

/**
 * Um valor que já tem o formato EXATO da máscara produzida por uma das regras abaixo não
 * deve ser marcado de novo. Isso precisa reconhecer o formato canônico de cada categoria,
 * não uma pista solta como "contém ***" — um valor real pode ter "***" por acaso (ex: uma
 * senha de verdade), e isso desligaria a detecção inteira se bastasse esse sinal fraco.
 */
function isAlreadyMasked(value: string): boolean {
  return (
    value === CREDENTIAL_MASKED ||
    value.endsWith(HEALTH_MASKED_SUFFIX) ||
    CPF_MASKED.test(value) ||
    RG_MASKED.test(value)
  );
}

export const PII_RULES: PiiRule[] = [
  {
    category: "cpf",
    description: "CPF formatado (000.000.000-00) ou 11 dígitos, com checksum válido — no campo inteiro ou embutido numa mensagem (ex: log/texto livre). Falso positivo evitado: número de 11 dígitos sem checksum válido (ex: contador sequencial) não é marcado. Caso negativo: valor já mascarado não dispara de novo.",
    matches({ value }) {
      if (isAlreadyMasked(value)) return false;
      if (CPF_FORMATTED.test(value) || CPF_DIGITS.test(value)) {
        return isValidCpfChecksum(value.replace(/\D/g, ""));
      }
      return findCpfOccurrences(value).length > 0;
    },
    mask(value) {
      if (CPF_FORMATTED.test(value) || CPF_DIGITS.test(value)) {
        return maskCpfDigits(value.replace(/\D/g, ""));
      }
      return value.replace(CPF_OCCURRENCE, (occurrence) => {
        const digits = occurrence.replace(/\D/g, "");
        return isValidCpfChecksum(digits) ? maskCpfDigits(digits) : occurrence;
      });
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
