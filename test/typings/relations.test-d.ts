import { factory, oneOf, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    country: oneOf('country'),
    stats: {
      revision: oneOf('revision'),
    },
  },
  country: {
    code: primaryKey(String),
  },
  revision: {
    id: primaryKey(String),
    updatedAt: Number,
  },
})

const user = db.user.create()
user.country?.code.toUpperCase()

// @ts-expect-error Unknown property "foo" on "country".
user.country.foo

user.stats.revision?.id
user.stats.revision?.updatedAt.toFixed()

// @ts-expect-error Unknown property "foo" on "revision".
user.stats.revision?.foo
