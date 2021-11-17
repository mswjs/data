import { datatype, name } from 'faker'
import { factory, primaryKey, nullable } from '@mswjs/data'
import { OperationErrorType } from '../../src/errors/OperationError'
import { getThrownError } from '../testUtils'

test('derives updated value from the existing value', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      role: String,
    },
  })
  db.user.create({
    firstName: 'Joseph',
    role: 'Auditor',
  })
  db.user.create({
    firstName: 'Jack',
    role: 'Writer',
  })
  db.user.create({
    firstName: 'John',
    role: 'Auditor',
  })

  const updateMultiUsers = db.user.updateMany({
    where: {
      role: {
        equals: 'Auditor',
      },
    },
    data: {
      firstName(firstName) {
        return firstName.toUpperCase()
      },
      role(role, user) {
        return user.firstName === 'John' ? 'Writer' : role
      },
    },
  })!

  expect(updateMultiUsers).toHaveLength(2)
  const names = updateMultiUsers.map((user) => user.firstName)
  const roles = updateMultiUsers.map((user) => user.role)
  expect(names).toEqual(['JOSEPH', 'JOHN'])
  expect(roles).toEqual(['Auditor', 'Writer'])

  const userResult = db.user.findMany({
    where: {
      role: {
        equals: 'Auditor',
      },
    },
  })
  const allFirstNames = userResult.map((user) => user.firstName)
  // "John" is no longer in the results because it's role changed to "Writer".
  expect(allFirstNames).toEqual(['JOSEPH'])
})

test('moves entities when they update primary keys', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
    },
  })
  db.user.create({ id: 'a' })
  db.user.create({ id: 'b' })
  db.user.create({ id: 'c' })

  db.user.updateMany({
    where: {
      id: {
        in: ['a', 'b'],
      },
    },
    data: {
      id: (value) => value + 1,
    },
  })

  const updatedUsers = db.user.findMany({
    where: {
      id: {
        in: ['a1', 'b1'],
      },
    },
  })
  expect(updatedUsers).toHaveLength(2)
  const updatedUserIds = updatedUsers.map((user) => user.id)
  expect(updatedUserIds).toEqual(['a1', 'b1'])

  const oldUsers = db.user.findMany({
    where: {
      id: {
        in: ['a', 'b'],
      },
    },
  })
  expect(oldUsers).toHaveLength(0)

  const intactUser = db.user.findFirst({
    where: {
      id: { equals: 'c' },
    },
  })
  expect(intactUser).toHaveProperty('id', 'c')
})

test('throws an exception when no entity matches the query in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
    },
  })
  db.user.create()
  db.user.create()

  const error = getThrownError(() => {
    db.user.updateMany({
      where: {
        id: {
          in: ['abc-123', 'def-456'],
        },
      },
      data: {
        firstName: (value) => value.toUpperCase(),
      },
      strict: true,
    })
  })

  expect(error).toHaveProperty('name', 'OperationError')
  expect(error).toHaveProperty('type', OperationErrorType.EntityNotFound)
  expect(error).toHaveProperty(
    'message',
    'Failed to execute "updateMany" on the "user" model: no entities found matching the query "{"id":{"in":["abc-123","def-456"]}}".',
  )
})

test('should update many entities with primitive values', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      role: String,
    },
  })
  db.user.create({
    firstName: 'Joseph',
    role: 'Auditor',
  })

  db.user.create({
    firstName: 'John',
    role: 'Auditor',
  })

  db.user.create({
    firstName: 'Jack',
    role: 'Writer',
  })

  const updateMultiUsers = db.user.updateMany({
    where: {
      role: {
        equals: 'Auditor',
      },
    },
    data: {
      role: 'Admin',
    },
  })!

  expect(updateMultiUsers).toHaveLength(2)
  updateMultiUsers.forEach((user) => expect(user.role).toEqual('Admin'))
})

test('supports updating a nullable property to a non-null value on many entities', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      role: nullable<string>(() => null),
    },
  })
  db.user.create({
    firstName: 'Joseph',
    role: null,
  })

  db.user.create({
    firstName: 'John',
    role: null,
  })

  db.user.create({
    firstName: 'Jack',
    role: 'Writer',
  })

  const nextAdmins = db.user.updateMany({
    where: {
      firstName: {
        contains: 'J',
      },
    },
    data: {
      role: 'Admin',
    },
  })!

  expect(nextAdmins).toHaveLength(3)
  nextAdmins.forEach((user) => expect(user).toHaveProperty('role', 'Admin'))
})

test('supports updating a nullable property with a value to null on many entities', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      role: nullable<string>(() => null),
    },
  })
  db.user.create({
    firstName: 'Joseph',
    role: 'Auditor',
  })

  db.user.create({
    firstName: 'John',
    role: 'Auditor',
  })

  db.user.create({
    firstName: 'Jack',
    role: 'Writer',
  })

  const prevAuditors = db.user.updateMany({
    where: {
      role: {
        equals: 'Auditor',
      },
    },
    data: {
      role: null,
    },
  })!

  expect(prevAuditors).toHaveLength(2)
  prevAuditors.forEach((user) => expect(user.role).toBeNull())
})

test('throw an error when updating entities with an already existing primary key', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      role: String,
    },
  })

  db.user.create({
    id: '123',
    role: 'Admin',
  })
  db.user.create({
    id: '456',
    role: 'Auditor',
  })

  db.user.create({
    id: '789',
    role: 'Auditor',
  })

  const error = getThrownError(() => {
    db.user.updateMany({
      where: {
        role: {
          equals: 'Auditor',
        },
      },
      data: {
        id: '123',
      },
    })
  })

  expect(error).toHaveProperty('name', 'OperationError')
  expect(error).toHaveProperty('type', OperationErrorType.DuplicatePrimaryKey)
  expect(error).toHaveProperty(
    'message',
    'Failed to execute "updateMany" on the "user" model: the entity with a primary key "123" ("id") already exists.',
  )
})
