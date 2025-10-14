export interface EmissionDataRow {
  label: string;
  category: string;
  value: number;
  unitnorm: string;
  description: string;
  source: string;
}

export interface EmissionEquivalentRow {
  label: string;
  category: string;
  emission_equivalent_value: number;
  emission_equivalent_unit: string;
  description: string;
  source: string;
}

export function validateEmissionRow(row: any): row is EmissionDataRow {
  return (
    typeof row.label === "string" &&
    typeof row.category === "string" &&
    typeof row.value === "number" &&
    typeof row.unitnorm === "string"
  );
}