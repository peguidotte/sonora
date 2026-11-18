// Mirrors contracts/openapi/csharp.openapi.json (version 0.4.0). Do not rename
// fields: they must stay camelCase and match the published contract exactly.

export type Origin = "simulated" | "public_dataset";
export type Aggregation = "hour" | "day";
export type ProfileStatus = "available" | "no_data";
export type CalibrationStatus = "unknown" | "simulated" | "documented";

export interface Location {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  isDemo: boolean;
}

export interface LocationPage {
  items: Location[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProfileSource {
  id: string;
  name: string;
  sourceUrl: string;
  snapshotDate: string;
  license: string;
  origin: Origin;
  limitations: string[];
}

export interface ProfileBin {
  from: string;
  to: string;
  laeqDbA: number;
  observationCount: number;
  sessionCount: number;
  observedSeconds: number;
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface ProfileSeries {
  producerId: string;
  method: string;
  calibrationStatus: CalibrationStatus;
  bins: ProfileBin[];
}

export interface Profile {
  locationId: string;
  from: string;
  to: string;
  timezone: string;
  origin: Origin;
  aggregation: Aggregation;
  status: ProfileStatus;
  laeqDbA: number | null;
  sources: ProfileSource[];
  series: ProfileSeries[];
  limitations: string[];
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ListLocationsParams {
  page?: number;
  pageSize?: number;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface GetProfileParams {
  locationId: string;
  from: string;
  to: string;
  origin: Origin;
  aggregation?: Aggregation;
}

/** Thrown by a client when the API answers with a structured error payload. */
export class SonoraApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.status = status;
    this.code = body.code;
  }
}

/** Thrown when the client cannot reach the API at all (offline, DNS, timeout). */
export class SonoraNetworkError extends Error {}
