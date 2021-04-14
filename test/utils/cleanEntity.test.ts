import { factory, primaryKey } from '../../src'
import { removeInternalProperties } from '../../src/utils/removeInternalProperties'

const db = factory({
  user: {
    id: primaryKey(String),
    firstName: String,
  },
})

beforeAll(() => {
  db.user.create({
    id: 'abc-123',
    firstName: 'John',
  })
})

it('removes internal properties from an entity', () => {
  const user = db.user.findFirst({ where: { id: { equals: 'abc-123' } } })
  expect(removeInternalProperties(user)).toEqual({
    id: 'abc-123',
    firstName: 'John',
  })
})
