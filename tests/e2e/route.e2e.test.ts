import request from "supertest";
import { app } from "../../src/api/server";

describe("End-to-End: /trip", () => {
  it("calls /trip API", async () => {
      const res = await request(app)
        .post("/api/trip")
        .send({
          locations: [
            { latitude: 51.5072,   longitude: -0.1275   },  
            { latitude: 52.4895,   longitude: -1.8986   },
            { latitude: 55.9533,   longitude: -3.1965   },
            { latitude: 55.8610,   longitude: -4.2490   }
          ],
          radius: 1e3
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("distance_km");
      expect(res.body).toHaveProperty("hours");
      expect(res.body).toHaveProperty("minutes");
      expect(res.body).toHaveProperty("wayCategory");
    },
    600000
  );

  it("calls /trip API within 25km of snappable route", async () => {
      const res = await request(app)
        .post("/api/trip")
        .send({
          locations: [
            { latitude: 51.5072,   longitude: -0.1275   },  
            { latitude: 52.4895,   longitude: -1.8986   },
            { latitude: 55.9533,   longitude: -3.1965   },
            { latitude: 53.628292,   longitude: -0.168410   }
          ],
          radius: 1e3
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("distance_km");
      expect(res.body).toHaveProperty("hours");
      expect(res.body).toHaveProperty("minutes");
      expect(res.body).toHaveProperty("wayCategory");
    },
    600000
  );
});
