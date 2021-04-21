import { datatype, name } from 'faker'
import { factory, primaryKey } from '@mswjs/data'
import { OperationErrorType } from '../../src/errors/OperationError'
import { getThrownError } from '../testUtils'

test('deletes all entites that match the query', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
      followersCount: datatype.number,
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
    where: {
      followersCount: {
        between: [11, 20],
      },
    },
  })!
  expect(deletedUsers).toHaveLength(2)

  const deletedUserNames = deletedUsers.map((user) => user.firstName)
  expect(deletedUserNames).toEqual(['Kate', 'Alice'])

  const queriedDeletedUsers = db.user.findMany({
    where: {
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

test('throws an exception when no entities match the query in a strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })
  db.user.create()
  db.user.create()

  const error = getThrownError(() => {
    db.user.deleteMany({
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
    'Failed to execute "deleteMany" on the "user" model: no entities found matching the query "{"id":{"in":["abc-123","def-456"]}}".',
  )
})

test('does nothing when no entities match the query', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
      followersCount: datatype.number,
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
    where: {
      followersCount: {
        gte: 1000,
      },
    },
  })
  expect(deletedUsers).toBeNull()

  const restUsers = db.user.getAll()
  expect(restUsers).toHaveLength(2)

  const restUserNames = restUsers.map((user) => user.firstName)
  expect(restUserNames).toEqual(['John', 'Kate'])
})
