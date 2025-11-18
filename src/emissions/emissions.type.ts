export interface EmissionDataRow {
  label: string;
  category: string;
  value: number;
  equivalent_unit: string;
  description: string;
  source: string;
  equivalent_description: string;
}

export interface EmissionEquivalentRow {
  label: string;
  category: string;
  emission_equivalent_value: number[];
  emission_equivalent_unit: string;
  description: string;
  source: string;
  equivalent_description: string;
}

export function validateEmissionRow(row: any): row is EmissionDataRow {
  return (
    typeof row.label === "string" &&
    typeof row.category === "string" &&
    typeof row.value === "number" &&
    typeof row.equivalent_unit === "string" &&
    typeof row.description === "string" &&
    typeof row.source === "string" &&
    typeof row.equivalent_description === "string"
  );
}