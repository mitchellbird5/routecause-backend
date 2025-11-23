import axios from "axios";
import { geocodeAddress } from "../../src/route/geocodeSearch";

jest.mock("axios"); // Mock the entire axios module
  const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Mocked API and error testing", () => {
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
});