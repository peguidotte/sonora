export interface Theme {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  danger: string;
  success: string;
}

export const normalTheme: Theme = {
  background: "#EEF2FB",
  surface: "#FFFFFF",
  surfaceAlt: "#E3ECFC",
  text: "#121826",
  muted: "#5B6474",
  accent: "#2F5FD9",
  accentText: "#FFFFFF",
  border: "#D7DEEA",
  danger: "#B42318",
  success: "#15803D",
};

// WCAG AA+ contrast pairs; never the only signal for state (also uses icons/text).
export const highContrastTheme: Theme = {
  background: "#000000",
  surface: "#0A0A0A",
  surfaceAlt: "#1A1A1A",
  text: "#FFFFFF",
  muted: "#E2E2E2",
  accent: "#66B2FF",
  accentText: "#000000",
  border: "#FFFFFF",
  danger: "#FF6B5E",
  success: "#5FE08A",
};

export const MIN_TOUCH_TARGET = 48;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const cardShadow = {
  shadowColor: "#0B1A3B",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 2,
};
