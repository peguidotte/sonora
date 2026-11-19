import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { ThemedText } from "../../src/components/ThemedText";
import { Card } from "../../src/components/Card";
import { Chip } from "../../src/components/Chip";
import { EmptyState, ErrorState, LoadingState, OfflineCacheBanner } from "../../src/components/QueryStates";
import { useAccessibility } from "../../src/accessibility/AccessibilityContext";
import { useSession } from "../../src/session/SessionContext";
import { useProfile } from "../../src/hooks/useProfile";
import { describeCoverage } from "../../src/domain/compare";
import { lastHourWindow } from "../../src/domain/period";
import { addFavorite, isFavorite, removeFavorite } from "../../src/storage/favorites";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme, radius, spacing } from "../../src/theme";
import type { Location, Origin } from "../../src/api/types";

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client } = useSession();
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;

  const [location, setLocation] = useState<Location | null>(null);
  const [origin, setOrigin] = useState<Origin>("simulated");
  const [favorite, setFavorite] = useState(false);
  const window = useMemo(() => lastHourWindow(), []);

  useEffect(() => {
    client.getLocation(id).then(setLocation).catch(() => setLocation(null));
    setFavorite(isFavorite(id));
  }, [client, id]);

  const { result, reload } = useProfile({ locationId: id, origin, ...window });

  function toggleFavorite() {
    if (!location) return;
    if (favorite) {
      removeFavorite(location.id);
      setFavorite(false);
    } else {
      addFavorite(location);
      setFavorite(true);
    }
  }

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title" accessibilityRole="header">
          {location?.name ?? "Location"}
        </ThemedText>
        {location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Feather name="map-pin" size={14} color={theme.muted} />
            <ThemedText variant="muted">{location.city}</ThemedText>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
        onPress={toggleFavorite}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          alignSelf: "flex-start",
          paddingHorizontal: spacing.lg,
          justifyContent: "center",
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: theme.accent,
          backgroundColor: favorite ? theme.accent : "transparent",
        }}
      >
        <Feather name="star" size={16} color={favorite ? theme.accentText : theme.accent} />
        <ThemedText style={{ color: favorite ? theme.accentText : theme.accent }}>
          {favorite ? "Favorited" : "Add to favorites"}
        </ThemedText>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label">Data origin</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Chip
            label="Simulated"
            icon="cpu"
            selected={origin === "simulated"}
            onPress={() => setOrigin("simulated")}
          />
          <Chip
            label="Public dataset"
            icon="database"
            selected={origin === "public_dataset"}
            onPress={() => setOrigin("public_dataset")}
          />
        </View>
      </View>

      {result.status === "loading" ? <LoadingState label="Loading noise profile…" /> : null}

      {result.status === "ready" ? (
        <ProfileCard laeq={result.profile.laeqDbA} coverage={describeCoverage(result.profile)} origin={result.profile.origin} theme={theme} />
      ) : null}

      {result.status === "offline-cache" ? (
        <>
          <OfflineCacheBanner fetchedAt={result.fetchedAt} />
          <ProfileCard laeq={result.profile.laeqDbA} coverage={describeCoverage(result.profile)} origin={result.profile.origin} theme={theme} />
        </>
      ) : null}

      {result.status === "auth-error" ? <ErrorState message={result.message} /> : null}
      {result.status === "error" ? <ErrorState message={result.message} onRetry={reload} /> : null}
    </ScreenContainer>
  );
}

function ProfileCard({
  laeq,
  coverage,
  origin,
  theme,
}: {
  laeq: number | null;
  coverage: string;
  origin: Origin;
  theme: typeof normalTheme;
}) {
  if (laeq === null) {
    return <EmptyState message="No observations in the requested period for this origin." />;
  }
  return (
    <Card
      accessibilityRole="text"
      accessibilityLabel={`Noise level ${laeq.toFixed(1)} decibels A, origin ${origin}, ${coverage}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Feather name="volume-2" size={22} color={theme.accent} />
        <ThemedText variant="title">{laeq.toFixed(1)} dB(A)</ThemedText>
      </View>
      <ThemedText variant="muted">Origin: {origin}</ThemedText>
      <ThemedText variant="muted">{coverage}</ThemedText>
    </Card>
  );
}
