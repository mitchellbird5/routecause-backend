// tests/integration/emissions.integration.test.ts
import request from "supertest";
import { app } from "../../src/api/server"; // adjust path if needed

describe("End-to-End: /emissions-comparison", () => {
  it("should return emissions with correct columns", async () => {
    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ column: "category", filter: "food", emissions: "1.0" })
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
      expect(typeof item.emission_equivalent_value).toBe("number");
      expect(typeof item.emission_equivalent_unit).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(typeof item.source).toBe("string");
    }
  });
});
