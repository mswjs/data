import { factory, primaryKey, manyOf } from '@mswjs/data'
import { ENTITY_TYPE, PRIMARY_KEY } from '../../lib/glossary'

test('supports one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  })

  const firstPost = db.post.create({
    id: 'post-1',
    title: 'First post',
  })
  const secondPost = db.post.create({
    id: 'post-2',
    title: 'Second post',
  })
  const user = db.user.create({
    id: 'user-1',
    posts: [firstPost, secondPost],
  })

  expect(user.posts).toEqual([firstPost, secondPost])

  expect(
    db.user.findFirst({
      where: {
        id: {
          equals: 'user-1',
        },
      },
    }),
  ).toEqual(user)
})

test('supports updating a recusrive one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      firstName: String,
      friends: manyOf('user'),
    },
  })

  const john = db.user.create({
    id: 'john',
    firstName: 'John',
    friends: [],
  })

  const kate = db.user.create({
    id: 'kate',
    firstName: 'Kate',
    friends: [john],
  })

  db.user.findFirst({
    where: { id: { equals: 'john' } },
    strict: true,
  })

  const updatedJohn = db.user.update({
    where: {
      id: {
        equals: john.id,
      },
    },
    data: {
      friends: [kate],
    },
    strict: true,
  })!

  expect(updatedJohn.friends).toHaveLength(1)
  expect(updatedJohn.friends[0]).toHaveProperty('firstName', 'Kate')
})

test('supports querying through one-to-many relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  })

  const firstUserPosts = [
    db.post.create({
      id: 'post-1-1',
      title: 'First post',
    }),
    db.post.create({
      id: 'post-1-2',
      title: 'Second post',
    }),
  ]

  db.user.create({
    id: 'user-1',
    posts: firstUserPosts,
  })

  db.user.create({
    id: 'user-2',
    posts: [
      db.post.create({
        id: 'post-2-1',
        title: 'Third post',
      }),
    ],
  })

  const thirdUserPosts = [
    db.post.create({ id: 'post-3-1', title: 'Second post' }),
    db.post.create({ id: 'post-3-2', title: 'Fourth post' }),
  ]
  db.user.create({
    id: 'user-3',
    posts: thirdUserPosts,
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

  expect(users).toEqual([
    {
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'user-1',
      posts: firstUserPosts,
    },
    {
      [ENTITY_TYPE]: 'user',
      [PRIMARY_KEY]: 'id',
      id: 'user-3',
      posts: thirdUserPosts,
    },
  ])
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
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
    },
  })

  const user = db.user.create({
    id: 'abc-123',
  })

  expect(
    db.user.findFirst({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
    }),
  ).toEqual(user)
})

test('updates a one-to-many relational property', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  })

  const firstPost = db.post.create({
    id: 'post-1',
    title: 'First post',
  })
  const secondPost = db.post.create({
    id: 'post-2',
    title: 'Second post',
  })
  const user = db.user.create({
    id: 'abc-123',
    posts: [firstPost],
  })
  const refetchUser = () => {
    return db.user.findFirst({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
    })
  }

  expect(user.posts).toEqual([firstPost])
  expect(refetchUser()).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
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
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    posts: [secondPost],
  })
  expect(refetchUser()).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    posts: [secondPost],
  })
})

test('updates a one-to-many relational property without initial value', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  })

  db.user.create({
    id: 'user-1',
  })

  const updatedUser = db.user.update({
    where: {
      id: {
        equals: 'user-1',
      },
    },
    data: {
      posts: [
        db.post.create({ id: 'post-1', title: 'First post' }),
        db.post.create({ id: 'post-2', title: 'Second post' }),
      ],
    },
  })

  expect(updatedUser).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'user-1',
    posts: [
      {
        [ENTITY_TYPE]: 'post',
        [PRIMARY_KEY]: 'id',
        id: 'post-1',
        title: 'First post',
      },
      {
        [ENTITY_TYPE]: 'post',
        [PRIMARY_KEY]: 'id',
        id: 'post-2',
        title: 'Second post',
      },
    ],
  })

  expect(
    db.user.findFirst({
      where: {
        id: {
          equals: 'user-1',
        },
      },
    }),
  ).toEqual(updatedUser)
})

test('throws an exception when updating a relational value via a compatible object', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post'),
    },
    post: {
      id: primaryKey(String),
      title: String,
    },
  })
  const firstPost = db.post.create({
    id: 'post-1',
    title: 'First post',
  })
  const user = db.user.create({
    id: 'abc-123',
    posts: [firstPost],
  })
  const refetchUser = () => {
    return db.user.findFirst({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
    })
  }

  expect(user.posts).toEqual([firstPost])
  expect(refetchUser()).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    posts: [firstPost],
  })

  expect(() =>
    db.user.update({
      where: {
        id: {
          equals: 'abc-123',
        },
      },
      data: {
        posts: [
          {
            id: 'post-2',
            title: 'Compatible object',
          },
        ],
      },
    }),
  ).toThrow(
    'Failed to define a relational property "posts" on "user": referenced entity "post-2" ("id") does not exist.',
  )
})

test('throws an exception when creating a unique one-to-many relation to the already referenced entity', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      // One post cannot belong to multiple users.
      posts: manyOf('post', { unique: true }),
    },
    post: {
      id: primaryKey(String),
    },
  })

  const post = db.post.create({
    id: 'post-1',
  })

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
      id: primaryKey(String),
      // One post cannot belong to multiple users.
      posts: manyOf('post', { unique: true }),
    },
    post: {
      id: primaryKey(String),
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
