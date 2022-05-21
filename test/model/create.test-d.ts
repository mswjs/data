import { factory, primaryKey, nullable } from '../../src'
import { faker } from '@faker-js/faker'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    lastName: nullable(faker.name.lastName),
    age: nullable<number>(() => null),
    address: {
      billing: {
        country: String,
      },
    },
  },
  company: {
    name: primaryKey(String),
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
  // @ts-expect-error Non-nullable properties cannot be instantiated with null.
  firstName: null,
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

const user = db.user.create({
  // Nullable properties can have an initialValue of null or the property type
  lastName: null,
  age: 15,
})

// @ts-expect-error lastName property is possibly null
user.lastName.toUpperCase()

// @ts-expect-error property 'toUpperCase' does not exist on type 'number'
user.age?.toUpperCase()
