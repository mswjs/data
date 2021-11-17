import { datatype } from 'faker'
import { factory, primaryKey, nullable } from '@mswjs/data'

const setup = () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      title: String,
      published: Boolean,
      finished: nullable<boolean>(() => null),
    },
  })

  db.book.create({
    title: 'The Winds of Winter',
    published: false,
    finished: false,
  })
  db.book.create({
    title: 'New Spring',
    published: true,
    finished: true,
  })
  db.book.create({
    title: 'The Doors of Stone',
    published: false,
    finished: null, // Who knows with Patrick?
  })
  db.book.create({
    title: 'The Fellowship of the Ring',
    published: true,
    finished: true,
  })

  return db
}

test('queries entities based on a boolean value', () => {
  const db = setup()

  const firstPublished = db.book.findFirst({
    where: {
      published: {
        equals: true,
      },
    },
  })
  expect(firstPublished).toHaveProperty('title', 'New Spring')

  const allUnpublished = db.book.findMany({
    where: {
      published: {
        notEquals: true,
      },
    },
  })
  expect(allUnpublished).toHaveLength(2)

  const unpublishedTitles = allUnpublished.map((book) => book.title)
  expect(unpublishedTitles).toEqual([
    'The Winds of Winter',
    'The Doors of Stone',
  ])
})

test('ignores entities with missing values when querying using boolean', () => {
  const db = setup()

  const finishedBooks = db.book.findMany({
    where: { finished: { equals: true } },
  })
  const unfinishedBooks = db.book.findMany({
    where: { finished: { notEquals: true } },
  })
  const bookTitles = [...finishedBooks, ...unfinishedBooks].map(
    (book) => book.title,
  )

  expect(bookTitles).toHaveLength(3)
  expect(bookTitles).not.toContain('The Doors of Stone')
})
