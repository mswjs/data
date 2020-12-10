import { random, name } from 'faker'
import { factory, oneOf } from '../src/factory'
import { identity } from '../src/utils/identity'

test('supports one-to-one relation', () => {
  const db = factory({
    country: {
      name: random.words,
    },
    capital: {
      name: random.word,
      country: oneOf('country'),
    },
  })

  const usa = db.country.create({
    name: 'United States of America',
  })

  const washington = db.capital.create({
    name: 'Washington',
    country: usa,
  })

  expect(washington.country).toHaveProperty('name', 'United States of America')
})

test('supports querying against a relational property', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: identity(userId),
      firstName: name.firstName,
    },
    post: {
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
          equals: userId,
        },
      },
    },
  })

  expect(userPosts).toHaveLength(3)
  const postTitles = userPosts.map((post) => post.title)
  expect(postTitles).toEqual(['First post', 'Second post', 'Third post'])
})

test('supports querying against nested relational properties', () => {
  const db = factory({
    role: {
      title: random.word,
    },
    user: {
      firstName: name.firstName,
      role: oneOf('role'),
    },
    post: {
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
