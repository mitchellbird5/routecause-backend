// tests/integration/emissions.integration.test.ts
import request from "supertest";
import { app } from "../../src/api/server"; // adjust path if needed

describe("End-to-End: /emissions", () => {
  it("should return emissions for valid category value", async () => {
    const res = await request(app)
      .get("/api/emissions")
      .query({ column: "category", value: "food" })
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("category", "Food");
      expect(res.body[0]).toHaveProperty("label");
      expect(res.body[0]).toHaveProperty("value");
    }
  });

  it("should return 400 for invalid column", async () => {
    const res = await request(app)
      .get("/api/emissions")
      .query({ column: "invalid_column", value: "Food" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid column name");
  });

  it("should return 400 for invalid value", async () => {
    const res = await request(app)
      .get("/api/emissions")
      .query({ column: "category", value: "InvalidValue" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid category value");
  });

  it("should handle missing params gracefully", async () => {
    const res = await request(app).get("/api/emissions");
    expect(res.status).toBe(400);
  });
});
