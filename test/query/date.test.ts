import { datatype } from 'faker'
import { factory, primaryKey, nullable } from '@mswjs/data'

const setup = () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      createdAt: () => new Date(),
      updatedAt: nullable<Date>(() => null),
    },
  })
  db.user.create({
    firstName: 'John',
    createdAt: new Date('1980-04-12'),
    updatedAt: new Date('1980-04-12'),
  })
  db.user.create({
    firstName: 'Kate',
    createdAt: new Date('2013-08-09'),
    updatedAt: new Date('2014-01-01'),
  })
  db.user.create({
    firstName: 'Sedrik',
    createdAt: new Date('1980-04-12'),
  })
  return db
}

test('queries entities that equal a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        equals: new Date('1980-04-12'),
      },
    },
  })
  expect(userResults).toHaveLength(2)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['John', 'Sedrik'])
})

test('queries entities that do not equal a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        notEquals: new Date('1980-04-12'),
      },
    },
  })
  expect(userResults).toHaveLength(1)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['Kate'])
})

test('queries entities that are older than a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        lt: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(2)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['John', 'Sedrik'])
})

test('queries entities that are older or equal a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        lte: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(2)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['John', 'Sedrik'])
})

test('queries entities that are newer than a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        gt: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(1)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['Kate'])
})

test('queries entities that are newer or equal to a date', () => {
  const db = setup()

  const userResults = db.user.findMany({
    where: {
      createdAt: {
        gte: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(1)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['Kate'])
})

test('ignores entities with missing values when querying using date', () => {
  const db = setup()

  const date = new Date('2000-01-01')
  const updatedBefore = db.user.findMany({
    where: { updatedAt: { lte: date } },
  })
  const updatedAfter = db.user.findMany({
    where: { updatedAt: { gte: date } },
  })
  const updatedUserNames = [...updatedBefore, ...updatedAfter].map(
    (user) => user.firstName,
  )

  expect(updatedUserNames).toHaveLength(2)
  expect(updatedUserNames).not.toContain('Sedrick')
})
