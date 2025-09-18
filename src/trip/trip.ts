import { queryOsrm, geocodeAddress } from "../distance/distance";
import { VehicleData } from "../vehicle/vehicle_types";
import { TripResult } from "../trip/trip_types";
import { convertMinutes } from "../distance/distance";

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

/**
 * Calculate trip based on start/end addresses and vehicle data
 */
export async function calculateTrip(
    start_address: string,
    end_address: string,
    vehicle_data: VehicleData
): Promise<TripResult> {

    // 1. Geocode addresses
    const start = await geocodeAddress(start_address);
    const end = await geocodeAddress(end_address);

    // 2. Query OSRM
    const osrm_res = await queryOsrm(start, end);

    // 3. Convert duration to hours/minutes
    const dur = convertMinutes(Math.floor(osrm_res.duration_min));

    // 4. Calculate fuel and emissions
    const fuel_used = (osrm_res.distance_km / 100.0) * vehicle_data.fuel_consumption_comb;
    const emissions_used = (osrm_res.distance_km * vehicle_data.co2_emissions) / 1000.0; // kg

    return {
        distance_km: osrm_res.distance_km,
        hours: dur.hours,
        minutes: dur.minutes,
        fuel_used_l: fuel_used,
        co2_kg: emissions_used,
    };
}
