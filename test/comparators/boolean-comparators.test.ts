import { booleanComparators } from '../../src/comparators/boolean'

test('equals', () => {
  expect(booleanComparators.equals(true, true)).toBe(true)
  expect(booleanComparators.equals(false, false)).toBe(true)
  expect(booleanComparators.equals(true, false)).toBe(false)
  expect(booleanComparators.equals(false, true)).toBe(false)
})

test('notEquals', () => {
  expect(booleanComparators.notEquals(true, false)).toBe(true)
  expect(booleanComparators.notEquals(false, true)).toBe(true)
  expect(booleanComparators.notEquals(true, true)).toBe(false)
  expect(booleanComparators.notEquals(false, false)).toBe(false)
})
