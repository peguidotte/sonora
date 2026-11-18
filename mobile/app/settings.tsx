import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { useAccessibility, type FontScale } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../src/theme";

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
      <ThemedText variant="title" accessibilityRole="header">
        Settings
      </ThemedText>

      <ThemedText variant="title">API source</ThemedText>
      <ThemedText variant="muted">
        The key is kept in memory for this session only — never saved to the bundle, logs or
        local storage.
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use local mock data"
        accessibilityState={{ selected: session.mode === "mock" }}
        onPress={session.setMock}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: "center",
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: session.mode === "mock" ? 2 : 1,
          borderColor: theme.accent,
        }}
      >
        <ThemedText>Use local mock data</ThemedText>
      </Pressable>

      <ThemedText>API base URL</ThemedText>
      <TextInput
        accessibilityLabel="API base URL"
        placeholder="https://sonora.example.org"
        autoCapitalize="none"
        autoCorrect={false}
        value={apiBaseUrl}
        onChangeText={setApiBaseUrl}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          color: theme.text,
        }}
      />

      <ThemedText>API key (session only)</ThemedText>
      <TextInput
        accessibilityLabel="API key, kept only for this session"
        placeholder="X-Api-Key value"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={apiKey}
        onChangeText={setApiKey}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          color: theme.text,
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connect to this API"
        onPress={connect}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
          backgroundColor: theme.accent,
        }}
      >
        <ThemedText style={{ color: "#FFFFFF" }}>Connect</ThemedText>
      </Pressable>

      <ThemedText variant="title">Accessibility</ThemedText>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {FONT_SCALES.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`Font size: ${option.label}`}
            accessibilityState={{ selected: fontScale === option.value }}
            onPress={() => setFontScale(option.value)}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: 12,
              justifyContent: "center",
              borderRadius: 8,
              borderWidth: fontScale === option.value ? 2 : 1,
              borderColor: theme.accent,
              backgroundColor: fontScale === option.value ? theme.accent : theme.surface,
            }}
          >
            <ThemedText style={{ color: fontScale === option.value ? "#FFFFFF" : undefined }}>
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="High contrast theme"
        accessibilityState={{ checked: highContrast }}
        onPress={toggleHighContrast}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          justifyContent: "center",
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.accent,
        }}
      >
        <ThemedText>High contrast: {highContrast ? "on" : "off"}</ThemedText>
      </Pressable>
    </ScreenContainer>
  );
}
