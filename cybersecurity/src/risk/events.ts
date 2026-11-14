// Registro em memória dos eventos de segurança observados pelo middleware.
import type { PiiCategory } from "../pii/rules.js";

export interface SecurityEvent {
  timestamp: string;
  source: string;
  sink: string;
  category: PiiCategory;
  blocked: boolean;
  citizenMessage: string;
  usedLlm: boolean;
}

export class SecurityEventLog {
  private readonly events: SecurityEvent[] = [];

  record(event: SecurityEvent): void {
    this.events.push(event);
  }

  all(): readonly SecurityEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
  }
}
