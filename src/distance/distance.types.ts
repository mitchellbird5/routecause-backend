export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TimeHM {
  hours: number;
  minutes: number;
}

export type RouteCoordinates = [number, number][]

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  route?: RouteCoordinates
}

export type geocodeAddressFn = (
  address: string
) => Promise<Coordinates>;

export interface AddressCoordinates {
  address: string;
  coordinates: Coordinates
}

export type geocodeMultiAddressFn = (
  address: string, 
  limit: number
) => Promise<AddressCoordinates[]>;

export type queryRouteFn = (
  start: Coordinates,
  end: Coordinates,
) => Promise<RouteResult>;

export type getRouteFn = (
  startAddress: string,
  endAddress: string,
  deps: { geocodeAddress: geocodeAddressFn; queryRoute: queryRouteFn },
) => Promise<RouteResult>;

export type convertMinutesFn = (minutes: number) => TimeHM;

export type reverseGeocodeFn = (latitude: number, longitude: number) => Promise<string>;
