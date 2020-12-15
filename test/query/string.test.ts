import { factory } from '../../src'

const setup = () => {
  const db = factory({
    recipe: {
      title: String,
      category: String,
    },
  })
  db.recipe.create({
    title: 'New York Pizza',
    category: 'pizza',
  })
  db.recipe.create({
    title: 'Chocolate Cake',
    category: 'cake',
  })
  db.recipe.create({
    title: 'Pizza Mozzarrela',
    category: 'pizza',
  })
  return db
}
test('queries entity which property equals a string', () => {
  const db = setup()

  const firstPizza = db.recipe.findFirst({
    which: {
      category: {
        equals: 'pizza',
      },
    },
  })
  expect(firstPizza).toHaveProperty('title', 'New York Pizza')

  const allPizza = db.recipe.findMany({
    which: {
      category: {
        equals: 'pizza',
      },
    },
  })
  expect(allPizza).toHaveLength(2)
  const titles = allPizza.map((pizza) => pizza.title)
  expect(titles).toEqual(['New York Pizza', 'Pizza Mozzarrela'])
})

test('queries entities which property contains a string', () => {
  const db = setup()

  const firstPizza = db.recipe.findFirst({
    which: {
      title: {
        contains: 'Pizza',
      },
    },
  })
  expect(firstPizza).toHaveProperty('title', 'New York Pizza')

  const allPizzas = db.recipe.findMany({
    which: {
      title: {
        contains: 'Pizza',
      },
    },
  })
  expect(allPizzas).toHaveLength(2)
  const pizzaTitles = allPizzas.map((pizza) => pizza.title)
  expect(pizzaTitles).toEqual(['New York Pizza', 'Pizza Mozzarrela'])
})

test('queries entities which property not contains a string', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    which: {
      title: {
        notContains: 'Pizza',
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities which property is not equals to a string', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    which: {
      title: {
        notEquals: 'New York Pizza',
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities which property is not contained into the array', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    which: {
      title: {
        notIn: ['New York Pizza'],
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities which property is contained into the array', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    which: {
      title: {
        in: ['New York Pizza'],
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'New York Pizza')
})
