import request from "supertest";
import { app } from "../../src/api/server";

describe("End-to-End: /route", () => {
  it("calls /route API", async () => {
      const res = await request(app)
        .post("/api/route")
        .send({
          locations: [
            { latitude: 51.5072,   longitude: -0.1275   },  
            { latitude: 52.4895,   longitude: -1.8986   },
            { latitude: 55.9533,   longitude: -3.1965   },
            { latitude: 55.8610,   longitude: -4.2490   }
          ],
          radius: 1e3,
          options: {
            extra_info: ["waycategory"]
          }
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res).toHaveProperty('body');
      expect(res.body.routes).toHaveLength(1);
      expect(res.body.routes[0].summary).toHaveProperty("distance");
      expect(res.body.routes[0].summary).toHaveProperty("duration");
      expect(res.body.routes[0]).toHaveProperty("geometry");
      expect(res.body.routes[0].extras).toHaveProperty("waycategory");
    },
    600000
  );

  it("calls /route API within 25km of snappable route", async () => {
      const res = await request(app)
        .post("/api/route")
        .send({
          locations: [
            { latitude: 51.5072,   longitude: -0.1275   },  
            { latitude: 52.4895,   longitude: -1.8986   },
            { latitude: 55.9533,   longitude: -3.1965   },
            { latitude: 53.628292,   longitude: -0.168410   }
          ],
          radius: 1e3,
          options: {
            extra_info: ["waycategory"]
          }
        })
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res).toHaveProperty('body');
      expect(res.body.routes).toHaveLength(1);
      expect(res.body.routes[0].summary).toHaveProperty("distance");
      expect(res.body.routes[0].summary).toHaveProperty("duration");
      expect(res.body.routes[0]).toHaveProperty("geometry");
      expect(res.body.routes[0].extras).toHaveProperty("waycategory");
    },
    600000
  );
});
