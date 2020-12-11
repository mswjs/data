import { stringComparators } from '../../src/utils/comparators'

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
