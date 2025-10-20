import axios from "axios";
import { 
  convertMinutes,
  haversineKm,
  getOsrmRoute,
  geocodeAddress,
  geocodeMultiAddress,
  queryOsrm,
  reverseGeocodeCoordinates
} from "../../src/distance/distance";
import { 
  OsrmOverview, 
  geocodeAddressFn, 
  queryOsrmFn 
} from "../../src/distance/distance.types";

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

  // ----------------------
  // haversineKm
  // ----------------------
  describe("haversineKm", () => {
    const cases = [
      {
        coord1: { latitude: 34.05, longitude: -118.24 },
        coord2: { latitude: 40.71, longitude: -74.0 },
        expected: 3936.06,
      },
      {
        coord1: { latitude: 51.51, longitude: -0.13 },
        coord2: { latitude: 48.85, longitude: 2.35 },
        expected: 344.438,
      },
      {
        coord1: { latitude: -33.87, longitude: 151.21 },
        coord2: { latitude: -37.81, longitude: 144.96 },
        expected: 713.377,
      },
      {
        coord1: { latitude: 58.09, longitude: 157.91 },
        coord2: { latitude: 39.56, longitude: 70.04 },
        expected: 6253.065,
      },
    ];

    cases.forEach(({ coord1, coord2, expected }) => {
      it(`distance between (${coord1.latitude},${coord1.longitude}) and (${coord2.latitude},${coord2.longitude}) ≈ ${expected} km`, () => {
        const dist = haversineKm(coord1, coord2);
        expect(dist).toBeCloseTo(expected, 1);
      });
    });

    it("returns 0 km for identical coordinates", () => {
      const coord = { latitude: 10, longitude: 20 };
      expect(haversineKm(coord, coord)).toBeCloseTo(0);
    });
  });

});

describe("Mocked API and error testing", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // reset call counts
  });

  describe("geocodeAddress", () => {
    it("returns coordinates for a mocked response", async () => {
      // Arrange: mock axios.get to return fake geocode data
      mockedAxios.get.mockResolvedValue({
        data: [
          { lat: 0, lon: 0 },
        ],
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      // Act
      const result = await geocodeAddress("New Brighton Pier, Christchurch, Canterbury");

      // Assert
      expect(result).toEqual({ latitude: 0, longitude: 0 });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("New%20Brighton%20Pier"),
        expect.objectContaining({
          headers: { "User-Agent": "MyTravelApp/1.0" },
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
      const mockData = [
        { display_name: "Place 1", lat: "1.1", lon: "2.1" },
        { display_name: "Place 2", lat: "3.3", lon: "4.4" },
      ];
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

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
        expect.stringContaining("Test%20Address&limit=2"),
        expect.objectContaining({
          headers: { "User-Agent": "MyTravelApp/1.0" },
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

    it("throws an error if API returns null", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: null });

      await expect(geocodeMultiAddress("Null Address", 1)).rejects.toThrow(
        'Address not found: "Null Address"'
      );
    });

    it("throws an error if API returns non-array data", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { something: "invalid" } });

      await expect(geocodeMultiAddress("Invalid Data", 1)).rejects.toThrow(
        "API return not an array"
      );
    });

    it("throws an error if axios request fails with a normal Error", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(geocodeMultiAddress("Fail Address", 1)).rejects.toThrow(
        'Failed to geocode address "Fail Address": Network error'
      );
    });

    it("throws an error if axios request fails with AxiosError object", async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        message: "Internal Server Error",
        config: {},
        response: { status: 500, data: "Server blew up" },
      });

      await expect(geocodeMultiAddress("Server Error Address", 1)).rejects.toThrow(
        'Failed to geocode address "Server Error Address": Internal Server Error'
      );
    });
  });

  describe("reverseGeocodeCoordinates", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it("returns an address when Nominatim responds with display_name", async () => {
      const mockAddress = "123 Example Street, Test City, Country";
      mockedAxios.get.mockResolvedValueOnce({
        data: { display_name: mockAddress },
      });

      const result = await reverseGeocodeCoordinates(-43.5321, 172.6362);

      expect(result).toBe(mockAddress);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/reverse"),
        expect.objectContaining({
          headers: expect.objectContaining({ "User-Agent": "MyTravelApp/1.0" }),
          timeout: 10000,
        })
      );
    });

    it("throws an error if Nominatim response does not include display_name", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      await expect(reverseGeocodeCoordinates(0, 0)).rejects.toThrow(
        "Address not found for coordinates"
      );
    });

    it("throws an error if axios request fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(reverseGeocodeCoordinates(0, 0)).rejects.toThrow(
        "Failed to reverse geocode coordinates: Network error"
      );
    });
  });

  });

  describe("queryOsrm", () => {
    it("returns mocked OSRM route with route", async () => {
      // Arrange: mock axios.get to return a fake OSRM response
      mockedAxios.get.mockResolvedValue({
        data: {
          routes: [{ distance: 0, duration: 0, geometry: "test" }], // distance in meters, duration in seconds
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      const start = { latitude: -43.531, longitude: 172.655 };
      const end = { latitude: -45.021, longitude: 168.738 };

      // Act
      const result = await queryOsrm(start, end, OsrmOverview.FULL);

      // Assert
      expect(result.distance_km).toBe(0);
      expect(result.duration_min).toBe(0);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(`${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full`));
      expect(result.route).toEqual([[-3.54411, 0]]);
    });

    it("returns mocked OSRM route without route", async () => {
      // Arrange: mock axios.get to return a fake OSRM response
      mockedAxios.get.mockResolvedValue({
        data: {
          routes: [{ distance: 0, duration: 0 }], // distance in meters, duration in seconds
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      });

      const start = { latitude: -43.531, longitude: 172.655 };
      const end = { latitude: -45.021, longitude: 168.738 };

      // Act
      const result = await queryOsrm(start, end, OsrmOverview.FALSE);

      // Assert
      expect(result.distance_km).toBe(0);
      expect(result.duration_min).toBe(0);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(`${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=false`));
    });
  });

  describe("getOsrmRoute", () => {
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

      // Mocked queryOsrm that includes route
      const mockQueryOsrm: queryOsrmFn = async () => ({
        distance_km: 486.4,
        duration_min: 364,
        route: [
          [172.655, -43.531],
          [168.738, -45.021],
        ],
      });

      const result = await getOsrmRoute(
        "New Brighton Pier, Christchurch, Canterbury",
        "Queenstown Airport, Queenstown, Otago",
        {
          geocodeAddress: mockGeocodeAddress,
          queryOsrm: mockQueryOsrm,
        },
        OsrmOverview.FULL
      );

      expect(result.distance_km).toBe(486.4);
      expect(result.duration_min).toBe(364);
      expect(result.route).toEqual([
        [172.655, -43.531],
        [168.738, -45.021],
      ]);
    });


    it("uses mocked functions without route", async () => {
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

      // Mocked queryOsrm
      const mockQueryOsrm: queryOsrmFn = async () => ({
        distance_km: 486.4,
        duration_min: 364,
      });

      const result = await getOsrmRoute(
        "New Brighton Pier, Christchurch, Canterbury",
        "Queenstown Airport, Queenstown, Otago",
        {
          geocodeAddress: mockGeocodeAddress,
          queryOsrm: mockQueryOsrm,
        },
        OsrmOverview.FALSE
      );

      expect(result.distance_km).toBe(486.4);
      expect(result.duration_min).toBe(364);
    });
  });

})