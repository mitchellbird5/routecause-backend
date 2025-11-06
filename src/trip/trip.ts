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
        fuel_used_l: trip.fuel_used_l,
        co2_kg: trip.co2_kg,
        route: trip.route
    };
}

/**
 * Calculate trip based on start/end addresses and vehicle data
 */
export async function calculateTrip(
    start: Coordinates,
    end: Coordinates,
    vehicle_data: VehicleData,
    queryRoute: queryRouteFn,
): Promise<TripResult> {

    const result = await queryRoute(start, end);

    const dur = convertMinutes(Math.floor(result.duration_min));

    const fuel_used =
        (result.distance_km / 100.0) * vehicle_data.fuel_consumption_comb;

    const emissions_used =
        (result.distance_km * vehicle_data.co2_emissions) / 1000.0; // kg

    return {
        distance_km: result.distance_km,
        hours: dur.hours,
        minutes: dur.minutes,
        fuel_used_l: fuel_used,
        co2_kg: emissions_used,
        route: result.route
    };
}

export async function calculateMultiStopTrip(
  locations: Coordinates[],
  vehicle_data: VehicleData,
  queryRoute: queryRouteFn,
): Promise<TripResult> {
  if (locations.length < 2) {
    throw new Error("At least two locations (start and end) are required");
  }

  let totalDistance = 0;
  let totalMinutes = 0;
  let totalFuel = 0;
  let totalEmissions = 0;
  let fullRoute: RouteCoordinates = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const legTrip = await calculateTrip(
      locations[i],
      locations[i + 1],
      vehicle_data,
      queryRoute,
    );

    totalDistance += legTrip.distance_km;
    totalMinutes += legTrip.hours * 60 + legTrip.minutes;
    totalFuel += legTrip.fuel_used_l;
    totalEmissions += legTrip.co2_kg;

    if (legTrip.route) {
      fullRoute = fullRoute.concat(legTrip.route);
    }
  }

  const dur = convertMinutes(totalMinutes);

  return {
    distance_km: totalDistance,
    hours: dur.hours,
    minutes: dur.minutes,
    fuel_used_l: totalFuel,
    co2_kg: totalEmissions,
    route: fullRoute.length ? fullRoute : undefined
  };
}