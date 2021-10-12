import { factory, oneOf, primaryKey } from '../..'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    age: Number,
    createdAt: () => new Date(),
    country: oneOf('country'),
    address: {
      billing: {
        country: String,
      },
    },
  },
  country: {
    code: primaryKey(String),
  },
})

db.user.update({
  where: {
    id: {
      equals: 'abc-123',
      // @ts-expect-error Only string comparators are allowed.
      gte: 2,
    },
    firstName: {
      contains: 'John',
    },
    age: {
      gte: 18,
      // @ts-expect-error Only number comparators are allowed.
      contains: 'value',
    },
    createdAt: {
      gte: new Date('2004-01-01'),
    },
  },
  data: {
    id: 'next',
    firstName: 'next',
    age: 24,
    country: db.country.create({ code: 'de' }),
  },
})

// Query and update through nested properties.
db.user.update({
  where: {
    address: {
      billing: {
        country: {
          equals: 'us',
        },
      },
    },
  },
  data: {
    address: {
      billing: {
        country: 'de',
      },
    },
  },
})

db.user.update({
  where: {},
  data: {
    id(id, user) {
      user.firstName
      // @ts-expect-error Unknown property.
      user.unknown

      return id.toUpperCase()
    },
    age(age) {
      age.toExponential
      return age + 10
    },
  },
})

// Update a nested property using value getter.
db.user.update({
  where: {
    address: {
      billing: {
        country: {
          equals: 'us',
        },
      },
    },
  },
  data: {
    address: {
      billing: {
        country(country, user) {
          user.firstName
          user.address.billing?.country

          // @ts-expect-error Property "unknown" doesn't exist on "user".
          user.unknown

          return country.toUpperCase()
        },
      },
    },
  },
})
