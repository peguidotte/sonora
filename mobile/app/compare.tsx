import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { Card } from "../src/components/Card";
import { Chip } from "../src/components/Chip";
import { EmptyState, ErrorState, LoadingState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { describeCoverage, findComparisonMismatches } from "../src/domain/compare";
import { lastHourWindow } from "../src/domain/period";
import { highContrastTheme, normalTheme, spacing } from "../src/theme";
import type { Location, Origin, Profile } from "../src/api/types";

type Slot = { location: Location | null; profile: Profile | null; error: string | null };

export default function CompareScreen() {
  const { client } = useSession();
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const window = useMemo(() => lastHourWindow(), []);
  const origin: Origin = "simulated";

  const [locations, setLocations] = useState<Location[] | null>(null);
  const [left, setLeft] = useState<Slot>({ location: null, profile: null, error: null });
  const [right, setRight] = useState<Slot>({ location: null, profile: null, error: null });

  useEffect(() => {
    client.listLocations().then((page) => setLocations(page.items));
  }, [client]);

  async function pick(side: "left" | "right", location: Location) {
    const setSlot = side === "left" ? setLeft : setRight;
    setSlot({ location, profile: null, error: null });
    try {
      const profile = await client.getProfile({ locationId: location.id, origin, ...window });
      setSlot({ location, profile, error: null });
    } catch {
      setSlot({ location, profile: null, error: "Could not load this location's profile." });
    }
  }

  if (!locations) return <LoadingState label="Loading locations…" />;

  const mismatches =
    left.profile && right.profile ? findComparisonMismatches(left.profile, right.profile) : [];

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Feather name="bar-chart-2" size={24} color={theme.accent} />
          <ThemedText variant="title" accessibilityRole="header">
            Compare two locations
          </ThemedText>
        </View>
        <ThemedText variant="muted">
          Same period, origin and method; this never ranks overall comfort.
        </ThemedText>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <Picker label="Location A" locations={locations} selected={left.location} onPick={(l) => pick("left", l)} />
        <Picker label="Location B" locations={locations} selected={right.location} onPick={(l) => pick("right", l)} />
      </View>

      {left.error ? <ErrorState message={left.error} /> : null}
      {right.error ? <ErrorState message={right.error} /> : null}

      {left.profile && right.profile ? (
        mismatches.length > 0 ? (
          <EmptyState
            message={`Not directly comparable: ${mismatches.map((m) => m.message).join(" ")}`}
          />
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <SideCard title={left.location!.name} profile={left.profile} theme={theme} />
            <SideCard title={right.location!.name} profile={right.profile} theme={theme} />
          </View>
        )
      ) : null}
    </ScreenContainer>
  );
}

function Picker({
  label,
  locations,
  selected,
  onPick,
}: {
  label: string;
  locations: Location[];
  selected: Location | null;
  onPick: (location: Location) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <ThemedText variant="label">{label}</ThemedText>
      <View style={{ gap: spacing.xs }}>
        {locations.map((location) => (
          <Chip
            key={location.id}
            label={location.name}
            selected={selected?.id === location.id}
            accessibilityLabel={`Select ${location.name} as ${label}`}
            onPress={() => onPick(location)}
          />
        ))}
      </View>
    </View>
  );
}

function SideCard({ title, profile, theme }: { title: string; profile: Profile; theme: typeof normalTheme }) {
  return (
    <Card style={{ flex: 1 }}>
      <ThemedText variant="subtitle">{title}</ThemedText>
      {profile.laeqDbA === null ? (
        <ThemedText variant="muted">No data</ThemedText>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Feather name="volume-2" size={18} color={theme.accent} />
          <ThemedText variant="subtitle">{profile.laeqDbA.toFixed(1)} dB(A)</ThemedText>
        </View>
      )}
      <ThemedText variant="muted">{describeCoverage(profile)}</ThemedText>
    </Card>
  );
}
