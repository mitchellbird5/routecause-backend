import {
  fetchVehicleRecords,
  selectVehicle,
} from "../vehicle/vehicle_data";
import {
  calculateMultiStopTrip,
  tripResultToJson,
} from "../trip/trip";
import {
  getOsrmRoute,
  geocodeAddress,
  queryOsrm,
  convertMinutes,
} from "../distance/distance";
import { OsrmOverview } from "../distance/distance.types";

interface TripRequestBody {
  vehicle_id: number;
  make: string;
  model: string;
  model_year: string;
  overview: OsrmOverview;
  locations: any[];
}

export async function getTripService(body: TripRequestBody) {
  if (!body.vehicle_id || !body.make || !body.model || !body.model_year) {
    throw { status: 400, message: "Missing vehicle_id or vehicle info" };
  }

  if (!Object.values(OsrmOverview).includes(body.overview)) {
    throw {
      status: 600,
      message:
        "Invalid overview value. Must be equal to 'full' or 'false'.",
    };
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
    {
      getOsrmRoute,
      convertMinutes,
      geocodeAddress,
      queryOsrm,
    },
    body.overview
  );

  return tripResultToJson(trip);
}
