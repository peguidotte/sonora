import React from "react";
import { Text, type TextProps } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, normalTheme } from "../theme";

type Variant = "body" | "title" | "subtitle" | "muted" | "label";

const BASE_SIZE: Record<Variant, number> = {
  title: 26,
  subtitle: 18,
  body: 16,
  label: 13,
  muted: 15,
};

const WEIGHT: Record<Variant, "400" | "600" | "700"> = {
  title: "700",
  subtitle: "600",
  body: "400",
  label: "600",
  muted: "400",
};

export function ThemedText({ variant = "body", style, ...rest }: TextProps & { variant?: Variant }) {
  const { fontScaleFactor, highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: BASE_SIZE[variant] * fontScaleFactor,
          color: variant === "muted" ? theme.muted : theme.text,
          fontWeight: WEIGHT[variant],
          letterSpacing: variant === "label" ? 0.4 : 0,
          textTransform: variant === "label" ? "uppercase" : "none",
        },
        style,
      ]}
    />
  );
}
