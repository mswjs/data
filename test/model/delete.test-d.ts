import { factory, oneOf, primaryKey } from '../../src'

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

db.user.delete({
  // Provide no query to match all entities.
  where: {},
})

db.user.delete({
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
})

// Delete by a nested property value.
db.user.delete({
  where: {
    address: {
      billing: {
        country: {
          equals: 'us',
        },
      },
    },
  },
})

db.user.delete({
  where: {
    address: {
      // @ts-expect-error Property "unknown" does not exist on "user.address".
      unknown: 'value',
    },
  },
})

db.user.delete({
  where: {
    address: {
      billing: {
        // @ts-expect-error Property "unknown" does not exist on "user.address.billing".
        unknown: 'value',
      },
    },
  },
})

// Delete by a relational property value.
db.user.delete({
  where: {
    country: {
      code: {
        equals: 'us',
      },
    },
  },
})

db.user.delete({
  where: {
    // @ts-expect-error Property "unknown" doesn't exist on "user".
    unknown: {
      equals: 'abc-123',
    },
  },
})

db.user.delete({
  where: {
    firstName: {
      // @ts-expect-error Unknown value comparator.
      unknownComparator: '123',
    },
  },
})
