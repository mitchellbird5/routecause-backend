import {
  fetchVehicleRecords,
  selectVehicle,
} from "../vehicle/vehicle";
import {
  calculateMultiStopTrip,
  tripResultToJson,
} from "../trip/trip";
import { queryRoute } from "../route/route";
import { Coordinates } from "../route/route.types";

export async function getTripService(
  vehicle_id: number,
  make: string,
  model: string,
  model_year: string,
  locations: Coordinates[],
) {
  if (!vehicle_id || !make || !model || !model_year) {
    throw { status: 400, message: "Missing Vehicle ID or vehicle info." };
  }

  const vehicles = await fetchVehicleRecords(
    make,
    model,
    model_year
  );
  const vehicle = selectVehicle(vehicles, vehicle_id - 1);

  if (!vehicle || !vehicle.make) {
    throw { status: 400, message: "Vehicle not found" };
  }

  const trip = await calculateMultiStopTrip(
    locations,
    vehicle,
    queryRoute,
  );

  return tripResultToJson(trip);
}
