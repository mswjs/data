import { primaryKey } from '../../src'
import { findPrimaryKey } from '../../src/utils/findPrimaryKey'

it('returns the primary key property name of the model definition', () => {
  const result = findPrimaryKey({
    id: primaryKey(String),
  })
  expect(result).toEqual('id')
})

it('returns undefined if the model definition contains property-compatible object', () => {
  const result = findPrimaryKey({
    id: {
      // This object is compatible with the "PrimaryKey" class
      // but is not an instance of that class.
      getValue() {
        return 'abc-123'
      },
    },
  })
  expect(result).toBeUndefined()
})

it('returns undefined if the model definition has no primary key', () => {
  const result = findPrimaryKey({})
  expect(result).toBeUndefined()
})
