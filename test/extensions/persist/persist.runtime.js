import { factory, primaryKey, oneOf } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    role: oneOf('userRole'),
  },
  role: {
    id: primaryKey(String),
    name: String,
  },
})

db.user.create({
  id: 'abc-123',
  firstName: 'John',
  role: db.role.create({
    id: 1,
    name: 'Reader',
  }),
})

window.db = db
