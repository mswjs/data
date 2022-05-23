import { dateComparators } from '../../src/comparators/date'

test('equals', () => {
  expect(
    dateComparators.equals(new Date('1980-12-10'), new Date('1980-12-10')),
  ).toBe(true)

  expect(
    dateComparators.equals(new Date('1980-12-10'), new Date('1980-01-01')),
  ).toBe(false)
})

test('notEquals', () => {
  expect(
    dateComparators.notEquals(new Date('1980-12-10'), new Date('1980-01-01')),
  ).toBe(true)

  expect(
    dateComparators.notEquals(new Date('1980-12-10'), new Date('1980-12-10')),
  ).toBe(false)
})

test('gt', () => {
  expect(
    dateComparators.gt(new Date('1980-01-01'), new Date('1980-06-24')),
  ).toBe(true)

  expect(
    dateComparators.gt(new Date('1980-02-14'), new Date('1980-02-12')),
  ).toBe(false)
})

test('gte', () => {
  expect(
    dateComparators.gte(new Date('1980-01-01'), new Date('1980-06-24')),
  ).toBe(true)
  expect(
    dateComparators.gte(new Date('1980-01-01'), new Date('1980-01-01')),
  ).toBe(true)

  expect(
    dateComparators.gte(new Date('1980-02-14'), new Date('1980-02-12')),
  ).toBe(false)
})

test('lt', () => {
  expect(
    dateComparators.lt(new Date('1980-02-14'), new Date('1980-02-12')),
  ).toBe(true)

  expect(
    dateComparators.lt(new Date('1980-01-01'), new Date('1980-06-24')),
  ).toBe(false)
})

test('lte', () => {
  expect(
    dateComparators.lte(new Date('1980-02-14'), new Date('1980-02-12')),
  ).toBe(true)
  expect(
    dateComparators.lte(new Date('1980-01-01'), new Date('1980-01-01')),
  ).toBe(true)

  expect(
    dateComparators.lte(new Date('1980-01-01'), new Date('1980-06-24')),
  ).toBe(false)
})
