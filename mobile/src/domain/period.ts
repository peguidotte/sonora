/** Default 1-hour lookback window ending now, matching the OpenAPI
 * constraint that `to` is exclusive and the span stays well under 31 days.
 * Timestamps are whole-second UTC ending in Z (yyyy-MM-ddTHH:mm:ssZ), the form
 * the C# API documents for `from`/`to`. */
export function lastHourWindow(now: Date = new Date()): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now.getTime() - 60 * 60 * 1000);
  return { from: toUtcSeconds(from), to: toUtcSeconds(to) };
}

function toUtcSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
