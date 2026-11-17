import { createHttpClient, normalizeBaseUrl } from "./httpClient";
import { SonoraApiError, SonoraNetworkError } from "./types";

describe("normalizeBaseUrl", () => {
  it.each([
    ["http://10.0.2.2:4010", "http://10.0.2.2:4010"],
    ["  http://10.0.2.2:4010/  ", "http://10.0.2.2:4010"],
    ["http://host:8080/api/sonora/v1", "http://host:8080"],
    ["http://host:8080/api/sonora/v1/", "http://host:8080"],
    ["https://sonora.example.org/base/api/sonora/v1", "https://sonora.example.org/base"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });
});

describe("createHttpClient (fetch stubbed)", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  function respond(status: number, body: unknown) {
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const client = createHttpClient({ baseUrl: "http://host:4010/", apiKey: "k" });

  it("lists locations on the contract path with the API key header", async () => {
    respond(200, { items: [], page: 1, pageSize: 20, total: 0 });
    await client.listLocations({ latitude: -23.56, longitude: -46.65, radiusMeters: 500 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://host:4010/api/sonora/v1/locations?latitude=-23.56&longitude=-46.65&radiusMeters=500",
    );
    expect(init.method).toBe("GET");
    expect(init.headers["X-Api-Key"]).toBe("k");
  });

  it("omits the query string when no filter is given", async () => {
    respond(200, { items: [], page: 1, pageSize: 20, total: 0 });
    await client.listLocations();
    expect(fetchMock.mock.calls[0][0]).toBe("http://host:4010/api/sonora/v1/locations");
  });

  it("requests the noise profile with from/to/origin/aggregation", async () => {
    respond(200, {});
    await client.getProfile({
      locationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      from: "2026-11-08T12:00:00Z",
      to: "2026-11-08T13:00:00Z",
      origin: "simulated",
      aggregation: "hour",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://host:4010/api/sonora/v1/locations/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/noise-profile" +
        "?from=2026-11-08T12%3A00%3A00Z&to=2026-11-08T13%3A00%3A00Z&origin=simulated&aggregation=hour",
    );
  });

  it("turns structured API errors into SonoraApiError without retrying", async () => {
    respond(403, { code: "forbidden", message: "API key lacks the required scope." });
    await expect(client.getLocation("x")).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
    await expect(client.getLocation("x")).rejects.toBeInstanceOf(SonoraApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // one call per attempt, no automatic retry
  });

  it("falls back to a generic error when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("<html>");
      },
    });
    await expect(client.getLocation("x")).rejects.toMatchObject({
      status: 502,
      code: "invalid_request",
    });
  });

  it("maps connection failures to SonoraNetworkError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(client.getLocation("x")).rejects.toBeInstanceOf(SonoraNetworkError);
  });
});
