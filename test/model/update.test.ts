import { random, name } from 'faker'
import { factory, primaryKey } from '../../src'

test('updates a unique entity that matches the query', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
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
      id: primaryKey(random.uuid),
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

test('throws an exception when no model matches the query in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: String,
    },
  })
  db.user.create()
  db.user.create()

  expect(() => {
    db.user.update({
      which: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: 'John',
      },
      strict: true,
    })
  }).toThrowError(
    'Failed to execute "update" on the "user" model: no entity found matching the query "{"id":{"equals":"abc-123"}}"',
  )
})

test('moves the entity when it updates the primary key', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
    },
  })

  db.user.create({
    id: 'abc-123',
  })

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
  expect(updatedUser).toHaveProperty('id', 'def-456')

  const userResult = db.user.findFirst({
    which: {
      id: {
        equals: 'def-456',
      },
    },
  })
  expect(userResult).toHaveProperty('id', 'def-456')

  const oldUser = db.user.findFirst({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(oldUser).toBeNull()
})

test('does nothing when no entity matches the query', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
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
  expect(updatedUser).toBeNull()
})
