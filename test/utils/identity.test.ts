import { identity } from '../../src/utils/identity'

test('returns a function that returns a given value', () => {
  const id = identity(5)
  expect(id).toBeInstanceOf(Function)
  expect(id()).toBe(5)
})
