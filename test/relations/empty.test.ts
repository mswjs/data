import { random } from 'faker'
import { factory, primaryKey, oneOf } from '@mswjs/data'

it('should not throw error if an entity with relation is created without it', () => {
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
