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
      // Fake vehicle data
      // -------------------------
      const vehicleData: VehicleData = {
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        vehicle_class: "Compact",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 7.5,
        fuel_consumption_hwy: 5.5,
        fuel_consumption_comb: 6.5, // L/100km
        co2_emissions: 150, // g/km
      };

      // -------------------------
      // Run the function
      // -------------------------
      const result = await calculateTrip(
        {latitude: 0, longitude: 0},
        {latitude: 1, longitude: 1},
        vehicleData,
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

      // Fuel used: (200 / 100) * 6.5 = 13 L
      expect(result.fuel_used_l).toBeCloseTo(13.0);

      // Emissions: (200 * 150) / 1000 = 30 kg
      expect(result.co2_kg).toBeCloseTo(30.0);

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

      const vehicleData: VehicleData = {
        make: "Toyota",
        model: "Corolla",
        model_year: "2020",
        vehicle_class: "Compact",
        engine_size: 1.8,
        cylinders: 4,
        transmission: "Automatic",
        fuel_type: "Gasoline",
        fuel_consumption_city: 7.5,
        fuel_consumption_hwy: 5.5,
        fuel_consumption_comb: 6.5,
        co2_emissions: 150,
      };

      const result = await calculateMultiStopTrip(
        [
          {latitude: 0, longitude: 0},   // Start
          {latitude: 1, longitude: 1},   // Stop1
          {latitude: 2, longitude: 2},   // Stop2
          {latitude: 3, longitude: 3},   // End
        ],
        vehicleData,
        mockQueryRoute,
      );

      // Total distances: 100 + 150 + 75 = 325 km
      expect(result.distance_km).toBe(325);

      // Total duration: 60 + 90 + 45 = 195 min = 3h 15m
      expect(result.hours).toBe(3);
      expect(result.minutes).toBe(15);

      // Fuel: (325 / 100) * 6.5 = 21.125 L
      expect(result.fuel_used_l).toBeCloseTo(21.125, 2);

      // Emissions: (325 * 150) / 1000 = 48.75 kg
      expect(result.co2_kg).toBeCloseTo(48.75, 2);

      expect(result).toHaveProperty("route")

      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(1, 60);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(2, 90);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(3, 45);
      expect(timeUtils.convertMinutes).toHaveBeenNthCalledWith(4, 195);

    });
  });
  
});
