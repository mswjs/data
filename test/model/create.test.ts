import { datatype, name } from 'faker'
import { factory, primaryKey, oneOf, nullable } from '@mswjs/data'
import { identity } from '../../src/utils/identity'

test('creates a new entity', () => {
  const userId = datatype.uuid()
  const db = factory({
    user: {
      id: primaryKey(identity(userId)),
    },
  })

  // Without any arguments a new entity is seeded
  // using the value getters defined in the model.
  const randomUser = db.user.create()
  expect(randomUser).toHaveProperty('id', userId)
})

test('creates a new entity with initial values', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
    },
  })

  // Entity can be given exact values to seed.
  const exactUser = db.user.create({
    id: 'abc-123',
  })
  expect(exactUser).toHaveProperty('id', 'abc-123')
})

test('creates a new entity with an array property', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      arrayProp: Array,
    },
  })

  const exactUser = db.user.create({
    id: 'abc-123',
    arrayProp: [1, 2, 3],
  })
  expect(exactUser).toHaveProperty('id', 'abc-123')
  expect(exactUser).toHaveProperty('arrayProp', [1, 2, 3])
})

test('creates a new entity with nullable properties', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: nullable(name.findName),
      age: nullable<number>(() => null),
      address: {
        street: String,
        number: nullable<number>(() => null),
      },
    },
  })

  const user = db.user.create({
    id: 'abc-123',
    name: null,
  })

  expect(user).toHaveProperty('name', null)
  expect(user).toHaveProperty('age', null)
  expect(user.address).toHaveProperty('number', null)
})

test('supports nested objects in the model definition', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: String,
      info: {
        firstName: String,
        lastName: String,
        address: {
          street: () => 'Yellow Brick Road',
          number: () => 1,
        },
        tags: Array,
      },
    },
  })

  // Entity can be given exact values to seed.
  const exactUser = db.user.create({
    id: 'abc-123',
    name: 'sampleUser',
    info: {
      firstName: 'Reginald',
      lastName: 'Dwight',
      address: {
        number: 73,
      },
      tags: ['one', 'two'],
    },
  })

  expect(exactUser).toHaveProperty('id', 'abc-123')
  expect(exactUser).toHaveProperty('name', 'sampleUser')
  expect(exactUser).toHaveProperty('info', {
    firstName: 'Reginald',
    lastName: 'Dwight',
    address: {
      street: 'Yellow Brick Road',
      number: 73,
    },
    tags: ['one', 'two'],
  })
})

test('relational properties can be declared in nested objects', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: String,
      info: {
        country: oneOf('country'),
        firstName: String,
        lastName: String,
      },
    },
    country: {
      id: primaryKey(datatype.uuid),
      name: String,
    },
  })

  const japan = db.country.create({
    name: 'Japan',
  })

  const exactUser = db.user.create({
    name: 'user',
    info: {
      country: japan,
      firstName: 'Ryuichi',
      lastName: 'Sakamoto',
    },
  })

  expect(exactUser).toHaveProperty('name', 'user')
  expect(exactUser.info).toHaveProperty('firstName', 'Ryuichi')
  expect(exactUser.info).toHaveProperty('lastName', 'Sakamoto')
  expect(exactUser.info.country).toHaveProperty('name', 'Japan')
})

test('uses value getters when creating an entity with nested arrays', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: String,
      info: {
        tags: () => [1, 2],
        documents: () => [],
      },
    },
  })

  const exactUser = db.user.create({
    id: 'abc-123',
    name: 'sampleUser',
  })

  expect(exactUser).toHaveProperty('name', 'sampleUser')
  expect(exactUser).toHaveProperty('info')
  expect(exactUser.info).toHaveProperty('tags', [1, 2])
  expect(exactUser.info).toHaveProperty('documents', [])
})

test('supports property names with dots in model definition', () => {
  const db = factory({
    user: {
      'employee.id': primaryKey(datatype.uuid),
    },
  })

  const user = db.user.create({
    'employee.id': 'abc-123',
  })

  expect(user).toHaveProperty(['employee.id'], 'abc-123')
})
