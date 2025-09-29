import { calculateTrip, calculateMultiStopTrip } from "../../src/trip/trip";
import { VehicleData } from "../../src/vehicle/vehicle.types";
import { OsrmOverview } from "../../src/distance/distance.types";

describe("calculateTrip", () => {
  it("calculates distance, time, fuel, and emissions correctly with mocked dependencies and false route", async () => {
    // -------------------------
    // Mock dependencies
    // -------------------------
    const mockGetOsrmRoute = jest.fn().mockResolvedValue({
      distance_km: 200,    // 200 km trip
      duration_min: 130,   // 2 hours 10 minutes
    });

    const mockConvertMinutes = jest.fn().mockImplementation((minutes: number) => ({
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    }));

    const mockGeocodeAddress = jest.fn();
    const mockQueryOsrm = jest.fn();

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
      "Start Address",
      "End Address",
      vehicleData,
      {
        getOsrmRoute: mockGetOsrmRoute,
        convertMinutes: mockConvertMinutes,
        geocodeAddress: mockGeocodeAddress,
        queryOsrm: mockQueryOsrm,
      },
      OsrmOverview.FALSE
    );

    // -------------------------
    // Assertions
    // -------------------------
    expect(mockGetOsrmRoute).toHaveBeenCalledWith(
      "Start Address", 
      "End Address", 
      {
        geocodeAddress: mockGeocodeAddress,
        queryOsrm: mockQueryOsrm,
      },
      OsrmOverview.FALSE
    );

    expect(mockConvertMinutes).toHaveBeenCalledWith(130);

    // Distance
    expect(result.distance_km).toBe(200);

    // Duration
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(10);

    // Fuel used: (200 / 100) * 6.5 = 13 L
    expect(result.fuel_used_l).toBeCloseTo(13.0);

    // Emissions: (200 * 150) / 1000 = 30 kg
    expect(result.co2_kg).toBeCloseTo(30.0);
  });

  it("calculates totals correctly for multiple stops (3 legs, 4 locations) without route", async () => {
    const mockGetOsrmRoute = jest
      .fn()
      .mockResolvedValueOnce({ distance_km: 100, duration_min: 60 }) // Start → Stop1
      .mockResolvedValueOnce({ distance_km: 150, duration_min: 90 }) // Stop1 → Stop2
      .mockResolvedValueOnce({ distance_km: 75, duration_min: 45 }); // Stop2 → End

    const mockConvertMinutes = jest.fn().mockImplementation((minutes: number) => ({
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    }));

    const mockGeocodeAddress = jest.fn();
    const mockQueryOsrm = jest.fn();

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
      ["Start", "Stop1", "Stop2", "End"],
      vehicleData,
      {
        getOsrmRoute: mockGetOsrmRoute,
        convertMinutes: mockConvertMinutes,
        geocodeAddress: mockGeocodeAddress,
        queryOsrm: mockQueryOsrm,
      },
      OsrmOverview.FALSE
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

    expect(mockConvertMinutes).toHaveBeenNthCalledWith(1, 60);
    expect(mockConvertMinutes).toHaveBeenNthCalledWith(2, 90);
    expect(mockConvertMinutes).toHaveBeenNthCalledWith(3, 45);
    expect(mockConvertMinutes).toHaveBeenNthCalledWith(4, 195);

  });
});
