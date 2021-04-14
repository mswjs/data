import { random, name } from 'faker'
import { factory, oneOf, primaryKey } from '@mswjs/data'

test('supports querying against a many-to-one relation', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
    },
    post: {
      id: primaryKey(random.uuid),
      title: random.words,
      author: oneOf('user'),
    },
  })

  const user = db.user.create()
  db.post.create({
    title: 'First post',
    author: user,
  })
  db.post.create({
    title: 'Second post',
    author: user,
  })
  db.post.create({
    title: 'Third post',
    author: user,
  })

  const userPosts = db.post.findMany({
    which: {
      author: {
        id: {
          equals: user.id,
        },
      },
    },
  })

  expect(userPosts).toHaveLength(3)
  const postTitles = userPosts.map((post) => post.title)
  expect(postTitles).toEqual(['First post', 'Second post', 'Third post'])
})

test('supports querying through nested relational properties', () => {
  const db = factory({
    role: {
      id: primaryKey(random.uuid),
      title: random.word,
    },
    user: {
      id: primaryKey(random.uuid),
      firstName: name.firstName,
      role: oneOf('role'),
    },
    post: {
      id: primaryKey(random.uuid),
      title: random.words,
      author: oneOf('user'),
    },
  })

  const editor = db.role.create({
    title: 'Editor',
  })
  const reader = db.role.create({
    title: 'Reader',
  })

  const firstUser = db.user.create({
    firstName: 'John',
    role: editor,
  })
  const secondUser = db.user.create({
    role: reader,
  })
  db.user.create({
    role: reader,
  })

  db.post.create({
    title: 'First post',
    author: firstUser,
  })
  db.post.create({
    title: 'Second post',
    author: firstUser,
  })
  db.post.create({
    title: 'Third post',
    author: firstUser,
  })
  db.post.create({
    title: 'Fourth post',
    author: secondUser,
  })

  const result = db.post.findMany({
    which: {
      author: {
        role: {
          title: {
            equals: 'Editor',
          },
        },
      },
    },
  })

  expect(result).toHaveLength(3)
})
