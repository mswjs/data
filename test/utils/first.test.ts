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
  expect(
    first(
      // @ts-expect-error Runtime null value.
      null,
    ),
  ).toBeNull()
  expect(
    first(
      // @ts-expect-error Runtime undefined value.
      undefined,
    ),
  ).toBeNull()
})
