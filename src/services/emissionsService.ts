import pool from "../emissions/emissionsDatabase";
import {
  getTableColumns,
  getDistinctColumnValues
} from "../emissions/emissionsDatabase";
import { calculateEmissionEquivalent } from "../emissions/emissions";
import {
  validateEmissionRow,
  EmissionEquivalentRow
} from "../emissions/emissions.type";

export async function getEmissionsService(
  column: string,
  filter: string,
  trip_emissions_kg: number
): Promise<EmissionEquivalentRow[]> {
  if (isNaN(trip_emissions_kg) || trip_emissions_kg < 0) {
    throw { status: 400, message: "Invalid trip emissions value" };
  }

  // Validate column exists
  const validColumns = (await getTableColumns("emission_data")).map(c => c.toLowerCase());
  if (!validColumns.includes(column.toLowerCase())) {
    throw { status: 400, message: `Invalid column name: ${column}` };
  }
  column = validColumns.find(c => c.toLowerCase() === column.toLowerCase())!;

  // Validate filter value exists in that column
  const validFilters = await getDistinctColumnValues("emission_data", column);
  if (!validFilters.includes(filter)) {
    throw { status: 400, message: `Invalid filter value: ${filter}` };
  }

  try {
    const query = `
      SELECT label, category, value, unitnorm
      FROM emission_data
      WHERE LOWER(${column}) = LOWER($1)
    `;
    const result = await pool.query(query, [filter]);

    return result.rows.map(row => {
      if (!validateEmissionRow(row)) {
        throw { status: 500, message: "Invalid row value in database" };
      }

      return {
        label: row.label,
        category: row.category,
        emission_equivalent_value: calculateEmissionEquivalent(trip_emissions_kg, row.value),
        emission_equivalent_unit: row.unitnorm
      };
    });
  } catch (error) {
    console.error("Database query error:", error);
    if ((error as any).status) throw error;
    throw { status: 500, message: "Database query failed" };
  }
}
