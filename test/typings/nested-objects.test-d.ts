import { factory, primaryKey } from '../../src'

const db = factory({
  user: {
    id: primaryKey(String),
    name: () => 'John',
    address: {
      billing: {
        street: String,
      },
      shipping: {
        street: String,
      },
    },
  },
})

/**
 * Create.
 */
db.user.create({
  address: {
    billing: {
      // Providing a known nested property.
      street: 'Baker',
    },
  },
})

db.user.create({
  address: {
    billing: {
      // @ts-expect-error Property "foo" doesn't exist on "user.address.billing".
      foo: 'Unknown',
    },
  },
})

db.user.create({
  address: {
    // @ts-expect-error Property "unknown" doesn't exist on "user.address".
    unknown: {},
  },
})

/**
 * Find first.
 */
db.user.findFirst({
  where: {
    address: {
      billing: {
        street: {
          equals: 'Baker',
        },
      },
    },
  },
})

db.user.findFirst({
  where: {
    address: {
      // @ts-expect-error Property "unknown" doesn't exist on "user.address".
      unknown: {},
    },
  },
})

db.user.findFirst({
  where: {
    address: {
      billing: {
        // @ts-expect-error Property "unknown" doesn't exist on "user.address.billing".
        unknown: {
          equals: 'Baker',
        },
      },
    },
  },
})

/**
 * Find many.
 */
db.user.findMany({
  where: {
    address: {
      billing: {
        street: {
          equals: 'Baker',
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
        // @ts-expect-error Property "unknown" doesn't exist on "user.address.billing".
        unknown: {
          equals: 'Baker',
        },
      },
    },
  },
})

/**
 * Update.
 */
db.user.update({
  where: {
    id: { equals: 'abc-123' },
  },
  data: {
    address: {
      billing: {
        // Updating a known nested property.
        street: 'Sunwell Ave.',
      },
    },
  },
})

db.user.update({
  where: {
    id: { equals: 'abc-123' },
  },
  data: {
    id(value) {
      return value.toUpperCase()
    },
    address: {
      billing: {
        street(value) {
          return value.toUpperCase()
        },
      },
    },
  },
})

db.user.update({
  where: {
    id: { equals: 'abc-123' },
  },
  data: {
    address: {
      billing: {
        // @ts-expect-error Property "foo" doesn't exist on "user.address.billing"
        foo: 'Unknown',
      },
    },
  },
})

/**
 * Update many.
 */
db.user.updateMany({
  where: {
    address: {
      billing: {
        street: {
          equals: 'Baker',
        },
      },
    },
  },
  data: {
    address: {
      billing: {
        street(value) {
          return value.toUpperCase()
        },
      },
    },
  },
})

/**
 * Sorting.
 */
db.user.findMany({
  where: {},
  orderBy: {
    address: {
      billing: {
        street: 'asc',
      },
    },
  },
})

db.user.findMany({
  where: {},
  // @ts-expect-error Must use "asc"/"desc" as sort direction.
  orderBy: {
    address: {
      billing: {
        street: 'UNKNOWN VALUE',
      },
    },
  },
})

db.user.findMany({
  where: {},
  // @ts-expect-error Must sort by a single criteria
  // using object as the "orderBy" value.
  orderBy: {
    address: {
      billing: {
        street: 'asc',
      },
      shipping: {
        street: 'desc',
      },
    },
  },
})

// Multi-criteria sorting.
db.user.findMany({
  where: {},
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
        shipping: {
          street: 'desc',
        },
      },
    },
  ],
})
