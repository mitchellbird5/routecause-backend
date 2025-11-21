import axios from "axios";
import { convertMinutes } from "../../src/route/duration";
import { 
  callOrsRouteApiWithRetry, 
  queryRoute, 
  getRoute 
} from "../../src/route/route";
import { geocodeAddress } from "../../src/route/geocodeSearch";
import { geocodeMultiAddress } from "../../src/route/geocodeMultiSearch";
import { reverseGeocodeCoordinates } from "../../src/route/reverseGeocode";
import { 
  Coordinates,
  geocodeAddressFn, 
  queryRouteFn 
} from "../../src/route/route.types";

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

  describe("geocodeAddress", () => {
    it("returns coordinates for a mocked response", async () => {
      // Arrange: mock axios.get to return fake geocode data

      if (process.env.APP_ENV === 'development') {
          mockedAxios.get.mockResolvedValue({
          data: [
            { lat: 0, lon: 0 },
          ],
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        });
      } else if (process.env.APP_ENV === 'production') {
        mockedAxios.get.mockResolvedValue({
          data: {
            features: [
              {
                geometry: {
                  coordinates: [0, 0]
                }
              }
            ]
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        });
      } else {
        throw new Error("Couldn't find environment")
      }

      

      // Act
      const result = await geocodeAddress("New Brighton Pier, Christchurch, Canterbury");

      // Assert
      expect(result).toEqual({ latitude: 0, longitude: 0 });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("New%20Brighton%20Pier"),
        expect.objectContaining({
          headers: { "User-Agent": "RouteCause/1.0" },
          timeout: 10000,
        })
      );
    });


    it("throws if API returns an empty array", async () => {
      mockedAxios.get.mockResolvedValue({
        data: [],
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      await expect(geocodeAddress("Unknown Place")).rejects.toThrow(
        'Address not found: "Unknown Place"'
      );
    });

    it("throws if axios rejects with a network error", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network down"));

      await expect(geocodeAddress("Some Place")).rejects.toThrow(
        'Failed to geocode address "Some Place": Network down'
      );
    });

    it("throws if axios rejects with an AxiosError (500)", async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        message: "Internal Server Error",
        config: {},
        response: { status: 500, data: "Server blew up" },
      });

      await expect(geocodeAddress("Server Error Place")).rejects.toThrow(
        'Failed to geocode address "Server Error Place": Internal Server Error'
      );
    });

    it("throws if response is missing data", async () => {
      mockedAxios.get.mockResolvedValue({
        data: null,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      await expect(geocodeAddress("Null Response Place")).rejects.toThrow(
        'Address not found: "Null Response Place"'
      );
  });

  describe("geocodeMultiAddress", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns multiple addresses when API responds with several results", async () => {
      let expected_url_contain: string;
      if (process.env.APP_ENV === 'development') {
        const mockData = [
          { display_name: "Place 1", lat: "1.1", lon: "2.1" },
          { display_name: "Place 2", lat: "3.3", lon: "4.4" },
        ];
        mockedAxios.get.mockResolvedValueOnce({ data: mockData });
        expected_url_contain = "Test%20Address&limit=2"
      } else if (process.env.APP_ENV === 'production') {
        const mockData = [
          {
            properties: {
              name: "Place 1"
            },
            geometry: {
              coordinates: [2.1, 1.1]
            }
          },
          {
            properties: {
              name: "Place 2"
            },
            geometry: {
              coordinates: [4.4, 3.3]
            }
          }
        ]
        mockedAxios.get.mockResolvedValueOnce({ data: {features: mockData} });
        expected_url_contain = "Test%20Address&size=2"
      } else {
        throw new Error("Can't find environment")
      }
      
      const result = await geocodeMultiAddress("Test Address", 2);

      expect(result).toEqual([
        { 
          address: "Place 1", 
          coordinates: {
            latitude: 1.1, 
            longitude: 2.1 
          }
        },
        { 
          address: "Place 2", 
          coordinates: {
            latitude: 3.3, 
            longitude: 4.4
          } 
        },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(expected_url_contain),
        expect.objectContaining({
          headers: { "User-Agent": "RouteCause/1.0" },
          timeout: 10000,
        })
      );
    });

    it("throws an error if API returns empty array", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      await expect(geocodeMultiAddress("Empty Address", 1)).rejects.toThrow(
        'Address not found: "Empty Address"'
      );
    });

    it("throws an error if axios request fails with a normal Error", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(geocodeMultiAddress("Fail Address", 1)).rejects.toThrow(
        'Network error'
      );
    });

    it("throws an error if axios request fails with AxiosError object", async () => {
      mockedAxios.get.mockRejectedValueOnce(
        Object.assign(new Error("Internal Server Error"), {
          isAxiosError: true,
          config: {},
          response: { status: 500, data: "Server blew up" },
        })
      );

      await expect(
        geocodeMultiAddress("Server Error Address", 1)
      ).rejects.toThrow("Internal Server Error");
    });
  });

  describe("reverseGeocodeCoordinates", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it("returns an address when Nominatim responds with display_name", async () => {
      const mockAddress = "123 Example Street, Test City, Country";

      if (process.env.APP_ENV === 'development') {
        mockedAxios.get.mockResolvedValueOnce({
          data: { display_name: mockAddress },
        });
      } else if (process.env.APP_ENV === 'production') {
        mockedAxios.get.mockResolvedValueOnce({
          data: { features: [{ properties: { label: mockAddress } }] },
        });
      } else {
        throw new Error("Can't find environment")
      }

      const result = await reverseGeocodeCoordinates(-43.5321, 172.6362);

      expect(result).toBe(mockAddress);

      const [[calledUrl, calledConfig]] = mockedAxios.get.mock.calls;

      expect(calledUrl).toContain("/reverse");
      expect(calledUrl).toContain("-43.5321");
      expect(calledUrl).toContain("172.6362");

      expect(calledConfig).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({ "User-Agent": "RouteCause/1.0" }),
          timeout: 10000,
        })
      );
    });

    it("throws an error if axios request fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(reverseGeocodeCoordinates(0, 0)).rejects.toThrow(
        "Failed to reverse geocode coordinates: 0 0 - Network error"
      );
    });
  });

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
        mockedAxios.get.mockResolvedValue({
          data: {
            features: [{ 
              geometry: { coordinates: [[-3.54411, 0]] } ,
              properties: { summary: { duration: 60, distance: 1000} }
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
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`${start.longitude},${start.latitude}`),
        expect.objectContaining({
          headers: { "User-Agent": "RouteCause/1.0" },
        })
      );
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`${end.longitude},${end.latitude}`),
        expect.objectContaining({
          headers: { "User-Agent": "RouteCause/1.0" },
        })
      );
      expect(result.route).toEqual([{latitude: 0, longitude: -3.54411}]);
    });
  });

  describe("getRoute", () => {
    it("uses mocked functions with route", async () => {
      // Mocked geocodeAddress
      const mockGeocodeAddress: geocodeAddressFn = async (address: string) => {
        switch (address) {
          case "New Brighton Pier, Christchurch, Canterbury":
            return { latitude: -43.531, longitude: 172.655 };
          case "Queenstown Airport, Queenstown, Otago":
            return { latitude: -45.021, longitude: 168.738 };
          default:
            return { latitude: -43.5321, longitude: 172.6362 };
        }
      };

      // Mocked queryRoute that includes route
      const mockqueryRoute: queryRouteFn = async () => ({
        distance_km: 486.4,
        duration_min: 364,
        route: [
          {longitude: 172.655, latitude: -43.531},
          {longitude: 168.738, latitude: -45.021},
        ],
      });

      const result = await getRoute(
        "New Brighton Pier, Christchurch, Canterbury",
        "Queenstown Airport, Queenstown, Otago",
        {
          geocodeAddress: mockGeocodeAddress,
          queryRoute: mockqueryRoute,
        }
      );

      expect(result.distance_km).toBe(486.4);
      expect(result.duration_min).toBe(364);
      expect(result.route).toEqual([
        {longitude: 172.655, latitude: -43.531},
        {longitude: 168.738, latitude: -45.021},
      ]);
    });

  });

  it("returns response immediately if ORS route succeeds on first try", async () => {
    const start = { latitude: -43.531, longitude: 172.655 };
    const end = { latitude: -45.021, longitude: 168.738 };
    const urlPattern = expect.stringContaining(`${start.longitude},${start.latitude}`);

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        features: [
          {
            geometry: { coordinates: [[172.655, -43.531], [168.738, -45.021]] },
            properties: { summary: { distance: 1000, duration: 60 } },
          },
        ],
      },
      statusText: "OK",
      headers: {},
      config: {},
    });

    const response = await callOrsRouteApiWithRetry(start, end, 10000);

    expect(response.data.features[0].geometry.coordinates).toEqual([[172.655, -43.531], [168.738, -45.021]]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(urlPattern, expect.any(Object));
  });

  it("snaps start coordinate if ORS 2010 error occurs and retries", async () => {
    const start = { latitude: -38.9275225, longitude: 174.8982278 };
    const end = { latitude: -41.285046, longitude: 174.776173 };
    const radius = 10000;

    // Mock axios.get for ORS route
    mockedAxios.get.mockResolvedValueOnce({
      status: 400,
      data: { error: { code: 2010, message: `Could not find routable point within 350m of ${start.longitude} ${start.latitude}` } },
      statusText: "Bad Request",
      headers: {},
      config: {},
    });

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        features: [
          {
            geometry: { coordinates: [[174.915644, -38.918619], [174.776173, -41.285046]] },
            properties: { summary: { distance: 1000, duration: 60 } },
          },
        ],
      },
      statusText: "OK",
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

    const response = await callOrsRouteApiWithRetry(start, end, radius);

    expect(response.data.features[0].geometry.coordinates).toEqual([
      [174.915644, -38.918619],
      [174.776173, -41.285046],
    ]);
  });

  it("returns error and response if it can't find a snapped coordinate", async () => {
    const start = { latitude: -38.9275225, longitude: 174.8982278 };
    const end = { latitude: -41.285046, longitude: 174.776173 };
    const radius = 10000;

    // Mock axios.get for ORS route
    mockedAxios.get.mockRejectedValueOnce({
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

})