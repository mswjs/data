import { datatype, random } from 'faker'
import { factory, primaryKey, oneOf } from '@mswjs/data'

test.only('supports one-to-one relation', () => {
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
