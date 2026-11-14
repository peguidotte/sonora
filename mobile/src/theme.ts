export interface Theme {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  danger: string;
}

export const normalTheme: Theme = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  text: "#1B1F24",
  muted: "#4B5563",
  accent: "#1E5AA8",
  border: "#D0D5DD",
  danger: "#B42318",
};

// WCAG AA+ contrast pairs; never the only signal for state (also uses icons/text).
export const highContrastTheme: Theme = {
  background: "#000000",
  surface: "#0A0A0A",
  text: "#FFFFFF",
  muted: "#E2E2E2",
  accent: "#66B2FF",
  border: "#FFFFFF",
  danger: "#FF6B5E",
};

export const MIN_TOUCH_TARGET = 48;
