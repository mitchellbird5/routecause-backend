import axios from "axios";
import { callSnapOrsApi, SnapError } from "../../src/route/snapRoute";

jest.mock("axios");
const mockAxios = axios as jest.Mocked<typeof axios>;

jest.mock("../../utils/getEnvVariables", () => ({
  getGeoSnapBaseUrl: () => "https://example.com/snap",
  getOrsApiKey: () => "FAKE_KEY",
}));

describe("callSnapOrsApi", () => {
  const sampleLocations = [
    [10, 20],
    [30, 40],
  ] as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns snapped locations when successful", async () => {
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: { locations: [[1,2],[3,4]] }
    });

    const res = await callSnapOrsApi(sampleLocations, 500);

    expect(res).toEqual([[1,2],[3,4]]);
    expect(mockAxios.post).toHaveBeenCalledTimes(1);
  });


  it("logs ORS error if status not 200 and response contains error", async () => {
    mockAxios.post.mockResolvedValue({
      status: 500,
      data: { error: { message: "fail", code: 69 }, locations: [[1,2]] }
    });

    const res = await callSnapOrsApi(sampleLocations, 500);

    expect(res).toEqual([[1,2]]);
  });


  it("throws SnapError when locations[0] is null", async () => {
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: { locations: [null] }
    });

    await expect(callSnapOrsApi(sampleLocations, 1000))
      .rejects
      .toBeInstanceOf(SnapError);
  });


  it("throws generic error if snappedLocations missing", async () => {
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: {}
    });

    await expect(callSnapOrsApi(sampleLocations, 500))
      .rejects
      .toThrow("Failed to snap coordinate via ORS Snap API");
  });


  it("throws when axios throws", async () => {
    mockAxios.post.mockRejectedValue(new Error("network fail"));

    await expect(callSnapOrsApi(sampleLocations, 500))
      .rejects
      .toThrow("network fail");
  });


  it("passes correct request params", async () => {
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: { locations: [[8,8]] }
    });

    await callSnapOrsApi(sampleLocations, 1000);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://example.com/snap",
      {
        locations: sampleLocations,
        radius: 1000
      },
      expect.objectContaining({
        headers: expect.any(Object),
        timeout: 10000
      })
    );
  });

});
