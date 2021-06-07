import { isPrimitive } from '../../src/utils/isPrimitive'

test('returns true for a string', () => {
  expect(isPrimitive('string')).toEqual(true)
})

test('returns true for a number', () => {
  expect(isPrimitive(42)).toEqual(true)
})

test('returns true for a boolean', () => {
  expect(isPrimitive(true)).toEqual(true)
})

test('returns true for a date', () => {
  expect(isPrimitive(new Date())).toEqual(true)
})
