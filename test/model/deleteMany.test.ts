import { random, name } from 'faker'
import { factory } from '../../src'
import { primaryKey } from '../../src/utils/primaryKey'

test('deletes all entites that match the query', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
      followersCount: random.number,
    },
  })

  db.user.create({
    firstName: 'John',
    followersCount: 10,
  })
  db.user.create({
    firstName: 'Kate',
    followersCount: 12,
  })
  db.user.create({
    firstName: 'Alice',
    followersCount: 18,
  })
  db.user.create({
    firstName: 'Joseph',
    followersCount: 24,
  })

  const deletedUsers = db.user.deleteMany({
    which: {
      followersCount: {
        between: [11, 20],
      },
    },
  })
  expect(deletedUsers).toHaveLength(2)

  const deletedUserNames = deletedUsers.map((user) => user.firstName)
  expect(deletedUserNames).toEqual(['Kate', 'Alice'])

  const queriedDeletedUsers = db.user.findMany({
    which: {
      followersCount: {
        between: [11, 20],
      },
    },
  })
  expect(queriedDeletedUsers).toEqual([])

  const restUsers = db.user.getAll()
  expect(restUsers).toHaveLength(2)

  const restUserNames = restUsers.map((user) => user.firstName)
  expect(restUserNames).toEqual(['John', 'Joseph'])
})

test('does nothing when no entities match the query', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
      followersCount: random.number,
    },
  })

  db.user.create({
    firstName: 'John',
    followersCount: 10,
  })
  db.user.create({
    firstName: 'Kate',
    followersCount: 12,
  })

  const deletedUsers = db.user.deleteMany({
    which: {
      followersCount: {
        gte: 1000,
      },
    },
  })
  expect(deletedUsers).toHaveLength(0)

  const restUsers = db.user.getAll()
  expect(restUsers).toHaveLength(2)

  const restUserNames = restUsers.map((user) => user.firstName)
  expect(restUserNames).toEqual(['John', 'Kate'])
})
