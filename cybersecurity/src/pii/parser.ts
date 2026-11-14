// Motor de parsing de PII: varre um payload (JSON de formulário/API) e marca campos sensíveis.
import { PII_RULES, type PiiCategory } from "./rules.js";

export interface PiiFinding {
  path: string;
  category: PiiCategory;
  description: string;
  originalValue: string;
  maskedValue: string;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function stringify(value: JsonValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

/** Varre recursivamente o payload e retorna todos os campos marcados como PII. */
export function scanPayload(payload: JsonValue, basePath = "$"): PiiFinding[] {
  const findings: PiiFinding[] = [];
  walk(payload, basePath, findings);
  return findings;
}

/**
 * Testa as regras contra um valor-folha (não objeto/array) e registra o achado, se houver.
 * `key` é a chave da propriedade que governa esse valor — para uma string dentro de um
 * array (ex: password: ["segredo"]), é a chave do array (password), não um índice.
 */
function testLeaf(key: string, child: JsonValue, path: string, findings: PiiFinding[]): void {
  const stringValue = stringify(child);
  for (const rule of PII_RULES) {
    if (rule.matches({ key, value: stringValue })) {
      findings.push({
        path,
        category: rule.category,
        description: rule.description,
        originalValue: stringValue,
        maskedValue: rule.mask(stringValue),
      });
      break; // primeira regra aplicável decide a categoria do campo
    }
  }
}

function walk(value: JsonValue, path: string, findings: PiiFinding[], governingKey = ""): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      if (item !== null && typeof item === "object") {
        walk(item, itemPath, findings, governingKey);
      } else {
        testLeaf(governingKey, item, itemPath, findings);
      }
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (child !== null && typeof child === "object") {
        walk(child, childPath, findings, key);
      } else {
        testLeaf(key, child, childPath, findings);
      }
    }
  }
}

/** Retorna uma cópia profunda do payload com todos os campos sensíveis mascarados. */
export function maskPayload(payload: JsonValue): JsonValue {
  const findings = scanPayload(payload);
  const maskedByPath = new Map(findings.map((finding) => [finding.path, finding.maskedValue]));
  return maskRecursive(payload, "$", maskedByPath);
}

function maskLeaf(value: JsonValue, path: string, maskedByPath: Map<string, string>): JsonValue {
  return maskedByPath.has(path) ? maskedByPath.get(path)! : value;
}

function maskRecursive(value: JsonValue, path: string, maskedByPath: Map<string, string>): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const itemPath = `${path}[${index}]`;
      return item !== null && typeof item === "object"
        ? maskRecursive(item, itemPath, maskedByPath)
        : maskLeaf(item, itemPath, maskedByPath);
    });
  }
  if (value !== null && typeof value === "object") {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      result[key] = child !== null && typeof child === "object"
        ? maskRecursive(child, childPath, maskedByPath)
        : maskLeaf(child, childPath, maskedByPath);
    }
    return result;
  }
  return value;
}
