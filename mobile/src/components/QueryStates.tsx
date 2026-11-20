import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Card } from "./Card";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme, radius, spacing } from "../theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: spacing.sm, padding: spacing.xl }}
    >
      <ActivityIndicator accessibilityLabel={label} color={theme.accent} size="large" />
      <ThemedText variant="muted">{label}</ThemedText>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <Card accessibilityRole="text" style={{ alignItems: "center" }}>
      <Feather name="volume-x" size={28} color={theme.muted} />
      <ThemedText variant="subtitle">No data</ThemedText>
      <ThemedText variant="muted" style={{ textAlign: "center" }}>
        {message}
      </ThemedText>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: spacing.lg,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: theme.danger,
        borderRadius: radius.lg,
        backgroundColor: theme.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name="alert-triangle" size={20} color={theme.danger} />
        <ThemedText variant="subtitle">Something went wrong</ThemedText>
      </View>
      <ThemedText>{message}</ThemedText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            flexDirection: "row",
            gap: spacing.xs,
            alignSelf: "flex-start",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.accent,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Feather name="refresh-cw" size={16} color={theme.accentText} />
          <ThemedText style={{ color: theme.accentText }}>Try again</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function OfflineCacheBanner({ fetchedAt }: { fetchedAt: string }) {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const formatted = new Date(fetchedAt).toLocaleString();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Offline: showing data cached on ${formatted}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Feather name="wifi-off" size={16} color={theme.muted} />
      <ThemedText variant="muted">Offline — showing cached data from {formatted}.</ThemedText>
    </View>
  );
}
