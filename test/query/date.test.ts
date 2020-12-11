import { factory } from '../../src/factory'

test('queries entities that equal a date', () => {
  const db = factory({
    user: {
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

  const userResults = db.user.findMany({
    which: {
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
  const db = factory({
    user: {
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

  const userResults = db.user.findMany({
    which: {
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
  const db = factory({
    user: {
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
    createdAt: new Date('1980-04-14'),
  })

  const userResults = db.user.findMany({
    which: {
      createdAt: {
        lt: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(1)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['John'])
})

test('queries entities that are older or equal a date', () => {
  const db = factory({
    user: {
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
    createdAt: new Date('1980-04-14'),
  })

  const userResults = db.user.findMany({
    which: {
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
  const db = factory({
    user: {
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
    createdAt: new Date('1980-04-14'),
  })

  const userResults = db.user.findMany({
    which: {
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
  const db = factory({
    user: {
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
    createdAt: new Date('1980-04-14'),
  })

  const userResults = db.user.findMany({
    which: {
      createdAt: {
        gte: new Date('1980-04-14'),
      },
    },
  })
  expect(userResults).toHaveLength(2)

  const userNames = userResults.map((user) => user.firstName)
  expect(userNames).toEqual(['Kate', 'Sedrik'])
})
