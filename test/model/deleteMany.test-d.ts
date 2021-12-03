import { factory, primaryKey, oneOf } from '../../src'

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

db.user.deleteMany({
  // Providing no query criteria matches all entities.
  where: {},
})

db.user.deleteMany({
  where: {
    id: {
      equals: 'abc-123',
    },
    firstName: {
      contains: 'John',
    },
    age: {
      gte: 18,
    },
    createdAt: {
      gte: new Date('2004-01-01'),
    },
  },
})

// Delete multiple entities by a nested property value.
db.user.deleteMany({
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

db.user.deleteMany({
  where: {
    address: {
      // @ts-expect-error Property "unknown" does not exist on "user.address".
      unknown: 'value',
    },
  },
})

db.user.deleteMany({
  where: {
    address: {
      billing: {
        // @ts-expect-error Property "unknown" does not exist on "user.address.billing".
        unknown: 'value',
      },
    },
  },
})

// Delete multiple entities by their relational property value.
db.user.deleteMany({
  where: {
    country: {
      code: {
        equals: 'us',
      },
    },
  },
})

db.user.deleteMany({
  where: {
    // @ts-expect-error Property "unknown" doesn't exist on "user".
    unknown: {
      equals: 'abc-123',
    },
  },
})

db.user.deleteMany({
  where: {
    firstName: {
      // @ts-expect-error Unknown value comparator.
      unknownComparator: '123',
    },
  },
})
