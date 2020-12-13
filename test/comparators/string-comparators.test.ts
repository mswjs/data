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
