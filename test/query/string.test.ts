import { factory } from '../../src'

test('queries entity which property equals a string', () => {
  const db = factory({
    user: {
      firstName: String,
      role: String,
    },
  })
  db.user.create({
    firstName: 'John',
    role: 'editor',
  })
  db.user.create({
    firstName: 'Kate',
    role: 'admin',
  })
  db.user.create({
    firstName: 'Alice',
    role: 'reader',
  })
  db.user.create({
    firstName: 'Joseph',
    role: 'editor',
  })

  const firstEditor = db.user.findOne({
    which: {
      role: {
        equals: 'editor',
      },
    },
  })
  expect(firstEditor).toHaveProperty('firstName', 'John')

  const allEditors = db.user.findMany({
    which: {
      role: {
        equals: 'editor',
      },
    },
  })
  expect(allEditors).toHaveLength(2)
  const editorNames = allEditors.map((user) => user.firstName)
  expect(editorNames).toEqual(['John', 'Joseph'])
})

test('queries entities which property contains a string', () => {
  const db = factory({
    recipe: {
      title: String,
    },
  })
  db.recipe.create({
    title: 'New York Pizza',
  })
  db.recipe.create({
    title: 'Chocolate Cake',
  })
  db.recipe.create({
    title: 'Pizza Mozzarrela',
  })

  const firstPizza = db.recipe.findOne({
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
