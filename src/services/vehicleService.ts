import { fetchVehicleRecords } from "../vehicle/vehicle";

export async function getVehiclesService(
  make: string,
  model: string,
  modelYear: string
) {
  return await fetchVehicleRecords(make, model, modelYear);
}
