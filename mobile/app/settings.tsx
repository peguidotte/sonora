import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { useAccessibility, type FontScale } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme, radius, spacing } from "../src/theme";

const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "extraLarge", label: "Extra large" },
];

export default function SettingsScreen() {
  const session = useSession();
  const { fontScale, setFontScale, highContrast, toggleHighContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  const [apiBaseUrl, setApiBaseUrl] = useState(session.apiBaseUrl);
  const [apiKey, setApiKey] = useState("");

  function connect() {
    if (!apiBaseUrl.trim()) return;
    session.setIntegrated(apiBaseUrl.trim(), apiKey);
  }

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name="settings" size={24} color={theme.accent} />
        <ThemedText variant="title" accessibilityRole="header">
          Settings
        </ThemedText>
      </View>

      <Card>
        <ThemedText variant="subtitle">API source</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <Feather name="shield" size={14} color={theme.muted} style={{ marginTop: 2 }} />
          <ThemedText variant="muted" style={{ flex: 1 }}>
            The key is kept in memory for this session only — never saved to the bundle, logs or
            local storage.
          </ThemedText>
        </View>

        <Chip
          label="Use local mock data"
          icon="cpu"
          selected={session.mode === "mock"}
          onPress={session.setMock}
        />

        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label">API base URL</ThemedText>
          <TextInput
            accessibilityLabel="API base URL"
            placeholder="https://sonora.example.org"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            value={apiBaseUrl}
            onChangeText={setApiBaseUrl}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              color: theme.text,
              backgroundColor: theme.background,
            }}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label">API key (session only)</ThemedText>
          <TextInput
            accessibilityLabel="API key, kept only for this session"
            placeholder="X-Api-Key value"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={apiKey}
            onChangeText={setApiKey}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              color: theme.text,
              backgroundColor: theme.background,
            }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect to this API"
          onPress={connect}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            flexDirection: "row",
            gap: spacing.xs,
            justifyContent: "center",
            alignItems: "center",
            borderRadius: radius.md,
            backgroundColor: theme.accent,
          }}
        >
          <Feather name="link" size={16} color={theme.accentText} />
          <ThemedText style={{ color: theme.accentText, fontWeight: "700" }}>Connect</ThemedText>
        </Pressable>
      </Card>

      <Card>
        <ThemedText variant="subtitle">Accessibility</ThemedText>

        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label">Font size</ThemedText>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            {FONT_SCALES.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={fontScale === option.value}
                accessibilityLabel={`Font size: ${option.label}`}
                onPress={() => setFontScale(option.value)}
              />
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="High contrast theme"
          accessibilityState={{ checked: highContrast }}
          onPress={toggleHighContrast}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.accent,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Feather name="eye" size={18} color={theme.accent} />
            <ThemedText>High contrast theme</ThemedText>
          </View>
          <Feather
            name={highContrast ? "toggle-right" : "toggle-left"}
            size={28}
            color={theme.accent}
          />
        </Pressable>
      </Card>
    </ScreenContainer>
  );
}
