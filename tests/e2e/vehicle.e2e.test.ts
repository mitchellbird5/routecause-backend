import request from "supertest";
import { app } from "../../src/api/server";


describe("End-to-End: /vehicles", () => {
  it("calls /vehicle API", async () => {
      const res = await request(app)
      .get("/api/vehicles")
      .query({
        make: "Toyota",
        model: "Corolla",
        year: "2008",
      })
      .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("co2_emissions");
      expect(res.body[0]).toHaveProperty("cylinders");
      expect(res.body[0]).toHaveProperty("engine_size");
      expect(res.body[0]).toHaveProperty("fuel_consumption_city");
      expect(res.body[0]).toHaveProperty("fuel_consumption_comb");
      expect(res.body[0]).toHaveProperty("fuel_consumption_hwy");
      expect(res.body[0]).toHaveProperty("fuel_type");
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("make");
      expect(res.body[0]).toHaveProperty("model");
      expect(res.body[0]).toHaveProperty("model_year");
      expect(res.body[0]).toHaveProperty("transmission");
      expect(res.body[0]).toHaveProperty("vehicle_class");
      expect(res.body[0].make).toBe("Toyota");
      expect(res.body[0].model).toBe("Corolla");
      expect(res.body[0].model_year).toBe("2008");
    }
  );

  it("calls /vehicle API and tests capitalisation", async () => {
      const res = await request(app)
      .get("/api/vehicles")
      .query({
        make: "toYOtA",
        model: "cOrOLla",
        year: "2008",
      })
      .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("co2_emissions");
      expect(res.body[0]).toHaveProperty("cylinders");
      expect(res.body[0]).toHaveProperty("engine_size");
      expect(res.body[0]).toHaveProperty("fuel_consumption_city");
      expect(res.body[0]).toHaveProperty("fuel_consumption_comb");
      expect(res.body[0]).toHaveProperty("fuel_consumption_hwy");
      expect(res.body[0]).toHaveProperty("fuel_type");
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("make");
      expect(res.body[0]).toHaveProperty("model");
      expect(res.body[0]).toHaveProperty("model_year");
      expect(res.body[0]).toHaveProperty("transmission");
      expect(res.body[0]).toHaveProperty("vehicle_class");
      expect(res.body[0].make).toBe("Toyota");
      expect(res.body[0].model).toBe("Corolla");
      expect(res.body[0].model_year).toBe("2008");
    }
  );
});
