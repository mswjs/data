import { factory, primaryKey, oneOf, nullable } from '@mswjs/data'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../lib/glossary'

test('supports one-to-one relationship', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  const britain = db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  expect(britain.capital).toEqual({
    [ENTITY_TYPE]: 'city',
    [PRIMARY_KEY]: 'id',
    id: 'city-1',
    name: 'London',
  })

  expect(
    db.country.findFirst({
      where: {
        name: {
          equals: 'Great Britain',
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'London',
    },
  })
})

test('supports nullable one-to-one relationship', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: nullable(oneOf('city')),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  const britain = db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  const candyLand = db.country.create({
    id: 'country-2',
    name: 'Candy Land',
    capital: null,
  })

  expect(britain.capital).toEqual({
    [ENTITY_TYPE]: 'city',
    [PRIMARY_KEY]: 'id',
    id: 'city-1',
    name: 'London',
  })

  expect(
    db.country.findFirst({
      where: {
        name: {
          equals: 'Great Britain',
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'London',
    },
  })

  expect(candyLand.capital).toBeNull()

  expect(
    db.country.findFirst({
      where: {
        name: {
          equals: 'Candy Land',
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-2',
    name: 'Candy Land',
    capital: null,
  })
})

test('supports querying through a one-to-one relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  expect(
    db.country.findFirst({
      where: {
        capital: {
          name: {
            equals: 'London',
          },
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'London',
    },
  })

  expect(
    db.country.findFirst({
      where: {
        capital: {
          name: {
            equals: 'New Hampshire',
          },
        },
      },
    }),
  ).toEqual(null)
})

test('supports querying through a nullable one-to-one relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: nullable(oneOf('city')),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  expect(
    db.country.findFirst({
      where: {
        capital: {
          name: {
            equals: 'London',
          },
        },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'London',
    },
  })

  expect(
    db.country.findFirst({
      where: {
        capital: {
          name: {
            equals: 'New Hampshire',
          },
        },
      },
    }),
  ).toEqual(null)
})

test('supports querying through a nested one-to-one relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          country: oneOf('country', { unique: true }),
        },
      },
    },
    country: {
      code: primaryKey(String),
    },
  })

  const usa = db.country.create({ code: 'us' })

  const user = db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: usa,
      },
    },
  })

  const result = db.user.findFirst({
    where: {
      address: {
        billing: {
          country: {
            code: {
              equals: 'us',
            },
          },
        },
      },
    },
  })

  expect(result).toEqual(user)
})

test('supports querying through a nested nullable one-to-one relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          country: nullable(oneOf('country', { unique: true })),
        },
      },
    },
    country: {
      code: primaryKey(String),
    },
  })

  const usa = db.country.create({ code: 'us' })

  const user = db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: usa,
      },
    },
  })

  const result = db.user.findFirst({
    where: {
      address: {
        billing: {
          country: {
            code: {
              equals: 'us',
            },
          },
        },
      },
    },
  })

  expect(result).toEqual(user)
})

test('creates an entity without specifying initial value for the one-to-one relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  const result = db.country.create({ id: 'country-1' })

  expect(result).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: '',
  })
})

test('creates an entity without specifying initial value for the nullable one-to-one relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: nullable(oneOf('city')),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  const result = db.country.create({ id: 'country-1' })

  expect(result).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: '',
    capital: null,
  })
})

test('updates the relational property to the next value', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })
  const refetchCountry = () => {
    return db.country.findFirst({
      where: {
        name: {
          equals: 'Great Britain',
        },
      },
    })
  }

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  // Update the "capital" relational property.
  const updatedCountry = db.country.update({
    where: {
      name: {
        equals: 'Great Britain',
      },
    },
    data: {
      capital: db.city.create({
        id: 'city-2',
        name: 'New Hampshire',
      }),
    },
  })

  expect(updatedCountry).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-2',
      name: 'New Hampshire',
    },
  })
  expect(refetchCountry()).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-2',
      name: 'New Hampshire',
    },
  })
})

test('updates the nullable relational property to the next value', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: nullable(oneOf('city')),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })
  const refetchCountry = () => {
    return db.country.findFirst({
      where: {
        name: {
          equals: 'Great Britain',
        },
      },
    })
  }

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  // Update the "capital" relational property.
  let updatedCountry = db.country.update({
    where: {
      name: {
        equals: 'Great Britain',
      },
    },
    data: {
      capital: db.city.create({
        id: 'city-2',
        name: 'New Hampshire',
      }),
    },
  })

  expect(updatedCountry).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-2',
      name: 'New Hampshire',
    },
  })
  expect(refetchCountry()).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-2',
      name: 'New Hampshire',
    },
  })

  // Update the "capital" relational property to null.
  updatedCountry = db.country.update({
    where: {
      name: {
        equals: 'Great Britain',
      },
    },
    data: {
      capital: null,
    },
  })

  expect(updatedCountry).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: null,
  })
  expect(refetchCountry()).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: null,
  })
})

