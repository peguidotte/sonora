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
    `INSERT OR REPLACE INTO profile_cache
      (location_id, origin, from_ts, to_ts, aggregation, payload, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [locationId, origin, from, to, aggregation, JSON.stringify(profile), new Date().toISOString()],
  );
}

export function loadProfileCache(params: GetProfileParams): CachedProfile | null {
  const db = getDatabase();
  const [locationId, origin, from, to, aggregation] = key(params);
  const row = db.getFirstSync<{ payload: string; fetched_at: string }>(
    `SELECT payload, fetched_at FROM profile_cache
      WHERE location_id = ? AND origin = ? AND from_ts = ? AND to_ts = ? AND aggregation = ?`,
    [locationId, origin, from, to, aggregation],
  );
  if (!row) return null;
  return { profile: JSON.parse(row.payload) as Profile, fetchedAt: row.fetched_at };
}
