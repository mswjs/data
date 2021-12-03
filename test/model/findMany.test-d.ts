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
        street: String,
        code: String,
      },
    },
  },
  country: {
    code: primaryKey(String),
  },
})

db.user.findMany({
  where: {
    id: {
      equals: 'abc-123',
    },
    firstName: {
      contains: 'John',
    },
    createdAt: {
      gte: new Date('2020-01-01'),
    },
    country: {
      code: {
        equals: 'us',
      },
    },
  },
})

db.user.findMany({
  where: {
    address: {
      billing: {
        code: {
          equals: 'us',
        },
      },
    },
  },
})

db.user.findMany({
  where: {
    address: {
      // @ts-expect-error Property "unknown" doesn't exist on "user.address".
      unknown: {},
    },
  },
})

db.user.findMany({
  where: {
    address: {
      billing: {
        // @ts-expect-error Property "unknown" doesn't exist on "user.address".
        unknown: {},
      },
    },
  },
})

db.user.findMany({
  where: {
    // @ts-expect-error Unknown model property.
    unknown: {
      equals: 2,
    },
  },
})

db.user.findMany({
  where: {
    id: {
      equals: 'abc-123',
      // @ts-expect-error Only string comparators are allowed.
      gte: 2,
    },
  },
})

/**
 * Sorting.
 */
// Single-criteria sort by a primitive value.
db.user.findMany({
  orderBy: {
    id: 'asc',
  },
})

db.user.findMany({
  orderBy: {
    // @ts-expect-error Unknown property name.
    unknown: 'asc',
  },
})

db.user.findMany({
  // @ts-expect-error Unknown sort direction.
  orderBy: {
    id: 'any',
  },
})

// Single-criteria sort by a nested value.
db.user.findMany({
  orderBy: {
    address: {
      billing: {
        code: 'desc',
      },
    },
  },
})

db.user.findMany({
  orderBy: {
    address: {
      // @ts-expect-error Unknown property name.
      unknown: 'asc',
    },
  },
})

db.user.findMany({
  // @ts-expect-error Unknown property name "billing.unknown".
  orderBy: {
    address: {
      billing: {
        unknown: 'asc',
      },
    },
  },
})

// Single-criteria sort by a relational value.
db.user.findMany({
  orderBy: {
    country: {
      code: 'asc',
    },
  },
})

// Multi-criteria sort by primitive values.
db.user.findMany({
  orderBy: [
    {
      id: 'asc',
    },
    {
      age: 'desc',
    },
  ],
})

// Multi-criteria sort by nested values.
db.user.findMany({
  orderBy: [
    {
      address: {
        billing: {
          street: 'asc',
        },
      },
    },
    {
      address: {
        billing: {
          code: 'desc',
        },
      },
    },
  ],
})

// One key restriction.
db.user.findMany({
  // @ts-expect-error Cannot specify multiple order keys.
  orderBy: {
    id: 'asc',
    age: 'desc',
  },
})

db.user.findMany({
  // @ts-expect-error Cannot specify multiple order keys.
  orderBy: {
    address: {
      billing: {
        code: 'asc',
        street: 'desc',
      },
    },
  },
})

db.user.findMany({
  orderBy: [
    // @ts-expect-error Cannot specify multiple order keys.
    {
      id: 'asc',
      age: 'desc',
    },
  ],
})
