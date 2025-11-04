import axios from "axios";
import { VehicleData } from "./vehicle.types";
import {
  normalizeVehicleRecord,
  VEHICLE_FIELD_MAP,
  buildVehicleApiUrl
} from "./api_refactor"
import { apiRateLimiter } from "../utils/rateLimiter";

export const emptyVehicleEntry: VehicleData = {
    make: "",
    model: "",
    model_year: "",
    vehicle_class: "",
    engine_size: NaN,
    cylinders: -1,
    transmission: "",
    fuel_type: "",
    fuel_consumption_city: NaN,
    fuel_consumption_hwy: NaN,
    fuel_consumption_comb: NaN,
    co2_emissions: NaN,
};

/**
 * Validates a vehicle record.
 * Throws an error if any required field is missing.
 */
export function validateVehicleRecord(
  rec: any,
  requiredFields: Array<string>
): void {
  const missingFields = requiredFields.filter(field => !(field in rec));

  if (missingFields.length > 0) {
    throw new Error(`Vehicle record is missing required fields: ${missingFields.join(", ")}`);
  }
}


export function makeVehicleFromRecord(rec: any): VehicleData {
  const normalizedRec = normalizeVehicleRecord(rec);

  const requiredFields = Object.values(VEHICLE_FIELD_MAP).map((f) => f.source);
  validateVehicleRecord(normalizedRec, requiredFields);

  const vehicle = {} as VehicleData;

  for (const key of Object.keys(VEHICLE_FIELD_MAP) as Array<keyof VehicleData>) {
    assignVehicleField(vehicle, key, normalizedRec);
  }

  return vehicle;
}


function assignVehicleField<K extends keyof VehicleData>(
  vehicle: VehicleData,
  key: K,
  rec: Record<string, any>
) {
  const { source, parser, default: def } = VEHICLE_FIELD_MAP[key];
  const value = rec[source] ?? def;
  vehicle[key] = parser ? parser(value) : value as VehicleData[K];
}

const vehicleRateLimiter = new apiRateLimiter(200, 10000);
export async function fetchVehicleRecords(
  make: string,
  model: string,
  model_year: string
): Promise<VehicleData[]> {
  vehicleRateLimiter.consume();

  const { url, params } = buildVehicleApiUrl(make, model, model_year) ?? {};
  if (!url || !params) return [];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.get(url, { params, timeout: 5000 });

      if (response.status === 200 && response.data?.result?.records) {
        return response.data.result.records.map((r: any, i: number) => ({
          id: i + 1,
          ...makeVehicleFromRecord(r),
        }));
      }
    } catch (err: any) {
      console.error("Attempt", attempt + 1, "error:", err.message);
      await new Promise((res) => setTimeout(res, 500 * 2 ** attempt));
    }
  }

  return [];
}

export function selectVehicle(records: any[], index: number): VehicleData {
    if (!records || index < 0 || index >= records.length) return emptyVehicleEntry;
    return records[index];
}