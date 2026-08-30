import { Query } from '#/src/index.js'

it('returns true when testing against a matching value', () => {
  expect(new Query<number>((value) => value === 123).test(123)).toBe(true)
  expect(
    new Query<{ id: number }>((value) => value.id === 123).test({ id: 123 }),
  ).toBe(true)
  expect(new Query<{ id: number }>().where({ id: 123 }).test({ id: 123 })).toBe(
    true,
  )
})

it('returns false when testing against a non-matching value', () => {
  expect(new Query<number>((value) => value === 123).test(1)).toBe(false)
  expect(
    new Query<{ id: number }>((value) => value.id === 123).test({ id: 1 }),
  ).toBe(false)
  expect(new Query<{ id: number }>().where({ id: 123 }).test({ id: 1 })).toBe(
    false,
  )
})

it('combines predicates under an OR logic', () => {
  expect(
    new Query<{ id: number }>((value) => value.id === 123)
      .or({ id: 456 })
      .test({ id: 123 }),
  ).toBe(true)
  expect(
    new Query<{ id: number }>((value) => value.id === 123)
      .or({ id: 456 })
      .test({ id: 456 }),
  ).toBe(true)

  expect(
    new Query<{ id: number }>((value) => value.id === 123)
      .or({ id: 456 })
      .test({ id: 1 }),
  ).toBe(false)
})

it('combines predicates under an AND logic', () => {
  expect(
    new Query<{ id: number; name: string }>()
      .where({ id: 456 })
      .and({ name: 'John' })
      .test({ id: 456, name: 'John' }),
  ).toBe(true)

  expect(
    new Query<{ id: number; name: string }>()
      .where({ id: 456 })
      .and({ name: 'John' })
      .test({ id: 123, name: 'John' }),
  ).toBe(false)
  expect(
    new Query<{ id: number; name: string }>()
      .where({ id: 456 })
      .and({ name: 'John' })
      .test({ id: 456, name: 'Kate' }),
  ).toBe(false)
})

it('supports a predicate function against an array property', () => {
  const query = new Query<{ petNames: Array<string> }>().where({
    petNames: (petNames) => petNames.includes('wolfy'),
  })

  expect(query.test({ petNames: ['wolfy'] })).toBe(true)
  expect(query.test({ petNames: ['rex'] })).toBe(false)
  expect(query.test({ petNames: [] })).toBe(false)
})

it('supports a condition against an array of objects', () => {
  const query = new Query<{ posts: Array<{ title: string }> }>().where({
    posts: { title: 'First' },
  })

  expect(query.test({ posts: [{ title: 'First' }] })).toBe(true)
  expect(query.test({ posts: [{ title: 'Second' }] })).toBe(false)
})
