import axios from "axios";
import { convertMinutes, haversineKm } from "../src/distance/distance";
import { getOsrmRoute, geocodeAddress, queryOsrm } from "../src/distance/distance";

jest.mock("axios"); // Mock the entire axios module
const mockedAxios = axios as jest.Mocked<typeof axios>;

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


});

describe("queryOsrm", () => {
  it("returns mocked OSRM route", async () => {
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

    const start = { latitude: 0, longitude: 0 };
    const end = { latitude: 0, longitude: 0 };

    // Act
    const result = await queryOsrm(start, end);

    // Assert
    expect(result).toEqual({ distance_km: 0, duration_min: 0 });
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(`${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=false`)
    );
  });
});

describe("getOsrmRoute with dependency injection", () => {
  it("uses mocked functions", async () => {
    // Mocked geocodeAddress
    const mockGeocodeAddress = async (address: string) => {
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
    const mockQueryOsrm = async () => ({
      distance_km: 486.4,
      duration_min: 364,
    });

    const result = await getOsrmRoute(
      "New Brighton Pier, Christchurch, Canterbury",
      "Queenstown Airport, Queenstown, Otago",
      {
        geocodeAddress: mockGeocodeAddress,
        queryOsrm: mockQueryOsrm,
      }
    );

    expect(result.distance_km).toBe(486.4);
    expect(result.duration_min).toBe(364);
  });
});


describe("Distance Tests", () => {

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
    ];

    cases.forEach(tc => {
      it(`converts ${tc.totalMinutes} minutes to ${tc.expectedHours}h ${tc.expectedMinutes}m`, () => {
        const result = convertMinutes(tc.totalMinutes);
        expect(result.hours).toBe(tc.expectedHours);
        expect(result.minutes).toBe(tc.expectedMinutes);
      });
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
