import axios from "axios";
import { geocodeMultiAddress } from "../../src/route/geocodeMultiSearch";

jest.mock("axios"); // Mock the entire axios module
  const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Mocked API and error testing", () => {
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