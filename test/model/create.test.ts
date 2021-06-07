import { datatype } from 'faker'
import { factory, primaryKey } from '@mswjs/data'
import { identity } from '../../src/utils/identity'

test('creates a new entity', () => {
  const userId = datatype.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
      name: () => 'Mark Chandler',
      nicknames: () => ['with-heart'],
      favoriteNumbers: () => [69, 420],
    },
  })

  // Without any arguments a new entity is seeded
  // using the value getters defined in the model.
  const randomUser = db.user.create()
  expect(randomUser).toHaveProperty('id', userId)
  expect(randomUser).toHaveProperty('name', 'Mark Chandler')
  expect(randomUser).toHaveProperty('nicknames', ['with-heart'])
  expect(randomUser).toHaveProperty('favoriteNumbers', [69, 420])
})

test('creates a new entity with initial values', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: String,
      nicknames: () => [] as string[],
      favoriteNumbers: () => [] as number[],
    },
  })

  // Entity can be given exact values to seed.
  const exactUser = db.user.create({
    id: 'abc-123',
    name: 'Mark',
    nicknames: ['with-heart'],
    favoriteNumbers: [69, 420],
  })
  expect(exactUser).toHaveProperty('id', 'abc-123')
  expect(exactUser).toHaveProperty('name', 'Mark')
  expect(exactUser).toHaveProperty('nicknames', ['with-heart'])
  expect(exactUser).toHaveProperty('favoriteNumbers', [69, 420])
})
