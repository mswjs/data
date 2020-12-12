import { random, name } from 'faker'
import { factory } from '../../src'
import { identity } from '../../src/utils/identity'
import { primaryKey } from '../../src/utils/primaryKey'

test('creates a new entity', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
    },
  })

  // Without any arguments a new entity is seeded
  // using the value getters defined in the model.
  const randomUser = db.user.create()
  expect(randomUser).toHaveProperty('id', userId)
})

test('creates a new entity with initial values', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
    },
  })

  // Entity can be given exact values to seed.
  const exactUser = db.user.create({
    id: 'abc-123',
  })
  expect(exactUser).toHaveProperty('id', 'abc-123')
})

test('should create an entity with the provided key', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
    },
  })

  db.user.create({
    id: 'abc-123',
  })

  expect(() =>
    db.user.create({
      id: 'abc-123',
    }),
  ).toThrow(
    'Failed to create a "user" entity with the primary key "id": an entity with such key already exists.',
  )
})

test('should throw an error if an entity is created with multiple primary key', () => {
  expect(() =>
    factory({
      user: {
        id: primaryKey(random.uuid),
        uuid: primaryKey(random.uuid),
      },
    }),
  ).toThrowError('You cannot specify more than one key for model "user"')
})

test('every model should have a primary key', () => {
  expect(() => {
    factory({
      user: {
        firstName: () => 'John',
      },
    })
  })
    .toThrow(`The model "user" doesn't have a primary key. You can add it using the util function \`primaryKey\`

import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(random.uuid),
  },
})`)
})
