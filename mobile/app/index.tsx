import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { ErrorState, LoadingState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { highContrastTheme, normalTheme, spacing } from "../src/theme";
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
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Feather name="radio" size={26} color={theme.accent} />
          <ThemedText variant="title" accessibilityRole="header">
            Sonora
          </ThemedText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            alignSelf: "flex-start",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs / 2,
            borderRadius: 999,
            backgroundColor: theme.surfaceAlt,
          }}
        >
          <Feather name={mode === "mock" ? "cpu" : "wifi"} size={14} color={theme.muted} />
          <ThemedText variant="muted">
            {mode === "mock" ? "Local mock data" : "Integrated with configured API"}
          </ThemedText>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        <Chip label="Favorites" icon="star" onPress={() => router.push("/favorites")} />
        <Chip label="Compare" icon="bar-chart-2" onPress={() => router.push("/compare")} />
        <Chip label="Settings" icon="settings" onPress={() => router.push("/settings")} />
      </View>

      {state.status === "loading" ? <LoadingState label="Loading locations…" /> : null}
      {state.status === "error" ? <ErrorState message={state.message} /> : null}
      {state.status === "ready" ? (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label">Monitored locations</ThemedText>
          <FlatList
            data={state.items}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <Link href={`/locations/${item.id}`} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}, ${item.city}`}>
                  <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ gap: 2 }}>
                      <ThemedText variant="subtitle">{item.name}</ThemedText>
                      <ThemedText variant="muted">{item.city}</ThemedText>
                    </View>
                    <Feather name="chevron-right" size={20} color={theme.muted} />
                  </Card>
                </Pressable>
              </Link>
            )}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
