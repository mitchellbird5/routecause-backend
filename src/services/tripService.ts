import {
  calculateMultiStopTrip,
  tripResultToJson,
} from "../trip/trip";
import { queryRoute } from "../route/route";
import { Coordinates } from "../route/route.types";

export async function getTripService(
  locations: Coordinates[],
) {

  const trip = await calculateMultiStopTrip(
    locations,
    queryRoute,
  );

  return tripResultToJson(trip);
}
