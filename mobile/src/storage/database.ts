import * as SQLite from "expo-sqlite";

// Local-only persistence (docs/arquitetura.md: "SQLite é usado somente no
// Mobile para favoritos/cache"). Never store the API key or any secret here.
const db = SQLite.openDatabaseSync("sonora.db");

let migrated = false;

export function ensureSchema(): void {
  if (migrated) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS favorites (
      location_id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      added_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_cache (
      location_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      from_ts TEXT NOT NULL,
      to_ts TEXT NOT NULL,
      aggregation TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (location_id, origin, from_ts, to_ts, aggregation)
    );
  `);
  migrated = true;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  ensureSchema();
  return db;
}
