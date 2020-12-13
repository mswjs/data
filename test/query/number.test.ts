import { factory } from '../../src'

test('queries entities which property equals to a number', () => {
  const db = factory({
    user: {
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

test('queries entities which property is within a number range', () => {
  const db = factory({
    item: {
      title: String,
      stockQuantity: Number,
    },
  })
  db.item.create({
    title: 'Star Wars Lego',
    stockQuantity: 5,
  })
  db.item.create({
    title: 'Avengers Hat',
    stockQuantity: 1,
  })
  db.item.create({
    title: 'Rick & Morty T-Shirt',
    stockQuantity: 20,
  })

  const firstWithBulkStock = db.item.findFirst({
    which: {
      stockQuantity: {
        between: [5, 50],
      },
    },
  })
  expect(firstWithBulkStock).toHaveProperty('title', 'Star Wars Lego')

  const allWithBulkStock = db.item.findMany({
    which: {
      stockQuantity: {
        between: [5, 50],
      },
    },
  })
  expect(allWithBulkStock).toHaveLength(2)
  const titles = allWithBulkStock.map((item) => item.title)
  expect(titles).toEqual(['Star Wars Lego', 'Rick & Morty T-Shirt'])
})
