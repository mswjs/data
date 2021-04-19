import { factory, oneOf, primaryKey } from '@mswjs/data'

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
  // a valid entity of that model.
  country: 'Exact string',
})

db.user.create({
  // @ts-expect-error Relational property must reference
  // a valid entity, not a compatible non-entity object.
  country: {
    name: 'Not an actual entity',
  },
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
  where: {
    // @ts-expect-error Unknown model property.
    unknownField: {
      equals: 2,
    },
  },
})

db.user.findFirst({
  where: {
    id: {
      equals: 'abc-123',
      // @ts-expect-error Only string-based comparators are available.
      gte: 2,
    },
  },
})

db.user.update({
  where: {
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
  where: {
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

db.user.getAll().map((user) => {
  user.id
  user.firstName
  user.country

  // @ts-expect-error Unknown property "foo" on the "user" model.
  user.foo
})
