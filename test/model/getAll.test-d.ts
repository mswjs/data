import { factory, manyOf, primaryKey } from '../../src'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
    address: {
      billing: {
        country: String,
      },
    },
    posts: manyOf('post'),
  },
  post: {
    id: primaryKey(String),
    title: String,
  },
})

const allUsers = db.user.getAll()

allUsers[0].id
allUsers[0].firstName
allUsers[0].address.billing?.country

// Relational properties.
const user = allUsers[0]
const { posts = [] } = user
posts[0].id
posts[0].title

// @ts-expect-error Property "unknown" doesn't exist on "post".
posts[0].unknown

// @ts-expect-error Property "unknown" doesn't exist on "user".
allUsers[0].unknown
