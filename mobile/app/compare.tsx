import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { EmptyState, ErrorState, LoadingState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { useSession } from "../src/session/SessionContext";
import { describeCoverage, findComparisonMismatches } from "../src/domain/compare";
import { lastHourWindow } from "../src/domain/period";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../src/theme";
import type { Location, Origin, Profile } from "../src/api/types";

type Slot = { location: Location | null; profile: Profile | null; error: string | null };

export default function CompareScreen() {
  const { client } = useSession();
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const window = useMemo(() => lastHourWindow(), []);
  const origin: Origin = "simulated";

  const [locations, setLocations] = useState<Location[] | null>(null);
  const [listError, setListError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [left, setLeft] = useState<Slot>({ location: null, profile: null, error: null });
  const [right, setRight] = useState<Slot>({ location: null, profile: null, error: null });

  useEffect(() => {
    let active = true;
    setListError(false);
    setLocations(null);
    client.listLocations()
      .then((page) => { if (active) setLocations(page.items); })
      .catch(() => { if (active) setListError(true); });
    return () => { active = false; };
  }, [client, attempt]);

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

  if (listError) return <ErrorState message="Could not load locations." onRetry={() => setAttempt((previous) => previous + 1)} />;
  if (!locations) return <LoadingState label="Loading locations…" />;

  const mismatches =
    left.profile && right.profile ? findComparisonMismatches(left.profile, right.profile) : [];

  return (
    <ScreenContainer>
      <ThemedText variant="title" accessibilityRole="header">
        Compare two locations
      </ThemedText>
      <ThemedText variant="muted">
        Same period, origin and method; this never ranks overall comfort.
      </ThemedText>

      <View style={{ flexDirection: "row", gap: 16 }}>
        <Picker label="Location A" locations={locations} selected={left.location} onPick={(l) => pick("left", l)} theme={theme} />
        <Picker label="Location B" locations={locations} selected={right.location} onPick={(l) => pick("right", l)} theme={theme} />
      </View>

      {left.error ? <ErrorState message={left.error} /> : null}
      {right.error ? <ErrorState message={right.error} /> : null}

      {left.profile && right.profile ? (
        mismatches.length > 0 ? (
          <EmptyState
            message={`Not directly comparable: ${mismatches.map((m) => m.message).join(" ")}`}
          />
        ) : (
          <View style={{ flexDirection: "row", gap: 16 }}>
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
  theme,
}: {
  label: string;
  locations: Location[];
  selected: Location | null;
  onPick: (location: Location) => void;
  theme: typeof normalTheme;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <ThemedText variant="muted">{label}</ThemedText>
      {locations.map((location) => (
        <Pressable
          key={location.id}
          accessibilityRole="button"
          accessibilityLabel={`Select ${location.name} as ${label}`}
          accessibilityState={{ selected: selected?.id === location.id }}
          onPress={() => onPick(location)}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            justifyContent: "center",
            paddingHorizontal: 8,
            borderRadius: 6,
            borderWidth: selected?.id === location.id ? 2 : 1,
            borderColor: theme.accent,
            backgroundColor: selected?.id === location.id ? theme.accent : theme.surface,
          }}
        >
          <ThemedText style={{ color: selected?.id === location.id ? "#FFFFFF" : undefined }}>
            {location.name}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function SideCard({ title, profile, theme }: { title: string; profile: Profile; theme: typeof normalTheme }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
      <ThemedText variant="title">{title}</ThemedText>
      {profile.laeqDbA === null ? (
        <ThemedText variant="muted">No data</ThemedText>
      ) : (
        <ThemedText>{profile.laeqDbA.toFixed(1)} dB(A)</ThemedText>
      )}
      <ThemedText variant="muted">{describeCoverage(profile)}</ThemedText>
    </View>
  );
}
