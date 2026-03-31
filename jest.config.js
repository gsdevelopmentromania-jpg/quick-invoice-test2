const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Path to your Next.js app (for loading next.config.mjs and .env files)
  dir: "./",
});

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: "jest-environment-node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
    "!src/app/page.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

module.exports = createJestConfig(customConfig);
