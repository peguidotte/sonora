import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { useAccessibility } from "../accessibility/AccessibilityContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ gap: 8, padding: 16 }}>
      <ActivityIndicator accessibilityLabel={label} />
      <ThemedText variant="muted">{label}</ThemedText>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View accessibilityRole="text" style={{ padding: 16, gap: 4 }}>
      <ThemedText variant="title">No data</ThemedText>
      <ThemedText variant="muted">{message}</ThemedText>
    </View>
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
      style={{ padding: 16, gap: 8, borderWidth: 1, borderColor: theme.danger, borderRadius: 8 }}
    >
      <ThemedText variant="title">Something went wrong</ThemedText>
      <ThemedText>{message}</ThemedText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.accent,
            borderRadius: 8,
            paddingHorizontal: 16,
          }}
        >
          <ThemedText style={{ color: "#FFFFFF" }}>Try again</ThemedText>
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
        padding: 12,
        borderRadius: 8,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <ThemedText variant="muted">Offline — showing cached data from {formatted}.</ThemedText>
    </View>
  );
}
