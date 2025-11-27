import axios from "axios";
import { queryRoute } from "../../src/route/route";
import {
  Coordinates,
  convertCoordinateListToLonLat
} from "../../src/route/route.types";

// mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// mock snap function
jest.mock("../../src/route/snapRoute", () => ({
  callSnapOrsApi: jest.fn()
}));
import { callSnapOrsApi } from "../../src/route/snapRoute";

describe("Utility tests", () => {
  describe("convertCoordinateListToLonLat", () => {
    it("converts correctly", () => {
      const coords: Coordinates[] = [
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ];

      expect(convertCoordinateListToLonLat(coords)).toEqual([
        [2, 1],
        [4, 3]
      ]);
    });
  });
});

describe("queryRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (process.env.APP_ENV as any) = "production";
  });

  it("returns ORS data when API succeeds", async () => {
    // SNAP response mock
    (callSnapOrsApi as jest.Mock).mockResolvedValueOnce([
      [2, 1],
      [4, 3]
    ]);

    // ORS route mock
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        routes: [
          { geometry: "abc123", summary: { distance: 1000, duration: 3000 } }
        ]
      }
    });

    const start = { latitude: 1, longitude: 2 };
    const end = { latitude: 3, longitude: 4 };

    const result = await queryRoute([start, end], 5000, {
      instructions: false
    });

    // result is now the ORS data, not AxiosResponse
    expect(result.routes).toBeDefined();
    expect(result.routes[0].geometry).toBe("abc123");

    // snap called correctly
    expect(callSnapOrsApi).toHaveBeenCalledWith(
      [[2, 1], [4, 3]],
      5000
    );

    // ORS called with merged options
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      {
        coordinates: [[2, 1], [4, 3]],
        instructions: false
      },
      expect.any(Object)
    );
  });

  it("throws when snap step fails", async () => {
    (callSnapOrsApi as jest.Mock).mockRejectedValueOnce(
      new Error("Snap failed")
    );

    const start = { latitude: 10, longitude: 20 };
    const end = { latitude: 30, longitude: 40 };

    await expect(queryRoute([start, end], 2000))
      .rejects.toThrow("Snap failed");
  });

  it("throws ORS structured error 2010", async () => {
    (callSnapOrsApi as jest.Mock).mockResolvedValueOnce([
      [20, 10],
      [40, 30]
    ]);

    mockedAxios.post.mockResolvedValueOnce({
      status: 400,
      data: {
        error: { code: 2010, message: "Bad route" }
      }
    });

    const start = { latitude: 10, longitude: 20 };
    const end = { latitude: 30, longitude: 40 };

    await expect(queryRoute([start, end], 1000))
      .rejects.toThrow("ORS request failed: Bad route");
  });
});
