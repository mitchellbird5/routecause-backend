export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LonLat = [number, number]

export type RouteCoordinates = Coordinates[]

export type queryRouteFn = (
  coordinates: Coordinates[],
  radius: number,
  options?: Record<string, any>
) => Promise<any>;

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