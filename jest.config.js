/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: [
    "<rootDir>/tests/unit",
    "<rootDir>/tests/integration",
    "<rootDir>/tests/e2e"
  ],
  testMatch: [
    "**/*.test.ts",
    "**/*.unit.test.ts",
    "**/*.integration.test.ts",
    "**/*.e2e.test.ts"
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  verbose: false,
  silent: true
};
