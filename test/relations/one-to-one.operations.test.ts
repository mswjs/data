import { nullable, oneOf, primaryKey } from '../../src'
import { testFactory } from '../helpers'

/**
 * Non-nullable one-to-one relationship.
 */
it('supports querying through a non-nullable relationship with initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({
    code: 'uk',
    capital: db.city.create({
      name: 'London',
    }),
  })
  const expectedCountry = entity('country', {
    code: 'uk',
    capital: entity('city', {
      name: 'London',
    }),
  })

  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual(expectedCountry)
  expect(
    db.country.findMany({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual([expectedCountry])

  // Non-matching query yields no results.
  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'New Hampshire' } },
      },
    }),
  ).toEqual(null)
})

it('supports querying through a non-nullable relationship without initial value', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({
    code: 'uk',
  })

  // Querying through the relationship is permitted
  // but since it hasn't been set, no queries will match.
  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual(null)
})

it('supports querying through a deeply nested non-nullable relationship', () => {
  const { db, entity } = testFactory({
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          country: oneOf('country'),
        },
      },
    },
    country: {
      code: primaryKey(String),
    },
  })

  db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: db.country.create({
          code: 'uk',
        }),
      },
    },
  })

  expect(
    db.user.findFirst({
      where: {
        address: {
          billing: {
            country: {
              code: { equals: 'uk' },
            },
          },
        },
      },
    }),
  ).toEqual(
    entity('user', {
      id: 'user-1',
      address: {
        billing: {
          country: entity('country', {
            code: 'uk',
          }),
        },
      },
    }),
  )
})

it('supports querying through nested non-nullable relationships', () => {
  const { db, entity } = testFactory({
    user: {
      id: primaryKey(String),
      location: oneOf('country'),
    },
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.user.create({
    id: 'user-1',
    location: db.country.create({
      code: 'uk',
      capital: db.city.create({
        name: 'London',
      }),
    }),
  })

  expect(
    db.user.findFirst({
      where: {
        location: {
          capital: {
            name: { equals: 'London' },
          },
        },
      },
    }),
  ).toEqual(
    entity('user', {
      id: 'user-1',
      location: entity('country', {
        code: 'uk',
        capital: entity('city', {
          name: 'London',
        }),
      }),
    }),
  )
})

/**
 * Nullable one-to-one relationship.
 */
it('supports querying through a nullable relationship with initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({
    code: 'uk',
    capital: db.city.create({
      name: 'London',
    }),
  })
  const expectedCountry = entity('country', {
    code: 'uk',
    capital: entity('city', {
      name: 'London',
    }),
  })

  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual(expectedCountry)
  expect(
    db.country.findMany({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual([expectedCountry])

  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'New Hampshire' } },
      },
    }),
  ).toEqual(null)
})

it('supports querying through a nullable relationship with null as initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({
    code: 'uk',
    capital: null,
  })

  // Querying through the relationship is permitted
  // but since it hasn't been set, no queries will match.
  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual(null)
})

it('supports querying through a nullable relationship without initial value', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({
    code: 'uk',
  })

  // Querying through the relationship is permitted
  // but since it hasn't been set, no queries will match.
  expect(
    db.country.findFirst({
      where: {
        capital: { name: { equals: 'London' } },
      },
    }),
  ).toEqual(null)
})

it('supports querying through a deeply nested nullable relationship', () => {
  const { db, entity } = testFactory({
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          country: nullable(oneOf('country')),
        },
      },
    },
    country: {
      code: primaryKey(String),
    },
  })

  db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: db.country.create({
          code: 'uk',
        }),
      },
    },
  })

  expect(
    db.user.findFirst({
      where: {
        address: {
          billing: {
            country: {
              code: { equals: 'uk' },
            },
          },
        },
      },
    }),
  ).toEqual(
    entity('user', {
      id: 'user-1',
      address: {
        billing: {
          country: entity('country', {
            code: 'uk',
          }),
        },
      },
    }),
  )
})
