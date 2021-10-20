import { Entity, ENTITY_TYPE, PRIMARY_KEY } from '../../src/glossary'
import { inheritInternalProperties } from '../../src/utils/inheritInternalProperties'

it('inherits internal properties from the given entity', () => {
  const target = {
    id: 'abc-123',
    firstName: 'John',
  }
  const entity: Entity<any, any> = {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
  }

  inheritInternalProperties(target, entity)

  expect(Object.keys(target)).toEqual(['id', 'firstName'])
  expect(Object.getOwnPropertySymbols(target)).toEqual([
    ENTITY_TYPE,
    PRIMARY_KEY,
  ])
  expect(target).toEqual({
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    firstName: 'John',
  })
})

it('throws an exception given a corrupted source entity', () => {
  expect(() =>
    inheritInternalProperties({ firstName: 'John' }, { id: 'abc-123' } as any),
  ).toThrow(
    'Failed to inherit internal properties from ({"id":"abc-123"}) to ({"firstName":"John"}): provided source entity has no entity type specified.',
  )

  expect(() =>
    inheritInternalProperties(
      {
        firstName: 'John',
      },
      {
        [ENTITY_TYPE]: 'user',
        id: 'abc-123',
      } as any,
    ),
  ).toThrow(
    'Failed to inherit internal properties from ({"id":"abc-123"}) to ({"firstName":"John"}): provided source entity has no primary key specified.',
  )
})
