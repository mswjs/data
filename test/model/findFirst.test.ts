import { random } from 'faker'
import { factory, primaryKey } from '../../src'
import { OperationErrorType } from '../../src/errors/OperationError'
import { identity } from '../../src/utils/identity'
import { getThrownError } from '../testUtils'

test('returns the only matching entity', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
    },
  })

  db.user.create()

  const user = db.user.findFirst({
    which: {
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
      id: primaryKey(random.uuid),
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const user = db.user.findFirst({
    which: {
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
      id: primaryKey(random.uuid),
    },
  })
  db.user.create()

  const error = getThrownError(() => {
    db.user.findFirst({
      which: {
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
      id: primaryKey(random.uuid),
    },
  })
  db.user.create()

  const user = db.user.findFirst({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(user).toBeNull()
})
