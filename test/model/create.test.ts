import { datatype, name } from 'faker'
import { factory, primaryKey, oneOf, manyOf, nullable } from '../../src'
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
  expect(randomUser.id).toEqual(userId)
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
  expect(exactUser.id).toEqual('abc-123')
})

test('creates a new entity with an array property', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      favouriteNumbers: Array,
    },
  })

  const exactUser = db.user.create({
    id: 'abc-123',
    favouriteNumbers: [1, 2, 3],
  })
  expect(exactUser.id).toEqual('abc-123')
  expect(exactUser.favouriteNumbers).toEqual([1, 2, 3])
})

test('creates a new entity with an array property with array of objects assigned', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      notes: Array,
    },
  })

  const exampleNotes = [
    {
      key: '001',
      value: 'Buy groceries',
    },
    {
      key: '002',
      value: 'Call grandpa on Friday',
    },
  ]

  const exactUser = db.user.create({
    id: 'abc-123',
    notes: exampleNotes,
  })

  expect(exactUser.id).toEqual('abc-123')
  expect(exactUser.notes).toEqual(exampleNotes)
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

  expect(user.name).toEqual(null)
  expect(user.age).toEqual(null)
  expect(user.address.number).toEqual(null)
})

test('supports nested nullable object', () => {
  type Car = {
    brand: string
    model: string
  }
  type Bike = Car

  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: name.findName,
      vehicule: {
        car: nullable<Car>(() => null),
        bike: nullable<Bike>(() => null),
      },
    },
  })

  const DIDDY = {
    id: '🐵',
    name: 'Diddy',
    vehicule: {
      car: {
        brand: 'Diddy Kong',
        model: 'Super Racing Model with extra 🍌 carriage',
      },
    },
  }

  const diddyUser = db.user.create({
    id: DIDDY.id,
    name: DIDDY.name,
    vehicule: { car: DIDDY.vehicule.car },
  })

  expect(diddyUser.id).toEqual(DIDDY.id)
  expect(diddyUser.name).toEqual(DIDDY.name)
  expect(diddyUser.vehicule.car).toEqual(DIDDY.vehicule.car)
  expect(diddyUser.vehicule.bike).toEqual(null)

  const DONKEY = {
    id: '🦍',
    name: 'Donkey',
    vehicule: {
      car: null,
      bike: {
        brand: 'Donkey Kong Choppers',
        model: 'Chuck Norris, the fastest',
      },
    },
  }

  const donkeyUser = db.user.create({
    id: DONKEY.id,
    name: DONKEY.name,
    vehicule: DONKEY.vehicule,
  })

  expect(donkeyUser.id).toEqual(DONKEY.id)
  expect(donkeyUser.name).toEqual(DONKEY.name)
  expect(donkeyUser.vehicule.bike).toEqual(DONKEY.vehicule.bike)
  expect(donkeyUser.vehicule.car).toEqual(null)
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

  expect(exactUser.id).toEqual('abc-123')
  expect(exactUser.name).toEqual('sampleUser')
  expect(exactUser.info).toEqual({
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

  expect(exactUser.name).toEqual('user')
  expect(exactUser.info.firstName).toEqual('Ryuichi')
  expect(exactUser.info.lastName).toEqual('Sakamoto')
  expect(exactUser.info.country).toEqual(
    expect.objectContaining({ name: 'Japan' }),
  )
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

  expect(exactUser.name).toEqual('sampleUser')
  expect(exactUser).toHaveProperty('info')
  expect(exactUser.info.tags).toEqual([1, 2])
  expect(exactUser.info.documents).toEqual([])
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

  expect(user['employee.id']).toEqual('abc-123')
})

test('throws an exception when null used as initial value for non-nullable properties', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      name: String,
    },
  })

  expect(() => {
    db.user.create({
      // @ts-expect-error Cannot use null as the initial value for a non-nullable property.
      name: null,
    })
  }).toThrowError(
    'Failed to create a "user" entity: a non-nullable property "name" cannot be instantiated with null. Use the "nullable" function when defining this property to support nullable value.',
  )
})

test('throws an exception when null used as initial value for non-nullable relations', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
    },
  })

  expect(() => {
    db.user.create({
      id: 'user-1',
      // @ts-expect-error Cannot use null as the initial value for a non-nullable relation.
      posts: null,
    })
  }).toThrowError(
    'Failed to define a "MANY_OF" relationship to "post" at "user.posts" (id: "user-1"): cannot set a non-nullable relationship to null.',
  )
})
