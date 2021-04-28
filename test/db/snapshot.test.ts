import { factory, primaryKey, snapshot, oneOf, manyOf } from '@mswjs/data'

it('should restore database without updatates made after snapshot', () => {
  const db = factory({
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  })

  db.user.create({ id: '123', firstName: 'John' })
  db.user.create({ id: '456', firstName: 'Kate' })

  const restore = snapshot(db)

  db.user.create({ id: '789', firstName: 'Joe' })

  expect(db.user.getAll()).toEqual([
    {
      id: '123',
      firstName: 'John',
    },
    {
      id: '456',
      firstName: 'Kate',
    },
    {
      id: '789',
      firstName: 'Joe',
    },
  ])

  restore()

  expect(db.user.getAll()).toEqual([
    {
      id: '123',
      firstName: 'John',
    },
    {
      id: '456',
      firstName: 'Kate',
    },
  ])
})

it('should restore database with all realations', () => {
  const db = factory({
    post: {
      id: primaryKey(String),
      title: String,
      user: oneOf('user'),
    },
    user: {
      id: primaryKey(String),
      firstName: String,
      roles: manyOf('role'),
    },
    role: {
      id: primaryKey(String),
      title: String,
    },
  })

  const admin = db.role.create({ id: '123', title: 'Admin' })
  const writer = db.role.create({ id: '456', title: 'Writer' })

  const john = db.user.create({
    id: '123',
    firstName: 'John',
    roles: [admin, writer],
  })
  const kate = db.user.create({ id: '456', firstName: 'Kate', roles: [admin] })
  const joe = db.user.create({ id: '789', firstName: 'Joe', roles: [writer] })

  db.post.create({ id: '123', title: 'How to use MSW', user: john })
  db.post.create({
    id: '456',
    title: 'A new way to model your data',
    user: kate,
  })

  const restore = snapshot(db)

  db.post.create({
    id: '789',
    title: 'Best practices with service workers',
    user: joe,
  })

  expect(db.post.getAll()).toEqual([
    {
      id: '123',
      title: 'How to use MSW',
      user: {
        id: '123',
        firstName: 'John',
        roles: [
          { id: '123', title: 'Admin' },
          { id: '456', title: 'Writer' },
        ],
      },
    },
    {
      id: '456',
      title: 'A new way to model your data',
      user: {
        id: '456',
        firstName: 'Kate',
        roles: [{ id: '123', title: 'Admin' }],
      },
    },
    {
      id: '789',
      title: 'Best practices with service workers',
      user: {
        id: '789',
        firstName: 'Joe',
        roles: [{ id: '456', title: 'Writer' }],
      },
    },
  ])

  restore()

  expect(db.post.getAll()).toEqual([
    {
      id: '123',
      title: 'How to use MSW',
      user: {
        id: '123',
        firstName: 'John',
        roles: [
          { id: '123', title: 'Admin' },
          { id: '456', title: 'Writer' },
        ],
      },
    },
    {
      id: '456',
      title: 'A new way to model your data',
      user: {
        id: '456',
        firstName: 'Kate',
        roles: [{ id: '123', title: 'Admin' }],
      },
    },
  ])
})
