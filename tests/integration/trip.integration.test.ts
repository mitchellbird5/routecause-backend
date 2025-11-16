import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as geocodeSearchModule from "../../src/route/geocodeSearch";
import * as routeModule from "../../src/route/route";
import * as vehicleData from "../../src/vehicle/vehicle";
import { VehicleData as VehicleDataType } from "../../src/vehicle/vehicle.types"
import * as tripService from "../../src/services/tripService";
import { apiRateLimitExceededError } from "../../src/utils/rateLimiter";
import { Coordinates } from "../../src/route/route.types";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("/trip API Route (mocked external APIs)", () => {

  beforeAll(() => {
    // Mock geocodeAddress and queryRoute
    jest.spyOn(geocodeSearchModule, "geocodeAddress").mockImplementation(async (address: string) => {
      switch (address) {
        case "Christchurch":
          return { latitude: -43.5321, longitude: 172.6362 };
        case "Queenstown":
          return { latitude: -45.0312, longitude: 168.6626 };
        default:
          return { latitude: 0, longitude: 0 };
      }
    });

    jest.spyOn(routeModule, "queryRoute").mockImplementation(async () => {
      return { distance_km: 486.4, duration_min: 364, route: [{latitude: 1, longitude: 2}] };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should calculate a trip for a valid vehicle using mocked APIs and full route", async () => {
    const postData = {
      locations: [{longitude:0, latitude:0}, {longitude:1, latitude:1}],
    };

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("distance_km", 486.4);
    expect(response.body).toHaveProperty("hours", 6);
    expect(response.body).toHaveProperty("minutes", 4);
    expect(response.body).toHaveProperty("route", [{latitude: 1, longitude: 2}]);
  });


  it("should calculate a trip for a valid vehicle using mocked APIs and false route", async () => {
    const postData = {
      locations: [{longitude:0, latitude:0}, {longitude:1, latitude:1}],
    };

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("distance_km", 486.4);
    expect(response.body).toHaveProperty("hours", 6);
    expect(response.body).toHaveProperty("minutes", 4);
    expect(response.body).toHaveProperty("route", [{latitude: 1, longitude: 2}]);
  });

  it("should return 400 for missing vehicle info using mocked APIs", async () => {
    const response = await request(app)
      .post("/api/trip")
      .send({})  // empty body
      .set("Accept", "application/json");

    expect(response.status).toBe(400);
  });

    it("returns 500 for unexpected errors", async () => {
    jest.spyOn(tripService, "getTripService").mockRejectedValue(
      new Error("Unexpected failure")
    );

    const postData = {
      locations: [{longitude:0, latitude:0}, {longitude:1, latitude:1}],
    };

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  it("returns correct response for minute limit exceedance", async () => {
    jest.spyOn(tripService, "getTripService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_MINUTE",
        429,
        "minute",
        3000
      )
    );

    const postData = {
      locations: [{longitude:0, latitude:0}, {longitude:1, latitude:1}],
    };

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_MINUTE",
      limitFreq: "minute",
      timeToResetMs: 3000
    });
  });

  it("returns correct response for daily limit exceedance", async () => {
    jest.spyOn(tripService, "getTripService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_DAILY",
        429,
        "daily",
        50000
      )
    );

    const postData = {
      locations: [{longitude:0, latitude:0}, {longitude:1, latitude:1}],
    };

    const response = await request(app)
      .post("/api/trip")
      .send(postData)
      .set("Accept", "application/json");

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_DAILY",
      limitFreq: "daily",
      timeToResetMs: 50000
    });
  });

});
