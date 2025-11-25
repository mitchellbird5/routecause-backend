import axios from "axios";
import { convertMinutes } from "../../src/route/duration";
import { 
  callOrsRouteApiWithRetry, 
  queryRoute
} from "../../src/route/route";
import { 
  Coordinates
} from "../../src/route/route.types";
import polyline from "@mapbox/polyline";

jest.mock("axios"); // Mock the entire axios module
  const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Logic testing", () => {

  // ----------------------
  // convertMinutes
  // ----------------------
  describe("convertMinutes", () => {
    const cases = [
      { totalMinutes: 125, expectedHours: 2, expectedMinutes: 5 },
      { totalMinutes: 60, expectedHours: 1, expectedMinutes: 0 },
      { totalMinutes: 45, expectedHours: 0, expectedMinutes: 45 },
      { totalMinutes: 0, expectedHours: 0, expectedMinutes: 0 },
      { totalMinutes: 150, expectedHours: 2, expectedMinutes: 30 },
      { totalMinutes: 160.1, expectedHours: 2, expectedMinutes: 40.1 },
      { totalMinutes: 160.5, expectedHours: 2, expectedMinutes: 40.5 },
      { totalMinutes: 160.9, expectedHours: 2, expectedMinutes: 40.9 },
    ];

    cases.forEach(tc => {
      it(`converts ${tc.totalMinutes} minutes to ${tc.expectedHours}h ${tc.expectedMinutes}m`, () => {
        const result = convertMinutes(tc.totalMinutes);
        expect(result.hours).toBeCloseTo(tc.expectedHours, 1);
        expect(result.minutes).toBeCloseTo(tc.expectedMinutes, 1);
      });
    });

    it("should throw an error if totalMinutes is negative", () => {
      expect(() => convertMinutes(-5)).toThrowError("totalMinutes cannot be negative");
    });
  });

});

