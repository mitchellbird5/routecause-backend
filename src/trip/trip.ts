import { VehicleData } from "../vehicle/vehicle.types";
import { TripResult } from "./trip.types";
import { 
  queryRouteFn, 
  RouteCoordinates,
  Coordinates
} from "../route/route.types";
import { convertMinutes } from "../route/duration";

/**
 * Convert TripResult to JSON (for API responses)
 */
export function tripResultToJson(trip: TripResult) {
    return {
        distance_km: trip.distance_km,
        hours: trip.hours,
        minutes: trip.minutes,
        route: trip.route
    };
}

/**
 * Calculate trip based on start/end addresses and vehicle data
 */
export async function calculateTrip(
    start: Coordinates,
    end: Coordinates,
    queryRoute: queryRouteFn,
): Promise<TripResult> {

    const result = await queryRoute(start, end);
    const dur = convertMinutes(Math.floor(result.duration_min));

    return {
        distance_km: result.distance_km,
        hours: dur.hours,
        minutes: dur.minutes,
        route: result.route
    };
}

export async function calculateMultiStopTrip(
  locations: Coordinates[],
  queryRoute: queryRouteFn,
): Promise<TripResult> {
  if (locations.length < 2) {
    throw new Error("At least two locations (start and end) are required");
  }

  let totalDistance = 0;
  let totalMinutes = 0;
  let fullRoute: RouteCoordinates = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const legTrip = await calculateTrip(
      locations[i],
      locations[i + 1],
      queryRoute,
    );

    totalDistance += legTrip.distance_km;
    totalMinutes += legTrip.hours * 60 + legTrip.minutes;

    if (legTrip.route) {
      fullRoute = fullRoute.concat(legTrip.route);
    }
  }

  const dur = convertMinutes(totalMinutes);

  return {
    distance_km: totalDistance,
    hours: dur.hours,
    minutes: dur.minutes,
    route: fullRoute.length ? fullRoute : undefined
  };
}