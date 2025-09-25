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

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("distance_km");
    expect(res.body).toHaveProperty("hours");
    expect(res.body).toHaveProperty("minutes");
    expect(res.body).toHaveProperty("fuel_used_l");
    expect(res.body).toHaveProperty("co2_kg");
  });
});
