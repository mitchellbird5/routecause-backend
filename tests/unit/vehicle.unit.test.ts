import axios from "axios";

import {
  makeVehicleFromRecord,
  selectVehicle,
  fetchVehicleRecords,
  emptyVehicleEntry,
} from "../../src/vehicle/vehicle";
import {
  toFloatOrNaN,
  datasetIdForYear,
  VehicleRecord,
  normalizeVehicleRecord
} from "../../src/vehicle/api_refactor";
import { VehicleData } from "../../src/vehicle/vehicle.types";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// make sure this has same entries as actual API data
const mockRecords = () => [
  {
    "Make": "Toyota",
    "Model": "Corolla",
    "Model year": "2020",
    "Vehicle class": "Compact",
    "Engine size (L)": "1.8",
    "Cylinders": "4",
    "Transmission": "Automatic",
    "Fuel type": "Petrol",
    "City (L/100 km)": "7.9",
    "Highway (L/100 km)": "6.1",
    "Combined (L/100 km)": "32.0",
    "CO2 emissions (g/km)": "180.0",
  },
  {
    "Make": "Honda",
    "Model": "Civic",
    "Model year": "2019",
    "Vehicle class": "Compact",
    "Engine size (L)": "2.0",
    "Cylinders": "4",
    "Transmission": "Manual",
    "Fuel type": "Petrol",
    "City (L/100 km)": "8.5",
    "Highway (L/100 km)": "6.8",
    "Combined (L/100 km)": "30.0",
    "CO2 emissions (g/km)": "185.0",
  },
];



const mockVehicleData: VehicleData[] = [
  {
    make: "Toyota",
    model: "Corolla",
    modelYear: "2020",
    vehicleClass: "Compact",
    engineSize_L: 1.8,
    cylinders: 4,
    transmission: "Automatic",
    fuelType: "Gasoline",
    fuelConsumptionCity_L100km: 7.9,
    fuelConsumptionHwy_L100km: 6.1,
    fuelConsumptionComb_L100km: 32.0,
    CO2Emissions_gKm: 180.0,
  },
  {
    make: "Honda",
    model: "Civic",
    modelYear: "2019",
    vehicleClass: "Compact",
    engineSize_L: 2.0,
    cylinders: 4,
    transmission: "Manual",
    fuelType: "Gasoline",
    fuelConsumptionCity_L100km: 8.5,
    fuelConsumptionHwy_L100km: 6.8,
    fuelConsumptionComb_L100km: 30.0,
    CO2Emissions_gKm: 185.0,
  },
];

