import { VehicleData } from "./vehicle.types";

export function toFloatOrNaN(s: string): number {
    const v = parseFloat(s);
    return isNaN(v) ? NaN : v;
}

type VehicleFieldMapEntry<T> = {
  source: string;
  parser?: (val: any) => T;
  default: T;
};

type VehicleFieldMap = {
  [K in keyof VehicleData]: VehicleFieldMapEntry<VehicleData[K]>;
};

export const VEHICLE_FIELD_MAP: VehicleFieldMap = {
  make: { source: "Make", default: "" },
  model: { source: "Model", default: "" },
  model_year: { source: "Model year", default: "" },
  vehicle_class: { source: "Vehicle class", default: "" },
  engine_size: { source: "Engine size (L)", parser: toFloatOrNaN, default: NaN },
  cylinders: { source: "Cylinders", parser: (v) => parseInt(v) || -1, default: -1 },
  transmission: { source: "Transmission", default: "" },
  fuel_type: { source: "Fuel type", default: "" },
  fuel_consumption_city: { source: "City (L/100 km)", parser: toFloatOrNaN, default: NaN },
  fuel_consumption_hwy: { source: "Highway (L/100 km)", parser: toFloatOrNaN, default: NaN },
  fuel_consumption_comb: { source: "Combined (L/100 km)", parser: toFloatOrNaN, default: NaN },
  co2_emissions: { source: "CO2 emissions (g/km)", parser: toFloatOrNaN, default: NaN },
};

export type VehicleRecord = Record<string, any>;

const TRANSMISSION_MAP: Record<string, string> = {
  A: "Automatic",
  AM: "Automated manual",
  AS: "Automatic with select shift",
  AV: "Continuously variable",
  M: "Manual",
};

const FUEL_TYPE_MAP: Record<string, string> = {
  X: "Petrol",
  Z: "Petrol",
  D: "Diesel",
  E: "E85",
  N: "Natural Gas",
};

/**
 * Cleans and normalizes raw API data for vehicle records.
 * Handles transmission codes (with optional trailing gear numbers)
 * and fuel type codes.
 */
export function normalizeVehicleRecord(rec: VehicleRecord): VehicleRecord {
  const normalized: VehicleRecord = { ...rec };

  if ("Transmission" in rec && typeof rec["Transmission"] === "string") {
    const raw = rec["Transmission"].trim();

    // Separate prefix and possible trailing number
    const match = raw.match(/^([A-Z]+)(\d+)?$/i);

    if (match) {
      const [, code, num] = match;
      const mapped = TRANSMISSION_MAP[code];
      if (mapped) {
        normalized["Transmission"] =
          num && !isNaN(Number(num))
            ? `${mapped}, ${num} speed`
            : mapped;
      } else {
        // Unknown code → leave unchanged
        normalized["Transmission"] = raw;
      }
    } else {
      // Fallback: keep original
      normalized["Transmission"] = raw;
    }
  }

  if ("Fuel type" in rec && typeof rec["Fuel type"] === "string") {
    const code = rec["Fuel type"].trim();
    normalized["Fuel type"] = FUEL_TYPE_MAP[code] ?? rec["Fuel type"];
  }

  return normalized;
}

/*
 Vehicle data sourced from "Fuel consumption ratings - 1995-2014 Fuel
 Consumption Ratings" authored by Government of Canada and "Fuel consumption
 ratings - 2015-2024 Fuel Consumption Ratings (2025-07-24)" authored by
  Government of Canada.
*/
export function datasetIdForYear(model_year: string): string | undefined {
  const numeric_year = parseInt(model_year);
  if (isNaN(numeric_year)) return undefined;

  if (numeric_year >= 1990 && numeric_year <= 2014) {
    return "42495676-28b7-40f3-b0e0-3d7fe005ca56";
  }
  if (numeric_year >= 2015 && numeric_year <= 2025) {
    return "e10efaa3-a8cc-4072-845a-13e03d996c30";
  }
  return undefined;
}

export function buildVehicleApiUrl(
  make: string,
  model: string,
  model_year: string
): { url: string; params: Record<string, any> } | null {
  const datasetId = datasetIdForYear(model_year);
  if (!datasetId) return null;

  const query = `${make} ${model_year} ${model}`;
  const url = "https://open.canada.ca/data/en/api/3/action/datastore_search";
  const params = { resource_id: datasetId, q: query };

  return { url, params };
}