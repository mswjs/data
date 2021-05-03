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

  expect(() => db.country.create({ id: 'country-1' })).not.toThrow()
})

test('updates the relational property to the next entity', () => {
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

test('updates the relational property to a compatible object value', () => {
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

  // Update the "country" relational property
  // to a compatible object value.
  const updatedCountry = db.country.update({
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
