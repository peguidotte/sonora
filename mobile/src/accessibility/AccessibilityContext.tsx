import React, { createContext, useContext, useMemo, useState } from "react";

export type FontScale = "normal" | "large" | "extraLarge";

const FONT_SCALE_FACTORS: Record<FontScale, number> = {
  normal: 1,
  large: 1.25,
  extraLarge: 1.5,
};

interface AccessibilityState {
  fontScale: FontScale;
  highContrast: boolean;
}

interface AccessibilityContextValue extends AccessibilityState {
  fontScaleFactor: number;
  setFontScale: (scale: FontScale) => void;
  toggleHighContrast: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>({
    fontScale: "normal",
    highContrast: false,
  });

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      fontScaleFactor: FONT_SCALE_FACTORS[state.fontScale],
      setFontScale: (scale) => setState((prev) => ({ ...prev, fontScale: scale })),
      toggleHighContrast: () =>
        setState((prev) => ({ ...prev, highContrast: !prev.highContrast })),
    }),
    [state],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
