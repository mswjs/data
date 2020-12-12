import { filterEntitesByPrimaryKey } from '../../src/query/executeQuery'

const createEntities = (size: number) => {
  return Array.from(Array(size).keys())
    .reverse()
    .reduce<Map<number, Record<string, any>>>((acc, id) => {
      acc.set(id, {
        id,
      })

      return acc
    }, new Map<number, Record<string, any>>())
}

test('should return all elements if query is not provided', () => {
  const entities = createEntities(1)
  const filteredEntities = filterEntitesByPrimaryKey(entities, 'id', {
    which: null,
  })

  expect(filteredEntities).toHaveLength(1)
  expect(filteredEntities).toEqual(Array.from(entities.values()))
})

test('should find the entity by id', () => {
  const entities = createEntities(15)
  const filteredEntities = filterEntitesByPrimaryKey(entities, 'id', {
    which: {
      id: {
        equals: 14,
      },
    },
  })

  expect(filteredEntities).toHaveLength(1)
  expect(filteredEntities).toEqual([
    {
      id: 14,
    },
  ])
})

test('should find entities in a range', () => {
  const entities = createEntities(100)
  const filteredEntities = filterEntitesByPrimaryKey(entities, 'id', {
    which: {
      id: {
        in: [2, 25, 50],
      },
    },
  })

  expect(filteredEntities).toHaveLength(3)
  expect(filteredEntities).toEqual([
    {
      id: 2,
    },
    {
      id: 25,
    },
    {
      id: 50,
    },
  ])
})

test('should find entities in a range', () => {
  const entities = createEntities(10)
  const filteredEntities = filterEntitesByPrimaryKey(entities, 'id', {
    which: {
      id: {
        between: [1, 3],
      },
    },
  })

  expect(filteredEntities).toHaveLength(3)
  expect(filteredEntities).toEqual([
    {
      id: 3,
    },
    {
      id: 2,
    },
    {
      id: 1,
    },
  ])
})
