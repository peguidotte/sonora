import React from "react";
import { View, type ViewProps } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { cardShadow, highContrastTheme, normalTheme, radius, spacing } from "../theme";

export function Card({ style, children, ...rest }: ViewProps & { children: React.ReactNode }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        highContrast ? null : cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}
