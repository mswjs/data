import { random } from 'faker'
import { factory } from '../../src'
import { primaryKey } from '../../src/utils/primaryKey'

const setup = () => {
  const db = factory({
    user: {
      id: primaryKey(random.uuid),
      firstName: String,
      age: Number,
    },
  })
  db.user.create({
    firstName: 'John',
    age: 16,
  })
  db.user.create({
    firstName: 'Alice',
    age: 24,
  })
  db.user.create({
    firstName: 'Kate',
    age: 41,
  })

  return db
}

test('queries entities which property equals to a number', () => {
  const db = setup()

  const firstAdult = db.user.findFirst({
    which: {
      age: {
        gte: 18,
      },
    },
  })
  expect(firstAdult).toHaveProperty('firstName', 'Alice')

  const allAdults = db.user.findMany({
    which: {
      age: {
        gte: 18,
      },
    },
  })
  expect(allAdults).toHaveLength(2)
  const adultsNames = allAdults.map((user) => user.firstName)
  expect(adultsNames).toEqual(['Alice', 'Kate'])
})

test('queries entities which property is not equals to a number', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        notEquals: 24,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Kate'])
})

test('queries entities which property is within a number range', () => {
  const db = setup()

  const john = db.user.findFirst({
    which: {
      age: {
        between: [16, 34],
      },
    },
  })
  expect(john).toHaveProperty('firstName', 'John')

  const usersInAge = db.user.findMany({
    which: {
      age: {
        between: [16, 34],
      },
    },
  })
  expect(usersInAge).toHaveLength(2)
  const names = usersInAge.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Alice'])
})

test('queries entities which property is not within a number range', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        notBetween: [16, 34],
      },
    },
  })
  expect(users).toHaveLength(1)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['Kate'])
})

test('queries entities that are older than a number', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        gt: 23,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['Alice', 'Kate'])
})

test('queries entities that are older or equal a number', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        gte: 24,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['Alice', 'Kate'])
})

test('queries entities that are younger then a number', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        lt: 24,
      },
    },
  })
  expect(users).toHaveLength(1)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John'])
})

test('queries entities that are younger or equal a number', () => {
  const db = setup()

  const users = db.user.findMany({
    which: {
      age: {
        lte: 24,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Alice'])
})
