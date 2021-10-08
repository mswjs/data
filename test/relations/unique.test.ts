import { factory, manyOf, oneOf, primaryKey } from '@mswjs/data'

test('throws an error when using an already associated "oneOf" unique relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      // There can be only 1 invitation associated with 1 user.
      // Multiple users cannot share the same invitation.
      invite: oneOf('invitation', { unique: true }),
    },
    invitation: {
      id: primaryKey(String),
    },
  })

  const invitation = db.invitation.create({
    id: 'invitation-1',
  })

  db.user.create({
    id: 'user-1',
    invite: invitation,
  })

  expect(() => {
    db.user.create({
      id: 'user-2',
      invite: invitation,
    })
  }).toThrow(
    'Failed to create a unique "invitation" relation for "user.invite" (user-2): the provided entity is already used.',
  )
})

test('throws an error when using an already associated "manyOf" unique relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      posts: manyOf('post', { unique: true }),
    },
    post: {
      id: primaryKey(String),
    },
  })

  const firstPost = db.post.create({ id: 'post-1' })
  const secondPost = db.post.create({ id: 'post-2' })

  db.user.create({
    id: 'user-1',
    posts: [firstPost, secondPost],
  })

  expect(() => {
    db.user.create({
      id: 'user-2',
      posts: [secondPost],
    })
  }).toThrow(
    'Failed to create a unique "post" relation for "user.posts" (user-2): the provided entity is already used.',
  )
})

test('throws an error when using an already associated "oneOf" nested unique relation', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          country: oneOf('country', { unique: true }),
        },
      },
    },
    country: {
      code: primaryKey(String),
    },
  })

  const usa = db.country.create({ code: 'us' })

  db.user.create({
    id: 'user-1',
    address: {
      billing: {
        country: usa,
      },
    },
  })

  expect(() => {
    db.user.create({
      id: 'user-2',
      address: {
        billing: {
          country: usa,
        },
      },
    })
  }).toThrow(
    'Failed to create a unique "country" relation for "user.address.billing.country" (user-2): the provided entity is already used.',
  )
})
