import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AccessibilityProvider, useAccessibility } from "../src/accessibility/AccessibilityContext";
import { SessionProvider } from "../src/session/SessionContext";
import { highContrastTheme, normalTheme } from "../src/theme";

function ThemedStack() {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  return (
    <>
      <StatusBar style={highContrast ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.accent,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Sonora" }} />
        <Stack.Screen name="locations/[id]" options={{ title: "Location" }} />
        <Stack.Screen name="compare" options={{ title: "Compare" }} />
        <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AccessibilityProvider>
        <ThemedStack />
      </AccessibilityProvider>
    </SessionProvider>
  );
}
