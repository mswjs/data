import { faker } from '@faker-js/faker'
import { factory, primaryKey, nullable } from '../../src'

const setup = () => {
  const db = factory({
    book: {
      id: primaryKey(faker.datatype.uuid),
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

  const books = db.book.findMany({
    where: {
      OR: [
        {
          OR: [
            {
              title: {
                contains: 'Doors',
              },
            },
            {
              title: {
                equals: 'New Spring',
              },
            },
          ],
        },
        {
          title: {
            contains: 'Winter',
          },
        },
      ],
    },
  })
  const bookTitles = books.map((book) => book.title)
  expect(bookTitles).toEqual([
    'The Winds of Winter',
    'New Spring',
    'The Doors of Stone',
  ])
})