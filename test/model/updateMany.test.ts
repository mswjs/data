import { random, name } from 'faker'
import { factory, primaryKey } from '../../src'

test('should update many entity with evolution value', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
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
    which: {
      role: {
        equals: 'Auditor',
      },
    },
    data: {
      firstName: (firstName) => firstName.toUpperCase(),
    },
  })

  expect(updateMultiUsers).toHaveLength(2)
  const names = updateMultiUsers.map((user) => user.firstName)
  expect(names).toEqual(['JOSEPH', 'JOHN'])

  const userResult = db.user.findFirst({
    which: {
      role: {
        equals: 'Auditor',
      },
    },
  })
  expect(userResult).toHaveProperty('firstName', 'JOSEPH')
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
    which: {
      id: {
        in: ['a', 'b'],
      },
    },
    data: {
      id: (value) => value + 1,
    },
  })

  const updatedUsers = db.user.findMany({
    which: {
      id: {
        in: ['a1', 'b1'],
      },
    },
  })
  expect(updatedUsers).toHaveLength(2)
  const updatedUserIds = updatedUsers.map((user) => user.id)
  expect(updatedUserIds).toEqual(['a1', 'b1'])

  const oldUsers = db.user.findMany({
    which: {
      id: {
        in: ['a', 'b'],
      },
    },
  })
  expect(oldUsers).toHaveLength(0)

  const intactUser = db.user.findFirst({
    which: {
      id: { equals: 'c' },
    },
  })
  expect(intactUser).toHaveProperty('id', 'c')
})

test('throws an exception when no entity matches the query in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
  })
  db.user.create()
  db.user.create()

  expect(() => {
    db.user.updateMany({
      which: {
        id: {
          in: ['abc-123', 'def-456'],
        },
      },
      data: {
        firstName: (value) => value.toUpperCase(),
      },
      strict: true,
    })
  }).toThrowError(
    'Failed to execute "updateMany" on the "user" model: no entities found matching the query "{"id":{"in":["abc-123","def-456"]}}".',
  )
})

test('should update many entities with primitive values', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
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
    which: {
      role: {
        equals: 'Auditor',
      },
    },
    data: {
      role: 'Admin',
    },
  })

  expect(updateMultiUsers).toHaveLength(2)
  updateMultiUsers.forEach((user) => expect(user.role).toEqual('Admin'))
})

test('throw an error when trying entities using a key already used', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
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

  expect(() =>
    db.user.update({
      which: {
        role: {
          equals: 'Auditor',
        },
      },
      data: {
        id: '123',
      },
    }),
  ).toThrowError(
    'Failed to execute "update" on the "user" model: the entity with a primary key "123" ("id") already exists.',
  )
})
