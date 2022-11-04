import { stringComparators } from '../../src/comparators/string'

test('equals', () => {
  expect(stringComparators.equals('foo', 'foo')).toBe(true)
  expect(stringComparators.equals('foo', 'bar')).toBe(false)
})

test('notEquals', () => {
  expect(stringComparators.notEquals('foo', 'bar')).toBe(true)
  expect(stringComparators.notEquals('foo', 'foo')).toBe(false)
})

test('contains', () => {
  expect(stringComparators.contains('foo', 'footer')).toBe(true)
  expect(stringComparators.contains('bar', 'abarthe')).toBe(true)
  expect(stringComparators.contains('foo', 'nope')).toBe(false)
})

test('notContains', () => {
  expect(stringComparators.notContains('foo', 'nope')).toBe(true)
  expect(stringComparators.notContains('nope', 'foo')).toBe(true)
  expect(stringComparators.notContains('foo', 'footer')).toBe(false)
})

test('gt', () => {
  expect(stringComparators.gt('bar', 'foo')).toEqual(true)
  expect(stringComparators.gt('001', '002')).toEqual(true)
  expect(stringComparators.gt('foo', 'footer')).toEqual(true)
  expect(
    stringComparators.gt(
      'c971d070-9b87-5492-9df6-b53091ae3874',
      'c9ac1210-e5e9-5422-acad-1839535989fe',
    ),
  ).toEqual(true)
  expect(
    stringComparators.gt(
      '2022-01-01T15:00:00.000Z',
      '2022-01-01T15:00:00.001Z',
    ),
  ).toEqual(true)
  expect(stringComparators.gt('foo', 'foo')).toEqual(false)
  expect(
    stringComparators.gt(
      'c9ac1210-e5e9-5422-acad-1839535989fe',
      'c971d070-9b87-5492-9df6-b53091ae3874',
    ),
  ).toEqual(false)
  expect(
    stringComparators.gt(
      '2022-01-01T15:00:00.000Z',
      '2022-01-01T14:00:00.000Z',
    ),
  ).toEqual(false)
})

test('gte', () => {
  expect(stringComparators.gte('bar', 'foo')).toEqual(true)
  expect(stringComparators.gte('001', '002')).toEqual(true)
  expect(stringComparators.gte('foo', 'footer')).toEqual(true)
  expect(
    stringComparators.gte(
      '2022-01-01T15:00:00.000Z',
      '2022-01-01T15:00:00.000Z',
    ),
  ).toEqual(true)
  expect(
    stringComparators.gte(
      '2022-01-01T15:00:00.000Z',
      '2022-01-01T14:00:00.000Z',
    ),
  ).toEqual(false)
  expect(stringComparators.gte('footer', 'foot')).toEqual(false)
})

test('lt', () => {
  expect(stringComparators.lt('foo', 'bar')).toEqual(true)
  expect(stringComparators.lt('002', '001')).toEqual(true)
  expect(stringComparators.lt('footer', 'foo')).toEqual(true)
  expect(
    stringComparators.lt(
      'c9ac1210-e5e9-5422-acad-1839535989fe',
      'c971d070-9b87-5492-9df6-b53091ae3874',
    ),
  ).toEqual(true)
  expect(
    stringComparators.lt(
      '2022-01-01T15:00:00.001Z',
      '2022-01-01T15:00:00.000Z',
    ),
  ).toEqual(true)
  expect(stringComparators.lt('abc', 'abc')).toEqual(false)
  expect(
    stringComparators.lt(
      'c971d070-9b87-5492-9df6-b53091ae3874',
      'c9ac1210-e5e9-5422-acad-1839535989fe',
    ),
  ).toEqual(false)
  expect(
    stringComparators.lt(
      '2022-01-01T14:00:00.000Z',
      '2022-01-01T15:00:00.000Z',
    ),
  ).toEqual(false)
})

test('lte', () => {
  expect(stringComparators.lte('foo', 'bar')).toEqual(true)
  expect(stringComparators.lte('002', '001')).toEqual(true)
  expect(stringComparators.lte('footer', 'foot')).toEqual(true)
  expect(
    stringComparators.lte(
      '2022-01-01T14:00:00.000Z',
      '2022-01-01T14:00:00.000Z',
    ),
  ).toEqual(true)
  expect(
    stringComparators.lte(
      '2022-01-01T14:00:00.000Z',
      '2022-01-01T15:00:00.000Z',
    ),
  ).toEqual(false)
  expect(stringComparators.lte('foot', 'footer')).toEqual(false)
})

test('in', () => {
  expect(stringComparators.in(['a', 'foo'], 'a')).toBe(true)
  expect(stringComparators.in(['a', 'foo'], 'foo')).toBe(true)
  expect(stringComparators.in(['a', 'foo'], 'antler')).toBe(false)
  expect(stringComparators.in(['a', 'foo'], 'footer')).toBe(false)
})

test('notIn', () => {
  expect(stringComparators.notIn(['a', 'foo'], 'bar')).toBe(true)
  expect(stringComparators.notIn(['a', 'foo'], 'footer')).toBe(true)
  expect(stringComparators.notIn(['a', 'foo'], 'antler')).toBe(true)
  expect(stringComparators.notIn(['a', 'foo'], 'a')).toBe(false)
  expect(stringComparators.notIn(['a', 'foo'], 'foo')).toBe(false)
})
