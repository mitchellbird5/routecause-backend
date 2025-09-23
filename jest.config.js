/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.unit.test.ts',
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.integration.test.ts',
    '**/tests/e2e/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  verbose: true
};
