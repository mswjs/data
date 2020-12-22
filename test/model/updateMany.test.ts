import { random, name } from 'faker'
import { factory } from '../../src'
import { identity } from '../../src/utils/identity'

test('should update many entity with evolution value', () => {
  const db = factory({
    user: {
      id: identity(random.uuid),
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

test('should update many entities with primitive values', () => {
  const db = factory({
    user: {
      id: identity(random.uuid),
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
