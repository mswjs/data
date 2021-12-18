import { factory, manyOf, oneOf, primaryKey, nullable } from '@mswjs/data'

const db = factory({
  user: {
    id: primaryKey(String),
    posts: manyOf('post'),
  },
  post: {
    id: primaryKey(String),
    text: String,
    author: oneOf('user'),
    reply: nullable(oneOf('post')),
    likedBy: nullable(manyOf('user')),
  },
})

const user = db.user.create()
const post = db.post.create()

// @ts-expect-error author is potentially undefined
post.author.id

// @ts-expect-error posts is potentially undefined
user.posts[0]

// @ts-expect-error reply is potentially null
post.reply.id

// @ts-expect-error likedBy is potentially null
post.likedBy.length

// nullable oneOf relationships are not potentially undefined, only null
if (post.reply !== null) {
  // we can call reply.text.toUpperCase after excluding null from types
  post.reply.text.toUpperCase()
}

// nullable manyOf relationships are not potentially undefined, only null
if (post.likedBy !== null) {
  // we can call likedBy.pop after excluding null from types
  post.likedBy.pop()
}
