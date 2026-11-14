import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { ThemedText } from "../../src/components/ThemedText";
import { EmptyState, ErrorState, LoadingState, OfflineCacheBanner } from "../../src/components/QueryStates";
import { useAccessibility } from "../../src/accessibility/AccessibilityContext";
import { useSession } from "../../src/session/SessionContext";
import { useProfile } from "../../src/hooks/useProfile";
import { describeCoverage } from "../../src/domain/compare";
import { lastHourWindow } from "../../src/domain/period";
import { addFavorite, isFavorite, removeFavorite } from "../../src/storage/favorites";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../../src/theme";
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
      <ThemedText variant="title" accessibilityRole="header">
        {location?.name ?? "Location"}
      </ThemedText>
      {location ? <ThemedText variant="muted">{location.city}</ThemedText> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
        onPress={toggleFavorite}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          alignSelf: "flex-start",
          paddingHorizontal: 16,
          justifyContent: "center",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.accent,
        }}
      >
        <ThemedText>{favorite ? "★ Favorited" : "☆ Add to favorites"}</ThemedText>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <OriginButton label="Simulated" active={origin === "simulated"} onPress={() => setOrigin("simulated")} theme={theme} />
        <OriginButton label="Public dataset" active={origin === "public_dataset"} onPress={() => setOrigin("public_dataset")} theme={theme} />
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

function OriginButton({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: typeof normalTheme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: active ? 2 : 1,
        borderColor: theme.accent,
        backgroundColor: active ? theme.accent : theme.surface,
      }}
    >
      <ThemedText style={{ color: active ? "#FFFFFF" : undefined }}>{label}</ThemedText>
    </Pressable>
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
    <View
      accessibilityRole="text"
      accessibilityLabel={`Noise level ${laeq.toFixed(1)} decibels A, origin ${origin}, ${coverage}`}
      style={{ padding: 16, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 4 }}
    >
      <ThemedText variant="title">{laeq.toFixed(1)} dB(A)</ThemedText>
      <ThemedText variant="muted">Origin: {origin}</ThemedText>
      <ThemedText variant="muted">{coverage}</ThemedText>
    </View>
  );
}
