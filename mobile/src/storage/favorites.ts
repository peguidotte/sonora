import type { Location } from "../api/types";
import { getDatabase } from "./database";

export interface FavoriteRecord {
  locationId: string;
  name: string;
  city: string;
  addedAt: string;
}

export function listFavorites(): FavoriteRecord[] {
  const db = getDatabase();
  const rows = db.getAllSync<{
    location_id: string;
    name: string;
    city: string;
    added_at: string;
  }>("SELECT location_id, name, city, added_at FROM favorites ORDER BY added_at DESC");
  return rows.map((row) => ({
    locationId: row.location_id,
    name: row.name,
    city: row.city,
    addedAt: row.added_at,
  }));
}

export function isFavorite(locationId: string): boolean {
  const db = getDatabase();
  const row = db.getFirstSync<{ location_id: string }>(
    "SELECT location_id FROM favorites WHERE location_id = ?",
    [locationId],
  );
  return row !== null;
}

export function addFavorite(location: Location): void {
  const db = getDatabase();
  db.runSync(
    "INSERT OR REPLACE INTO favorites (location_id, name, city, added_at) VALUES (?, ?, ?, ?)",
    [location.id, location.name, location.city, new Date().toISOString()],
  );
}

export function removeFavorite(locationId: string): void {
  const db = getDatabase();
  db.runSync("DELETE FROM favorites WHERE location_id = ?", [locationId]);
}
