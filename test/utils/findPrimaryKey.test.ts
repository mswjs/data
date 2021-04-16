import { findPrimaryKey } from '../../src/utils/findPrimaryKey'

it('returns the primary key property name of the model definition', () => {
  const primaryKey = findPrimaryKey({
    id: {
      isPrimaryKey: true,
      getValue: String,
    },
  })
  expect(primaryKey).toEqual('id')
})

it('returns undefined if the model definition has no primart key', () => {
  const primaryKey = findPrimaryKey({})
  expect(primaryKey).toBeUndefined()
})
