import { factory, primaryKey, oneOf } from '@mswjs/data'

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
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      id: 'city-1',
      name: 'London',
    },
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
    id: 'country-1',
    name: 'Great Britain',
    capital: {
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

test('allows creating an entity without specifying a value for the one-to-one relational property', () => {
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
    id: 'country-1',
    name: '',
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
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      id: 'city-2',
      name: 'New Hampshire',
    },
  })
  expect(refetchCountry()).toEqual({
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      id: 'city-2',
      name: 'New Hampshire',
    },
  })
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
    'Failed to add relational property "capital" on "country": referenced entity with the id "city-2" does not exist.',
  )
})

test('respects updates to the referenced relational entity', () => {
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
    id: 'country-1',
    name: 'Great Britain',
    capital: {
      id: 'city-1',
      name: 'New Hampshire',
    },
  })
})
