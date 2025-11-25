export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LonLat = [number, number]

export interface TimeHM {
  hours: number;
  minutes: number;
}

export type RouteCoordinates = Coordinates[]

export type WayCategorySummary = {
  distance_km: number;
  percentage: number;
};

export type WayCategory = {
  summary: Record<string, WayCategorySummary>,
  values: number[][]
}

const WAYCATEGORY_MAP: Record<number, string> = {
  0: "No category",
  1: "Highway",
  2: "Steps",
  4: "Unpaved road",
  8: "Ferry",
  16: "Track",
  32: "Tunnel",
  64: "Paved road",
  128: "Ford",
};

/**
 * Given ORS summary extra-info for waycategory, convert to human-readable categories.
 * Supports bit-field decoding: a “value” may represent multiple categories.
 */
export function decodeWayCategorySummary(
  summary: Array<{ value: number; distance: number; amount: number }>
): Record<string, WayCategorySummary> {
  const result: Record<string, WayCategorySummary> = {};

  for (const { value, distance, amount } of summary) {
    if (value === 0) {
      result[WAYCATEGORY_MAP[0]] = {
        distance_km: distance / 1000,
        percentage: amount,
      };
      continue;
    }

    // For non-zero: break into bits
    for (const bit of Object.keys(WAYCATEGORY_MAP).map(Number)) {
      if (bit === 0) continue;
      if ((value & bit) === bit) {
        const name = WAYCATEGORY_MAP[bit] ?? `Unknown (${bit})`;
        result[name] = {
          distance_km: distance / 1000,
          percentage: amount,
        };
      }
    }
  }

  return result;
}

export interface RouteResult {
  distance_km: number;
  hours: number;
  minutes: number;
  route: RouteCoordinates;
  wayCategory?: WayCategory
}

export type queryRouteFn = (
  coordinates: Coordinates[],
  radius: number
) => Promise<RouteResult>;

export type convertMinutesFn = (minutes: number) => TimeHM;

export function convertCoordinateToLonLat(
  coord: Coordinates
) : LonLat {
  return [coord.longitude, coord.latitude]
}

export function convertCoordinateListToLonLat(
  coords: Coordinates[]
) : LonLat[] {
  return coords.map(convertCoordinateToLonLat);
}

export function convertLonLatToCoordinates(
  coord: LonLat
) : Coordinates {
  return {longitude: coord[0], latitude: coord[1]} as Coordinates
}

export function convertLonLatListToCoordinates(
  coords: LonLat[]
) : Coordinates[] {
  return coords.map(convertLonLatToCoordinates)
}