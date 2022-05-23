import { IDENTIFIER, MODEL_NAME } from '../../contexts/QueryableContext'
import { Database } from '../../Database'
import { factory } from '../../factory'
import { id } from '../id'
import { oneOf } from '../oneOf'

const db = new Database()

afterEach(() => {
  db.drop()
})

it('does not set a relationship without a value', () => {
  const db = factory({
    user: {
      id: id(() => 'user-1'),
      role: oneOf('role'),
    },
    role: {
      id: id(() => 'role-1'),
    },
  })

  const user = db.user.create()

  expect(user.role).toBeUndefined()
})

it('creates one-to-one relationship between two models', () => {
  const db = factory({
    user: {
      id: id(() => 'user-1'),
      role: oneOf('role'),
    },
    role: {
      id: id(() => 'role-1'),
    },
  })

  const user = db.user.create({
    role: db.role.create(),
  })

  expect(user.role).toEqual({
    id: 'role-1',
    [IDENTIFIER]: 'id',
    [MODEL_NAME]: 'role',
  })
})

it('allows one record to be referenced multiple times', () => {
  const db = factory({
    user: {
      id: id(String),
      role: oneOf('role'),
    },
    role: {
      id: id(String),
    },
  })

  const moderator = db.role.create({ id: 'moderator' })

  expect(
    db.user.create({
      id: 'john',
      role: moderator,
    }),
  ).toEqual({
    id: 'john',
    role: {
      id: 'moderator',
      [IDENTIFIER]: 'id',
      [MODEL_NAME]: 'role',
    },
    [IDENTIFIER]: 'id',
    [MODEL_NAME]: 'user',
  })

  expect(
    db.user.create({
      id: 'kate',
      role: moderator,
    }),
  ).toEqual({
    id: 'kate',
    role: {
      id: 'moderator',
      [IDENTIFIER]: 'id',
      [MODEL_NAME]: 'role',
    },
    [IDENTIFIER]: 'id',
    [MODEL_NAME]: 'user',
  })
})

it('supports a unique one-to-one relationship', () => {
  const db = factory({
    country: {
      code: id(String),
      capital: oneOf('city', { unique: true }),
    },
    city: {
      name: id(String),
    },
  })

  const washington = db.city.create({ name: 'Washington' })

  db.country.create({
    code: 'us',
    capital: washington,
  })

  expect(() =>
    db.country.create({
      code: 'uk',
      capital: washington,
    }),
  ).toThrow(
    'Failed to set a "ONE_OF" relationship at "country.capital": the referenced "city" belongs to another "country" (code: "us").',
  )

  expect(() =>
    db.country.create({
      code: 'uk',
      capital: db.city.create({ name: 'London' }),
    }),
  ).not.toThrow()
})
