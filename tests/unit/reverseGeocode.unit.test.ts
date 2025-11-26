import axios from "axios";
import { reverseGeocodeCoordinates } from "../../src/route/reverseGeocode";

jest.mock("axios"); // Mock the entire axios module
  const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Mocked API and error testing", () => {
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
      "Network error"
    );
  });
});
