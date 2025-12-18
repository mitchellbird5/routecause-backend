// tests/integration/emissions.integration.test.ts
import request from "supertest";
import { app } from "../../src/api/server"; // adjust path if needed

describe("End-to-End: /emissions-comparison", () => {
  it("should return emissions with correct columns", async () => {
    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ 
        column: "category", 
        filter: "food", 
        emissions: ["1.0", "10.0"].join(",") 
      })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const item = res.body[0];
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("emission_equivalent_value");
      expect(item).toHaveProperty("emission_equivalent_unit");
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("source");
      expect(item).toHaveProperty("equivalent_description");

      // Optional: check types
      expect(typeof item.label).toBe("string");
      expect(typeof item.category).toBe("string");
      expect(item.emission_equivalent_value).toBeInstanceOf(Array);
      expect(typeof item.emission_equivalent_unit).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(typeof item.source).toBe("string");
    }
  });

  it("should fail with invalid column", async () => {
    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ 
        column: "invalid_column", 
        filter: "food", 
        emissions: ["1.0", "10.0"].join(",") 
      })
      .set("Accept", "application/json");

    expect(res.status).toBe(400);
  });

  it("should fail with invalid filter", async () => {
    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ 
        column: "invalid_column", 
        filter: "invalid_filter", 
        emissions: ["1.0", "10.0"].join(",") 
      })
      .set("Accept", "application/json");

    expect(res.status).toBe(400);
  });
});
