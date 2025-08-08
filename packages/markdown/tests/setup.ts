// Jest setup file for the markdown package

// Mock fs/promises for all tests by default
jest.mock('fs/promises');

// Global test environment setup
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
