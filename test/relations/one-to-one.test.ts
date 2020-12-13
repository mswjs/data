import { random } from 'faker'
import { factory, oneOf } from '../../src'

test('supports one-to-one relation', () => {
  const db = factory({
    country: {
      name: random.words,
    },
    capital: {
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
      name: random.words,
    },
    capital: {
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

  const capital = db.capital.findFirst({
    which: {
      country: {
        name: {
          equals: 'United States of America',
        },
      },
    },
  })
  expect(capital).toHaveProperty('name', 'Washington')
})
