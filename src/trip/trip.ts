import { getOsrmRoute, geocodeAddress, queryOsrm } from "../distance/distance";
import { VehicleData } from "../vehicle/vehicle_types";
import { TripResult } from "../trip/trip_types";
import { convertMinutes } from "../distance/distance";
import { Coordinates, OsrmResult, TimeHM, GeocodeAddressFn, QueryOsrmFn } from "../distance/distance_types";

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
    };
}

export interface TripDependencies {
    getOsrmRoute: (
        startAddress: string,
        endAddress: string,
        deps: { geocodeAddress: GeocodeAddressFn; queryOsrm: QueryOsrmFn }
    ) => Promise<OsrmResult>;
    convertMinutes: (minutes: number) => TimeHM;
    geocodeAddress: (address: string) => Promise<Coordinates>;
    queryOsrm: (start: Coordinates, end: Coordinates) => Promise<OsrmResult>;
}

/**
 * Calculate trip based on start/end addresses and vehicle data
 */
export async function calculateTrip(
    start_address: string,
    end_address: string,
    vehicle_data: VehicleData,
    deps: TripDependencies
): Promise<TripResult> {
    const { getOsrmRoute, convertMinutes, geocodeAddress, queryOsrm } = deps;

    const osrm_res = await getOsrmRoute(start_address, end_address, {
        geocodeAddress,
        queryOsrm,
    });

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
    };
}

export async function calculateMultiStopTrip(
  locations: string[],
  vehicle_data: VehicleData,
  deps: TripDependencies
): Promise<TripResult> {
  if (locations.length < 2) {
    throw new Error("At least two locations (start and end) are required");
  }

  let totalDistance = 0;
  let totalMinutes = 0;
  let totalFuel = 0;
  let totalEmissions = 0;

  for (let i = 0; i < locations.length - 1; i++) {
    const legTrip = await calculateTrip(
      locations[i],
      locations[i + 1],
      vehicle_data,
      deps
    );

    totalDistance += legTrip.distance_km;
    totalMinutes += legTrip.hours * 60 + legTrip.minutes;
    totalFuel += legTrip.fuel_used_l;
    totalEmissions += legTrip.co2_kg;
  }

  const dur = deps.convertMinutes(totalMinutes);

  return {
    distance_km: totalDistance,
    hours: dur.hours,
    minutes: dur.minutes,
    fuel_used_l: totalFuel,
    co2_kg: totalEmissions,
  };
}