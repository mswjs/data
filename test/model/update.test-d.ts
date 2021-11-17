import faker from 'faker'
import { factory, oneOf, manyOf, primaryKey, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    lastName: nullable(faker.name.lastName),
    age: Number,
    createdAt: () => new Date(),
    country: oneOf('country'),
    company: nullable(oneOf('company')),
    address: {
      billing: {
        country: String,
        city: nullable<string>(() => null),
      },
    },
  },
  country: {
    code: primaryKey(String),
  },
  company: {
    name: primaryKey(String),
    employees: manyOf('user'),
    countries: nullable(manyOf('country')),
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
    company: db.company.create({ name: 'Umbrella' }),
    lastName: null,
    // @ts-expect-error Unable to update non-nullable values to null
    updatedAt: null,
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
        city: 'Berlin',
      },
    },
  },
})

// Update nullable hasOne relations to null
db.user.update({
  where: {
    id: {
      equals: 'abc-123',
    },
  },
  data: {
    company: null,
    // @ts-expect-error unable to update non-nullable relations to null
    country: null,
  },
})

// Update nullable hasMany relations to null
db.company.update({
  where: {
    name: {
      equals: 'Umbrella',
    },
  },
  data: {
    countries: null,
    // @ts-expect-error unable to update non-nullable hasMany relations to null
    employees: null,
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
