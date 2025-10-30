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

export class RateLimiter {
  private minuteCalls: number[] = [];
  private dailyCalls: number[] = [];
  private readonly MINUTE_LIMIT: number;
  private readonly DAILY_LIMIT: number;

  constructor(minuteLimit: number, dailyLimit: number) {
    this.MINUTE_LIMIT = minuteLimit;
    this.DAILY_LIMIT = dailyLimit;
  }

  consume() {
    const now = Date.now();

    // Remove old timestamps
    this.minuteCalls = this.minuteCalls.filter((t) => now - t < 60 * 1000);
    this.dailyCalls = this.dailyCalls.filter((t) => now - t < 24 * 60 * 60 * 1000);

    // Check limits
    if (this.minuteCalls.length >= this.MINUTE_LIMIT) {
      const err = new Error("RATE_LIMIT_EXCEEDED_MINUTE");
      (err as any).code = "RATE_LIMIT_EXCEEDED_MINUTE";
      throw err;
    }
    if (this.dailyCalls.length >= this.DAILY_LIMIT) {
      const err = new Error("RATE_LIMIT_EXCEEDED_DAILY");
      (err as any).code = "RATE_LIMIT_EXCEEDED_DAILY";
      throw err;
    }

    // Record this call
    this.minuteCalls.push(now);
    this.dailyCalls.push(now);
  }
}
