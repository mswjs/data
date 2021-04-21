import { datatype, seed } from 'faker'
import { factory, oneOf, primaryKey } from '@mswjs/data'
import { OperationErrorType } from '../../src/errors/OperationError'
import { identity } from '../../src/utils/identity'
import { getThrownError } from '../testUtils'

test('returns the only matching entity', () => {
  const userId = datatype.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
    },
  })

  db.user.create()

  const user = db.user.findFirst({
    where: {
      id: {
        equals: userId,
      },
    },
  })
  expect(user).toHaveProperty('id', userId)
})

test('returns the first entity among multiple matching entities', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const user = db.user.findFirst({
    where: {
      followersCount: {
        gt: 10,
      },
    },
  })
  expect(user).toHaveProperty('followersCount', 12)
})

test('throws an exception when no results in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })
  db.user.create()

  const error = getThrownError(() => {
    db.user.findFirst({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      strict: true,
    })
  })

  expect(error).toHaveProperty('name', 'OperationError')
  expect(error).toHaveProperty('type', OperationErrorType.EntityNotFound)
  expect(error).toHaveProperty(
    'message',
    `Failed to execute "findFirst" on the "user" model: no entity found matching the query "{"id":{"equals":"abc-123"}}".`,
  )
})

test('returns null when found no matching entities', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })
  db.user.create()

  const user = db.user.findFirst({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(user).toBeNull()
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
    const object = db.userObject.findFirst({
      where: {
        user: {
          id: {
            equals: seededUser.id,
          },
        },
      },
    })
    expect(object).toEqual({
      data: 'test data - associated with user',
      id: seededObject.id,
      user: {
        id: seededUser.id,
        firstName: 'Test',
      },
    })
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
