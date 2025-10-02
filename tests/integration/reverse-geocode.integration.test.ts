import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("Integration: /api/reverse-geocode (real API)", () => {
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
  }, 20000); // Allow 20s timeout for real API call

  it("returns 400 for missing or invalid lat/lon", async () => {
    const res1 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: "abc", lon: 172.6362 });
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    const res2 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: -43.5321 });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");

    const res3 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat: 45, lon: "abc" });
    expect(res3.status).toBe(400);
    expect(res3.body).toHaveProperty("error");

    const res4 = await request(app)
      .get("/api/reverse-geocode")
      .query({ lon: -43.5321 });
    expect(res4.status).toBe(400);
    expect(res4.body).toHaveProperty("error");
  });

  it("returns 500 if coordinates are unlikely to resolve", async () => {
    // coordinates in the middle of the ocean
    const lat = 0;
    const lon = 0;

    const res = await request(app)
      .get("/api/reverse-geocode")
      .query({ lat, lon });

    expect([200, 500]).toContain(res.status); 
    // Nominatim sometimes returns a result even for ocean, sometimes not
    if (res.status === 200) {
      expect(res.body.address).toBeTruthy();
    } else {
      expect(res.body).toHaveProperty("error");
    }
  }, 20000);
});
