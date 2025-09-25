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
        start: "Jervois Quay, Wellington Central, Wellington, 6040, New Zealand",
        end: "Tony's Tyre Service Jervois Quay, 54, Jervois Quay, Lambton, Wellington Central, Wellington, 6011, New Zealand"
      })
      .set("Accept", "application/json");

    console.log("Response body:", res.body);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("distance_km");
    expect(res.body).toHaveProperty("hours");
    expect(res.body).toHaveProperty("minutes");
    expect(res.body).toHaveProperty("fuel_used_l");
    expect(res.body).toHaveProperty("co2_kg");

    expect(res.body.distance_km).toBeCloseTo(0.0277, 4);
    expect(res.body.hours).toBe(0);
    expect(res.body.minutes).toBeCloseTo(0);
    expect(res.body.fuel_used_l).toBeCloseTo(0.0020498, 7)
    expect(res.body.co2_kg).toBeCloseTo(0.004709, 7)
  });
});
