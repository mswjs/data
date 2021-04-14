import { random } from 'faker'
import { factory, primaryKey } from '@mswjs/data'

test('supports offset-based pagination', () => {
  const db = factory({
    book: {
      id: primaryKey(random.uuid),
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
    which: { category: { equals: 'Fantasy' } },
    take: 2,
  })
  expect(firstPage).toHaveLength(2)
  const firstPageBooks = firstPage.map((book) => book.title)
  expect(firstPageBooks).toEqual(['Magician', 'The Lord of the Rings'])

  const secondPage = db.book.findMany({
    which: { category: { equals: 'Fantasy' } },
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
      id: primaryKey(random.uuid),
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
    which: { category: { equals: 'Fantasy' } },
    take: 2,
    cursor: null,
  })
  expect(firstPage).toHaveLength(2)
  const firstPageBooks = firstPage.map((book) => book.title)
  expect(firstPageBooks).toEqual(['Magician', 'The Lord of the Rings'])

  const secondPage = db.book.findMany({
    which: { category: { equals: 'Fantasy' } },
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
      id: primaryKey(random.uuid),
      title: String,
      category: String,
    },
  })

  db.book.create({ title: 'Magician', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #1', category: 'Science' })
  db.book.create({ title: 'The Lord of the Rings', category: 'Fantasy' })
  db.book.create({ title: 'Irrelevant Book #2', category: 'Science' })

  const firstPage = db.book.findMany({
    which: { category: { equals: 'Fantasy' } },
    take: 2,
    cursor: 'abc-invalid-cursor',
  })
  expect(firstPage).toEqual([])
})
