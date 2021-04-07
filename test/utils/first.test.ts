import { first } from '../../src/utils/first'

test('returns the first item of a one-item array', () => {
  expect(first([10])).toBe(10)
})

test('returns the first item of a non-empty array', () => {
  expect(first([1, 2, 3])).toBe(1)
})

test('returns null given an empty array', () => {
  expect(first([])).toBeNull()
})

test('returns null given a falsy value', () => {
  expect(first(null as any)).toBeNull()
  expect(first(undefined as any)).toBeNull()
})
