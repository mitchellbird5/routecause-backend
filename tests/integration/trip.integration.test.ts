import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as distanceModule from "../../src/distance/distance";
import * as vehicleData from "../../src/vehicle/vehicle";
import { VehicleData as VehicleDataType } from "../../src/vehicle/vehicle.types"

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("/trip API Route (mocked external APIs)", () => {

  beforeAll(() => {
    // Mock geocodeAddress and queryRoute
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

    jest.spyOn(distanceModule, "queryRoute").mockImplementation(async () => {
      return { distance_km: 486.4, duration_min: 364 };
    });

    jest.spyOn(vehicleData, "selectVehicle");
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should calculate a trip for a valid vehicle using mocked APIs and full route", async () => {
    const postData = {
      vehicle_id: 1,
      make: "Toyota",
      model: "Corolla",
      model_year: "2008",
      locations: ["Christchurch", "Queenstown"],
      overview: "full"
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


  it("should calculate a trip for a valid vehicle using mocked APIs and false route", async () => {
    const postData = {
      vehicle_id: 1,
      make: "Toyota",
      model: "Corolla",
      model_year: "2008",
      locations: ["Christchurch", "Queenstown"],
      overview: "false"
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
    expect(response.body).toHaveProperty("error", "Missing Vehicle ID or vehicle info.");
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

});
