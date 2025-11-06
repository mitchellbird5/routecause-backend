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

interface TripRequestBody {
  vehicle_id: number;
  make: string;
  model: string;
  model_year: string;
  locations: Coordinates[];
}

export async function getTripService(body: TripRequestBody) {
  if (!body.vehicle_id || !body.make || !body.model || !body.model_year) {
    throw { status: 400, message: "Missing Vehicle ID or vehicle info." };
  }

  const vehicles = await fetchVehicleRecords(
    body.make,
    body.model,
    body.model_year
  );
  const vehicle = selectVehicle(vehicles, body.vehicle_id - 1);

  if (!vehicle || !vehicle.make) {
    throw { status: 400, message: "Vehicle not found" };
  }

  const trip = await calculateMultiStopTrip(
    body.locations,
    vehicle,
    queryRoute,
  );

  return tripResultToJson(trip);
}
