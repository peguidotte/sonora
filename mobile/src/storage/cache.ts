import type { GetProfileParams, Profile } from "../api/types";
import { getDatabase } from "./database";

export interface CachedProfile {
  profile: Profile;
  fetchedAt: string;
}

function key(params: GetProfileParams) {
  return [params.locationId, params.origin, params.from, params.to, params.aggregation ?? "hour"] as const;
}

export function saveProfileCache(params: GetProfileParams, profile: Profile): void {
  const db = getDatabase();
  const [locationId, origin, from, to, aggregation] = key(params);
  db.runSync(
    `INSERT OR REPLACE INTO integrated_profile_cache
      (location_id, origin, from_ts, to_ts, aggregation, payload, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [locationId, origin, from, to, aggregation, JSON.stringify(profile), new Date().toISOString()],
  );
}

export function loadLatestProfile(locationId: string, origin: GetProfileParams["origin"]): CachedProfile | null {
  const row = getDatabase().getFirstSync<{ payload: string; fetched_at: string }>(
    `SELECT payload, fetched_at FROM integrated_profile_cache
      WHERE location_id = ? AND origin = ?
      ORDER BY fetched_at DESC LIMIT 1`,
    [locationId, origin],
  );
  return row ? { profile: JSON.parse(row.payload) as Profile, fetchedAt: row.fetched_at } : null;
}
