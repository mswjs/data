import { datatype } from 'faker'
import { factory, primaryKey, oneOf } from '@mswjs/data'

test('supports offset-based pagination', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      category: String,
    },
  })

  db.book.create({ title: 'Magician', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #1', category: 'Science' })
  db.book.create({ title: 'The Lord of the Rings', category: 'Fantasy' })
  db.book.create({ title: 'The Name of the Wind', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #2', category: 'Science' })
  db.book.create({ title: 'The Song of Ice and Fire', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #3', category: 'Science' })

  const firstPage = db.book.findMany({
    where: { category: { equals: 'Fantasy' } },
    take: 2,
  })
  expect(firstPage).toHaveLength(2)
  const firstPageBooks = firstPage.map((book) => book.title)
  expect(firstPageBooks).toEqual(['Magician', 'The Lord of the Rings'])

  const secondPage = db.book.findMany({
    where: { category: { equals: 'Fantasy' } },
    skip: 2,
    take: 2,
  })
  expect(secondPage).toHaveLength(2)
  const secondPageBooks = secondPage.map((book) => book.title)
  expect(secondPageBooks).toEqual([
    'The Name of the Wind',
    'The Song of Ice and Fire',
  ])
})

test('supports cursor-based pagination', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      category: String,
    },
  })

  db.book.create({ title: 'Magician', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #1', category: 'Science' })
  db.book.create({ title: 'The Lord of the Rings', category: 'Fantasy' })
  db.book.create({ title: 'The Name of the Wind', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #2', category: 'Science' })
  db.book.create({ title: 'The Song of Ice and Fire', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #3', category: 'Science' })

  const firstPage = db.book.findMany({
    where: { category: { equals: 'Fantasy' } },
    take: 2,
    cursor: null,
  })
  expect(firstPage).toHaveLength(2)
  const firstPageBooks = firstPage.map((book) => book.title)
  expect(firstPageBooks).toEqual(['Magician', 'The Lord of the Rings'])

  const secondPage = db.book.findMany({
    where: { category: { equals: 'Fantasy' } },
    take: 2,
    cursor: firstPage[firstPage.length - 1].id,
  })
  expect(secondPage).toHaveLength(2)
  const secondPageBooks = secondPage.map((book) => book.title)
  expect(secondPageBooks).toEqual([
    'The Name of the Wind',
    'The Song of Ice and Fire',
  ])
})

test('returns an empty list given invalid cursor', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      category: String,
    },
  })

  db.book.create({ title: 'Magician', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #1', category: 'Science' })
  db.book.create({ title: 'The Lord of the Rings', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #2', category: 'Science' })

  const firstPage = db.book.findMany({
    where: { category: { equals: 'Fantasy' } },
    take: 2,
    cursor: 'abc-invalid-cursor',
  })
  expect(firstPage).toEqual([])
})

test('supports single-criteria sorting in the paginated results', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      publishedYear: Number,
    },
  })

  db.book.create({ title: 'B', publishedYear: 1875 })
  db.book.create({ title: 'C', publishedYear: 2004 })
  db.book.create({ title: 'A', publishedYear: 2021 })
  db.book.create({ title: 'D', publishedYear: 2006 })

  const firstPage = db.book.findMany({
    where: {
      publishedYear: { gte: 1990 },
    },
    take: 2,
    orderBy: { title: 'asc' },
  })
  const firstPageTitles = firstPage.map((book) => book.title)
  expect(firstPageTitles).toEqual(['A', 'C'])

  const secondPage = db.book.findMany({
    where: {
      publishedYear: { gte: 1990 },
    },
    skip: 2,
    take: 2,
    orderBy: {
      title: 'asc',
    },
  })
  const secondPageTitles = secondPage.map((book) => book.title)
  expect(secondPageTitles).toEqual(['D'])
})

test('supports multi-criteria sorting in the paginated results', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      publishedYear: Number,
    },
  })

  db.book.create({ title: 'A', publishedYear: 1875 })
  db.book.create({ title: 'C', publishedYear: 2004 })
  db.book.create({ title: 'A', publishedYear: 2021 })
  db.book.create({ title: 'D', publishedYear: 2006 })

  const firstPage = db.book.findMany({
    take: 2,
    orderBy: [
      {
        title: 'asc',
      },
      {
        publishedYear: 'desc',
      },
    ],
  })
  const firstPageBooks = firstPage.map((book) => [
    book.title,
    book.publishedYear,
  ])
  expect(firstPageBooks).toEqual([
    ['A', 2021],
    ['A', 1875],
  ])

  const secondPage = db.book.findMany({
    skip: 2,
    take: 2,
    orderBy: [
      {
        title: 'asc',
      },
      {
        publishedYear: 'desc',
      },
    ],
  })
  const secondPageBooks = secondPage.map((book) => book.title)
  expect(secondPageBooks).toEqual(['C', 'D'])
})

