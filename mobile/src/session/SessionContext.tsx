import React, { createContext, useContext, useMemo, useState } from "react";
import type { SonoraClient } from "../api/client";
import { createHttpClient } from "../api/httpClient";
import { createMockClient } from "../api/mockClient";

export type SessionMode = "mock" | "integrated";

export interface SessionState {
  mode: SessionMode;
  apiBaseUrl: string;
  /** Held only in memory for this session; never persisted (docs/arquitetura.md). */
  apiKey: string;
}

interface SessionContextValue extends SessionState {
  client: SonoraClient;
  setMock: () => void;
  setIntegrated: (apiBaseUrl: string, apiKey: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    mode: "mock",
    apiBaseUrl: "",
    apiKey: "",
  });

  const client = useMemo<SonoraClient>(() => {
    if (state.mode === "integrated" && state.apiBaseUrl) {
      return createHttpClient({ baseUrl: state.apiBaseUrl, apiKey: state.apiKey });
    }
    return createMockClient();
  }, [state]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      client,
      setMock: () => setState({ mode: "mock", apiBaseUrl: "", apiKey: "" }),
      setIntegrated: (apiBaseUrl: string, apiKey: string) =>
        setState({ mode: "integrated", apiBaseUrl, apiKey }),
    }),
    [state, client],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
