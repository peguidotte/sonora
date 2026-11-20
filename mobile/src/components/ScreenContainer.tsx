import React from "react";
import { ScrollView, View, type ViewProps } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, normalTheme, spacing } from "../theme";

export function ScreenContainer({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, flexGrow: 1 }}
    >
      <View {...rest} style={[{ gap: spacing.lg }, style]}>
        {children}
      </View>
    </ScrollView>
  );
}
