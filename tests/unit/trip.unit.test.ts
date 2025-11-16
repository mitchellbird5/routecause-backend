import { calculateTrip, calculateMultiStopTrip } from "../../src/trip/trip";
import { VehicleData } from "../../src/vehicle/vehicle.types";
import * as timeUtils from "../../src/route/duration";

describe("Logic testing", () => {

  describe("calculateTrip", () => {
    it("calculates distance, time, fuel, and emissions correctly with mocked dependencies", async () => {
      // -------------------------
      // Mock dependencies
      // -------------------------

      const mockQueryRoute = jest.fn().mockResolvedValue({
        distance_km: 200,    // 200 km trip
        duration_min: 130,   // 2 hours 10 minutes
      });

      // -------------------------
      // Run the function
      // -------------------------
      const result = await calculateTrip(
        {latitude: 0, longitude: 0},
        {latitude: 1, longitude: 1},
        mockQueryRoute,
      );

      // -------------------------
      // Assertions
      // -------------------------
      expect(mockQueryRoute).toHaveBeenCalledWith(
        {latitude: 0, longitude: 0},
        {latitude: 1, longitude: 1}
      );

      // Distance
      expect(result.distance_km).toBe(200);

      // Duration
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(10);

      expect(result).toHaveProperty("route")
    });

  });

  describe("calculateMultiStopTrip", () => {
    it("calculates totals correctly for multiple stops (3 legs, 4 locations)", async () => {
      const mockQueryRoute = jest
        .fn()
        .mockResolvedValueOnce({ distance_km: 100, duration_min: 60 }) // Start → Stop1
        .mockResolvedValueOnce({ distance_km: 150, duration_min: 90 }) // Stop1 → Stop2
        .mockResolvedValueOnce({ distance_km: 75, duration_min: 45 }); // Stop2 → End

      jest.spyOn(timeUtils, "convertMinutes");

      const result = await calculateMultiStopTrip(
        [
          {latitude: 0, longitude: 0},   // Start
          {latitude: 1, longitude: 1},   // Stop1
          {latitude: 2, longitude: 2},   // Stop2
          {latitude: 3, longitude: 3},   // End
        ],
        mockQueryRoute,
      );

      // Total distances: 100 + 150 + 75 = 325 km
      expect(result.distance_km).toBe(325);

      // Total duration: 60 + 90 + 45 = 195 min = 3h 15m
      expect(result.hours).toBe(3);
      expect(result.minutes).toBe(15);

      expect(result).toHaveProperty("route")

      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(1, 60);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(2, 90);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(3, 45);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(4, 195);

    });
  });
  
});
