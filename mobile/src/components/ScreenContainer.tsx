import React from "react";
import { ScrollView, View, type ViewProps } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, normalTheme } from "../theme";

export function ScreenContainer({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <View {...rest} style={style}>
        {children}
      </View>
    </ScrollView>
  );
}
