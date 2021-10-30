import { primaryKey } from '../../src'
import { findPrimaryKey, findPrimaryKeyValue } from '../../src/utils/findPrimaryKey'

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

it('returns the primary key property value of the model definition - string', () => {
  const result = findPrimaryKeyValue({
    id: primaryKey(String),
  })
  expect(result).toEqual('')
})

it('returns the primary key property value of the model definition - number', () => {
  const result = findPrimaryKeyValue({
    id: primaryKey(Number),
  })
  expect(result).toEqual(0)
})
