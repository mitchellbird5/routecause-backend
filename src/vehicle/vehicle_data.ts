import axios from "axios";
import { VehicleData } from "./vehicle_types";

export const NAN_F = NaN;

export const emptyVehicleEntry: VehicleData = {
    make: "",
    model: "",
    model_year: "",
    vehicle_class: "",
    engine_size: NAN_F,
    cylinders: -1,
    transmission: "",
    fuel_type: "",
    fuel_consumption_city: NAN_F,
    fuel_consumption_hwy: NAN_F,
    fuel_consumption_comb: NAN_F,
    co2_emissions: NAN_F,
};

export function toFloatOrNaN(s: string): number {
    const v = parseFloat(s);
    return isNaN(v) ? NAN_F : v;
}

export function makeVehicleFromRecord(rec: any): VehicleData {
    return {
        make: rec['Make'] ?? "",
        model: rec['Model'] ?? "",
        model_year: rec['Model year'] ?? "",
        vehicle_class: rec['Vehicle class'] ?? "",
        engine_size: toFloatOrNaN(rec['Engine size (L)'] ?? ""),
        cylinders: parseInt(rec['Cylinders']) || -1,
        transmission: rec['Transmission'] ?? "",
        fuel_type: rec['Fuel type'] ?? "",
        fuel_consumption_city: toFloatOrNaN(rec['City (L/100 km)'] ?? ""),
        fuel_consumption_hwy: toFloatOrNaN(rec['Highway (L/100 km)'] ?? ""),
        fuel_consumption_comb: toFloatOrNaN(rec['Combined (L/100 km)'] ?? ""),
        co2_emissions: toFloatOrNaN(rec['CO2 emissions (g/km)'] ?? ""),
    };
}

export function datasetIdForYear(year: number): string | undefined {
    if (year >= 1990 && year <= 2014) return "42495676-28b7-40f3-b0e0-3d7fe005ca56";
    if (year >= 2015 && year <= 2025) return "505e609e-624c-443f-9155-97431e5e3732";
}

/*
 Vehicle data sourced from "Fuel consumption ratings - 1995-2014 Fuel
 Consumption Ratings" authored by Government of Canada and "Fuel consumption
 ratings - 2015-2024 Fuel Consumption Ratings (2025-07-24)" authored by
  Government of Canada.
*/
export async function fetchVehicleRecords(
  make: string,
  model: string,
  model_year: string
): Promise<VehicleData[]> {
  const year = parseInt(model_year);
  if (isNaN(year)) {
    console.error("Invalid model year:", model_year);
    return [];
  }

  const datasetId = datasetIdForYear(year);
  if (!datasetId) return [];

  const q = `${make} ${model_year} ${model}`;
  const url = "https://open.canada.ca/data/en/api/3/action/datastore_search";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.get(url, {
        params: { resource_id: datasetId, q },
        timeout: 5000,
      });

      if (response.status === 200 && response.data?.result?.records) {
        const records: VehicleData[] = response.data.result.records.map(
          (r: any, i: number) => {
            const vehicle = makeVehicleFromRecord(r);
            return { id: i + 1, ...vehicle };
          }
        );
        return records;
      }
    } catch (err: any) {
      console.error("Attempt", attempt + 1, "error:", err.message);
      await new Promise((res) => setTimeout(res, 500 * 2 ** attempt)); // backoff
    }
  }

  return [];
}

export function selectVehicle(records: any[], index: number): VehicleData {
    if (!records || index < 0 || index >= records.length) return emptyVehicleEntry;
    return records[index];
}