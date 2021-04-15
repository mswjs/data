export default {
  preset: 'ts-jest',
  testTimeout: 60000,
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@mswjs/data(.*)': '<rootDir>/$1',
  },
}
