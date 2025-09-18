import axios from "axios";
import {  
  emptyVehicleEntry, 
  makeVehicleFromRecord, 
  toFloatOrNaN, 
  datasetIdForYear, 
  selectVehicle, 
  fetchVehicleRecords, 
  getVehicleData 
} from "../src/vehicle/vehicle_data";
import { VehicleData } from "../src/vehicle/vehicle_types";

// Tell Jest to mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockRecords = () => [
  {
    Make: "Toyota",
    Model: "Corolla",
    "Model year": "2020",
    "Vehicle class": "Compact",
    "Engine size (L)": "1.8",
    Cylinders: "4",
    Transmission: "Automatic",
    "Fuel type": "Gasoline",
    "City (L/100 km)": "7.9",
    "Highway (L/100 km)": "6.1",
    "Combined (L/100 km)": "32.0",
    "CO2 emissions (g/km)": "180.0"
  },
  {
    Make: "Honda",
    Model: "Civic",
    "Model year": "2019",
    "Vehicle class": "Compact",
    "Engine size (L)": "2.0",
    Cylinders: "4",
    Transmission: "Manual",
    "Fuel type": "Gasoline",
    "City (L/100 km)": "8.5",
    "Highway (L/100 km)": "6.8",
    "Combined (L/100 km)": "30.0",
    "CO2 emissions (g/km)": "185.0"
  }
];

describe("makeVehicleFromRecord", () => {
  it("parses fields correctly", () => {
    const record = mockRecords()[0];
    const v = makeVehicleFromRecord(record);

    expect(v.make).toBe("Toyota");
    expect(v.model).toBe("Corolla");
    expect(v.model_year).toBe("2020");
    expect(v.vehicle_class).toBe("Compact");
    expect(v.engine_size).toBe(1.8);
    expect(v.cylinders).toBe(4);
    expect(v.transmission).toBe("Automatic");
    expect(v.fuel_type).toBe("Gasoline");
    expect(v.fuel_consumption_city).toBe(7.9);
    expect(v.fuel_consumption_hwy).toBe(6.1);
    expect(v.fuel_consumption_comb).toBe(32.0);
    expect(v.co2_emissions).toBe(180.0);
  });
});

describe("toFloatOrNaN", () => {
  it("converts valid numbers", () => {
    expect(toFloatOrNaN("3.14")).toBeCloseTo(3.14);
    expect(toFloatOrNaN("-2.71")).toBeCloseTo(-2.71);
    expect(toFloatOrNaN("0")).toBe(0);
  });

  it("returns NaN for invalid numbers", () => {
    expect(Number.isNaN(toFloatOrNaN("abc"))).toBe(true);
    expect(Number.isNaN(toFloatOrNaN(""))).toBe(true);
  });
});

describe("datasetIdForYear", () => {
  it("returns correct dataset for old years", () => {
    expect(datasetIdForYear(2000)).toBe("42495676-28b7-40f3-b0e0-3d7fe005ca56");
  });

  it("returns correct dataset for modern years", () => {
    expect(datasetIdForYear(2020)).toBe("505e609e-624c-443f-9155-97431e5e3732");
  });

  it("returns undefined for out of range years", () => {
    expect(datasetIdForYear(1800)).toBeUndefined();
  });
});

describe("selectVehicle", () => {
  it("returns correct entry when index is valid", () => {
    const records = mockRecords();
    const v = selectVehicle(records, 1);

    expect(v.make).toBe("Honda");
    expect(v.model).toBe("Civic");
    expect(v.model_year).toBe("2019");
    expect(v.vehicle_class).toBe("Compact");
    expect(v.engine_size).toBe(2.0);
    expect(v.cylinders).toBe(4);
    expect(v.transmission).toBe("Manual");
    expect(v.fuel_type).toBe("Gasoline");
    expect(v.fuel_consumption_city).toBe(8.5);
    expect(v.fuel_consumption_hwy).toBe(6.8);
    expect(v.fuel_consumption_comb).toBe(30.0);
    expect(v.co2_emissions).toBe(185.0);
  });

  it("returns emptyVehicleEntry for out-of-range index", () => {
    const records = mockRecords();
    const v = selectVehicle(records, 99);
    expect(v).toEqual(emptyVehicleEntry);
  });
});

describe("fetchVehicleRecords", () => {
  it("handles invalid model_year gracefully", async () => {
    const result = await fetchVehicleRecords("Honda", "Civic", "notayear");
    expect(result).toHaveLength(0);
  });

  it("returns mocked records when axios responds successfully", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { result: { records: mockRecords() } }
    });

    const result = await fetchVehicleRecords("Toyota", "Corolla", "2020");
    expect(result).toHaveLength(2);
    expect(result[0].Make).toBe("Toyota");
  });

  it("returns [] on axios failure", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("network error"));
    const result = await fetchVehicleRecords("Toyota", "Corolla", "2020");
    expect(result).toEqual([]);
  });
});

describe("getVehicleData", () => {
  it("returns empty entry when year is out of range", async () => {
    const vehicle = await getVehicleData("Toyota", "Camry", "1985");
    expect(vehicle).toEqual(emptyVehicleEntry);
  });

  it("returns a selected vehicle when axios returns data", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { result: { records: mockRecords() } }
    });

    // Mock readline interaction
    jest.spyOn(require("readline"), "createInterface").mockReturnValue({
      question: (_q: string, cb: (answer: string) => void) => cb("1"),
      close: jest.fn(),
    } as any);

    const vehicle = await getVehicleData("Toyota", "Corolla", "2020");
    expect(vehicle.make).toBe("Toyota");
    expect(vehicle.model).toBe("Corolla");
  });
});
