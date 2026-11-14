import type { SonoraClient } from "./client";
import type {
  GetProfileParams,
  ListLocationsParams,
  Location,
  LocationPage,
  Profile,
} from "./types";

// Synthetic fixtures mirroring contracts/fixtures/*.json shapes. Never real
// measurements; used only so the app has something to show without the C#
// API running (docs/disciplinas/mobile.md: "Mock permitido deve ser
// declarado; não é evidência de integração real").
const DEMO_LOCATIONS: Location[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Demo location A",
    city: "São Paulo",
    latitude: -23.56,
    longitude: -46.65,
    isDemo: true,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Demo location B",
    city: "São Paulo",
    latitude: -23.55,
    longitude: -46.63,
    isDemo: true,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Demo location C (no data)",
    city: "Santos",
    latitude: -23.96,
    longitude: -46.33,
    isDemo: true,
  },
];

function profileFor(locationId: string, params: GetProfileParams): Profile {
  if (locationId === "cccccccc-cccc-4ccc-8ccc-cccccccccccc") {
    return {
      locationId,
      from: params.from,
      to: params.to,
      timezone: "America/Sao_Paulo",
      origin: params.origin,
      aggregation: params.aggregation ?? "hour",
      status: "no_data",
      laeqDbA: null,
      sources: [],
      series: [],
      limitations: ["No observations in the requested period."],
    };
  }

  const laeq = locationId === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" ? 67.4 : 58.1;
  return {
    locationId,
    from: params.from,
    to: params.to,
    timezone: "America/Sao_Paulo",
    origin: params.origin,
    aggregation: params.aggregation ?? "hour",
    status: "available",
    laeqDbA: laeq,
    sources: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Shared synthetic dataset",
        sourceUrl: "https://example.invalid/fixtures",
        snapshotDate: "2026-11-08",
        license: "Synthetic project fixture",
        origin: params.origin,
        limitations: ["Not a physical sound measurement."],
      },
    ],
    series: [
      {
        producerId: "11111111-1111-4111-8111-111111111111",
        method: "wokwi_linear_demo",
        calibrationStatus: "simulated",
        bins: [
          {
            from: params.from,
            to: params.to,
            laeqDbA: laeq,
            observationCount: 2,
            sessionCount: 1,
            observedSeconds: 10,
            firstObservedAt: params.from,
            lastObservedAt: params.from,
          },
        ],
      },
    ],
    limitations: [
      "Only 10 seconds observed; this does not represent the entire hour.",
      "Synthetic values.",
    ],
  };
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function createMockClient(): SonoraClient {
  return {
    async listLocations(_params?: ListLocationsParams): Promise<LocationPage> {
      return delay({
        items: DEMO_LOCATIONS,
        page: 1,
        pageSize: 20,
        total: DEMO_LOCATIONS.length,
      });
    },

    async getLocation(locationId: string): Promise<Location> {
      const found = DEMO_LOCATIONS.find((item) => item.id === locationId);
      if (!found) {
        throw new Error(`Unknown mock locationId: ${locationId}`);
      }
      return delay(found);
    },

    async getProfile(params: GetProfileParams): Promise<Profile> {
      return delay(profileFor(params.locationId, params));
    },
  };
}
