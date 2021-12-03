import { primaryKey, oneOf, nullable } from '../../src'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'
import { testFactory } from '../testUtils'

/**
 * Nullable one-to-one relationship.
 */
it('updates a nullable relationship with initial value to null', () => {
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

  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: { capital: null },
  })

  expect(nextCountry).toHaveRelationalProperty('capital', null)

  expect(nextCountry?.capital).toEqual(null)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    entity('country', {
      code: 'uk',
      capital: null,
    }),
  )

  // Un-referenced city still exists.
  expect(db.city.findFirst({ where: { name: { equals: 'London' } } })).toEqual(
    entity('city', { name: 'London' }),
  )
})

it('updates a nullable relationship without initial value to null', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({ code: 'uk' })

  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: { capital: null },
  })

  expect(nextCountry).toHaveRelationalProperty('capital', null)

  expect(nextCountry?.capital).toEqual(null)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    entity('country', {
      code: 'uk',
      capital: null,
    }),
  )

  expect(db.city.count()).toEqual(0)
})

it('updates a nullable relationship with initial value to a new entity', () => {
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
    // Previously, "London" was the capital.
    capital: db.city.create({ name: 'London' }),
  })

  const nextCapital = db.city.create({ name: 'Leads' })
  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: {
      // Update the capital to be a newly created "Leads".
      capital: nextCapital,
    },
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: nextCapital,
  })

  expect(nextCountry).toHaveRelationalProperty('capital', nextCapital)

  // The updated country contains the updated relationship.
  expect(nextCountry).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )

  // The country can be queried by the new relationship.
  expect(
    db.country.findFirst({ where: { capital: { name: { equals: 'Leads' } } } }),
  ).toEqual(expectedCountry)

  // Newly created city exists.
  expect(db.city.findFirst({ where: { name: { equals: 'Leads' } } })).toEqual(
    nextCapital,
  )

  // Previously referenced city is not deleted.
  expect(db.city.findFirst({ where: { name: { equals: 'London' } } })).toEqual(
    entity('city', { name: 'London' }),
  )
})

it('updates a nullable relationship without initial value to a new entity', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({ code: 'uk' })

  const nextCapital = db.city.create({ name: 'Leads' })
  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: { capital: nextCapital },
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: nextCapital,
  })

  expect(nextCountry).toHaveRelationalProperty('capital', nextCapital)

  // The updated country contains the updated relationship.
  expect(nextCountry).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )

  // The country can be queried by the new relationship.
  expect(
    db.country.findFirst({ where: { capital: { name: { equals: 'Leads' } } } }),
  ).toEqual(expectedCountry)

  // Newly created city exists.
  expect(db.city.findFirst({ where: { name: { equals: 'Leads' } } })).toEqual(
    nextCapital,
  )
})

it('updates a deeply nested nullable relationship', () => {
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

  const user = db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: db.country.create({ code: 'uk' }),
      },
    },
  })

  const nextUser = db.user.update({
    where: { id: { equals: 'user-1' } },
    data: {
      address: {
        billing: {
          country: db.country.create({ code: 'us' }),
        },
      },
    },
    strict: true,
  })

  const expectedUser = entity('user', {
    id: 'user-1',
    address: {
      billing: {
        country: entity('country', {
          code: 'us',
        }),
      },
    },
  })

  expect(nextUser).toEqual(expectedUser)
})

it('forbids updating a nullable relationship without initial value to a different model', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
    user: {
      id: primaryKey(String),
    },
  })

  const country = db.country.create({ code: 'uk' })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        // @ts-expect-error Runtime value incompatibility.
        capital: db.user.create({ id: 'user-1' }),
      },
    }),
  ).toThrow(
    'Failed to update a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected the next value to reference a "city" but got "user" (id: "user-1").',
  )
  expect(country).toHaveRelationalProperty('capital', null)
})

it('forbids updating a nullable relationship with initial value to a different model', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
    user: {
      id: primaryKey(String),
    },
  })

  const london = db.city.create({ name: 'London' })
  const country = db.country.create({
    code: 'uk',
    capital: london,
  })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        // @ts-expect-error Runtime value incompatibility.
        capital: db.user.create({ id: 'user-1' }),
      },
    }),
  ).toThrow(
    'Failed to update a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected the next value to reference a "city" but got "user" (id: "user-1").',
  )
  expect(country).toHaveRelationalProperty('capital', london)
})

