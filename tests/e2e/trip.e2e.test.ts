import request from "supertest";
import { app } from "../../src/api/server";

describe("End-to-End: /trip", () => {
  it("calls /trip API", async () => {
      const res = await request(app)
        .post("/api/trip")
        .send({
          vehicle_id: 1,
          make: "Toyota",
          model: "Corolla",
          model_year: "2008",
          locations: ["Cuba Street, Wellington, New Zealand", "Te Papa Museum, Wellington, New Zealand"],
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("distance_km");
      expect(res.body).toHaveProperty("hours");
      expect(res.body).toHaveProperty("minutes");
      expect(res.body).toHaveProperty("fuel_used_l");
      expect(res.body).toHaveProperty("co2_kg");
    },
    20000
  );
});
