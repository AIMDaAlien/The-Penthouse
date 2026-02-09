module.exports = {
  testEnvironment: 'node',
  verbose: true,
  // setupFilesAfterEnv: ['./tests/setup.js'], // Optional: global setup
  testMatch: ['**/tests/**/*.test.js'],
  forceExit: true, // Force Jest to exit after all tests complete
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
