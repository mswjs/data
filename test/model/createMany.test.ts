import faker from '@faker-js/faker'
import { factory, identity, primaryKey } from '../../src'

test('creates a single new entity', () => {
  const userId = faker.datatype.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
    },
  })

  const users = db.user.createMany([{}])
  expect(users.length).toEqual(1)
  expect(users[0].id).toEqual(userId)
})

test('creates multiple new entities', () => {
  const db = factory({
    user: {
      id: primaryKey(faker.datatype.uuid),
    },
  })

  const users = db.user.createMany([{}, {}, {}])
  expect(users.length).toEqual(3)
})

test('creates entities using the set values', () => {
  const db = factory({
    user: {
      id: primaryKey(faker.datatype.uuid),
    },
  })

  const users = db.user.createMany([{
    id: 'abc-123',
  }, {
    id: 'def-456',
  }, {
    id: 'ghi-789',
  }])
  expect(users.length).toEqual(3)
  expect(users[0].id).toEqual('abc-123')
  expect(users[1].id).toEqual('def-456')
  expect(users[2].id).toEqual('ghi-789')
})