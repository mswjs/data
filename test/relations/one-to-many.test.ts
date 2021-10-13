import { random, datatype } from 'faker'
import { factory, primaryKey, manyOf } from '@mswjs/data'

test('supports one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(datatype.uuid),
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
      id: primaryKey(datatype.uuid),
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

test('supports querying through a nested one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      activity: {
        posts: manyOf('post'),
      },
    },
    post: {
      id: primaryKey(String),
    },
  })

  const user = db.user.create({
    id: 'user-1',
    activity: {
      posts: [
        db.post.create({ id: 'post-1' }),
        db.post.create({ id: 'post-2' }),
      ],
    },
  })

  const result = db.user.findFirst({
    where: {
      activity: {
        posts: {
          id: {
            equals: 'post-2',
          },
        },
      },
    },
  })

  expect(result).toEqual(user)
})

test('supports creating an entity without specifying the value for one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(datatype.uuid),
    },
  })

  expect(() =>
    db.user.create({
      id: 'abc-123',
    }),
  ).not.toThrow()

  const user = db.user.findFirst({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(user).toBeDefined()
})

test('updates the relational value via the ".update()" model method', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(datatype.uuid),
      title: random.words,
    },
  })

  const firstPost = db.post.create({ title: 'First post' })
  const secondPost = db.post.create({ title: 'Second post' })
  const user = db.user.create({
    id: 'abc-123',
    posts: [firstPost],
  })
  const refetchUser = () => {
    return db.user.findFirst({
      where: {
        id: { equals: 'abc-123' },
      },
    })
  }

  expect(user.posts).toEqual([firstPost])
  expect(refetchUser()).toEqual({
    id: 'abc-123',
    posts: [firstPost],
  })

  // Update the "posts" relational property.
  const updatedUser = db.user.update({
    where: {
      id: { equals: 'abc-123' },
    },
    data: {
      posts: [secondPost],
    },
  })

  expect(updatedUser).toEqual({
    id: 'abc-123',
    posts: [secondPost],
  })
  expect(refetchUser()).toEqual({
    id: 'abc-123',
    posts: [secondPost],
  })
})

test('throws an exception when updating a relational value via a compatible object', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(datatype.uuid),
      title: random.words,
    },
  })
  const firstPost = db.post.create({
    title: 'First post',
  })
  const user = db.user.create({
    id: 'abc-123',
    posts: [firstPost],
  })
  const refetchUser = () => {
    return db.user.findFirst({
      where: {
        id: { equals: 'abc-123' },
      },
    })
  }

  expect(user.posts).toEqual([firstPost])
  expect(refetchUser()).toEqual({
    id: 'abc-123',
    posts: [firstPost],
  })

  expect(() =>
    db.user.update({
      where: {
        id: { equals: 'abc-123' },
      },
      data: {
        posts: [
          {
            id: 'post-1',
            title: 'Compatible object',
          },
        ],
      },
    }),
  ).toThrow(
    'Failed to define a relational property "posts" on "user": referenced entity "post-1" ("id") does not exist.',
  )
})

test('throws an exception when creating a unique one-to-many relation to the already referenced entity', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      // One post cannot belong to multiple users.
      posts: manyOf('post', { unique: true }),
    },
    post: {
      id: primaryKey(datatype.uuid),
    },
  })

  const post = db.post.create({ id: 'post-1' })

  db.user.create({
    id: 'user-1',
    posts: [post],
  })

  expect(() =>
    db.user.create({
      id: 'user-2',
      posts: [post],
    }),
  ).toThrow(
    'Failed to create a unique "MANY_OF" relation to "post" ("user.posts") for "user-2": referenced post "post-1" belongs to another user ("user-1").',
  )
})

test('throws an exception when updating a unique one-to-many relation to the already referenced entity', () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      // One post cannot belong to multiple users.
      posts: manyOf('post', { unique: true }),
    },
    post: {
      id: primaryKey(datatype.uuid),
    },
  })

  const post = db.post.create({
    id: 'post-1',
  })

  db.user.create({
    id: 'user-1',
    posts: [post],
  })

  db.user.create({
    id: 'user-2',
  })

  expect(() =>
    db.user.update({
      where: {
        id: {
          equals: 'user-2',
        },
      },
      data: {
        posts: [post],
      },
      strict: true,
    }),
  ).toThrow(
    'Failed to create a unique "MANY_OF" relation to "post" ("user.posts") for "user-2": referenced post "post-1" belongs to another user ("user-1").',
  )
})
