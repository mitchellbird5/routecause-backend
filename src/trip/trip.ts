import { WayCategory, WayCategorySummary } from "../route/route.types";
import { TripResult } from "./trip.types";
import { 
  queryRouteFn, 
  RouteCoordinates,
  Coordinates
} from "../route/route.types";
import { convertMinutes } from "../route/duration";

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
        route: result.route,
        wayCategory: result.wayCategory? result.wayCategory : undefined
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

  let allValues: number[][] = [];
  const summaryMap: Record<string, number> = {};

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

    if (legTrip.wayCategory) {
      allValues = allValues.concat(legTrip.wayCategory.values || []);

      // accumulate distances by category name
      Object.entries(legTrip.wayCategory.summary).forEach(([name, info]) => {
        summaryMap[name] = (summaryMap[name] || 0) + info.distance_km;
      });
    }
  }

  const dur = convertMinutes(totalMinutes);

  // convert summaryMap to a dictionary with distance_km and percentage
  const combinedSummary: Record<string, WayCategorySummary> = {};
  Object.entries(summaryMap).forEach(([name, distance_km]) => {
    combinedSummary[name] = {
      distance_km,
      percentage: totalDistance ? (distance_km / totalDistance) * 100 : 0,
    };
  });

  const combinedWayCategory = allValues.length
    ? { summary: combinedSummary, values: allValues }
    : undefined;

  return {
    distance_km: totalDistance,
    hours: dur.hours,
    minutes: dur.minutes,
    route: fullRoute.length ? fullRoute : undefined,
    wayCategory: combinedWayCategory,
  };
}