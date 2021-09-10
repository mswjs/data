import { isObject } from '../../src/utils/isObject'

it('returns true given an empty object', () => {
  expect(isObject({})).toEqual(true)
})

it('returns true given an object with values', () => {
  expect(isObject({ a: 1, b: ['foo'] })).toEqual(true)
})

it('returns false given falsy values', () => {
  expect(isObject(undefined)).toEqual(false)
  expect(isObject(null)).toEqual(false)
  expect(isObject(false)).toEqual(false)
})

it('returns false given an array', () => {
  expect(isObject([])).toEqual(false)
  expect(isObject([{ a: 1 }])).toEqual(false)
})
