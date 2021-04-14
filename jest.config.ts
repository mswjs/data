export default {
  preset: 'ts-jest',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@mswjs/data(.*)': '<rootDir>/$1',
  },
}
