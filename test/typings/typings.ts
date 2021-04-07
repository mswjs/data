import { factory, oneOf, primaryKey } from '../../src'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    country: oneOf('country'),
  },
  country: {
    name: primaryKey(String),
  },
  post: {
    id: primaryKey(String),
    title: String,
  },
})

// @ts-expect-error Unknown model name.
db.unknownModel.create()

db.user.create({
  id: 'abc-123',
  // @ts-expect-error Unknown model property.
  unknownProp: true,
})

db.user.create({
  // @ts-expect-error Relational properties must reference
  // a valida entity of that model.
  country: 'Exact string',
})

db.user.create({
  // @ts-expect-error Relational property must reference
  // the exact model type ("country").
  country: db.post.create(),
})

db.user.create({
  country: db.country.create(),
})

db.user.findFirst({
  which: {
    // @ts-expect-error Unknown model property.
    unknownField: {
      equals: 2,
    },
  },
})

db.user.findFirst({
  which: {
    id: {
      equals: 'abc-123',
      // @ts-expect-error Only string-based comparators are available.
      gte: 2,
    },
  },
})

db.user.update({
  which: {
    id: {
      equals: 'abc-123',
    },
  },
  data: {
    firstName: 'John',
    // @ts-expect-error Unknown model property.
    unknownField: 2,
  },
})

db.user.update({
  which: {
    id: {
      equals: 'abc-123',
    },
  },
  data: {
    firstName(prev, user) {
      // @ts-expect-error Incompatible value types.
      const next: number = prev

      // @ts-expect-error Unknown model property.
      user.unknownField

      return prev
    },
  },
})
