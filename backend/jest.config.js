/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: false } }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,         // opt-in only; avoids slow runs in CI
  coverageDirectory: 'coverage',
  coverageReporter: ['text', 'lcov'],
  setupFilesAfterFramework: [],
  testTimeout: 15000,
  verbose: true,
};
