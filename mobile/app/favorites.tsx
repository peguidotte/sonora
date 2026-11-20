import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { listFavorites, removeFavorite, type FavoriteRecord } from "../src/storage/favorites";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme, spacing } from "../src/theme";

export default function FavoritesScreen() {
  const { highContrast } = useAccessibility();
  const theme = highContrast ? highContrastTheme : normalTheme;
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);

  useEffect(() => {
    setFavorites(listFavorites());
  }, []);

  function remove(locationId: string) {
    removeFavorite(locationId);
    setFavorites(listFavorites());
  }

  return (
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Feather name="star" size={24} color={theme.accent} />
          <ThemedText variant="title" accessibilityRole="header">
            Favorites
          </ThemedText>
        </View>
        <ThemedText variant="muted">
          Saved locally; persists after closing and reopening the app, with no internet required.
        </ThemedText>
      </View>

      {favorites.length === 0 ? (
        <EmptyState message="No favorites yet. Open a location and tap “Add to favorites”." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {favorites.map((favorite) => (
            <Card
              key={favorite.locationId}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <Link href={`/locations/${favorite.locationId}`} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${favorite.name}`}
                  style={{ flex: 1, gap: 2 }}
                >
                  <ThemedText variant="subtitle">{favorite.name}</ThemedText>
                  <ThemedText variant="muted">{favorite.city}</ThemedText>
                </Pressable>
              </Link>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${favorite.name} from favorites`}
                onPress={() => remove(favorite.locationId)}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  minWidth: MIN_TOUCH_TARGET,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Feather name="trash-2" size={20} color={theme.danger} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
