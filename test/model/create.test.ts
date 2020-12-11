import { random } from 'faker'
import { factory } from '../../src'
import { identity } from '../../src/utils/identity'

test('creates a new entity', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: identity(userId),
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
      id: random.uuid,
    },
  })

  // Entity can be given exact values to seed.
  const exactUser = db.user.create({
    id: 'abc-123',
  })
  expect(exactUser).toHaveProperty('id', 'abc-123')
})
