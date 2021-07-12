import { factory, primaryKey } from '@mswjs/data'

window.db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

window.secondDb = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})
