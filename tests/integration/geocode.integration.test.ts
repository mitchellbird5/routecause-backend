import request from "supertest";
import express from "express";
import { router as apiRouter } from "../../src/api/routes";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

describe("Integration: /api/geocode (real API)", () => {
  it("returns coordinates for a valid address", async () => {
    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "Cuba Street, Wellington, New Zealand" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("latitude");
    expect(res.body).toHaveProperty("longitude");
  }, 20000);

  it("returns 400 if address is missing", async () => {
    const res = await request(app).get("/api/geocode");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("handles an address that likely does not exist", async () => {
    const res = await request(app)
      .get("/api/geocode")
      .query({ address: "asdlkfjasdlfkjasdlfkj" }); // nonsense

    // It might be 500 if Nominatim can’t resolve
    expect([200, 500]).toContain(res.status);
  }, 20000);
});