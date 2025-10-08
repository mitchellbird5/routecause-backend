import { calculateEmissionEquivalent } from "../../src/emissions/emissions";
import { getEmissionsService } from "../../src/services/emissionsService";
import pool, {
  getTableColumns,
  getDistinctColumnValues
} from "../../src/emissions/emissionsDatabase";


jest.mock("../../src/emissions/emissionsDatabase", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn()
    },
    getTableColumns: jest.fn().mockResolvedValue(["category", "label", "value", "unitnorm"]),
    getDistinctColumnValues: jest.fn().mockImplementation((_, col) => {
      if (col === "category") return Promise.resolve(["food", "transport"]);
      return Promise.resolve([]);
    })
  };
});

describe("Logic testing", () => {
    describe("calculateEmissionEquivalent", () => {
        it("should correctly calculate emission equivalent when ref_emissions > 0", () => {
            expect(calculateEmissionEquivalent(100, 50)).toBe(2);
        });

        it("should throw an error if ref_emissions is 0", () => {
            expect(() => calculateEmissionEquivalent(100, 0)).toThrowError(
            "Reference value = 0, division undefined."
            );
        });
    });
});

describe("Mocked API and error testing", async () => {
    describe("getEmissionsService", () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("returns emission equivalents when inputs are valid", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            (getDistinctColumnValues as jest.Mock).mockResolvedValue(["food"]);
            (pool.query as jest.Mock).mockResolvedValue({
            rows: [
                { label: "Beef", category: "food", value: 100, unitnorm: "kg CO2eq" }
            ]
            });

            const result = await getEmissionsService("category", "food", 10);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
            label: "Beef",
            category: "food",
            emission_equivalent_value: 0.1,
            emission_equivalent_unit: "kg CO2eq"
            });
        });

        it("normalizes column names", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            (getDistinctColumnValues as jest.Mock).mockResolvedValue(["food"]);
            (pool.query as jest.Mock).mockResolvedValue({
            rows: [
                { label: "Chicken", category: "food", value: 50, unitnorm: "kg CO2eq" }
            ]
            });

            const result = await getEmissionsService("CATEGORY", "food", 20);

            expect(result[0].emission_equivalent_value).toBe(0.4);
        });

        it("throws 400 if column is invalid", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            await expect(getEmissionsService("invalid_column", "food", 1)).rejects.toMatchObject({
            status: 400,
            message: "Invalid column name: invalid_column"
            });
        });

        it("throws 400 if filter is invalid", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            (getDistinctColumnValues as jest.Mock).mockResolvedValue(["food"]);
            await expect(getEmissionsService("category", "invalidFilter", 1)).rejects.toMatchObject({
            status: 400,
            message: "Invalid filter value: invalidFilter"
            });
        });

        it("throws 400 if trip_emissions_kg is NaN or negative", async () => {
            await expect(getEmissionsService("category", "food", NaN)).rejects.toMatchObject({
            status: 400,
            message: "Invalid trip emissions value"
            });
            await expect(getEmissionsService("category", "food", -5)).rejects.toMatchObject({
            status: 400,
            message: "Invalid trip emissions value"
            });
        });

        it("throws 500 if row value is invalid", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            (getDistinctColumnValues as jest.Mock).mockResolvedValue(["food"]);
            (pool.query as jest.Mock).mockResolvedValue({
            rows: [{ label: "Beef", category: "food", value: null, unitnorm: "kg CO2eq" }]
            });

            await expect(getEmissionsService("category", "food", 1)).rejects.toMatchObject({
            status: 500,
            message: "Invalid row value in database"
            });
        });

        it("throws 500 if DB query fails", async () => {
            (getTableColumns as jest.Mock).mockResolvedValue(["category"]);
            (getDistinctColumnValues as jest.Mock).mockResolvedValue(["food"]);
            (pool.query as jest.Mock).mockRejectedValue(new Error("DB down"));

            await expect(getEmissionsService("category", "food", 1)).rejects.toMatchObject({
            status: 500,
            message: "Database query failed"
            });
        });
    });
});