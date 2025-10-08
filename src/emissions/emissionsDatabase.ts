import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export default pool;

let cachedColumns: Record<string, string[]> = {};
let cachedFilterValues: Record<string, Record<string, string[]>> = {};

/**
 * Get column names for a table, cached for performance.
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  if (cachedColumns[tableName]) {
    return cachedColumns[tableName];
  }

  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
  `;
  const result = await pool.query(query, [tableName]);

  const columns = result.rows.map(row => row.column_name);
  cachedColumns[tableName] = columns;
  return columns;
}

/**
 * Get distinct values for a column, cached for performance.
 */
export async function getDistinctColumnValues(
  tableName: string,
  columnName: string
): Promise<string[]> {
  if (cachedFilterValues[tableName]?.[columnName]) {
    return cachedFilterValues[tableName][columnName];
  }

  const query = `
    SELECT DISTINCT ${columnName}
    FROM ${tableName}
  `;
  const result = await pool.query(query);

  const values = result.rows.map(row => String(Object.values(row)[0]).toLowerCase());

  cachedFilterValues[tableName] = cachedFilterValues[tableName] || {};
  cachedFilterValues[tableName][columnName] = values;

  return values;
}

/**
 * Validates that the column exists and the filter value is valid.
 */
export async function validateColumnAndFilter(
  tableName: string,
  column: string,
  filter: string
) {
  const validColumns = (await getTableColumns(tableName)).map(c => c.toLowerCase());

  const matchingColumn = validColumns.find(c => c === column.toLowerCase());
  if (!matchingColumn) {
    throw { status: 400, message: `Invalid column name: ${column}` };
  }

  column = matchingColumn; // Normalized to DB column name

  const validFilters = await getDistinctColumnValues(tableName, column);
  if (!validFilters.includes(filter)) {
    throw { status: 400, message: `Invalid filter value: ${filter}` };
  }

  return column; // Return normalized column name
}
