import { invariant } from '../../src/utils/invariant'

test('throws an error when a predicate is true', () => {
  const run = () => invariant(true, 'Custom error message')
  expect(run).toThrow('Custom error message')
})

test('does not throw an error when a predicate is false', () => {
  const run = () => invariant(false, 'Custom error message')
  expect(run).not.toThrow()
})
