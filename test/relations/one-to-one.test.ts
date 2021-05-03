import { datatype, random } from 'faker'
import { factory, primaryKey, oneOf } from '@mswjs/data'

test('supports one-to-one relation', () => {
  const db = factory({
    country: {
      id: primaryKey(datatype.uuid),
      name: random.words,
    },
    capital: {
      id: primaryKey(datatype.uuid),
      name: random.word,
      country: oneOf('country'),
    },
  })

  const usa = db.country.create({
    name: 'United States of America',
  })
  const washington = db.capital.create({
    name: 'Washington',
    country: usa,
  })

  expect(washington.country).toHaveProperty('name', 'United States of America')
})

test('supports querying through a one-to-one relational property', () => {
  const db = factory({
    country: {
      id: primaryKey(datatype.uuid),
      name: random.words,
    },
    capital: {
      id: primaryKey(datatype.uuid),
      name: random.word,
      country: oneOf('country'),
    },
  })

  const usa = db.country.create({
    name: 'United States of America',
  })
  db.capital.create({
    name: 'Washington',
    country: usa,
  })

  const capital = db.capital.findFirst({
    where: {
      country: {
        name: {
          equals: 'United States of America',
        },
      },
    },
  })
  expect(capital).toHaveProperty('name', 'Washington')
})

test('should not throw error if an entity with one-to-one relation is created without it', () => {
  const db = factory({
    country: {
      id: primaryKey(random.uuid),
      name: random.words,
    },
    capital: {
      id: primaryKey(random.uuid),
      name: random.word,
      country: oneOf('country'),
    },
  })

  expect(() => db.capital.create()).not.toThrow()
})

test('updates the relational property to the next entity', () => {
  const db = factory({
    country: {
      name: primaryKey(random.words),
    },
    capital: {
      name: primaryKey(random.word),
      country: oneOf('country'),
    },
  })
  const refetchCapital = () => {
    return db.capital.findFirst({
      where: {
        name: { equals: 'Washington' },
      },
    })
  }

  const usa = db.country.create({
    name: 'United States of America',
  })
  const australia = db.country.create({
    name: 'Australia',
  })
  db.capital.create({
    name: 'Washington',
    country: usa,
  })
  expect(refetchCapital()).toEqual({
    name: 'Washington',
    country: {
      name: 'United States of America',
    },
  })

  // Update the "country" relational property.
  const updatedCapital = db.capital.update({
    where: {
      name: { equals: 'Washington' },
    },
    data: {
      country: australia,
    },
  })

  expect(updatedCapital).toEqual({
    name: 'Washington',
    country: {
      name: 'Australia',
    },
  })
  expect(refetchCapital()).toEqual({
    name: 'Washington',
    country: {
      name: 'Australia',
    },
  })
})

test('updates the relational property to a compatible object value', () => {
  const db = factory({
    country: {
      name: primaryKey(random.words),
    },
    capital: {
      name: primaryKey(random.word),
      country: oneOf('country'),
    },
  })
  const refetchCapital = () => {
    return db.capital.findFirst({
      where: {
        name: { equals: 'Washington' },
      },
    })
  }

  const usa = db.country.create({
    name: 'United States of America',
  })
  db.capital.create({
    name: 'Washington',
    country: usa,
  })

  expect(refetchCapital()).toEqual({
    name: 'Washington',
    country: {
      name: 'United States of America',
    },
  })

  // Update the "country" relational property
  // to a compatible object value.
  const updatedCapital = db.capital.update({
    where: {
      name: { equals: 'Washington' },
    },
    data: {
      country: {
        name: 'Australia',
      },
    },
  })

  expect(updatedCapital).toEqual({
    name: 'Washington',
    country: {
      name: 'Australia',
    },
  })
  expect(refetchCapital()).toEqual({
    name: 'Washington',
    country: {
      name: 'Australia',
    },
  })
})
