import faker from '@faker-js/faker';
import { factory, nullable, primaryKey } from '../../src';

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

// Most assertions are covered by create.test-d.ts, as
// createMany calls it internally

// @ts-expect-error Source has 0 element(s) but target requires 1.
db.user.createMany([])

db.user.createMany([
  {},
  {
    // @ts-expect-error Property "secondName" does not exist on "user".
    secondName: 'any'
  }
])