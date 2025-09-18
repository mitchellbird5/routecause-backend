import { convertMinutes, haversineKm,  queryOsrm, getOsrmRoute } from "../src/distance/distance";

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


  // ----------------------
  // OSRM integration
  // ----------------------
  describe("OSRM integration", () => {
    it("queryOsrm returns valid results within tolerance", async () => {
      const start = { latitude: -43.5066, longitude: 172.7323 };
      const end = { latitude: -45.0198, longitude: 168.7453 };

      const result = await queryOsrm(start, end);

      // Expected values
      const expectedDistance = 486.4;
      const expectedDuration = 364;

      // Tolerances
      const distanceTolerance = expectedDistance * 0.01; // 1%
      const durationTolerance = expectedDuration * 0.10; // 10%

      expect(result.distance_km).toBeGreaterThanOrEqual(expectedDistance - distanceTolerance);
      expect(result.distance_km).toBeLessThanOrEqual(expectedDistance + distanceTolerance);

      expect(result.duration_min).toBeGreaterThanOrEqual(expectedDuration - durationTolerance);
      expect(result.duration_min).toBeLessThanOrEqual(expectedDuration + durationTolerance);
    });

    it("queryOsrm throws on invalid coordinates", async () => {
      const invalid = { latitude: 361, longitude: 0 };
      const valid = { latitude: 0, longitude: 0 };

      await expect(queryOsrm(invalid, valid)).rejects.toThrow();
    });

    it("getOsrmRoute returns valid route within tolerance", async () => {
      const result = await getOsrmRoute(
        "New Brighton Pier, Christchurch, Canterbury",
        "Queenstown Airport, Queenstown, Otago"
      );

      const expectedDistance = 486.4;
      const expectedDuration = 364;

      // ±1% for distance
      const distanceTolerance = expectedDistance * 0.01;
      expect(result.distance_km).toBeGreaterThanOrEqual(expectedDistance - distanceTolerance);
      expect(result.distance_km).toBeLessThanOrEqual(expectedDistance + distanceTolerance);

      // ±10% for duration
      const durationTolerance = expectedDuration * 0.10;
      expect(result.duration_min).toBeGreaterThanOrEqual(expectedDuration - durationTolerance);
      expect(result.duration_min).toBeLessThanOrEqual(expectedDuration + durationTolerance);
    });

  });
  
});
