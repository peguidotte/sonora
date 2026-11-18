import type {
  GetProfileParams,
  ListLocationsParams,
  Location,
  LocationPage,
  Profile,
} from "./types";

/**
 * Adapter boundary consumed by every screen. The mock adapter and the HTTP
 * adapter both implement this shape so screens never know which one is
 * active (see docs/disciplinas/mobile.md: "trocar por URL configurável").
 */
export interface SonoraClient {
  listLocations(params?: ListLocationsParams): Promise<LocationPage>;
  getLocation(locationId: string): Promise<Location>;
  getProfile(params: GetProfileParams): Promise<Profile>;
}
