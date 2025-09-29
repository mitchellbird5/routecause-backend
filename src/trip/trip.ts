import { VehicleData } from "../vehicle/vehicle.types";
import { TripResult } from "./trip.types";
import { 
  queryOsrmFn, 
  convertMinutesFn, 
  getOsrmRouteFn, 
  geocodeAddressFn,
  OsrmOverview,
  OsrmRoute 
} from "../distance/distance.types";

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

export interface TripDependencies {
    getOsrmRoute: getOsrmRouteFn;
    convertMinutes: convertMinutesFn;
    geocodeAddress: geocodeAddressFn;
    queryOsrm: queryOsrmFn;
}

/**
 * Calculate trip based on start/end addresses and vehicle data
 */
export async function calculateTrip(
    start_address: string,
    end_address: string,
    vehicle_data: VehicleData,
    deps: TripDependencies,
    overview: OsrmOverview
): Promise<TripResult> {
    const { getOsrmRoute, convertMinutes, geocodeAddress, queryOsrm } = deps;

    const osrm_res = await getOsrmRoute(
      start_address,
      end_address, 
      {
        geocodeAddress,
        queryOsrm,
      },
      overview
    );

    const dur = convertMinutes(Math.floor(osrm_res.duration_min));

    const fuel_used =
        (osrm_res.distance_km / 100.0) * vehicle_data.fuel_consumption_comb;

    const emissions_used =
        (osrm_res.distance_km * vehicle_data.co2_emissions) / 1000.0; // kg

    return {
        distance_km: osrm_res.distance_km,
        hours: dur.hours,
        minutes: dur.minutes,
        fuel_used_l: fuel_used,
        co2_kg: emissions_used,
        route: osrm_res.route
    };
}

export async function calculateMultiStopTrip(
  locations: string[],
  vehicle_data: VehicleData,
  deps: TripDependencies,
  overview: OsrmOverview
): Promise<TripResult> {
  if (locations.length < 2) {
    throw new Error("At least two locations (start and end) are required");
  }

  let totalDistance = 0;
  let totalMinutes = 0;
  let totalFuel = 0;
  let totalEmissions = 0;
  let fullRoute: OsrmRoute = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const legTrip = await calculateTrip(
      locations[i],
      locations[i + 1],
      vehicle_data,
      deps,
      overview
    );

    totalDistance += legTrip.distance_km;
    totalMinutes += legTrip.hours * 60 + legTrip.minutes;
    totalFuel += legTrip.fuel_used_l;
    totalEmissions += legTrip.co2_kg;

    if (legTrip.route) {
      fullRoute = fullRoute.concat(legTrip.route);
    }
  }

  const dur = deps.convertMinutes(totalMinutes);

  return {
    distance_km: totalDistance,
    hours: dur.hours,
    minutes: dur.minutes,
    fuel_used_l: totalFuel,
    co2_kg: totalEmissions,
    route: fullRoute.length ? fullRoute : undefined
  };
}