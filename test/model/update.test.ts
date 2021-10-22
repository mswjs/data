import { datatype, name } from 'faker'
import { factory, oneOf, primaryKey, nullable } from '@mswjs/data'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../lib/glossary'
import { OperationErrorType } from '../../src/errors/OperationError'
import { getThrownError } from '../testUtils'

test('updates a unique entity that matches the query', () => {
  const userId = datatype.uuid()
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
    },
  })
  db.user.create({
    id: userId,
    firstName: 'Joseph',
  })
  db.user.create()

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: userId,
      },
    },
    data: {
      firstName: 'John',
    },
  })
  expect(updatedUser).toHaveProperty('firstName', 'John')

  const userResult = db.user.findFirst({
    where: {
      id: {
        equals: userId,
      },
    },
  })
  expect(userResult).toHaveProperty('firstName', 'John')
})

test('updates a property that had no initial value', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
    },
  })

  db.user.create({
    id: 'abc-123',
  })

  expect(
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: 'John',
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    firstName: 'John',
  })

  expect(
    db.user.findFirst({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    firstName: 'John',
  })
})

test('updates the first entity when multiple entities match the query', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      followersCount: datatype.number,
    },
  })
  db.user.create({
    firstName: 'Alice',
    followersCount: 10,
  })
  db.user.create({
    followersCount: 12,
  })

  const updatedUser = db.user.update({
    where: {
      followersCount: {
        gte: 10,
      },
    },
    data: {
      firstName: 'Kate',
    },
  })
  expect(updatedUser).toHaveProperty('firstName', 'Kate')

  const kate = db.user.findFirst({
    where: {
      firstName: {
        equals: 'Kate',
      },
    },
  })
  expect(kate).toHaveProperty('firstName', 'Kate')
})

test('updates a nested property of the model', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      address: {
        billing: {
          street: String,
          country: String,
        },
        shipping: {
          country: String,
        },
      },
    },
  })

  db.user.create({
    id: 'user-1',
    address: {
      billing: {
        street: 'Baker',
        country: 'us',
      },
      shipping: {
        country: 'de',
      },
    },
  })

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'user-1',
      },
    },
    data: {
      address: {
        billing: {
          country: 'de',
        },
      },
    },
  })

  expect(updatedUser).toHaveProperty(['address', 'billing', 'street'], 'Baker')
  expect(updatedUser).toHaveProperty(['address', 'billing', 'country'], 'de')

  const queriedUser = db.user.findFirst({
    where: {
      address: {
        billing: {
          country: {
            equals: 'de',
          },
        },
      },
    },
  })
  expect(queriedUser).toEqual(updatedUser)
})

test('updates root and nested properties of the model simultaneously', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      address: {
        shipping: {
          country: String,
        },
      },
    },
  })

  db.user.create({
    id: 'user-1',
    firstName: 'Lora',
    address: {
      shipping: {
        country: 'de',
      },
    },
  })

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'user-1',
      },
    },
    data: {
      firstName: 'Bob',
      address: {
        shipping: {
          country: 'fr',
        },
      },
    },
  })

  expect(updatedUser).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
    firstName: 'Bob',
    address: {
      shipping: {
        country: 'fr',
      },
    },
  })
})

test('updates both properties and relations', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      address: oneOf('address'),
    },
    address: {
      id: primaryKey(datatype.uuid),
      country: String,
    },
  })

  db.user.create({
    id: 'user-1',
    firstName: 'Lora',
    address: db.address.create({
      id: 'address-1',
      country: 'de',
    }),
  })

  const newAddress = db.address.create({
    id: 'address-2',
    country: 'us',
  })

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'user-1',
      },
    },
    data: {
      firstName: 'Bob',
      address: newAddress,
    },
  })

  expect(updatedUser).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
    firstName: 'Bob',
    address: {
      [ENTITY_TYPE]: 'address',
      [PRIMARY_KEY]: 'id',
      id: 'address-2',
      country: 'us',
    },
  })
})

test('throws an exception when no model matches the query in strict mode', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
    },
  })
  db.user.create()
  db.user.create()

  const error = getThrownError(() => {
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: 'John',
      },
      strict: true,
    })
  })

  expect(error).toHaveProperty('name', 'OperationError')
  expect(error).toHaveProperty('type', OperationErrorType.EntityNotFound)
  expect(error).toHaveProperty(
    'message',
    'Failed to execute "update" on the "user" model: no entity found matching the query "{"id":{"equals":"abc-123"}}".',
  )
})

test('moves the entity when it updates the primary key', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })

  db.user.create({
    id: 'abc-123',
  })

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
    data: {
      id: 'def-456',
    },
  })
  expect(updatedUser).toHaveProperty('id', 'def-456')

  const userResult = db.user.findFirst({
    where: {
      id: {
        equals: 'def-456',
      },
    },
  })
  expect(userResult).toHaveProperty('id', 'def-456')

  const oldUser = db.user.findFirst({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(oldUser).toBeNull()
})

test('does nothing when no entity matches the query', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })

  db.user.create()
  db.user.create()

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
    data: {
      id: 'def-456',
    },
  })
  expect(updatedUser).toBeNull()
})

test('throw an error when trying to update an entity using a key already used', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })

  db.user.create({
    id: '123',
  })
  db.user.create({
    id: '456',
  })

  const error = getThrownError(() => {
    db.user.update({
      where: {
        id: {
          equals: '456',
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
    'Failed to execute "update" on the "user" model: the entity with a primary key "123" ("id") already exists.',
  )
})

test('derives next entity values based on the existing ones', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.findName,
      role: String,
    },
  })

  db.user.create({
    firstName: 'John',
    role: 'Auditor',
  })
  db.user.create({
    firstName: 'Jessie',
    role: 'Writer',
  })

  db.user.update({
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
  })

  const userResult = db.user.findFirst({
    where: {
      firstName: {
        equals: 'JOHN',
      },
    },
  })
  expect(userResult).toHaveProperty('firstName', 'JOHN')
  expect(userResult).toHaveProperty('role', 'Writer')
})

test('exposes a root entity for a derivitive value of a nested property', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      address: {
        billing: {
          country: String,
        },
      },
    },
  })

  db.user.create({
    id: 'abc-123',
    address: {
      billing: {
        country: 'us',
      },
    },
  })

  const result = db.user.update({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
    data: {
      address: {
        billing: {
          country(country, user) {
            expect(user).toHaveProperty('id', 'abc-123')
            expect(user).toHaveProperty(['address', 'billing', 'country'], 'us')

            return country.toUpperCase()
          },
        },
      },
    },
  })

  expect(result).toHaveProperty(['address', 'billing', 'country'], 'US')
})

test('supports updating a nullable property to a non-null value', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: nullable(name.firstName),
    },
  })

  db.user.create({
    id: 'abc-123',
    firstName: null,
  })

  expect(
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: 'John',
      },
    }),
  ).toHaveProperty('firstName', 'John')
})

test('supports updating a nullable property with a value to null', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: nullable(name.firstName),
    },
  })

  db.user.create({
    id: 'abc-123',
    firstName: 'John',
  })

  expect(
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        firstName: null,
      },
    }),
  ).toHaveProperty('firstName', null)
})

test('throws when setting a non-nullable property to null', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: name.firstName,
    },
  })

  db.user.create({
    id: 'abc-123',
  })

  expect(() =>
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        // @ts-expect-error types don't allow updating normal properties to null
        firstName: null,
      },
    }),
  ).toThrowError(
    /Failed to set value at "firstName" to null as the property is not nullable/,
  )
})
