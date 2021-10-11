import { drop, factory, identity, primaryKey, oneOf } from '@mswjs/data'

test('drops all records in the database', () => {
  const db = factory({
    user: {
      id: primaryKey(identity('abc-123')),
    },
  })

  db.user.create()
  expect(db.user.getAll()).toHaveLength(1)

  drop(db)
  expect(db.user.getAll()).toHaveLength(0)
})

test('does nothing when the database is already empty', () => {
  const db = factory({
    user: {
      id: primaryKey(identity('abc-123')),
    },
  })

  db.user.create()
  db.user.delete({
    where: {
      id: {
        equals: 'abc-123',
      },
    },
  })

  expect(db.user.getAll()).toHaveLength(0)

  drop(db)
  expect(db.user.getAll()).toHaveLength(0)
})

test('properly cleans up relational properties', () => {
  const db = factory({
    user: {
      id: primaryKey(identity('abc-123')),
    },
    group: {
      id: primaryKey(identity('def-456')),
      owner: oneOf('user'),
    },
  })

  const user = db.user.create()
  db.group.create({ owner: user })

  expect(db.user.getAll()).toHaveLength(1)
  expect(db.group.getAll()).toHaveLength(1)

  drop(db)
  expect(db.user.getAll()).toHaveLength(0)
  expect(db.group.getAll()).toHaveLength(0)
})
