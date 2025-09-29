export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TimeHM {
  hours: number;
  minutes: number;
}

export type OsrmRoute = [number, number][]

export interface OsrmResult {
  distance_km: number;
  duration_min: number;
  route?: OsrmRoute
}

export type geocodeAddressFn = (address: string) => Promise<Coordinates>;

export enum OsrmOverview {
  FALSE = "false",
  FULL = "full",
}

export type queryOsrmFn = (
  start: Coordinates,
  end: Coordinates,
  overview: OsrmOverview
) => Promise<OsrmResult>;

export type getOsrmRouteFn = (
  startAddress: string,
  endAddress: string,
  deps: { geocodeAddress: geocodeAddressFn; queryOsrm: queryOsrmFn },
  overview: OsrmOverview
) => Promise<OsrmResult>;

export type convertMinutesFn = (minutes: number) => TimeHM;