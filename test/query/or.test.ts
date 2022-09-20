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

  const doorsAndWinter = db.book.findMany({
    where: {
      OR: [
        {
          title: {
            contains: "Doors",
          },
        },
        {
          title: {
            contains: "Winter",
          },
        },
      ],
    },
  })
  const doorsAndWinterTitles = doorsAndWinter.map((book) => book.title)
  expect(doorsAndWinterTitles).toEqual([
    'The Winds of Winter',
    'The Doors of Stone',
  ])
})