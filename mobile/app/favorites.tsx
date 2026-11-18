import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { ThemedText } from "../src/components/ThemedText";
import { EmptyState } from "../src/components/QueryStates";
import { useAccessibility } from "../src/accessibility/AccessibilityContext";
import { listFavorites, removeFavorite, type FavoriteRecord } from "../src/storage/favorites";
import { highContrastTheme, MIN_TOUCH_TARGET, normalTheme } from "../src/theme";

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
      <ThemedText variant="title" accessibilityRole="header">
        Favorites
      </ThemedText>
      <ThemedText variant="muted">
        Saved locally; persists after closing and reopening the app, with no internet required.
      </ThemedText>

      {favorites.length === 0 ? (
        <EmptyState message="No favorites yet. Open a location and tap “Add to favorites”." />
      ) : (
        favorites.map((favorite) => (
          <View
            key={favorite.locationId}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <Link href={`/locations/${favorite.locationId}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${favorite.name}`}>
                <ThemedText>{favorite.name}</ThemedText>
                <ThemedText variant="muted">{favorite.city}</ThemedText>
              </Pressable>
            </Link>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${favorite.name} from favorites`}
              onPress={() => remove(favorite.locationId)}
              style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, justifyContent: "center", alignItems: "center" }}
            >
              <ThemedText style={{ color: theme.danger }}>Remove</ThemedText>
            </Pressable>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}
