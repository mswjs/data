import { random } from 'faker'
import { factory, primaryKey } from '../../src'

test('returns the first entity among multiple matching entities', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const users = db.user.findMany({
    which: {
      followersCount: {
        gt: 10,
      },
    },
  })
  expect(users).toHaveLength(2)
  const usersFollowersCount = users.map((user) => user.followersCount)
  expect(usersFollowersCount).toEqual([12, 15])
})

test('throws an exception when no results in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
    },
  })
  db.user.create()
  db.user.create()

  expect(() => {
    db.user.findMany({
      which: {
        id: {
          in: ['abc-123', 'def-456'],
        },
      },
      strict: true,
    })
  }).toThrowError(
    'Failed to execute "findMany" on the "user" model: no entities found matching the query "{"id":{"in":["abc-123","def-456"]}}"',
  )
})

test('returns an empty array when not found matching entities', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const users = db.user.findMany({
    which: {
      followersCount: {
        gte: 1000,
      },
    },
  })
  expect(users).toHaveLength(0)
})
