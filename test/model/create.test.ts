import { faker } from '@faker-js/faker'
import { NullableObject, NullableProperty } from '../../src/nullable'
import { factory, primaryKey, oneOf, manyOf, nullable } from '../../src'
import { identity } from '../../src/utils/identity'

test('creates a new entity', () => {
  const userId = faker.datatype.uuid()
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
      id: primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
      name: nullable(faker.name.findName),
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

test('supports nested objects in the model definition', () => {
  const db = factory({
    user: {
      id: primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
      name: String,
      info: {
        country: oneOf('country'),
        firstName: String,
        lastName: String,
      },
    },
    country: {
      id: primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
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
      'employee.id': primaryKey(faker.datatype.uuid),
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
      id: primaryKey(faker.datatype.uuid),
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

type AddressDefinitionType = {
  street: StringConstructor
  number: NullableProperty<number>
}

type NullableAddressDefinitionType = AddressDefinitionType | null

type UserDetailsType = {
  name: StringConstructor
  hobbies: ArrayConstructor
  address: NullableObject<AddressDefinitionType>
}

type NullableUserDetailsType = UserDetailsType | null

describe('nullable objects with regular definition', () => {
  test('full initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable({
          street: String,
          number: nullable(Number),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: {
        street: 'Wall street',
        number: 100,
      },
    })

    expect(user.address).toEqual({
      street: 'Wall street',
      number: 100,
    })
  })
  test('null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable({
          street: String,
          number: nullable(Number),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: null,
    })

    expect(user.address).toEqual(null)
  })
  test('no initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable({
          street: String,
          number: nullable(Number),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
    })

    expect(user.address).toEqual({
      street: '',
      number: 0,
    })
  })
  test('inner null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable({
          street: String,
          number: nullable(Number),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: {
        street: 'Wall street',
        number: null,
      },
    })

    expect(user.address).toEqual({
      street: 'Wall street',
      number: null,
    })
  })
  test('null value in inner nullable definition and no inner nullable initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable({
          street: String,
          number: nullable<number>(() => null),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: {
        street: 'Wall street',
      },
    })

    expect(user.address).toEqual({
      street: 'Wall street',
      number: null,
    })
  })
})

describe('nullable objects with null definition', () => {
  test('full initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable<NullableAddressDefinitionType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: {
        street: 'Wall street',
        number: 100,
      },
    })

    expect(user.address).toEqual({
      street: 'Wall street',
      number: 100,
    })
  })
  test('null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable<NullableAddressDefinitionType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: null,
    })

    expect(user.address).toEqual(null)
  })
  test('no initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable<NullableAddressDefinitionType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
    })

    expect(user.address).toEqual(null)
  })
  test('inner null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        address: nullable<NullableAddressDefinitionType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      address: {
        street: 'Wall street',
        number: null,
      },
    })

    expect(user.address).toEqual({
      street: 'Wall street',
      number: null,
    })
  })
})

describe('nullable objects with complex structure and regular definition', () => {
  test('full initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable({
          name: String,
          hobbies: Array,
          address: nullable({
            street: () => 'Wall street',
            number: nullable(() => 100),
          }),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: {
        name: 'John',
        hobbies: ['Music', 'Sports'],
        address: {
          street: 'Fifth Avenue',
          number: 150,
        },
      },
    })

    expect(user.details).toEqual({
      name: 'John',
      hobbies: ['Music', 'Sports'],
      address: {
        street: 'Fifth Avenue',
        number: 150,
      },
    })
  })
  test('null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable({
          name: String,
          hobbies: Array,
          address: nullable({
            street: () => 'Wall street',
            number: nullable(() => 100),
          }),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: null,
    })

    expect(user.details).toEqual(null)
  })
  test('no initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable({
          name: String,
          hobbies: () => ['Cooking'],
          address: nullable({
            street: () => 'Wall street',
            number: nullable(() => 100),
          }),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
    })

    expect(user.details).toEqual({
      name: '',
      hobbies: ['Cooking'],
      address: {
        street: 'Wall street',
        number: 100,
      },
    })
  })
  test('inner null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable({
          name: String,
          hobbies: Array,
          address: nullable({
            street: () => 'Wall street',
            number: nullable(() => 100),
          }),
        }),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: {
        name: 'John',
        hobbies: ['Music', 'Sports'],
        address: null,
      },
    })

    expect(user.details).toEqual({
      name: 'John',
      hobbies: ['Music', 'Sports'],
      address: null,
    })
  })
})

describe('nullable objects with complex structure and null definition', () => {
  test('full initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable<NullableUserDetailsType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: {
        name: 'John',
        hobbies: ['Music', 'Sports'],
        address: {
          street: 'Fifth Avenue',
          number: 150,
        },
      },
    })

    expect(user.details).toEqual({
      name: 'John',
      hobbies: ['Music', 'Sports'],
      address: {
        street: 'Fifth Avenue',
        number: 150,
      },
    })
  })
  test('null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable<NullableUserDetailsType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: null,
    })

    expect(user.details).toEqual(null)
  })
  test('no initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable<NullableUserDetailsType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
    })

    expect(user.details).toEqual(null)
  })
  test('inner null initial value', () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        details: nullable<NullableUserDetailsType>(null),
      },
    })

    const user = db.user.create({
      id: 'abc-123',
      details: {
        name: 'John',
        hobbies: ['Music', 'Sports'],
        address: null,
      },
    })

    expect(user.details).toEqual({
      name: 'John',
      hobbies: ['Music', 'Sports'],
      address: null,
    })
  })
})
