/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: [
    "<rootDir>/tests/unit",
    "<rootDir>/tests/integration",
  ],
  testMatch: [
    "**/*.test.ts",
    "**/*.unit.test.ts",
    "**/*.integration.test.ts"
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  verbose: true
};
