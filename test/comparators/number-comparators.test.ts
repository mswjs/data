import { numberComparators } from '../../src/comparators/number'

test('equals', () => {
  expect(numberComparators.equals(1, 1)).toEqual(true)
  expect(numberComparators.equals(234, 234)).toEqual(true)
  expect(numberComparators.equals(2, 5)).toEqual(false)
})

test('notEquals', () => {
  expect(numberComparators.notEquals(2, 5)).toEqual(true)
  expect(numberComparators.notEquals(0, 10)).toEqual(true)
  expect(numberComparators.notEquals(1, 1)).toEqual(false)
})

test('between', () => {
  expect(numberComparators.between([5, 10], 7)).toEqual(true)
  expect(numberComparators.between([5, 10], 5)).toEqual(true)
  expect(numberComparators.between([5, 10], 7)).toEqual(true)
  expect(numberComparators.between([5, 10], 24)).toEqual(false)
})

test('notBetween', () => {
  expect(numberComparators.notBetween([5, 10], 4)).toEqual(true)
  expect(numberComparators.notBetween([5, 10], 11)).toEqual(true)
  expect(numberComparators.notBetween([5, 10], 5)).toEqual(false)
  expect(numberComparators.notBetween([5, 10], 10)).toEqual(false)
})

test('gt', () => {
  expect(numberComparators.gt(2, 5)).toEqual(true)
  expect(numberComparators.gt(9, 20)).toEqual(true)
  expect(numberComparators.gt(20, 20)).toEqual(false)
})

test('gte', () => {
  expect(numberComparators.gte(2, 5)).toEqual(true)
  expect(numberComparators.gte(9, 20)).toEqual(true)
  expect(numberComparators.gte(20, 20)).toEqual(true)
  expect(numberComparators.gte(4, 2)).toEqual(false)
})

test('gt', () => {
  expect(numberComparators.lt(5, 2)).toEqual(true)
  expect(numberComparators.lt(20, 9)).toEqual(true)
  expect(numberComparators.lt(20, 20)).toEqual(false)
  expect(numberComparators.lt(5, 20)).toEqual(false)
})

test('lte', () => {
  expect(numberComparators.lte(5, 2)).toEqual(true)
  expect(numberComparators.lte(20, 9)).toEqual(true)
  expect(numberComparators.lte(20, 20)).toEqual(true)
  expect(numberComparators.lte(5, 20)).toEqual(false)
})

test('in', () => {
  expect(numberComparators.in([5], 5)).toEqual(true)
  expect(numberComparators.in([5, 10], 5)).toEqual(true)
  expect(numberComparators.in([1, 3, 5], 3)).toEqual(true)

  expect(numberComparators.in([5], 3)).toEqual(false)
  expect(numberComparators.in([3, 5], 4)).toEqual(false)
})

test('notIn', () => {
  expect(numberComparators.notIn([5], 2)).toEqual(true)
  expect(numberComparators.notIn([5, 10], 7)).toEqual(true)
  expect(numberComparators.notIn([1, 3, 5], 4)).toEqual(true)

  expect(numberComparators.notIn([5], 5)).toEqual(false)
  expect(numberComparators.notIn([3, 5], 3)).toEqual(false)
})
