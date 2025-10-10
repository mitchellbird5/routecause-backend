

export function calculateEmissionEquivalent(
  trip_emissions_kg: number,
  ref_emissions: number,
): number {
    if (ref_emissions===0) throw new Error("Reference value = 0, division undefined.")
    return trip_emissions_kg/ref_emissions
}