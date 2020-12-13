import { random } from 'faker'
import { factory } from '../../src'
import { identity } from '../../src/utils/identity'

test('returns the only matching entity', () => {
  const userId = random.uuid()
  const db = factory({
    user: {
      id: identity(userId),
    },
  })

  db.user.create()

  const user = db.user.findFirst({
    which: {
      id: {
        equals: userId,
      },
    },
  })
  expect(user).toHaveProperty('id', userId)
})

test('returns the first entity among multiple matching entities', () => {
  const db = factory({
    user: {
      id: random.uuid,
      followersCount: Number,
    },
  })

  db.user.create({ followersCount: 10 })
  db.user.create({ followersCount: 12 })
  db.user.create({ followersCount: 15 })

  const user = db.user.findFirst({
    which: {
      followersCount: {
        gt: 10,
      },
    },
  })
  expect(user).toHaveProperty('followersCount', 12)
})

test('returns null when found no matching entities', () => {
  const db = factory({
    user: {
      id: random.uuid,
    },
  })
  db.user.create()

  const user = db.user.findFirst({
    which: {
      id: {
        equals: 'abc-123',
      },
    },
  })
  expect(user).toBeNull()
})