describe("Logic testing", () => {

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
      expect(v.modelYear).toBe("2020");
      expect(v.vehicleClass).toBe("Compact");
      expect(v.engineSize_L).toBe(1.8);
      expect(v.cylinders).toBe(4);
      expect(v.transmission).toBe("Automatic");
      expect(v.fuelType).toBe("Petrol");
      expect(v.fuelConsumptionCity_L100km).toBe(7.9);
      expect(v.fuelConsumptionHwy_L100km).toBe(6.1);
      expect(v.fuelConsumptionComb_L100km).toBe(32.0);
      expect(v.CO2Emissions_gKm).toBe(180.0);
    });
  });


  describe("selectVehicle", () => {
    it("returns correct entry when index is valid", () => {
      const vehicle_data = mockVehicleData;
      const v = selectVehicle(vehicle_data, 1);

      expect(v.make).toBe("Honda");
      expect(v.model).toBe("Civic");
      expect(v.modelYear).toBe("2019");
      expect(v.vehicleClass).toBe("Compact");
      expect(v.engineSize_L).toBe(2.0);
      expect(v.cylinders).toBe(4);
      expect(v.transmission).toBe("Manual");
      expect(v.fuelType).toBe("Gasoline");
      expect(v.fuelConsumptionCity_L100km).toBe(8.5);
      expect(v.fuelConsumptionHwy_L100km).toBe(6.8);
      expect(v.fuelConsumptionComb_L100km).toBe(30.0);
      expect(v.CO2Emissions_gKm).toBe(185.0);
    });

    it("returns emptyVehicleEntry for invalid index", () => {
      const vehicle_data = mockVehicleData;
      expect(selectVehicle(vehicle_data, 99)).toEqual(emptyVehicleEntry);
      expect(selectVehicle([], 0)).toEqual(emptyVehicleEntry);
    });
  });

  describe("fetchVehicleRecords", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns [] if modelYear is not a number", async () => {
      const result = await fetchVehicleRecords("Honda", "Civic", "notayear");
      expect(result).toEqual([]);
    });

    it("returns [] if datasetIdForYear is undefined", async () => {
      const result = await fetchVehicleRecords("Ford", "Model T", "1800");
      expect(result).toEqual([]);
    });
  });

  describe("Vehicle database specific tests", () => {

    describe("datasetIdForYear", () => {
      it("returns correct dataset for 2000", () => {
        expect(datasetIdForYear("2000")).toBe("42495676-28b7-40f3-b0e0-3d7fe005ca56");
      });

      it("returns correct dataset for 2020", () => {
        expect(datasetIdForYear("2020")).toBe("e10efaa3-a8cc-4072-845a-13e03d996c30");
      });

      it("returns undefined for out-of-range year", () => {
        expect(datasetIdForYear("1800")).toBeUndefined();
        expect(datasetIdForYear("3000")).toBeUndefined();
      });
    });

    describe("normalizeVehicleRecord", () => {
      it("should map transmission codes with gear numbers", () => {
        const rec: VehicleRecord = { Transmission: "A4", "Fuel type": "X" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Automatic, 4 speed");
        expect(result["Fuel type"]).toBe("Petrol");
      });

      it("should map automated manual with gears", () => {
        const rec: VehicleRecord = { Transmission: "AM6", "Fuel type": "D" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Automated manual, 6 speed");
        expect(result["Fuel type"]).toBe("Diesel");
      });

      it("should map manual with gears", () => {
        const rec: VehicleRecord = { Transmission: "M5", "Fuel type": "N" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Manual, 5 speed");
        expect(result["Fuel type"]).toBe("Natural Gas");
      });

      it("should map transmission code without gears", () => {
        const rec: VehicleRecord = { Transmission: "AS", "Fuel type": "Z" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Automatic with select shift");
        expect(result["Fuel type"]).toBe("Petrol");
      });

      it("should map continuously variable without gears", () => {
        const rec: VehicleRecord = { Transmission: "AV", "Fuel type": "E" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Continuously variable");
        expect(result["Fuel type"]).toBe("E85");
      });

      it("should return unknown codes unchanged", () => {
        const rec: VehicleRecord = { Transmission: "Unknown7", "Fuel type": "Q" };
        const result = normalizeVehicleRecord(rec);
        expect(result.Transmission).toBe("Unknown7");
        expect(result["Fuel type"]).toBe("Q");
      });

      it("should handle missing transmission or fuel type", () => {
        const rec: VehicleRecord = {};
        const result = normalizeVehicleRecord(rec);
        expect(result).toEqual({});
      });
    });

  });

});


describe("Mocked API and error testing", () => {

  describe("fetchVehicleRecords", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns records if axios succeeds", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { result: { records: mockRecords()} },
      });

      const result = await fetchVehicleRecords("Toyota", "Corolla", "2020");
      expect(result).toHaveLength(2);
      expect(result[0].make).toBe("Toyota");
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
      expect(result[1].model).toBe("Civic");
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("makeVehicleFromRecord", () => {
    it("should throw an error if any required field is missing", () => {
      const incompleteRec = {
        Make: "Toyota",
        Model: "Corolla",
        "Model year": "2020",
        // missing "Vehicle class" and others
      };

      expect(() => makeVehicleFromRecord(incompleteRec)).toThrowError(
        /missing required fields: Vehicle class, Engine size \(L\), Cylinders, Transmission, Fuel type, City \(L\/100 km\), Highway \(L\/100 km\), Combined \(L\/100 km\), CO2 emissions \(g\/km\)/
      );
    });

    it("should return a VehicleData object if all fields exist", () => {
      const completeRec = {
        "Make": "Toyota",
        "Model": "Corolla",
        "Model year": "2020",
        "Vehicle class": "Compact",
        "Engine size (L)": "1.8",
        "Cylinders": "4",
        "Transmission": "Automatic",
        "Fuel type": "Gasoline",
        "City (L/100 km)": "7.9",
        "Highway (L/100 km)": "6.1",
        "Combined (L/100 km)": "6.8",
        "CO2 emissions (g/km)": "155"
      };

      const vehicle = makeVehicleFromRecord(completeRec);
      expect(vehicle.make).toBe("Toyota");
      expect(vehicle.modelYear).toBe("2020");
      expect(vehicle.cylinders).toBe(4);
    });
  });
});