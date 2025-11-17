import request from "supertest";
import { app } from "../../src/api/server";


describe("End-to-End: /vehicles", () => {
  it("calls /vehicle API", async () => {
      const res = await request(app)
      .get("/api/vehicles")
      .query({
        make: "Toyota",
        model: "Corolla",
        year: "2015",
      })
      .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("co2_emissions");
      expect(res.body[0]).toHaveProperty("cylinders");
      expect(res.body[0]).toHaveProperty("engineSize");
      expect(res.body[0]).toHaveProperty("fuelConsumptionCity");
      expect(res.body[0]).toHaveProperty("fuelConsumptionComb");
      expect(res.body[0]).toHaveProperty("fuelConsumptionHwy");
      expect(res.body[0]).toHaveProperty("fuelType");
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("make");
      expect(res.body[0]).toHaveProperty("model");
      expect(res.body[0]).toHaveProperty("modelYear");
      expect(res.body[0]).toHaveProperty("transmission");
      expect(res.body[0]).toHaveProperty("vehicleClass");
      expect(res.body[0].make).toBe("Toyota");
      expect(res.body[0].model).toBe("Corolla LE Eco (1-Mode)");
      expect(res.body[0].modelYear).toBe("2015");
    }
  );

  it("calls /vehicle API and tests capitalisation", async () => {
      const res = await request(app)
      .get("/api/vehicles")
      .query({
        make: "toYOtA",
        model: "cOrOLla",
        year: "2015",
      })
      .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("co2_emissions");
      expect(res.body[0]).toHaveProperty("cylinders");
      expect(res.body[0]).toHaveProperty("engineSize");
      expect(res.body[0]).toHaveProperty("fuelConsumptionCity");
      expect(res.body[0]).toHaveProperty("fuelConsumptionComb");
      expect(res.body[0]).toHaveProperty("fuelConsumptionHwy");
      expect(res.body[0]).toHaveProperty("fuelType");
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("make");
      expect(res.body[0]).toHaveProperty("model");
      expect(res.body[0]).toHaveProperty("modelYear");
      expect(res.body[0]).toHaveProperty("transmission");
      expect(res.body[0]).toHaveProperty("vehicleClass");
      expect(res.body[0].make).toBe("Toyota");
      expect(res.body[0].model).toBe("Corolla LE Eco (1-Mode)");
      expect(res.body[0].modelYear).toBe("2015");
    }
  );
});