/**
 * Non-nullable one-to-one relationship.
 */
it('updates a non-nullable relationship with initial value to a new entity', () => {
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
    capital: db.city.create({ name: 'London' }),
  })

  const nextCapital = db.city.create({ name: 'Leads' })
  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: { capital: nextCapital },
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: nextCapital,
  })

  expect(nextCountry).toHaveRelationalProperty('capital', nextCapital)

  expect(nextCountry).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({ where: { capital: { name: { equals: 'Leads' } } } }),
  ).toEqual(expectedCountry)

  // Newly referenced entity is created.
  expect(db.city.findFirst({ where: { name: { equals: 'Leads' } } })).toEqual(
    nextCapital,
  )

  // Un-referenced entity is not removed.
  expect(db.city.findFirst({ where: { name: { equals: 'London' } } })).toEqual(
    entity('city', { name: 'London' }),
  )
})

it('updates a non-nullable relationship without initial value to a new entity', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  db.country.create({ code: 'uk' })

  const nextCapital = db.city.create({ name: 'Leads' })
  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: { capital: nextCapital },
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: nextCapital,
  })

  expect(nextCountry).toHaveRelationalProperty('capital', nextCapital)

  expect(nextCountry).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({ where: { capital: { name: { equals: 'Leads' } } } }),
  ).toEqual(expectedCountry)

  // Newly referenced entity is created.
  expect(db.city.findFirst({ where: { name: { equals: 'Leads' } } })).toEqual(
    nextCapital,
  )
})

it('preserves the relational property after arbitrary parent entity update', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      name: String,
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const london = db.city.create({
    name: 'London',
  })
  db.country.create({
    code: 'uk',
    name: 'United Kingdom',
    capital: london,
  })

  const nextCountry = db.country.update({
    where: { code: { equals: 'uk' } },
    data: {
      name: 'The United Kingdom',
    },
  })

  expect(nextCountry).toHaveRelationalProperty('capital', london)
  expect(
    db.country.findFirst({ where: { code: { equals: 'uk' } } }),
  ).toHaveRelationalProperty('capital', london)
})

it('forbids updating a non-nullable relationship without initial value to null', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({ code: 'uk' })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        // @ts-expect-error Runtime value incompatibility.
        capital: null,
      },
    }),
  ).toThrow(
    'Failed to update a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): cannot update a non-nullable relationship to null.',
  )
  // Non-nullable relationships are not instantiated without a value.
  expect(country).not.toHaveProperty('capital')
})

it('forbids updating a non-nullable relationship without initial value to a different model', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
    user: {
      id: primaryKey(String),
    },
  })

  const country = db.country.create({ code: 'uk' })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        // @ts-expect-error Runtime value incompatibility.
        capital: db.user.create({ id: 'user-1' }),
      },
    }),
  ).toThrow(
    'Failed to update a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected the next value to reference a "city" but got "user" (id: "user-1").',
  )
  expect(country).not.toHaveProperty('capital')
  expect(db.user.getAll()).toEqual([
    {
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'user-1',
    },
  ])
})

it('forbids updating a unique non-nullable relationship to already referenced entity', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city', { unique: true }),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const prevCapital = db.city.create({ name: 'London' })
  const country = db.country.create({
    code: 'uk',
    capital: prevCapital,
  })

  const nextCapital = db.city.create({ name: 'Berlin' })
  db.country.create({
    code: 'de',
    capital: nextCapital,
  })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: { capital: nextCapital },
    }),
  ).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): the referenced "city" (name: "Berlin") belongs to another "country" (code: "de").',
  )
  expect(country).toHaveRelationalProperty('capital', prevCapital)
})

it('forbids updating a relationship to a compatible plain object', () => {
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
    capital: db.city.create({
      name: 'London',
    }),
  })

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        capital: {
          name: 'New Hampshire',
        },
      },
    }),
  ).toThrow(
    'Failed to update a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected the next value to be an entity but got {"name":"New Hampshire"}.',
  )
})

it('forbids updating a relationship to a non-existing entity', () => {
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

  expect(() =>
    db.country.update({
      where: { code: { equals: 'uk' } },
      data: {
        capital: entity('city', {
          name: 'New Hampshire',
        }),
      },
    }),
  ).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): referenced entity "city" (name: "New Hampshire") does not exist.',
  )
})
