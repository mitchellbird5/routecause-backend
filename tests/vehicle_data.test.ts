import axios from "axios";
import {
  toFloatOrNaN,
  makeVehicleFromRecord,
  datasetIdForYear,
  selectVehicle,
  fetchVehicleRecords,
  emptyVehicleEntry,
} from "../src/vehicle/vehicle_data";

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
    "CO2 emissions (g/km)": "180.0",
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
    "CO2 emissions (g/km)": "185.0",
  },
];

describe("toFloatOrNaN", () => {
  it("converts valid strings to floats", () => {
    expect(toFloatOrNaN("3.14")).toBeCloseTo(3.14);
    expect(toFloatOrNaN("-2.71")).toBeCloseTo(-2.71);
    expect(toFloatOrNaN("0")).toBe(0);
  });

  it("returns NaN for invalid numbers", () => {
    expect(Number.isNaN(toFloatOrNaN("abc"))).toBe(true);
    expect(Number.isNaN(toFloatOrNaN(""))).toBe(true);
  });
});

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

  it("handles missing fields gracefully", () => {
    const v = makeVehicleFromRecord({});
    expect(v.make).toBe("");
    expect(v.engine_size).toBeNaN();
    expect(v.cylinders).toBe(-1);
  });
});

describe("datasetIdForYear", () => {
  it("returns correct dataset for 2000", () => {
    expect(datasetIdForYear(2000)).toBe("42495676-28b7-40f3-b0e0-3d7fe005ca56");
  });

  it("returns correct dataset for 2020", () => {
    expect(datasetIdForYear(2020)).toBe("505e609e-624c-443f-9155-97431e5e3732");
  });

  it("returns undefined for out-of-range year", () => {
    expect(datasetIdForYear(1800)).toBeUndefined();
    expect(datasetIdForYear(3000)).toBeUndefined();
  });
});

describe("selectVehicle", () => {
  it("returns correct entry when index is valid", () => {
    const records = mockRecords();
    const v = selectVehicle(records, 1);

    expect(v.make).toBe("Honda");
    expect(v.model).toBe("Civic");
  });

  it("returns emptyVehicleEntry for invalid index", () => {
    const records = mockRecords();
    expect(selectVehicle(records, 99)).toEqual(emptyVehicleEntry);
    expect(selectVehicle([], 0)).toEqual(emptyVehicleEntry);
  });
});

describe("fetchVehicleRecords", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns [] if model_year is not a number", async () => {
    const result = await fetchVehicleRecords("Honda", "Civic", "notayear");
    expect(result).toEqual([]);
  });

  it("returns [] if datasetIdForYear is undefined", async () => {
    const result = await fetchVehicleRecords("Ford", "Model T", "1800");
    expect(result).toEqual([]);
  });

  it("returns records if axios succeeds", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { result: { records: mockRecords() } },
    });

    const result = await fetchVehicleRecords("Toyota", "Corolla", "2020");
    expect(result).toHaveLength(2);
    expect(result[0].Make).toBe("Toyota");
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it("retries 3 times then returns [] if axios keeps failing", async () => {
    mockedAxios.get.mockRejectedValue(new Error("network error"));
    const result = await fetchVehicleRecords("Toyota", "Corolla", "2020");
    expect(result).toEqual([]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });

  it("succeeds on retry (2nd attempt)", async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValueOnce({
        status: 200,
        data: { result: { records: mockRecords() } },
      });

    const result = await fetchVehicleRecords("Honda", "Civic", "2019");
    expect(result).toHaveLength(2);
    expect(result[1].Model).toBe("Civic");
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});
