import { random, name } from 'faker'
import { factory } from '../../src'
import { measurePerformance, repeat } from '../testUtils'

test('creates a 1000 records in under 100ms', async () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      lastName: name.lastName,
      age: random.number,
      role: random.word,
    },
  })

  const createPerformance = await measurePerformance('create', () => {
    repeat(db.user.create, 1000)
  })

  expect(createPerformance.duration).toBeLessThanOrEqual(100)
})

test('queries through a 1000 records in under 100ms', async () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      lastName: name.lastName,
      age: random.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 1000)

  const findManyPerformance = await measurePerformance('findMany', () => {
    db.user.findMany({
      which: {
        age: {
          gte: 18,
        },
      },
    })
  })

  expect(findManyPerformance.duration).toBeLessThanOrEqual(100)
})

test('updates a single record under 100ms', async () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      lastName: name.lastName,
      age: random.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 1000)

  const updatePerformance = await measurePerformance('update', () => {
    db.user.update({
      which: {
        age: {
          lte: 20,
        },
      },
      data: {
        age: 21,
      },
    })
  })

  expect(updatePerformance.duration).toBeLessThanOrEqual(100)
})

test('deletes a single record in under 100ms', async () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      lastName: name.lastName,
      age: random.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 999)
  db.user.create({ id: 'abc-123' })

  const deletePerformance = await measurePerformance('delete', () => {
    db.user.delete({
      which: {
        id: {
          equals: 'abc-123',
        },
      },
    })
  })

  expect(deletePerformance.duration).toBeLessThanOrEqual(100)
})

test('deletes multiple records in under 100ms', async () => {
  const db = factory({
    user: {
      id: random.uuid,
      firstName: name.firstName,
      lastName: name.lastName,
      age: random.number,
      role: random.word,
    },
  })
  repeat(db.user.create, 1000)

  const deleteManyPerformance = await measurePerformance('deleteMany', () => {
    db.user.deleteMany({
      which: {
        age: {
          lte: 18,
        },
      },
    })
  })

  expect(deleteManyPerformance.duration).toBeLessThanOrEqual(100)
})
