import { random, name } from 'faker'
import { factory } from '../../src'
import { identity } from '../../src/utils/identity'

test('updates a unique entity that matches the query', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: identity(userId),
      firstName: name.findName,
    },
  })
  db.user.create({
    id: userId,
    firstName: 'Joseph',
  })
  db.user.create()

  const updatedUser = db.user.update({
    which: {
      id: {
        equals: userId,
      },
    },
    data: {
      firstName: 'John',
    },
  })
  expect(updatedUser).toHaveProperty('firstName', 'John')

  const userResult = db.user.findFirst({
    which: {
      id: {
        equals: userId,
      },
    },
  })
  expect(userResult).toHaveProperty('firstName', 'John')
})

test('updates the first entity when multiple entities match the query', () => {
  const db = factory({
    user: {
      firstName: name.findName,
      followersCount: random.number,
    },
  })
  db.user.create({
    firstName: 'Alice',
    followersCount: 10,
  })
  db.user.create({
    followersCount: 12,
  })

  const updatedUser = db.user.update({
    which: {
      followersCount: {
        gte: 10,
      },
    },
    data: {
      firstName: 'Kate',
    },
  })
  expect(updatedUser).toHaveProperty('firstName', 'Kate')

  const kate = db.user.findFirst({
    which: {
      firstName: {
        equals: 'Kate',
      },
    },
  })
  expect(kate).toHaveProperty('firstName', 'Kate')
})

test('does nothing when no entity matches the query', () => {
  const db = factory({
    user: {
      id: random.uuid,
    },
  })

  db.user.create()
  db.user.create()

  const updatedUser = db.user.update({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
    data: {
      id: 'def-456',
    },
  })
  expect(updatedUser).toBeUndefined()
})
