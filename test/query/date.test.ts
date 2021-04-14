import { random } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

const setup = () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: String,
      createdAt: () => new Date(),
    },
  })
  db.user.create({
    firstName: 'John',
    createdAt: new Date('1980-04-12'),
  })
  db.user.create({
    firstName: 'Kate',
    createdAt: new Date('2013-08-09'),
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
