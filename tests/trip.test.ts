import { calculateTrip } from "../src/trip/trip";
import { VehicleData } from "../src/vehicle/vehicle_types";

describe("calculateTrip", () => {
  it("calculates distance, time, fuel, and emissions correctly with mocked dependencies", async () => {
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
      }
    );

    // -------------------------
    // Assertions
    // -------------------------
    expect(mockGetOsrmRoute).toHaveBeenCalledWith("Start Address", "End Address", {
      geocodeAddress: mockGeocodeAddress,
      queryOsrm: mockQueryOsrm,
    });

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
});
