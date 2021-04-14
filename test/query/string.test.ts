import { random } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

const setup = () => {
  const db = factory({
    recipe: {
      id: primaryKey(random.uuid),
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

test('queries entity where property equals a string', () => {
  const db = setup()

  const firstPizza = db.recipe.findFirst({
    where: {
      category: {
        equals: 'pizza',
      },
    },
  })
  expect(firstPizza).toHaveProperty('title', 'New York Pizza')

  const allPizza = db.recipe.findMany({
    where: {
      category: {
        equals: 'pizza',
      },
    },
  })
  expect(allPizza).toHaveLength(2)
  const titles = allPizza.map((pizza) => pizza.title)
  expect(titles).toEqual(['New York Pizza', 'Pizza Mozzarrela'])
})

test('queries entities where property contains a string', () => {
  const db = setup()

  const firstPizza = db.recipe.findFirst({
    where: {
      title: {
        contains: 'Pizza',
      },
    },
  })
  expect(firstPizza).toHaveProperty('title', 'New York Pizza')

  const allPizzas = db.recipe.findMany({
    where: {
      title: {
        contains: 'Pizza',
      },
    },
  })
  expect(allPizzas).toHaveLength(2)
  const pizzaTitles = allPizzas.map((pizza) => pizza.title)
  expect(pizzaTitles).toEqual(['New York Pizza', 'Pizza Mozzarrela'])
})

test('queries entities where property not contains a string', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    where: {
      title: {
        notContains: 'Pizza',
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities where property is not equals to a string', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    where: {
      title: {
        notEquals: 'New York Pizza',
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities where property is not contained into the array', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    where: {
      title: {
        notIn: ['New York Pizza'],
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'Chocolate Cake')
})

test('queries entities where property is contained into the array', () => {
  const db = setup()

  const chocolateCake = db.recipe.findFirst({
    where: {
      title: {
        in: ['New York Pizza'],
      },
    },
  })
  expect(chocolateCake).toHaveProperty('title', 'New York Pizza')
})
