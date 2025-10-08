// tests/unit/emissions.service.test.ts
import { getEmissionsService } from "../../src/services/emissionsService";
import pool from "../../src/emissions/emissionsDatabase";
import { EmissionDBColumn, EmissionDBCategoryValue } from "../../src/emissions/emissions.type";

jest.mock("../../src/emissions/emissionsDatabase", () => ({
  query: jest.fn(),
}));

describe("/emissions and API Routes (mocked external APIs)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should query the database when valid column and value are provided", async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ category: "food" }] });

    const result = await getEmissionsService(EmissionDBColumn.CATEGORY, EmissionDBCategoryValue.FOOD);

    expect(pool.query).toHaveBeenCalledWith(
      "SELECT * FROM emission_data WHERE LOWER(category) = LOWER($1)",
      ["food"]
    );
    expect(result).toEqual([{ category: "food" }]);
  });

  it("should throw 400 if column is invalid", async () => {
    await expect(getEmissionsService("invalid_column", "Food")).rejects.toMatchObject({
      status: 400,
      message: "Invalid column name",
    });
  });

  it("should throw 400 if category value is invalid", async () => {
    await expect(getEmissionsService("category", "InvalidValue")).rejects.toMatchObject({
      status: 400,
      message: "Invalid category value",
    });
  });

  it("should throw 500 if database query fails", async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error("Connection lost"));

    await expect(
      getEmissionsService(EmissionDBColumn.CATEGORY, EmissionDBCategoryValue.FOOD)
    ).rejects.toMatchObject({
      status: 500,
      message: "Database query failed",
    });
  });
});
