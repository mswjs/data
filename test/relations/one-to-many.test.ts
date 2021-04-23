import { random } from 'faker'
import { factory, primaryKey, manyOf } from '@mswjs/data'

test('supports one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(random.uuid),
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

test('supports querying through one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(random.uuid),
      title: random.words,
    },
  })

  db.user.create({
    id: 'user-1',
    posts: [
      db.post.create({ title: 'First post' }),
      db.post.create({ title: 'Second post' }),
    ],
  })

  db.user.create({
    id: 'user-2',
    posts: [db.post.create({ title: 'Third post' })],
  })

  db.user.create({
    id: 'user-3',
    posts: [
      db.post.create({ title: 'Second post' }),
      db.post.create({ title: 'Fourth post' }),
    ],
  })

  const users = db.user.findMany({
    where: {
      posts: {
        title: {
          in: ['First post', 'Second post'],
        },
      },
    },
  })
  expect(users).toHaveLength(2)

  const userIds = users.map((user) => user.id)
  expect(userIds).toEqual(['user-1', 'user-3'])
})

test('should not throw error if an entity with one-to-many relation is created without it', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(random.uuid),
      title: random.words,
    },
  })

  expect(() => db.user.create()).not.toThrow()
})
