import { isInternalEntity } from '../../src/utils/isInternalEntity'

it('returns true given an internal entity object', () => {
  expect(
    isInternalEntity({
      __type: 'user',
      __primaryKey: 'id',
      id: 'abc-123',
    }),
  ).toEqual(true)
})

it('returns false given a corrupted internal entity object', () => {
  expect(
    isInternalEntity({
      __type: 'user',
      // Purposefully missing the "__primaryKey" property.
      id: 'abc-123',
    }),
  ).toEqual(false)
})

it('returns false given an arbitrary object', () => {
  expect(
    isInternalEntity({
      id: 'abc-123',
      type: 'custom',
    }),
  ).toEqual(false)
})
