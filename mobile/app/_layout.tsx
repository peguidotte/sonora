import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AccessibilityProvider } from "../src/accessibility/AccessibilityContext";
import { SessionProvider } from "../src/session/SessionContext";

export default function RootLayout() {
  return (
    <SessionProvider>
      <AccessibilityProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ title: "Sonora" }} />
          <Stack.Screen name="locations/[id]" options={{ title: "Location" }} />
          <Stack.Screen name="compare" options={{ title: "Compare" }} />
          <Stack.Screen name="favorites" options={{ title: "Favorites" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
      </AccessibilityProvider>
    </SessionProvider>
  );
}
