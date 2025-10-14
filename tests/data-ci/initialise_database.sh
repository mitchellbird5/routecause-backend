#!/bin/bash
set -e

echo "Creating emission_data table if it doesn't exist..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
CREATE TABLE IF NOT EXISTS emission_data (
  category TEXT,
  label TEXT,
  value REAL,
  unit TEXT,
  equivalent_unit TEXT,
  description TEXT,
  source TEXT,
  equivalent_description TEXT
);
SQL

echo "Importing CSV data..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "\copy emission_data(category, label, value, unit, equivalent_unit, description, source, equivalent_description)
      FROM '/docker-entrypoint-initdb.d/emission_data.csv' CSV HEADER;"

echo "Database initialization complete."
