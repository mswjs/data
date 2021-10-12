import { factory, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    address: {
      billing: {
        country: String,
      },
    },
  },
})

// @ts-expect-error Unknown model name.
db.unknownModel.create()

db.user.create({
  id: 'abc-123',
  // @ts-expect-error Unknown model property.
  unknownProp: true,
  address: {
    billing: {
      country: 'us',
    },
  },
})

db.user.create({
  address: {
    // @ts-expect-error Property "unknown" does not exist on "user.address".
    unknown: 'value',
  },
})

db.user.create({
  address: {
    billing: {
      // @ts-expect-error Property "unknown" does not exist on "user.address.billing".
      unknown: 'value',
    },
  },
})

db.user.create({
  // @ts-expect-error Relational properties must reference
  // a valid entity of that model.
  country: 'Exact string',
})

db.user.create({
  // @ts-expect-error Relational property must reference
  // the exact model type ("country").
  country: db.post.create(),
})

db.user.create({
  // Any property is optional.
  // When not provided, its value getter from the model
  // will be executed to get the initial value.
  firstName: 'John',
})
