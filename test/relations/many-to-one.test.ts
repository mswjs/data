import { factory, oneOf, primaryKey, nullable } from '../../src'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'

test('supports querying by a many-to-one relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: oneOf('user'),
    },
  })

  const author = db.user.create({
    id: 'user-1',
  })

  db.post.create({
    id: 'post-1',
    title: 'First post',
    author,
  })
  db.post.create({
    id: 'post-2',
    title: 'Second post',
    author,
  })
  db.post.create({
    id: 'post-3',
    title: 'Third post',
    author,
  })

  const userPosts = db.post.findMany({
    where: {
      author: {
        id: {
          equals: author.id,
        },
      },
    },
  })

  expect(userPosts).toEqual([
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-1',
      title: 'First post',
      author: author,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-2',
      title: 'Second post',
      author: author,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-3',
      title: 'Third post',
      author: author,
    },
  ])
})

test('supports querying by a nullable many-to-one relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: nullable(oneOf('user')),
    },
  })

  const author = db.user.create({
    id: 'user-1',
  })

  db.post.create({
    id: 'post-1',
    title: 'First post',
    author,
  })
  db.post.create({
    id: 'post-2',
    title: 'Second post',
    author,
  })
  db.post.create({
    id: 'post-3',
    title: 'Third post',
    author,
  })
  db.post.create({
    id: 'post-4',
    title: 'Fourth post',
  })

  const userPosts = db.post.findMany({
    where: {
      author: {
        id: {
          equals: author.id,
        },
      },
    },
  })

  expect(userPosts).toEqual([
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-1',
      title: 'First post',
      author: author,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-2',
      title: 'Second post',
      author: author,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-3',
      title: 'Third post',
      author: author,
    },
  ])
})

test('supports querying by a nested many-to-one relation', () => {
  const db = factory({
    role: {
      name: primaryKey(String),
    },
    user: {
      id: primaryKey(String),
      role: oneOf('role'),
    },
    post: {
      id: primaryKey(String),
      author: oneOf('user'),
    },
  })

  const editor = db.role.create({
    name: 'editor',
  })
  const reader = db.role.create({
    name: 'reader',
  })

  const john = db.user.create({
    id: 'john',
    role: editor,
  })
  const kate = db.user.create({
    id: 'kate',
    role: reader,
  })
  db.user.create({
    id: 'joseph',
    role: reader,
  })

  db.post.create({
    id: 'post-1',
    author: john,
  })
  db.post.create({
    id: 'post-2',
    author: john,
  })
  db.post.create({
    id: 'post-3',
    author: kate,
  })
  db.post.create({
    id: 'post-4',
    author: john,
  })

  const posts = db.post.findMany({
    where: {
      author: {
        role: {
          name: {
            equals: 'editor',
          },
        },
      },
    },
  })

  expect(posts).toEqual([
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-1',
      author: john,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-2',
      author: john,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-4',
      author: john,
    },
  ])
})

test('supports querying by a nested nullable many-to-one relation', () => {
  const db = factory({
    role: {
      name: primaryKey(String),
    },
    user: {
      id: primaryKey(String),
      role: nullable(oneOf('role')),
    },
    post: {
      id: primaryKey(String),
      author: oneOf('user'),
    },
  })

  const editor = db.role.create({
    name: 'editor',
  })
  const reader = db.role.create({
    name: 'reader',
  })

  const john = db.user.create({
    id: 'john',
    role: editor,
  })
  const kate = db.user.create({
    id: 'kate',
    role: reader,
  })
  const guest = db.user.create({
    id: 'guest',
  })
  db.user.create({
    id: 'joseph',
    role: reader,
  })

  db.post.create({
    id: 'post-1',
    author: john,
  })
  db.post.create({
    id: 'post-2',
    author: john,
  })
  db.post.create({
    id: 'post-3',
    author: kate,
  })
  db.post.create({
    id: 'post-4',
    author: john,
  })
  db.post.create({
    id: 'post-5',
    author: guest,
  })

  const posts = db.post.findMany({
    where: {
      author: {
        role: {
          name: {
            equals: 'editor',
          },
        },
      },
    },
  })

  expect(posts).toEqual([
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-1',
      author: john,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-2',
      author: john,
    },
    {
      [ENTITY_TYPE]: 'post',
      [PRIMARY_KEY]: 'id',
      id: 'post-4',
      author: john,
    },
  ])
})

test('updates a many-to-one relational property without initial value', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
    },
    post: {
      id: primaryKey(String),
      author: nullable(oneOf('user')),
    },
  })

  db.post.create({
    id: 'post-1',
  })

  const updatedPost = db.post.update({
    where: {
      id: {
        equals: 'post-1',
      },
    },
    data: {
      author: db.user.create({ id: 'john' }),
    },
  })

  expect(updatedPost).toEqual({
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-1',
    author: {
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'john',
    },
  })

  expect(
    db.post.findFirst({
      where: {
        id: {
          equals: 'post-1',
        },
      },
    }),
  ).toEqual(updatedPost)
})

test('updates a nullable many-to-one relational property without initial value', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
    },
    post: {
      id: primaryKey(String),
      author: nullable(oneOf('user')),
    },
  })

  db.post.create({
    id: 'post-1',
  })

  const updatedPost = db.post.update({
    where: {
      id: {
        equals: 'post-1',
      },
    },
    data: {
      author: db.user.create({ id: 'john' }),
    },
  })

  expect(updatedPost).toEqual({
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-1',
    author: {
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'john',
    },
  })

  expect(
    db.post.findFirst({
      where: {
        id: {
          equals: 'post-1',
        },
      },
    }),
  ).toEqual(updatedPost)
})

test('does not throw any error when a many-to-one entity is created without a relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      firstName: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: nullable(oneOf('user')),
    },
  })

  const post = db.post.create({
    id: 'post-1',
    title: 'First post',
  })

  expect(post).toEqual({
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-1',
    title: 'First post',
    author: null,
  })
})

test('does not throw any error when a nullable many-to-one entity is created without a relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      firstName: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: nullable(oneOf('user')),
    },
  })

  const post = db.post.create({
    id: 'post-1',
    title: 'First post',
  })

  expect(post).toEqual({
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: 'post-1',
    title: 'First post',
    author: null,
  })
})
