import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";
import { Coordinates } from "../../src/distance/distance.types";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("End-to-End: /geocode", () => {
  it("returns coordinates for a valid address", async () => {
    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Cuba Street, Wellington, New Zealand" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("latitude");
    expect(res.body).toHaveProperty("longitude");
  }, 20000);
});

describe("End-to-End: /reverse-geocode", () => {
  it("returns an address for valid latitude and longitude", async () => {
    const lat = -43.5321; // Christchurch
    const lon = 172.6362;

    const res = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat, lon })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("address");
    expect(typeof res.body.address).toBe("string");
    expect(res.body.address.length).toBeGreaterThan(0);
  }, 20000);
});

describe("End-to-End: /geocode-multi", () => {
  it("returns multiple suggestions for a valid query and limit", async () => {
    const res = await request(app)
      .get("/api/geocode-multi")
      .query({ address: "Cuba Street, Wellington", limit: 3 })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    res.body.forEach((item: any) => {
      expect(item).toHaveProperty("address");
      expect(typeof item.address).toBe("string");
      expect(item.address.length).toBeGreaterThan(0);

      expect(item).toHaveProperty("coordinates");
      expect(item.coordinates).toHaveProperty("latitude");
      expect(typeof item.coordinates.latitude).toBe("number");
      expect(item.coordinates).toHaveProperty("longitude");
      expect(typeof item.coordinates.longitude).toBe("number");
    });
  }, 20000);
});