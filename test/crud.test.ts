import { random, name } from 'faker'
import { factory } from '../src/factory'
import { identity } from '../src/utils/identity'

test('creates a single entity', () => {
  const id = random.uuid()
  const firstName = name.firstName()
  const db = factory({
    user: {
      id: identity(id),
      firstName: identity(firstName),
    },
  })

  const user = db.user.create()
  expect(user).toHaveProperty('id', id)
  expect(user).toHaveProperty('firstName', firstName)

  const usersCount = db.user.count()
  expect(usersCount).toBe(1)
})

test('finds a single entity by query', () => {
  const id = random.uuid()
  const firstName = name.firstName()
  const db = factory({
    user: {
      id: identity(id),
      firstName: identity(firstName),
    },
  })
  db.user.create()

  const user = db.user.findOne({
    which: {
      id: {
        equals: id,
      },
    },
  })

  expect(user).toHaveProperty('id', id)
  expect(user).toHaveProperty('firstName', firstName)
})

test('finds many entities by query', () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      followersCount: random.number,
    },
  })
  db.user.create({
    firstName: 'John',
    followersCount: 5,
  })
  db.user.create({
    firstName: 'Kate',
    followersCount: 10,
  })
  db.user.create({
    firstName: 'Harry',
    followersCount: 16,
  })

  const popularUsers = db.user.findMany({
    which: {
      followersCount: {
        gte: 10,
      },
    },
  })

  expect(popularUsers).toHaveLength(2)
  expect(popularUsers[0]).toHaveProperty('firstName', 'Kate')
  expect(popularUsers[1]).toHaveProperty('firstName', 'Harry')
})

test('updates an entity by query', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: identity(userId),
      firstName: name.firstName,
    },
  })
  db.user.create({
    firstName: 'Joe',
  })

  // Should return the updated entity.
  const nextUser = db.user.update({
    which: {
      id: {
        equals: userId,
      },
    },
    data: {
      firstName: 'John',
    },
  })

  expect(nextUser).toHaveProperty('firstName', 'John')

  // Should persist the update in the database.
  const foundUser = db.user.findOne({
    which: {
      id: {
        equals: userId,
      },
    },
  })

  expect(foundUser).toHaveProperty('firstName', 'John')
})

test('deletes an entity by query', () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      postsCount: random.number,
    },
  })
  db.user.create()
  db.user.create({
    id: 'abc-123',
  })
  db.user.create()

  const deletedUser = db.user.delete({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })

  const usersCount = db.user.count()
  expect(usersCount).toBe(2)

  const deletedUserSearchResult = db.user.findOne({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(deletedUserSearchResult).toBeNull()
})

test('deletes multiple entities by query', () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      postsCount: random.number,
    },
  })
  db.user.create({
    firstName:'John'
  })
  db.user.create({
    firstName:'John',
  })
  db.user.create()

  const deletedUsers = db.user.deleteMany({
    which: {
      firstName: {
        equals: 'John',
      },
    },
  })

  const usersCount = db.user.count()
  expect(usersCount).toBe(1)

  expect(deletedUsers.length).toBe(2)
  const deletedUsersSearchResult = db.user.findOne({
    which: {
      firstName: {
        equals: 'John',
      },
    },
  })
  expect(deletedUsersSearchResult).toBeNull()
})