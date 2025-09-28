import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as distanceModule from "../../src/distance/distance";
import * as vehicleData from "../../src/vehicle/vehicle_data";
import { VehicleData as VehicleDataType } from "../../src/vehicle/vehicle_types";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("API Routes (mocked external APIs)", () => {

  beforeAll(() => {
    // Mock geocodeAddress and queryOsrm
    jest.spyOn(distanceModule, "geocodeAddress").mockImplementation(async (address: string) => {
      switch (address) {
        case "Christchurch":
          return { latitude: -43.5321, longitude: 172.6362 };
        case "Queenstown":
          return { latitude: -45.0312, longitude: 168.6626 };
        default:
          return { latitude: 0, longitude: 0 };
      }
    });

    jest.spyOn(distanceModule, "queryOsrm").mockImplementation(async () => {
      return { distance_km: 486.4, duration_min: 364 };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should return a list of vehicles for given query", async () => {
    const response = await request(app)
      .get("/api/vehicles")
      .query({ make: "Toyota", model: "Corolla", year: "2008" });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return empty array if no matching vehicles", async () => {
    const response = await request(app)
      .get("/api/vehicles")
      .query({ make: "Nonexistent", model: "Car", year: "2006" });

    const fakeVehicle: VehicleDataType[] = [
      {
        make: "Toyota",
        model: "Corolla",
        model_year: "2008",
        vehicle_class: "Sedan",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 8.5,
        fuel_consumption_hwy: 6.2,
        fuel_consumption_comb: 7.4,
        co2_emissions: 17
      },
      {
        make: "Toyota",
        model: "Camry",
        model_year: "2012",
        vehicle_class: "Sedan",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 8.5,
        fuel_consumption_hwy: 6.2,
        fuel_consumption_comb: 7.4,
        co2_emissions: 17
      }
    ];

    jest.spyOn(vehicleData, "fetchVehicleRecords").mockResolvedValue(fakeVehicle);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it("should calculate a trip for a valid vehicle using mocked APIs", async () => {
    const postData = {
      vehicle_id: 1,
      make: "Toyota",
      model: "Corolla",
      model_year: "2008",
      locations: ["Christchurch", "Queenstown"]
    };

    const fakeVehicle: VehicleDataType[] = [
      {
        make: "Toyota",
        model: "Corolla",
        model_year: "2008",
        vehicle_class: "Sedan",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 8.5,
        fuel_consumption_hwy: 6.2,
        fuel_consumption_comb: 7.4,
        co2_emissions: 17
      }
    ];

    jest.spyOn(vehicleData, "fetchVehicleRecords").mockResolvedValue(fakeVehicle);

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("distance_km", 486.4);
    expect(response.body).toHaveProperty("hours", 6);
    expect(response.body).toHaveProperty("minutes", 4);
    expect(response.body).toHaveProperty("fuel_used_l", 35.9936);
    expect(response.body.co2_kg).toBeCloseTo(8.2688, 2);
  });

  it("should return 400 for missing vehicle info using mocked APIs", async () => {
    const response = await request(app)
      .post("/api/trip")
      .send({})  // empty body
      .set("Accept", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("returns vehicles for given make/model/year using mocked APIs", async () => {
    const fakeVehicles: VehicleDataType[] = [
      {
        make: "Toyota",
        model: "Corolla",
        model_year: "2008",
        vehicle_class: "Sedan",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 8.5,
        fuel_consumption_hwy: 6.2,
        fuel_consumption_comb: 7.4,
        co2_emissions: 180,
      },
    ];


    jest.spyOn(vehicleData, "fetchVehicleRecords").mockResolvedValue(fakeVehicles);

    const res = await request(app).get("/api/vehicles?make=Toyota&model=Corolla&year=2008");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeVehicles);
    expect(vehicleData.fetchVehicleRecords).toHaveBeenCalledWith("Toyota", "Corolla", "2008");
  });

  it("returns 500 if fetchVehicleRecords throws using mocked APIs", async () => {
    jest.spyOn(vehicleData, "fetchVehicleRecords").mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/vehicles");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("DB error");
  });
});