describe("Mocked API and error testing", () => {
  beforeEach(() => {
    jest.resetAllMocks(); // completely resets mocked implementations
  });

  describe("queryRoute", () => {
    it("returns mocked OSRM route with route", async () => {
      // Arrange: mock axios.get to return a fake OSRM response
      if (process.env.APP_ENV === 'development') {
        mockedAxios.get.mockResolvedValue({
          data: {
            routes: [{ distance: 1000, duration: 60, geometry: "test" }],
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        });
      } else if (process.env.APP_ENV === 'production') {
        // UPDATED: mock ORS production response
        const polylineEncoded = polyline.encode([
          [-43.531, 172.655],
          [-45.021, 168.738],
        ]);

        mockedAxios.post.mockResolvedValue({
          data: {
            routes: [{
              geometry: polylineEncoded,
              summary: { distance: 1000, duration: 60 },
              extras: {
                waycategory: {
                  summary: [
                    { value: 0, distance: 600, amount: 60 },
                    { value: 1, distance: 400, amount: 40 },
                  ],
                  values: [
                    [0, 1, 0],
                    [1, 2, 1],
                  ],
                },
              },
            }],
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        });
      } else {
        throw new Error("Can't find environment configuration")
      }
      
      const start = { latitude: -43.531, longitude: 172.655 } as Coordinates;
      const end = { latitude: -45.021, longitude: 168.738 } as Coordinates;

      // Act
      const result = await queryRoute(start, end);

      // Assert
      expect(result.distance_km).toBe(1);
      expect(result.duration_min).toBe(1);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/v2/directions"),
        expect.objectContaining({
          coordinates: [
            [172.655, -43.531],
            [168.738, -45.021],
          ],
          extra_info: ["waycategory"],
        }),
        expect.any(Object)
      );

      expect(result.route).toEqual([
        { latitude: -43.531, longitude: 172.655 },
        { latitude: -45.021, longitude: 168.738 },
      ]);

      expect(result.wayCategory).toEqual({
        summary: {
          "No category": { distance_km: 0.6, percentage: 60 },
          "Highway": { distance_km: 0.4, percentage: 40 },
        },
        values: [
          [0, 1, 0],
          [1, 2, 1],
        ],
      });
    });

    it("returns response immediately if ORS route succeeds on first try", async () => {
      const start = { latitude: -43.531, longitude: 172.655 };
      const end = { latitude: -45.021, longitude: 168.738 };

      const polylineEncoded = polyline.encode([
          [-43.531, 172.655],
          [-45.021, 168.738],
        ]);

      mockedAxios.post.mockResolvedValue({
        data: {
          routes: [{
            geometry: polylineEncoded,
            summary: { distance: 1000, duration: 60 },
            extras: {
              waycategory: {
                summary: [
                  { value: 0, distance: 600, amount: 60 },
                  { value: 1, distance: 400, amount: 40 },
                ],
                values: [
                  [0, 1, 0],
                  [1, 2, 1],
                ],
              },
            },
          }],
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      const response = await callOrsRouteApiWithRetry(start, end, 10000);

      expect(response.data.routes[0].geometry).toEqual(polylineEncoded);
      expect(response.data.routes[0].summary.distance).toBe(1000);
      expect(response.data.routes[0].summary.duration).toBe(60);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        expect.objectContaining({
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
          ],
          extra_info: ["waycategory"],
        }),
        expect.any(Object)
      );
    });

    it("snaps start coordinate if ORS 2010 error occurs and retries", async () => {
      const start = { latitude: -38.9275225, longitude: 174.8982278 };
      const end = { latitude: -41.285046, longitude: 174.776173 };
      const radius = 10000;

      // Mock axios.get for ORS route
      mockedAxios.post.mockResolvedValueOnce({
        status: 400,
        data: { error: { code: 2010, message: `Could not find routable point within 350m of ${start.longitude} ${start.latitude}` } },
        statusText: "Bad Request",
        headers: {},
        config: {},
      });

      // Mock axios.post for callSnapOrsApi
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { locations: [{location: [174.915644, -38.918619]}] },
        statusText: "OK",
        headers: {},
        config: {},
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { locations: [{location: [174.776173, -41.285046]}] },
        statusText: "OK",
        headers: {},
        config: {},
      });

      
      const polylineEncoded = polyline.encode([
          [-38.918619, 174.915644],
          [-41.285046, 174.776173],
        ]);

      mockedAxios.post.mockResolvedValue({
        data: {
          routes: [{
            geometry: polylineEncoded,
            summary: { distance: 1000, duration: 60 },
            extras: {
              waycategory: {
                summary: [
                  { value: 0, distance: 600, amount: 60 },
                  { value: 1, distance: 400, amount: 40 },
                ],
                values: [
                  [0, 1, 0],
                  [1, 2, 1],
                ],
              },
            },
          }],
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      const response = await callOrsRouteApiWithRetry(start, end, radius);

      expect(response.data.routes[0].geometry).toEqual(polylineEncoded);
      expect(response.data.routes[0].summary.distance).toBe(1000);
      expect(response.data.routes[0].summary.duration).toBe(60);
      expect(mockedAxios.post).toHaveBeenCalledTimes(4);
    });

    it("returns error and response if it can't find a snapped coordinate", async () => {
      const start = { latitude: -38.9275225, longitude: 174.8982278 };
      const end = { latitude: -41.285046, longitude: 174.776173 };
      const radius = 10000;

      // Mock axios.get for ORS route
      mockedAxios.post.mockRejectedValueOnce({
        code: 2010,
        message: `ORS request failed: Could not find routable point within 350m of ${start.longitude} ${start.latitude}`,
      });

      // Mock axios.post for callSnapOrsApi
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { locations: [null] },
        statusText: "OK",
        headers: {},
        config: {},
      });

      await expect(callOrsRouteApiWithRetry(start, end, radius)).rejects.toThrow(
        "ORS snap request failed: Could not find snappable point in 10km radius"
      );
    });
  });

})