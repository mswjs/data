import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    posts: manyOf('post'),
  },
  post: {
    id: primaryKey(String),
    author: oneOf('user'),
  },
})

const user = db.user.create()
const post = db.post.create()

// @ts-expect-error author is potentially undefined
post.author.id

// @ts-expect-error posts is potentially undefined
user.posts[0]