test('throws an exception when creating a unique one-to-one relation to the already referenced entity', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      // There can only be 1 invite associated with 1 user.
      invitation: oneOf('invite', { unique: true }),
    },
    invite: {
      code: primaryKey(String),
    },
  })

  const invitation = db.invite.create({
    code: 'abc-123',
  })

  // Create a user with a different invite.
  db.user.create({
    id: 'user-1',
    invitation,
  })

  expect(() =>
    db.user.create({
      id: 'user-2',
      invitation,
    }),
  ).toThrow(
    'Failed to create a unique "ONE_OF" relation to "invite" ("user.invitation") for "user-2": referenced invite "abc-123" belongs to another user ("user-1").',
  )
})

test('throws an exception when updating a unique one-to-one relation to the already referenced entity', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      // There can only be 1 invite associated with 1 user.
      invitation: oneOf('invite', { unique: true }),
    },
    invite: {
      code: primaryKey(String),
    },
  })

  const firstInvite = db.invite.create({ code: 'abc-123' })
  const secondInvite = db.invite.create({ code: 'def-456' })

  db.user.create({
    id: 'user-1',
    invitation: firstInvite,
  })

  db.user.create({
    id: 'user-2',
    invitation: secondInvite,
  })

  expect(() =>
    db.user.update({
      where: {
        id: {
          equals: 'user-1',
        },
      },
      data: {
        invitation: secondInvite,
      },
      strict: true,
    }),
  ).toThrow(
    'Failed to create a unique "ONE_OF" relation to "invite" ("user.invitation") for "user-1": referenced invite "def-456" belongs to another user ("user-2").',
  )
})

test('throws an exception when updating a non-nullable one-to-one relation to null', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      invitation: oneOf('invite'),
    },
    invite: {
      code: primaryKey(String),
    },
  })

  db.user.create({
    id: 'user-1',
    invitation: db.invite.create({ code: 'abc-123' }),
  })

  expect(() =>
    db.user.update({
      where: {
        id: {
          equals: 'user-1',
        },
      },
      data: {
        // @ts-expect-error updating non-nullable relation to null not allowed
        invitation: null,
      },
      strict: true,
    }),
  ).toThrow(
    'Failed to update relational property "invitation" on "user": the next value must be an entity, a list of entities, or null if relation is nullable',
  )
})

test('updates a relational property without initial value', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
  })

  const updatedCountry = db.country.update({
    where: {
      id: {
        equals: 'country-1',
      },
    },
    data: {
      capital: db.city.create({
        id: 'city-1',
        name: 'London',
      }),
    },
  })

  expect(updatedCountry).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'London',
    },
  })

  expect(
    db.country.findFirst({
      where: {
        id: {
          equals: 'country-1',
        },
      },
    }),
  ).toEqual(updatedCountry)
})

test('throws an exception when updating a relation to a compatible plain object', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })

  expect(() =>
    db.country.update({
      where: {
        name: {
          equals: 'Great Britain',
        },
      },
      data: {
        capital: {
          id: 'city-2',
          name: 'New Hampshire',
        },
      },
    }),
  ).toThrow(
    'Failed to define a relational property "capital" on "country": referenced entity "city-2" ("id") does not exist.',
  )
})

test('supports updating the value of the relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      id: primaryKey(String),
      name: String,
    },
  })

  db.country.create({
    id: 'country-1',
    name: 'Great Britain',
    capital: db.city.create({
      id: 'city-1',
      name: 'London',
    }),
  })
  db.city.update({
    where: {
      name: { equals: 'London' },
    },
    data: {
      name: 'New Hampshire',
    },
  })

  const country = db.country.findFirst({
    where: {
      name: {
        equals: 'Great Britain',
      },
    },
  })

  expect(country).toEqual({
    [ENTITY_TYPE]: 'country',
    [PRIMARY_KEY]: 'id',
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      [ENTITY_TYPE]: 'city',
      [PRIMARY_KEY]: 'id',
      id: 'city-1',
      name: 'New Hampshire',
    },
  })
})

test('supports updating the values of multiple relational properties', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      country: oneOf('country'),
    },
    country: {
      code: primaryKey(String),
    },
  })

  // Initial entities.
  db.user.create({
    id: 'user-1',
    country: db.country.create({
      code: 'us',
    }),
  })
  db.user.create({
    id: 'user-2',
    country: db.country.create({
      code: 'de',
    }),
  })

  // Update entities.
  expect(
    db.user.update({
      where: {
        id: { equals: 'user-1' },
      },
      data: {
        country: db.country.create({
          code: 'uk',
        }),
      },
    }),
  ).toHaveProperty(['country', 'code'], 'uk')

  expect(
    db.user.findFirst({
      where: {
        id: { equals: 'user-1' },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
    country: {
      [ENTITY_TYPE]: 'country',
      [PRIMARY_KEY]: 'code',
      code: 'uk',
    },
  })

  expect(
    db.user.update({
      where: {
        id: { equals: 'user-2' },
      },
      data: {
        country: db.country.create({
          code: 'ua',
        }),
      },
    }),
  ).toHaveProperty(['country', 'code'], 'ua')

  expect(
    db.user.findFirst({
      where: {
        id: { equals: 'user-2' },
      },
    }),
  ).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-2',
    country: {
      [ENTITY_TYPE]: 'country',
      [PRIMARY_KEY]: 'code',
      code: 'ua',
    },
  })
})