test('supports single-criteria sorting by relational property in the paginated results', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      author: oneOf('author'),
    },
    author: {
      id: primaryKey(datatype.uuid),
      firstName: String,
    },
  })

  const john = db.author.create({ firstName: 'John' })
  const george = db.author.create({ firstName: 'George' })
  const nelson = db.author.create({ firstName: 'Nelson' })
  const bookByJohn = db.book.create({ title: 'A', author: john })
  const bookByGeorge = db.book.create({ title: 'B', author: george })
  db.book.create({ title: 'C', author: nelson })

  const firstPage = db.book.findMany({
    take: 2,
    orderBy: {
      author: {
        firstName: 'asc',
      },
    },
  })

  expect(firstPage).toEqual([bookByGeorge, bookByJohn])
})

test('supports multi-criteria sorting by relational property in the paginated results', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      author: oneOf('author'),
    },
    author: {
      id: primaryKey(datatype.uuid),
      firstName: String,
      bornAt: () => new Date(),
    },
  })

  const john = db.author.create({
    firstName: 'John',
    bornAt: new Date('1980-01-30'),
  })
  const george = db.author.create({
    firstName: 'George',
    bornAt: new Date('1990-12-08'),
  })
  const nelson = db.author.create({
    firstName: 'Nelson',
    bornAt: new Date('1986-09-09'),
  })

  const bookByJohn = db.book.create({ title: 'A', author: john })
  const bookByGeorge = db.book.create({ title: 'B', author: george })
  const bookByNelson = db.book.create({ title: 'C', author: nelson })

  const firstPage = db.book.findMany({
    take: 2,
    orderBy: [
      {
        author: {
          firstName: 'asc',
        },
      },
      {
        author: {
          bornAt: 'desc',
        },
      },
    ],
  })

  expect(firstPage).toEqual([bookByGeorge, bookByJohn])

  const secondPage = db.book.findMany({
    skip: 2,
    take: 2,
    orderBy: [
      {
        author: {
          firstName: 'asc',
        },
      },
      {
        author: {
          bornAt: 'desc',
        },
      },
    ],
  })

  expect(secondPage).toEqual([bookByNelson])
})

test('supports sorting by both direct and relational properties in the paginated results', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      author: oneOf('author'),
    },
    author: {
      id: primaryKey(datatype.uuid),
      firstName: String,
    },
  })

  const john = db.author.create({ firstName: 'John' })
  const george = db.author.create({ firstName: 'George' })
  const nelson = db.author.create({ firstName: 'Nelson' })
  db.book.create({ title: 'A', author: john })
  db.book.create({ title: 'B', author: george })
  db.book.create({ title: 'A', author: nelson })

  const firstPage = db.book.findMany({
    take: 2,
    orderBy: [
      {
        title: 'asc',
      },
      {
        author: {
          firstName: 'asc',
        },
      },
    ],
  })
  const firstPageBooks = firstPage.map((book) => book.title)
  const firstPageAuthors = firstPage.map((book) => book.author?.firstName)
  expect(firstPageBooks).toEqual(['A', 'A'])
  expect(firstPageAuthors).toEqual(['John', 'Nelson'])
})

test('supports single-criteria sorting by nested model properties', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      publication: {
        country: String,
      },
    },
  })

  const americanBook = db.book.create({
    publication: {
      country: 'us',
    },
  })

  const germanBook = db.book.create({
    publication: {
      country: 'de',
    },
  })

  const result = db.book.findMany({
    orderBy: {
      publication: {
        country: 'asc',
      },
    },
  })

  expect(result).toEqual([germanBook, americanBook])
})

test('supports multi-criteria sorting by nested model properties', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      publication: {
        year: () => new Date(),
        pubilsher: {
          country: String,
        },
      },
    },
  })

  const americanBookOne = db.book.create({
    publication: {
      year: new Date('1997-10-10'),
      pubilsher: {
        country: 'us',
      },
    },
  })
  const americanBookTwo = db.book.create({
    publication: {
      year: new Date('2005-04-01'),
      pubilsher: {
        country: 'us',
      },
    },
  })

  const germanBookOne = db.book.create({
    publication: {
      year: new Date('2011-12-07'),
      pubilsher: {
        country: 'de',
      },
    },
  })
  const germanBookTwo = db.book.create({
    publication: {
      year: new Date('2020-06-24'),
      pubilsher: {
        country: 'de',
      },
    },
  })

  const result = db.book.findMany({
    where: {},
    orderBy: [
      {
        publication: {
          year: 'desc',
        },
      },
      {
        publication: {
          pubilsher: {
            country: 'asc',
          },
        },
      },
    ],
  })

  expect(result).toEqual([
    germanBookTwo,
    germanBookOne,
    americanBookTwo,
    americanBookOne,
  ])
})
