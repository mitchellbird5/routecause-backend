import pool from "../emissions/emissionsDatabase";
import { EmissionDBColumn, EmissionDBCategoryValue } from "../emissions/emissions.type";

export async function getEmissionsService(column: string, value: string) {

  if (!Object.values(EmissionDBColumn).includes(column as EmissionDBColumn)) {
    throw { status: 400, message: "Invalid column name" };
  }

  const allowedValues = Object.values(EmissionDBCategoryValue);
  if (!allowedValues.includes(value as EmissionDBCategoryValue)) {
    throw { status: 400, message: "Invalid category value" };
  }

  try {
    const result = await pool.query(
      `SELECT * FROM emissions WHERE ${column} = $1`,
      [value]
    );
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw { status: 500, message: "Database query failed" };
  }
}