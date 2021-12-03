import { nullable, oneOf, primaryKey } from '../../src'
import { testFactory } from '../helpers'

/**
 * Nullable one-to-one relationship.
 */
it('creates a nullable relationship with entity as initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
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

  expect(country).toHaveRelationalProperty(
    'capital',
    entity('city', { name: 'London' }),
  )

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({
      where: { capital: { name: { equals: 'London' } } },
    }),
  ).toEqual(expectedCountry)
})

it('creates a nullable relationship with null as initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
    code: 'uk',
    capital: null,
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: null,
  })

  expect(country).toHaveRelationalProperty('capital', null)

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )

  expect(db.city.count()).toEqual(0)
})

it('creates a nullable relationship without initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city')),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
    code: 'uk',
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    // Nullable relational property is set to null by default.
    capital: null,
  })

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
})

it('forbids creating a nullable relationship referencing a different model', () => {
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

  expect(() =>
    db.country.create({
      code: 'uk',
      // @ts-expect-error Runtime value incompatibility.
      capital: db.user.create({ id: 'user-1' }),
    }),
  ).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected a referenced entity to be "city" but got "user" (id: "user-1").',
  )
  expect(db.country.count()).toEqual(0)
})

it('creates a nullable unique relationship with initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city', { unique: true })),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const london = db.city.create({ name: 'London' })
  const country = db.country.create({
    code: 'uk',
    capital: london,
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: london,
  })

  expect(country).toHaveRelationalProperty('capital', london)

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({
      where: { capital: { name: { equals: 'London' } } },
    }),
  ).toEqual(expectedCountry)
})

it('creates a nullable unique relationship with null as initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: nullable(oneOf('city', { unique: true })),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
    code: 'uk',
    capital: null,
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: null,
  })

  expect(country).toHaveRelationalProperty('capital', null)

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
})

/**
 * Non-nullable one-to-one relationship.
 */
it('creates a non-nullable relationship', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const london = db.city.create({ name: 'London' })
  const country = db.country.create({
    code: 'uk',
    capital: london,
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: london,
  })

  expect(country).toHaveRelationalProperty('capital', london)

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({
      where: { capital: { name: { equals: 'London' } } },
    }),
  ).toEqual(expectedCountry)
})

it('creates a non-nullable relationship without the initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
    code: 'uk',
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: undefined,
  })

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({
      where: { capital: { name: { equals: 'Manchester' } } },
    }),
  ).toEqual(null)
})

it('forbids creating a non-nullable relationship with null as initial value', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city'),
    },
    city: {
      name: primaryKey(String),
    },
  })

  expect(() =>
    db.country.create({
      code: 'uk',
      // @ts-expect-error Runtime value incompatibility.
      capital: null,
    }),
  ).toThrow(
    'Failed to define a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): cannot set a non-nullable relationship to null.',
  )
})

it('forbids creating a non-nullable relatiosnhip referencing a different model', () => {
  const { db, entity } = testFactory({
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

  expect(() =>
    db.country.create({
      code: 'uk',
      // @ts-expect-error Runtime value incompatibility.
      capital: db.user.create({ id: 'user-1' }),
    }),
  ).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "city" at "country.capital" (code: "uk"): expected a referenced entity to be "city" but got "user" (id: "user-1")',
  )

  expect(db.country.count()).toEqual(0)
  expect(db.user.getAll()).toEqual([entity('user', { id: 'user-1' })])
})

/**
 * Unique relationship.
 */
it('creates a non-nullable unique relationship with initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city', { unique: true }),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const london = db.city.create({ name: 'London' })
  const country = db.country.create({
    code: 'uk',
    capital: london,
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: london,
  })

  expect(country).toHaveRelationalProperty('capital', london)

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
  expect(
    db.country.findFirst({
      where: { capital: { name: { equals: 'London' } } },
    }),
  ).toEqual(expectedCountry)
})

it('creates a non-nullable unique relationship without initial value', () => {
  const { db, entity } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city', { unique: true }),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const country = db.country.create({
    code: 'uk',
  })

  const expectedCountry = entity('country', {
    code: 'uk',
    capital: undefined,
  })

  expect(country).toEqual(expectedCountry)
  expect(db.country.findFirst({ where: { code: { equals: 'uk' } } })).toEqual(
    expectedCountry,
  )
})

it('forbids creating a unique relationship to already referenced entity', () => {
  const { db } = testFactory({
    country: {
      code: primaryKey(String),
      capital: oneOf('city', { unique: true }),
    },
    city: {
      name: primaryKey(String),
    },
  })

  const london = db.city.create({ name: 'London' })
  db.country.create({
    code: 'uk',
    capital: london,
  })

  expect(() =>
    db.country.create({
      code: 'de',
      capital: london,
    }),
  ).toThrow(
    'Failed to resolve a "ONE_OF" relationship to "city" at "country.capital" (code: "de"): the referenced "city" (name: "London") belongs to another "country" (code: "uk").',
  )
  expect(db.country.findFirst({ where: { code: { equals: 'de' } } })).toEqual(
    null,
  )
})
