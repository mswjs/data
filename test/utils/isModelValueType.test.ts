import { isModelValueType } from '../../src/utils/isModelValueType'

it('returns true given a string', () => {
  expect(isModelValueType('I am a string')).toBe(true)
})

it('returns true given a new string', () => {
  expect(isModelValueType(String())).toBe(true)
})

it('returns true given a number', () => {
  expect(isModelValueType(100)).toBe(true)
})

it('returns true given a new number', () => {
  expect(isModelValueType(Number())).toBe(true)
})

it('returns true given a Date', () => {
  expect(isModelValueType(new Date())).toBe(true)
})

it('returns true given a new array', () => {
  expect(isModelValueType(new Array())).toBe(true)
})

it('returns true given an array with primitive values', () => {
  expect(isModelValueType(['I am a string', 100])).toBe(true)
})

it('returns false given an undefined', () => {
  expect(isModelValueType(undefined)).toBe(false)
})

it('returns false given a null', () => {
  expect(isModelValueType(null)).toBe(false)
})

it('returns false when given an array with non-primitive values', () => {
  expect(isModelValueType(['I am a string', {}])).toBe(false)
})

it('returns false when given nested primitive arrays', () => {
  expect(isModelValueType(['I am a string', [100]])).toBe(false)
})
