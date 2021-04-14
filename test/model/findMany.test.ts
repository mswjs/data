import { random } from 'faker'
import { factory, primaryKey } from '@mswjs/data'
import { OperationErrorType } from '../../src/errors/OperationError'
import { getThrownError } from '../testUtils'

test('returns all matching entities', () => {
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

  const error = getThrownError(() => {
    db.user.findMany({
      which: {
        id: {
          in: ['abc-123', 'def-456'],
        },
      },
      strict: true,
    })
  })

  expect(error).toHaveProperty('name', 'OperationError')
  expect(error).toHaveProperty('type', OperationErrorType.EntityNotFound)
  expect(error).toHaveProperty(
    'message',
    'Failed to execute "findMany" on the "user" model: no entities found matching the query "{"id":{"in":["abc-123","def-456"]}}".',
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
