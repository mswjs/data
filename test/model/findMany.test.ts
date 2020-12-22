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
