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
        start: "Christchurch",
        end: "Queenstown"
      })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("distance_km");
    expect(res.body).toHaveProperty("hours");
    expect(res.body).toHaveProperty("minutes");
    expect(res.body).toHaveProperty("fuel_used_l");
    expect(res.body).toHaveProperty("co2_kg");

    // sanity checks
    expect(res.body.distance_km).toBeCloseTo(481.5043, 1);
    expect(res.body.hours).toBe(6);
    expect(res.body.minutes).toBe(23);
    expect(res.body.fuel_used_l).toBeCloseTo(35.6313182, 1)
    expect(res.body.co2_kg).toBeCloseTo(81.855731, 1)
  });
});
