/** Default 1-hour lookback window ending now, matching the OpenAPI
 * constraint that `to` is exclusive and the span stays well under 31 days. */
export function lastHourWindow(now: Date = new Date()): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now.getTime() - 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
