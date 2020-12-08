import { random } from 'faker'
import { factory, oneOf } from '../src/factory'

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
