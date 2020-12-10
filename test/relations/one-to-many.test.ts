import { random } from 'faker'
import { factory, manyOf } from '../../src/factory'

test('supports one-to-many relation', () => {
  const db = factory({
    user: {
      posts: manyOf('post'),
    },
    post: {
      title: random.words,
    },
  })

  const firstPost = db.post.create({
    title: 'First post',
  })
  const secondPost = db.post.create({
    title: 'Second post',
  })
  const user = db.user.create({
    posts: [firstPost, secondPost],
  })

  expect(user.posts).toHaveLength(2)

  const posts = user.posts.map((post) => post.title)
  expect(posts).toEqual(['First post', 'Second post'])
})
