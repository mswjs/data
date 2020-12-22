import { v4 } from 'uuid'
import { random } from 'faker'
import { factory, primaryKey } from '../src'

test('supports querying by the primary key', () => {
  const db = factory({
    user: {
      id: primaryKey(v4),
      firstName: random.word,
    },
  })

  db.user.create()
  db.user.create()
  const user = db.user.create({
    firstName: 'John',
  })
  db.user.create()

  const userResult = db.user.findFirst({
    which: {
      id: {
        equals: user.id,
      },
    },
  })

  expect(userResult).toHaveProperty('id', user.id)
  expect(userResult).toHaveProperty('firstName', 'John')
})

test('supports querying by the range of primary keys', () => {
  const db = factory({
    user: {
      id: primaryKey(random.word),
      firstName: random.word,
    },
  })

  db.user.create({
    id: 'abc-123',
    firstName: 'John',
  })
  db.user.create()
  db.user.create({
    id: 'def-456',
    firstName: 'Kate',
  })
  db.user.create()

  const results = db.user.findMany({
    which: {
      id: {
        in: ['abc-123', 'def-456'],
      },
    },
  })
  expect(results).toHaveLength(2)

  const userNames = results.map((user) => user.firstName)
  expect(userNames).toEqual(['John', 'Kate'])
})

test('supports querying by the primary key and additional properties', () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: String,
      age: Number,
    },
  })

  db.user.create({
    id: 'abc-123',
    firstName: 'John',
    age: 32,
  })
  db.user.create({
    firstName: 'Alice',
    age: 23,
  })
  db.user.create({
    id: 'def-456',
    firstName: 'Kate',
    age: 14,
  })
  db.user.create({
    firstName: 'Sheldon',
    age: 42,
  })

  const results = db.user.findMany({
    which: {
      id: {
        in: ['abc-123', 'def-456'],
      },
      age: {
        gte: 18,
      },
    },
  })
  expect(results).toHaveLength(1)

  expect(results[0]).toHaveProperty('firstName', 'John')
  expect(results[0]).toHaveProperty('age', 32)
})

test('throws an exception when creating entity with existing primary key', () => {
  const db = factory({
    user: {
      id: primaryKey(v4),
    },
  })

  db.user.create({ id: 'abc-123' })

  expect(() => {
    db.user.create({ id: 'abc-123' })
  }).toThrowError(
    'Failed to create "user": entity with the primary key "abc-123" ("id") already exists.',
  )
})
