export default {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@mswjs/data(.*)': '<rootDir>/$1',
  },
}
