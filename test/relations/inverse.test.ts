import { factory, manyOf, oneOf, primaryKey } from '../../src'

it('supports inverse relationships', () => {
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

  // Create a user and add a new post to it.
  const user = db.user.create({
    id: 'user-1',
  })
  db.user.update({
    where: {
      id: { equals: 'user-1' },
    },
    data: {
      posts: [db.post.create({ id: 'post-1' })],
    },
  })

  // The "post.author" property must automatically be set.
  const post = db.post.findFirst({
    where: {
      id: { equals: 'post-1' },
    },
  })

  expect(post).toHaveRelationalProperty('author', user)
})
