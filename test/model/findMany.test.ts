import { datatype } from 'faker'
import { factory, oneOf, primaryKey } from '@mswjs/data'
import { OperationErrorType } from '../../src/errors/OperationError'
import { getThrownError } from '../testUtils'

test('returns all matching entities', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const users = db.user.findMany({
    where: {
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
      id: primaryKey(datatype.uuid),
    },
  })
  db.user.create()
  db.user.create()

  const error = getThrownError(() => {
    db.user.findMany({
      where: {
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
      id: primaryKey(datatype.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const users = db.user.findMany({
    where: {
      followersCount: {
        gte: 1000,
      },
    },
  })
  expect(users).toHaveLength(0)
})

// See: https://github.com/mswjs/data/issues/78
test('returns same results in setTimeout', async () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
    },
    userObject: {
      id: primaryKey(datatype.uuid),
      data: String,
      user: oneOf('user'),
    },
  })

  // Seed the database
  const seededUser = db.user.create({
    firstName: 'Test',
  })
  const seededObject = db.userObject.create({
    user: seededUser,
    data: 'test data - associated with user',
  })

  const queryObject = () => {
    const object = db.userObject.findMany({
      where: {
        user: {
          id: {
            equals: seededUser.id,
          },
        },
      },
    })
    expect(object).toEqual([
      {
        data: 'test data - associated with user',
        id: seededObject.id,
        user: {
          id: seededUser.id,
          firstName: 'Test',
        },
      },
    ])
  }

  // Query for the object immediately
  queryObject()

  // This should return the exact same results as the query above,
  // since nothing has changed
  await new Promise<void>((res) =>
    setTimeout(() => {
      queryObject()
      res()
    }, 1000),
  )
})
