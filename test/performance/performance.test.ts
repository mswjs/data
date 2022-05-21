import { faker } from '@faker-js/faker'
import { factory, primaryKey } from '@mswjs/data'
import { measurePerformance, repeat } from '../testUtils'

describe.skip('Performance testing', () => {
  test('creates a 1000 records in under 100ms', async () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        firstName: faker.name.firstName,
        lastName: faker.name.lastName,
        age: faker.datatype.number,
        role: faker.random.word,
      },
    })

    const createPerformance = await measurePerformance('create', () => {
      repeat(db.user.create, 1000)
    })

    expect(createPerformance.duration).toBeLessThanOrEqual(350)
  })

  test('queries through a 1000 records in under 100ms', async () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        firstName: faker.name.firstName,
        lastName: faker.name.lastName,
        age: faker.datatype.number,
        role: faker.random.word,
      },
    })
    repeat(db.user.create, 1000)

    const findManyPerformance = await measurePerformance('findMany', () => {
      db.user.findMany({
        where: {
          age: {
            gte: 18,
          },
        },
      })
    })

    expect(findManyPerformance.duration).toBeLessThanOrEqual(350)
  })

  test('updates a single record under 100ms', async () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        firstName: faker.name.firstName,
        lastName: faker.name.lastName,
        age: faker.datatype.number,
        role: faker.random.word,
      },
    })
    repeat(db.user.create, 1000)

    const updatePerformance = await measurePerformance('update', () => {
      db.user.update({
        where: {
          age: {
            lte: 20,
          },
        },
        data: {
          age: 21,
        },
      })
    })

    expect(updatePerformance.duration).toBeLessThanOrEqual(350)
  })

  test('deletes a single record in under 100ms', async () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        firstName: faker.name.firstName,
        lastName: faker.name.lastName,
        age: faker.datatype.number,
        role: faker.random.word,
      },
    })
    repeat(db.user.create, 999)
    db.user.create({ id: 'abc-123' })

    const deletePerformance = await measurePerformance('delete', () => {
      db.user.delete({
        where: {
          id: {
            equals: 'abc-123',
          },
        },
      })
    })

    expect(deletePerformance.duration).toBeLessThanOrEqual(350)
  })

  test('deletes multiple records in under 100ms', async () => {
    const db = factory({
      user: {
        id: primaryKey(faker.datatype.uuid),
        firstName: faker.name.firstName,
        lastName: faker.name.lastName,
        age: faker.datatype.number,
        role: faker.random.word,
      },
    })
    repeat(db.user.create, 1000)

    const deleteManyPerformance = await measurePerformance('deleteMany', () => {
      db.user.deleteMany({
        where: {
          age: {
            lte: 18,
          },
        },
      })
    })

    expect(deleteManyPerformance.duration).toBeLessThanOrEqual(350)
  })
})
