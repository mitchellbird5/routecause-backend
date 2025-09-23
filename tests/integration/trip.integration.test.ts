import request from "supertest";
import { app } from "../../src/api/server";

describe("Integration: /api/trip", () => {
  it("calculates a trip using real OSRM + Nominatim", async () => {
    const res = await request(app)
      .post("/api/trip")
      .send({
        vehicle_id: 1,
        make: "Toyota",
        model: "Corolla",
        model_year: "2008",
        start: "Wellington Railway Station",
        end: "Te Papa Museum"
      })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("distance_km");
    expect(res.body).toHaveProperty("hours");
    expect(res.body).toHaveProperty("minutes");
    expect(res.body).toHaveProperty("fuel_used_l");
    expect(res.body).toHaveProperty("co2_kg");

    // sanity checks
    expect(res.body.distance_km).toBeCloseTo(1.5504, 1);
    expect(res.body.hours).toBe(0);
    expect(res.body.minutes).toBe(3);
    expect(res.body.fuel_used_l).toBeCloseTo(0.1147296, 1)
    expect(res.body.co2_kg).toBeCloseTo(0.263568, 1)
  });
});
