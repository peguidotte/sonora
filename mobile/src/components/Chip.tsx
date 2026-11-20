import React from "react";
import { Pressable, type PressableProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme, radius, spacing } from "../theme";

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  accessibilityLabel?: string;
} & Omit<PressableProps, "style" | "children">;

export function Chip({ label, selected = false, icon, accessibilityLabel, ...rest }: ChipProps) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      {...rest}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        justifyContent: "center",
        borderRadius: radius.pill,
        borderWidth: selected ? 2 : 1,
        borderColor: theme.accent,
        backgroundColor: selected ? theme.accent : theme.surface,
      }}
    >
      {icon ? (
        <Feather name={icon} size={16} color={selected ? theme.accentText : theme.accent} />
      ) : null}
      <ThemedText style={{ color: selected ? theme.accentText : theme.text, fontWeight: selected ? "700" : "400" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
