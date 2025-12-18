import pool, { validateColumnAndFilter } from "../emissions/emissionsDatabase";
import { calculateEmissionEquivalent } from "../emissions/emissions";
import {
  validateEmissionRow,
  EmissionEquivalentRow
} from "../emissions/emissions.type";

export async function getEmissionsService(
  column: string,
  filter: string,
  trip_emissions_kg_values: number[]
): Promise<EmissionEquivalentRow[]> {
  if (!Array.isArray(trip_emissions_kg_values) || trip_emissions_kg_values.some(v => isNaN(v) || v < 0)) {
    throw { status: 400, message: "Invalid trip emissions values" };
  }

  const table = process.env.POSTGRES_TABLE

  if (!table) {
    throw { status:400, message: "No table environment variable set"}
  }

  const validColumn = await validateColumnAndFilter(
    table,
    column,
    filter
  )

  try {
    const query = `
      SELECT 
        label, 
        category, 
        value::float AS value, 
        equivalent_unit, 
        description, 
        source, 
        equivalent_description
      FROM emission_data
      WHERE LOWER(${validColumn}) = LOWER($1)
    `;
    const result = await pool.query(query, [filter]);

    return result.rows.map(row => {
      if (!validateEmissionRow(row)) {
        throw { status: 500, message: "Invalid row value in database" };
      }

      const emission_equivalent_value = trip_emissions_kg_values.map(v =>
        calculateEmissionEquivalent(v, row.value)
      );

      return {
        label: row.label,
        category: row.category,
        emission_equivalent_value: emission_equivalent_value,
        emission_equivalent_unit: row.equivalent_unit,
        description: row.description,
        source: row.source,
        equivalent_description: row.equivalent_description
      };
    });
  } catch (error) {
    console.error("Database query error:", error);
    if ((error as any).status) throw error;
    throw { status: 500, message: "Database query failed" };
  }
}
