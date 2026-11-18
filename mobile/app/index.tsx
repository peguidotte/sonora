import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { ErrorState, LoadingState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../src/theme";
import type { Location } from "../src/api/types";

type State =
  | { status: "loading" }
  | { status: "ready"; items: Location[] }
  | { status: "error"; message: string };

export default function LocationsScreen() {
  const { client, mode } = useSession();
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    client
      .listLocations()
      .then((page) => {
        if (active) setState({ status: "ready", items: page.items });
      })
      .catch(() => {
        if (active) setState({ status: "error", message: "Could not load locations." });
      });
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <ScreenContainer>
      <ThemedText variant="title" accessibilityRole="header">
        Sonora
      </ThemedText>
      <ThemedText variant="muted">
        Mode: {mode === "mock" ? "Local mock data" : "Integrated with configured API"}
      </ThemedText>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <NavButton label="Favorites" onPress={() => router.push("/favorites")} theme={theme} />
        <NavButton label="Compare" onPress={() => router.push("/compare")} theme={theme} />
        <NavButton label="Settings" onPress={() => router.push("/settings")} theme={theme} />
      </View>

      {state.status === "loading" ? <LoadingState label="Loading locations…" /> : null}
      {state.status === "error" ? <ErrorState message={state.message} /> : null}
      {state.status === "ready" ? (
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Link href={`/locations/${item.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}, ${item.city}`}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  marginBottom: 8,
                }}
              >
                <ThemedText>{item.name}</ThemedText>
                <ThemedText variant="muted">{item.city}</ThemedText>
              </Pressable>
            </Link>
          )}
        />
      ) : null}
    </ScreenContainer>
  );
}

function NavButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: typeof normalTheme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderRadius: 8,
        backgroundColor: theme.accent,
      }}
    >
      <ThemedText style={{ color: "#FFFFFF" }}>{label}</ThemedText>
    </Pressable>
  );
}
