import request from "supertest";
import { app } from "../../src/api/server";

// ---- Mock dependencies ----
import * as vehicleData from "../../src/vehicle/vehicle_data";
import * as tripModule from "../../src/trip/trip";

// Replace real implementations with Jest mocks
jest.mock("../../src/vehicle/vehicle_data");
jest.mock("../../src/trip/trip");

const mockVehicle = {
  make: "Toyota",
  model: "Corolla",
  model_year: "2020",
  vehicle_class: "Compact",
  engine_size: 1.8,
  cylinders: 4,
  transmission: "Automatic",
  fuel_type: "Gasoline",
  fuel_consumption_city: 8,
  fuel_consumption_hwy: 6,
  fuel_consumption_comb: 7,
};

const mockTripResult = {
  distance_km: 300,
  duration_min: 240,
  fuel_used_l: 21,
  co2_kg: 49,
};

describe("Server routes (with mocks)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/vehicles", () => {
    it("should return 200 and vehicles from fetchVehicleRecords", async () => {
      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([mockVehicle]);

      const res = await request(app).get("/api/vehicles?make=Toyota&model=Corolla&year=2020");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([mockVehicle]);
      expect(vehicleData.fetchVehicleRecords).toHaveBeenCalledWith("Toyota", "Corolla", "2020");
    });

    it("should return 500 if fetchVehicleRecords throws", async () => {
      (vehicleData.fetchVehicleRecords as jest.Mock).mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/vehicles");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "DB error");
    });
  });

  describe("POST /api/trip", () => {
    it("should return 400 if vehicle info is missing", async () => {
      const res = await request(app).post("/api/trip").send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Missing vehicle_id or vehicle info");
    });

    it("should return 400 if vehicle not found", async () => {
      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([]);
      (vehicleData.selectVehicle as jest.Mock).mockReturnValue(null);

      const res = await request(app).post("/api/trip").send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        locations: ["A", "B"],
        overview: 'false'
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Vehicle not found");
    });

    it("should return 600 if overview not in Enum", async () => {
      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([]);
      (vehicleData.selectVehicle as jest.Mock).mockReturnValue(null);

      const res = await request(app).post("/api/trip").send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        locations: ["A", "B"],
        overview: 'not an entry'
      });

      expect(res.status).toBe(600);
      expect(res.body).toHaveProperty("error", "Invalid overview value. Must be equal to 'full' or 'false'.");
    });

    it("should return 200 with mocked trip result and false route", async () => {
      const mockTripWithoutGeometry = {
        ...mockTripResult,
        geometry: undefined, 
      };

      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([mockVehicle]);
      (vehicleData.selectVehicle as jest.Mock).mockReturnValue(mockVehicle);
      (tripModule.calculateMultiStopTrip as jest.Mock).mockResolvedValue(mockTripWithoutGeometry);
      (tripModule.tripResultToJson as jest.Mock).mockImplementation((trip) => trip);

      const res = await request(app).post("/api/trip").send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        locations: ["A", "B"],
        overview: 'false'
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTripWithoutGeometry);

      expect(vehicleData.fetchVehicleRecords).toHaveBeenCalledWith("Toyota", "Corolla", "2020");
      expect(vehicleData.selectVehicle).toHaveBeenCalledWith([mockVehicle], 0);
      expect(tripModule.calculateMultiStopTrip).toHaveBeenCalled();
      expect(tripModule.tripResultToJson).toHaveBeenCalledWith(mockTripWithoutGeometry);
    });

    it("should return 200 with mocked trip result and full route", async () => {
    const mockTripWithGeometry = {
        ...mockTripResult,
        geometry: [
          [172.655, -43.531],
          [168.738, -45.021],
        ],
      };

      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([mockVehicle]);
      (vehicleData.selectVehicle as jest.Mock).mockReturnValue(mockVehicle);
      (tripModule.calculateMultiStopTrip as jest.Mock).mockResolvedValue(mockTripWithGeometry);
      (tripModule.tripResultToJson as jest.Mock).mockImplementation((trip) => trip);

      const res = await request(app).post("/api/trip").send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        locations: ["A", "B"],
        overview: 'full'
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTripWithGeometry);

      expect(vehicleData.fetchVehicleRecords).toHaveBeenCalledWith("Toyota", "Corolla", "2020");
      expect(vehicleData.selectVehicle).toHaveBeenCalledWith([mockVehicle], 0);
      expect(tripModule.calculateMultiStopTrip).toHaveBeenCalled();
      expect(tripModule.tripResultToJson).toHaveBeenCalledWith(mockTripWithGeometry);
    });

    it("should return 500 if calculateMultiStopTrip throws", async () => {
      (vehicleData.fetchVehicleRecords as jest.Mock).mockResolvedValue([mockVehicle]);
      (vehicleData.selectVehicle as jest.Mock).mockReturnValue(mockVehicle);
      (tripModule.calculateMultiStopTrip as jest.Mock).mockRejectedValue(new Error("Route API error"));

      const res = await request(app).post("/api/trip").send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        locations: ["A", "B"],
        overview: "false"
      });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Route API error");
    });
  });
});
