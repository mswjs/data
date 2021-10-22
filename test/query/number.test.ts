import { datatype } from 'faker'
import { factory, primaryKey, nullable } from '@mswjs/data'

const setup = () => {
  const db = factory({
    user: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      age: Number,
      height: nullable<number>(() => null),
    },
  })
  db.user.create({
    firstName: 'John',
    age: 16,
    height: 200,
  })
  db.user.create({
    firstName: 'Alice',
    age: 24,
    height: 165,
  })
  db.user.create({
    firstName: 'Kate',
    age: 41,
  })

  return db
}

test('queries entities where property equals to a number', () => {
  const db = setup()

  const firstAdult = db.user.findFirst({
    where: {
      age: {
        gte: 18,
      },
    },
  })
  expect(firstAdult).toHaveProperty('firstName', 'Alice')

  const allAdults = db.user.findMany({
    where: {
      age: {
        gte: 18,
      },
    },
  })
  expect(allAdults).toHaveLength(2)
  const adultsNames = allAdults.map((user) => user.firstName)
  expect(adultsNames).toEqual(['Alice', 'Kate'])
})

test('queries entities where property is not equals to a number', () => {
  const db = setup()

  const users = db.user.findMany({
    where: {
      age: {
        notEquals: 24,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Kate'])
})

test('queries entities where property is within a number range', () => {
  const db = setup()

  const john = db.user.findFirst({
    where: {
      age: {
        between: [16, 34],
      },
    },
  })
  expect(john).toHaveProperty('firstName', 'John')

  const usersInAge = db.user.findMany({
    where: {
      age: {
        between: [16, 34],
      },
    },
  })
  expect(usersInAge).toHaveLength(2)
  const names = usersInAge.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Alice'])
})

test('queries entities where property is not within a number range', () => {
  const db = setup()

  const users = db.user.findMany({
    where: {
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
    where: {
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
    where: {
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
    where: {
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
    where: {
      age: {
        lte: 24,
      },
    },
  })
  expect(users).toHaveLength(2)
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Alice'])
})

test('queries entities where property is not contained into the array', () => {
  const db = setup()

  const users = db.user.findMany({
    where: {
      age: {
        notIn: [16, 24],
      },
    },
  })
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['Kate'])
})

test('queries entities where property is contained into the array', () => {
  const db = setup()

  const users = db.user.findMany({
    where: {
      age: {
        in: [16, 24],
      },
    },
  })
  const names = users.map((user) => user.firstName)
  expect(names).toEqual(['John', 'Alice'])
})

test('ignores entities with missing values when querying using number', () => {
  const db = setup()

  const height = 180
  const shorterUsers = db.user.findMany({ where: { height: { lt: height } } })
  const tallerUsers = db.user.findMany({ where: { height: { gte: height } } })
  const userNames = [...shorterUsers, ...tallerUsers].map(
    (user) => user.firstName,
  )

  expect(userNames).toHaveLength(2)
  expect(userNames).toEqual(['Alice', 'John'])
})
