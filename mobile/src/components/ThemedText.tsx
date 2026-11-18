import React from "react";
import { Text, type TextProps } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, normalTheme } from "../theme";

type Variant = "body" | "title" | "muted";

export function ThemedText({ variant = "body", style, ...rest }: TextProps & { variant?: Variant }) {
  const { fontScaleFactor, highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const baseSize = variant === "title" ? 22 : 16;

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: baseSize * fontScaleFactor,
          color: variant === "muted" ? theme.muted : theme.text,
          fontWeight: variant === "title" ? "700" : "400",
        },
        style,
      ]}
    />
  );
}
