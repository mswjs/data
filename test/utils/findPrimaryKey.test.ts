import { findPrimaryKey } from '../../src/utils/findPrimaryKey'

it('returns the primary key property name of the model declaration', () => {
  const primaryKey = findPrimaryKey({
    id: {
      isPrimaryKey: true,
      getValue: String,
    },
  })
  expect(primaryKey).toEqual('id')
})

it('returns undefined if the model declaration has no primart key', () => {
  const primaryKey = findPrimaryKey({})
  expect(primaryKey).toBeUndefined()
})
