// Cálculo do indicador "Risco Cidadão" a partir dos eventos de segurança observados.
// Farol ilustrativo da auditoria local; não é uma classificação oficial de risco.
import type { SecurityEvent } from "./events.js";
import type { PiiCategory } from "../pii/rules.js";

export type RiskLevel = "verde" | "amarelo" | "vermelho";

export interface RiskReport {
  level: RiskLevel;
  score: number;
  blockedCount: number;
  allowedCount: number;
  byCategory: Record<PiiCategory, number>;
  explanation: string;
}

// Peso por categoria: saúde e credencial pesam mais que CPF/RG no cálculo do farol,
// refletindo o dano potencial do vazamento em cada categoria — decisão documentada no README.
const CATEGORY_WEIGHT: Record<PiiCategory, number> = {
  cpf: 2,
  rg: 1,
  health: 3,
  credential: 3,
};

const emptyByCategory = (): Record<PiiCategory, number> => ({ cpf: 0, rg: 0, health: 0, credential: 0 });

/**
 * score = soma do peso de cada evento BLOQUEADO pela categoria envolvida.
 * Eventos permitidos (já sanitizados) não aumentam o score: a sanitização funcionou.
 * verde: score 0 | amarelo: score 1–4 | vermelho: score >= 5.
 */
export function calculateRisk(events: readonly SecurityEvent[]): RiskReport {
  const byCategory = emptyByCategory();
  let score = 0;
  let blockedCount = 0;
  let allowedCount = 0;

  for (const event of events) {
    if (event.blocked) {
      blockedCount += 1;
      score += CATEGORY_WEIGHT[event.category];
      byCategory[event.category] += 1;
    } else {
      allowedCount += 1;
    }
  }

  const level: RiskLevel = score === 0 ? "verde" : score <= 4 ? "amarelo" : "vermelho";
  const explanation = `score=${score} (soma do peso das categorias bloqueadas: cpf=2, rg=1, saude=3, credencial=3); ${blockedCount} evento(s) bloqueado(s), ${allowedCount} permitido(s) após sanitização.`;

  return { level, score, blockedCount, allowedCount, byCategory, explanation };
}
