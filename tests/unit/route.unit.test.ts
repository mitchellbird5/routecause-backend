import axios from "axios";
import polyline from "@mapbox/polyline";

import { queryRoute } from "../../src/route/route";
import {
  Coordinates,
  convertCoordinateListToLonLat
} from "../../src/route/route.types";

import { convertMinutes } from "../../src/route/duration";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;


describe("Logic testing", () => {

  describe("convertMinutes", () => {

    it.each([
      { totalMinutes: 125, expectedHours: 2, expectedMinutes: 5 },
      { totalMinutes: 60, expectedHours: 1, expectedMinutes: 0 },
      { totalMinutes: 45, expectedHours: 0, expectedMinutes: 45 },
      { totalMinutes: 0, expectedHours: 0, expectedMinutes: 0 },
      { totalMinutes: 150, expectedHours: 2, expectedMinutes: 30 },
      { totalMinutes: 160.1, expectedHours: 2, expectedMinutes: 40.1 },
      { totalMinutes: 160.5, expectedHours: 2, expectedMinutes: 40.5 },
      { totalMinutes: 160.9, expectedHours: 2, expectedMinutes: 40.9 },
    ])("converts $totalMinutes", ({ totalMinutes, expectedHours, expectedMinutes }) => {
      const result = convertMinutes(totalMinutes);
      expect(result.hours).toBeCloseTo(expectedHours);
      expect(result.minutes).toBeCloseTo(expectedMinutes);
    });

    it("throws if totalMinutes negative", () => {
      expect(() => convertMinutes(-1)).toThrow();
    });
  });

  describe("convertCoordinateListToLonLat", () => {
    it("converts correctly", () => {
      const coords: Coordinates[] = [
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ];

      expect(convertCoordinateListToLonLat(coords))
        .toEqual([
          [2,1],
          [4,3]
        ]);
    });
  });

});


describe("Mocked ORS API", () => {

  beforeEach(() => {
    jest.resetAllMocks();
    (process.env.APP_ENV as any) = "production";
  });

  it("returns ORS result OK", async () => {

    const encoded = polyline.encode([
      [-43.531,172.655],
      [-45.021,168.738]
    ]);

    mockedAxios.post
      .mockResolvedValueOnce({
        status: 200,
        data: {
          routes: [{
            geometry: encoded,
            summary: { distance: 1000, duration: 60 },
            extras: {
              waycategory: {
                summary: [
                  { value: 0, distance: 600, amount: 60 },
                  { value: 1, distance: 400, amount: 40 }
                ],
                values: [
                  [0,1,0],
                  [1,2,1]
                ]
              }
            }
          }]
        }
      });

    const start = { latitude: -43.531, longitude: 172.655 };
    const end   = { latitude: -45.021, longitude: 168.738 };

    const result = await queryRoute([start,end], 1000);

    expect(result.distance_km).toBe(1);
    expect(result.duration_min).toBe(1);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    expect(result.route).toEqual([
      { latitude: -43.531, longitude: 172.655 },
      { latitude: -45.021, longitude: 168.738 },
    ]);

    expect(result.wayCategory?.summary).toEqual({
      "No category": { distance_km: 0.6, percentage: 60 },
      "Highway":     { distance_km: 0.4, percentage: 40 },
    });

    expect(result.wayCategory?.values).toEqual([
      [0,1,0],
      [1,2,1]
    ]);
  });


  it("throws snapped error when callSnapOrsApi result invalid", async () => {

    // fail first ORS post
    mockedAxios.post
      .mockRejectedValueOnce({
        code:2010,
        message:"ORS request failed"
      });

    const start = { latitude: -40, longitude: 170 };
    const end = { latitude: -41, longitude: 171 };

    await expect(queryRoute([start,end], 2000))
      .rejects
      .toBeDefined();
  });

});
