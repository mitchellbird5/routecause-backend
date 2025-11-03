import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as geocodeService from "../../src/services/geocodeService";
import { apiRateLimitExceededError } from "../../src/utils/rateLimiter";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("/geocode API Route (mocked external APIs)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns coordinates for a valid address", async () => {
    jest.spyOn(geocodeService, "getGeocodeService").mockResolvedValue({
      latitude: -43.5321,
      longitude: 172.6362,
    });

    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Test Address" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      latitude: -43.5321,
      longitude: 172.6362,
    });
  });

  it("returns 400 if address is missing", async () => {
    const res = await request(app).get("/api/geocode");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing or invalid 'address' query param.");
  });

  it("returns 500 if service throws an error", async () => {
    jest.spyOn(geocodeService, "getGeocodeService").mockRejectedValue(
      new Error("Internal Server Error")
    );

    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Fail Address" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Internal Server Error");
  });

  it("returns correct response for minute limit exceedance", async () => {
    // Mock the service to throw minute limit error
    jest.spyOn(geocodeService, "getGeocodeService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_MINUTE",
        429,
        "minute",
        3000,
      )
    );

    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Test Address" });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_MINUTE",
      limitFreq: "minute",
      timeToResetMs: 3000
    });
  });

  it("returns correct response for daily limit exceedance", async () => {
    // Mock the service to throw daily limit error
    jest.spyOn(geocodeService, "getGeocodeService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_DAILY",
        429,
        "daily",
        50000,
      )
    );

    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Test Address" });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_DAILY",
      limitFreq: "daily",
      timeToResetMs: 50000
    });
  });
});

describe("/geocode-multi API Route (mocked external APIs)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns multiple address suggestions for a valid query and limit", async () => {
    const mockSuggestions = [
      { 
        address: "Place 1", 
        coordinates: {
          latitude: 1.1, 
          longitude: 2.1 
        }
      },
      { address: "Place 2", 
        coordinates: {
          latitude: 3.3, 
          longitude: 4.4 
        }
      },
    ];

    jest.spyOn(geocodeService, "getGeocodeMultiService").mockResolvedValue(mockSuggestions);

    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ q: "Test Query", limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockSuggestions);
  });

  it("returns 400 if query is missing", async () => {
    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ limit: 2 });

    // Mocked service throws 400 if query is missing
    jest.spyOn(geocodeService, "getGeocodeMultiService").mockImplementation(() => {
      throw { status: 400, message: "Missing or invalid 'address' parameter." };
    });

    expect(res.status).toBe(400);
  });

  it("returns 500 if service throws an error", async () => {
    jest.spyOn(geocodeService, "getGeocodeMultiService").mockRejectedValue(
      new Error("Internal Server Error")
    );

    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ q: "Fail Query", limit: 2 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Internal Server Error");
  });

  it("returns correct response for minute limit exceedance", async () => {
    // Mock the service to throw minute limit error
    jest.spyOn(geocodeService, "getGeocodeMultiService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_MINUTE",
        429,
        "minute",
        3000,
      )
    );

    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ address: "Test Address", limit: 3 });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_MINUTE",
      limitFreq: "minute",
      timeToResetMs: 3000
    });
  });

  it("returns correct response for daily limit exceedance", async () => {
    // Mock the service to throw daily limit error
    jest.spyOn(geocodeService, "getGeocodeMultiService").mockRejectedValue(
      new apiRateLimitExceededError(
        "RATE_LIMIT_EXCEEDED_DAILY",
        429,
        "daily",
        50000
      )
    );

    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ address: "Test Address", limit: 3 });

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "RATE_LIMIT_EXCEEDED_DAILY",
      limitFreq: "daily",
      timeToResetMs: 50000
    });
  });
});

describe("/reverse-geocode API Route (mocked external APIs)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an address for valid lat/lon", async () => {
    jest.spyOn(geocodeService, "getReverseGeocodeService").mockResolvedValue(
      "123 Mocked Street, Test City"
    );

    const res = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: -43.5321, lon: 172.6362 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("address", "123 Mocked Street, Test City");
  });

  it("returns 400 for missing or invalid lat/lon", async () => {
    const res1 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: "abc", lon: 172.6362 });
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error", "Invalid latitude or longitude.");

    const res2 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: -43.5321 });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error", "Invalid latitude or longitude.");

    const res3 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: 45, lon: "abc" });
    expect(res3.status).toBe(400);
    expect(res3.body).toHaveProperty("error", "Invalid latitude or longitude.");

    const res4 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lon: -43.5321 });
    expect(res4.status).toBe(400);
    expect(res4.body).toHaveProperty("error", "Invalid latitude or longitude.");
  });

  it("returns 500 if service throws an error", async () => {
    jest.spyOn(geocodeService, "getReverseGeocodeService").mockRejectedValue(
      new Error("Internal Server Error")
    );

    const res = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: -43.5321, lon: 172.6362 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Internal Server Error");
  });
});

