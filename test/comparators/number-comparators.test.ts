import { numberComparators } from '../../src/utils/comparators'

test('equals', () => {
  expect(numberComparators.equals(1, 1)).toBe(true)
  expect(numberComparators.equals(234, 234)).toBe(true)
  expect(numberComparators.equals(2, 5)).toBe(false)
})

test('notEquals', () => {
  expect(numberComparators.notEquals(2, 5)).toBe(true)
  expect(numberComparators.notEquals(0, 10)).toBe(true)
  expect(numberComparators.notEquals(1, 1)).toBe(false)
})

test('gt', () => {
  expect(numberComparators.gt(2, 5)).toBe(true)
  expect(numberComparators.gt(9, 20)).toBe(true)
  expect(numberComparators.gt(20, 20)).toBe(false)
})

test('gte', () => {
  expect(numberComparators.gte(2, 5)).toBe(true)
  expect(numberComparators.gte(9, 20)).toBe(true)
  expect(numberComparators.gte(20, 20)).toBe(true)
  expect(numberComparators.gte(4, 2)).toBe(false)
})

test('gt', () => {
  expect(numberComparators.lt(5, 2)).toBe(true)
  expect(numberComparators.lt(20, 9)).toBe(true)
  expect(numberComparators.lt(20, 20)).toBe(false)
  expect(numberComparators.lt(5, 20)).toBe(false)
})

test('lte', () => {
  expect(numberComparators.lte(5, 2)).toBe(true)
  expect(numberComparators.lte(20, 9)).toBe(true)
  expect(numberComparators.lte(20, 20)).toBe(true)
  expect(numberComparators.lte(5, 20)).toBe(false)
})
