import { datatype } from 'faker'
import { factory, primaryKey } from '../../src'
import { repeat } from '../testUtils'

test('counts the amount of records for the model', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
    },
  })
  repeat(db.book.create, 12)

  const booksCount = db.book.count()
  expect(booksCount).toBe(12)
})

test('returns 0 when no records are present', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
    },
    user: {
      id: primaryKey(datatype.uuid),
    },
  })
  repeat(db.book.create, 5)

  const usersCount = db.user.count()
  expect(usersCount).toBe(0)
})

test('counts the amount of records that match the query', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      pagesCount: Number,
    },
  })
  db.book.create({ pagesCount: 150 })
  db.book.create({ pagesCount: 335 })
  db.book.create({ pagesCount: 750 })

  const longBooks = db.book.count({
    where: {
      pagesCount: {
        gte: 300,
      },
    },
  })
  expect(longBooks).toBe(2)
})

test('returns 0 when no records match the query', () => {
  const db = factory({
    book: {
      id: primaryKey(datatype.uuid),
      pagesCount: Number,
    },
  })
  db.book.create({ pagesCount: 150 })
  db.book.create({ pagesCount: 335 })
  db.book.create({ pagesCount: 750 })

  const longBooks = db.book.count({
    where: {
      pagesCount: {
        gte: 1000,
      },
    },
  })
  expect(longBooks).toBe(0)
})
