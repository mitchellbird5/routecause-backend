export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TimeHM {
  hours: number;
  minutes: number;
}

export interface OsrmResult {
  distance_km: number;
  duration_min: number;
}

export type GeocodeAddressFn = (address: string) => Promise<Coordinates>;

export type QueryOsrmFn = (
  start: Coordinates,
  end: Coordinates
) => Promise<OsrmResult>;
