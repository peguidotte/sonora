import type { SonoraClient } from "./client";
import {
  SonoraApiError,
  SonoraNetworkError,
  type ApiError,
  type GetProfileParams,
  type ListLocationsParams,
  type Location,
  type LocationPage,
  type Profile,
} from "./types";

export interface HttpClientConfig {
  /** Origin only (scheme/host/port). The adapter adds the contract prefix,
   * e.g. http://192.168.0.10:8080 (see docs/arquitetura.md: API_BASE_URL). */
  baseUrl: string;
  /** Kept in memory only by the caller; never persisted by this client. */
  apiKey: string;
}

const PREFIX = "/api/sonora/v1";
const REQUEST_TIMEOUT_MS = 10_000;

/** Accepts what people paste into Settings: trims, drops trailing slashes and a
 * pasted contract prefix, so `http://host:8080/api/sonora/v1/` still works. */
export function normalizeBaseUrl(value: string): string {
  let url = value.trim().replace(/\/+$/, "");
  if (url.toLowerCase().endsWith(PREFIX)) {
    url = url.slice(0, -PREFIX.length).replace(/\/+$/, "");
  }
  return url;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

async function request<T>(config: HttpClientConfig, path: string): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${normalizeBaseUrl(config.baseUrl)}${PREFIX}${path}`, {
      method: "GET",
      headers: { "X-Api-Key": config.apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    // Covers DNS failure, timeout and offline device: never retried
    // automatically (docs/disciplinas/mobile.md: "sem retry infinito").
    throw new SonoraNetworkError("Could not reach the Sonora API.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let body: ApiError = { code: "invalid_request", message: "Invalid request." };
    try {
      body = await response.json();
    } catch {
      // Keep the generic fallback above; never surface raw/HTML error bodies.
    }
    throw new SonoraApiError(response.status, body);
  }

  return (await response.json()) as T;
}

export function createHttpClient(config: HttpClientConfig): SonoraClient {
  return {
    async listLocations(params: ListLocationsParams = {}): Promise<LocationPage> {
      const query = buildQuery({
        page: params.page,
        pageSize: params.pageSize,
        latitude: params.latitude,
        longitude: params.longitude,
        radiusMeters: params.radiusMeters,
      });
      return request<LocationPage>(config, `/locations${query}`);
    },

    async getLocation(locationId: string): Promise<Location> {
      return request<Location>(config, `/locations/${encodeURIComponent(locationId)}`);
    },

    async getProfile(params: GetProfileParams): Promise<Profile> {
      const query = buildQuery({
        from: params.from,
        to: params.to,
        origin: params.origin,
        aggregation: params.aggregation,
      });
      return request<Profile>(
        config,
        `/locations/${encodeURIComponent(params.locationId)}/noise-profile${query}`,
      );
    },
  };
}
