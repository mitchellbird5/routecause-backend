// tests/integration/emissions.api.test.ts
import request from "supertest";
import express, { Request, Response } from "express";
import { router as apiRouter } from "../../src/api/routes";
import * as emissionsService from "../../src/services/emissionsService";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

jest.mock("../../src/services/emissionsService");

describe("/emissions-comparison API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with emission equivalents", async () => {
    (emissionsService.getEmissionsService as jest.Mock).mockResolvedValue([
      {
        label: "Beef",
        category: "food",
        emission_equivalent_value: 0.1,
        emission_equivalent_unit: "kg"
      }
    ]);

    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ column: "category", filter: "food", emissions: "10" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        label: "Beef",
        category: "food",
        emission_equivalent_value: 0.1,
        emission_equivalent_unit: "kg"
      }
    ]);
  });

  it("returns 500 if service throws", async () => {
    (emissionsService.getEmissionsService as jest.Mock).mockRejectedValue({
      status: 500,
      message: "Database query failed"
    });

    const res = await request(app)
      .get("/api/emissions-comparison")
      .query({ column: "category", filter: "food", emissions: "10" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Database query failed");
  });
});
