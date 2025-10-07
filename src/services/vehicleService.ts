import { fetchVehicleRecords } from "../vehicle/vehicle_data";

export async function getVehiclesService(
  make: string,
  model: string,
  model_year: string
) {
  return await fetchVehicleRecords(make, model, model_year);
}
