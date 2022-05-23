export default {
  preset: 'ts-jest',
  testTimeout: 60000,
  rootDir: '..',
  moduleNameMapper: {
    '^@mswjs/data(.*)': '<rootDir>/src',
  },
  setupFilesAfterEnv: ['./test/jest.setup.ts'],
}
