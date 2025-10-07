import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as vehicleData from "../../src/vehicle/vehicle";
import { VehicleData as VehicleDataType } from "../../src/vehicle/vehicle.types"

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("/vehicle API Route (mocked external APIs)", () => {

  beforeEach(() => {
    jest.restoreAllMocks();
  });

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

  it("should return a list of vehicles for given query", async () => {
    jest.spyOn(vehicleData, "fetchVehicleRecords").mockResolvedValue(fakeVehicle);

    const response = await request(app)
      .get("/api/vehicles")
      .query({ make: "Toyota", model: "Corolla", year: "2008" });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return empty array if no matching vehicles", async () => {
    jest.spyOn(vehicleData, "fetchVehicleRecords").mockResolvedValue([]);

    const response = await request(app)
      .get("/api/vehicles")
      .query({ make: "Nonexistent", model: "Car", year: "2006" });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
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