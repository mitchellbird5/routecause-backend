import request from "supertest";
import { app } from "../../src/api/server";
import { getNodeEnvironmentFlag } from "../../src/utils/getEnvVariables";

const isProduction = getNodeEnvironmentFlag();

describe("End-to-End: /trip", () => {
  it("calls /trip API", async () => {
      const res = await request(app)
        .post("/api/trip")
        .send({
          locations: [
            { latitude: -41.219366, longitude: 174.889145 }, // Auckland
            { latitude: -41.290588, longitude: 174.781064 }
          ],
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("distance_km");
      expect(res.body).toHaveProperty("hours");
      expect(res.body).toHaveProperty("minutes");
      if (isProduction) {
        expect(res.body).toHaveProperty("wayCategory");
      }
    },
    20000
  );

  it("calls /trip API within 25km of snappable route", async () => {
      const res = await request(app)
        .post("/api/trip")
        .send({
          locations: [
            { latitude: -41.219366, longitude: 174.889145 }, // Auckland
            { latitude: -36.732047, longitude: 174.794605 }
          ],
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("distance_km");
      expect(res.body).toHaveProperty("hours");
      expect(res.body).toHaveProperty("minutes");
      if (isProduction) {
        expect(res.body).toHaveProperty("wayCategory");
      }
    },
    20000
  );
});
