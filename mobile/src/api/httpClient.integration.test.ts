import { lastHourWindow } from "../domain/period";
import { createHttpClient } from "./httpClient";
import { SonoraApiError } from "./types";

// Opt-in: runs against any server that speaks contracts/openapi/csharp.openapi.json,
// either the static contract mock or the real C# API. Skipped when unset.
//
//   SONORA_API_URL=http://127.0.0.1:4010 SONORA_API_KEY=mock-consumer-key npx jest integration
const baseUrl = process.env.SONORA_API_URL;
const apiKey = process.env.SONORA_API_KEY ?? "";
const suite = baseUrl ? describe : describe.skip;

suite("HTTP client against a live Sonora API", () => {
  const client = createHttpClient({ baseUrl: baseUrl ?? "", apiKey });

  it("lists locations in the LocationPage shape", async () => {
    const page = await client.listLocations();
    expect(page.page).toBeGreaterThanOrEqual(1);
    expect(page.total).toBeGreaterThanOrEqual(page.items.length);
    for (const item of page.items) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          city: expect.any(String),
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          isDemo: expect.any(Boolean),
        }),
      );
    }
  });

  it("reads one location and its noise profile for the last hour", async () => {
    const { items } = await client.listLocations();
    if (items.length === 0) return; // nothing seeded yet; nothing to read
    const location = await client.getLocation(items[0].id);
    expect(location.id).toBe(items[0].id);

    const profile = await client.getProfile({
      locationId: location.id,
      origin: "simulated",
      ...lastHourWindow(),
    });
    expect(profile.origin).toBe("simulated");
    expect(["available", "no_data"]).toContain(profile.status);
    if (profile.status === "no_data") {
      expect(profile.laeqDbA).toBeNull();
      expect(profile.series).toEqual([]);
    }
  });

  it("rejects an inverted window with the contract error", async () => {
    const { from, to } = lastHourWindow();
    const { items } = await client.listLocations();
    if (items.length === 0) return;
    await expect(
      client.getProfile({ locationId: items[0].id, origin: "simulated", from: to, to: from }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_window" });
  });

  it("answers 401 for an unknown key", async () => {
    const bad = createHttpClient({ baseUrl: baseUrl ?? "", apiKey: "not-a-valid-key" });
    await expect(bad.listLocations()).rejects.toBeInstanceOf(SonoraApiError);
    await expect(bad.listLocations()).rejects.toMatchObject({ status: 401 });
  });
});
