import { factory, oneOf, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    createdAt: () => new Date(),
    country: oneOf('country'),
  },
  country: {
    id: primaryKey(String),
    name: String,
  },
  post: {
    id: primaryKey(String),
    title: String,
  },
})

db.user.findFirst({
  where: {
    // @ts-expect-error Unknown model property.
    unknown: {
      equals: 2,
    },
  },
})

db.user.findFirst({
  where: {
    id: {
      equals: 'abc-123',
      // @ts-expect-error Only string comparators are allowed.
      gte: 2,
    },
  },
})
