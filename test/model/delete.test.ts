import { random, name } from 'faker'
import { factory } from '../../src'

test('deletes a unique entity that matches the query', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.findName,
    },
  })

  db.user.create({ firstName: 'Kate' })
  db.user.create({ id: userId, firstName: 'John' })
  db.user.create({ firstName: 'Alice' })

  const deletedUser = db.user.delete({
    which: {
      id: {
        equals: userId,
      },
    },
  })
  expect(deletedUser).toHaveProperty('id', userId)
  expect(deletedUser).toHaveProperty('firstName', 'John')

  const remainingUsers = db.user.getAll()
  const remainingUserNames = remainingUsers.map((user) => user.firstName)
  expect(remainingUserNames).toEqual(['Kate', 'Alice'])
})

test('deletes the first entity that matches the query', () => {
  const db = factory({
    user: {
      firstName: name.firstName,
      followersCount: Number,
    },
  })

  db.user.create({ firstName: 'John', followersCount: 10 })
  db.user.create({ firstName: 'Kate', followersCount: 12 })
  db.user.create({ firstName: 'Alice', followersCount: 15 })

  const deletedUser = db.user.delete({
    which: {
      followersCount: {
        gt: 10,
      },
    },
  })
  expect(deletedUser).toHaveProperty('firstName', 'Kate')

  const deletedUserSearch = db.user.findFirst({
    which: {
      firstName: {
        equals: 'Kate',
      },
    },
  })
  expect(deletedUserSearch).toBeNull()

  const allUsers = db.user.getAll()
  const userNames = allUsers.map((user) => user.firstName)
  expect(userNames).toEqual(['John', 'Alice'])
})

test('does nothing when no entity matches the query', () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
    },
  })
  db.user.create({ firstName: 'Kate' })
  db.user.create({ firstName: 'Alice' })
  db.user.create({ firstName: 'John' })

  const deletedUser = db.user.delete({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(deletedUser).toBeUndefined()

  const allUsers = db.user.getAll()
  expect(allUsers).toHaveLength(3)

  const userNames = allUsers.map((user) => user.firstName)
  expect(userNames).toEqual(['Kate', 'Alice', 'John'])
})
