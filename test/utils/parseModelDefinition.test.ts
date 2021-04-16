import { parseModelDefinition } from '../../src/model/parseModelDefinition'
import { manyOf, oneOf, primaryKey } from '../../src'
import { RelationKind } from '../../src/glossary'

it('parses a given plain model definition', () => {
  const result = parseModelDefinition('user', {
    id: primaryKey(String),
    firstName: String,
  })

  expect(result).toEqual({
    primaryKey: 'id',
    properties: {
      id: '',
      firstName: '',
    },
    relations: {},
  })
})

it('parses a given model definition with relations', () => {
  const result = parseModelDefinition(
    'user',
    {
      id: primaryKey(String),
      country: oneOf('country', { unique: true }),
      posts: manyOf('post'),
    },
    {
      id: 'abc-123',
      country: {
        __type: 'country',
        __primaryKey: 'id',
        id: 'country-1',
      },
      posts: [
        {
          __type: 'post',
          __primaryKey: 'id',
          id: 'post-1',
        },
        {
          __type: 'post',
          __primaryKey: 'id',
          id: 'post-2',
        },
      ],
    },
  )

  expect(result).toEqual({
    primaryKey: 'id',
    properties: {
      id: 'abc-123',
    },
    relations: {
      country: {
        kind: RelationKind.OneOf,
        modelName: 'country',
        unique: true,
        refs: [
          {
            __type: 'country',
            __primaryKey: 'id',
            __nodeId: 'country-1',
          },
        ],
      },
      posts: {
        kind: RelationKind.ManyOf,
        modelName: 'post',
        unique: false,
        refs: [
          {
            __type: 'post',
            __primaryKey: 'id',
            __nodeId: 'post-1',
          },
          {
            __type: 'post',
            __primaryKey: 'id',
            __nodeId: 'post-2',
          },
        ],
      },
    },
  })
})

it('throws an error when provided a model definition with multiple primary keys', () => {
  const parse = () =>
    parseModelDefinition('user', {
      id: primaryKey(String),
      role: primaryKey(String),
    })

  expect(parse).toThrow(
    'Failed to parse model definition for "user": cannot specify more than one primary key for a model.',
  )
})

it('throws an error when provided a model definition without a primary key', () => {
  const parse = () =>
    parseModelDefinition('user', {
      firstName: String,
    })

  expect(parse).toThrow(
    'Failed to parse model definition for "user": primary key not found.',
  )
})

it('throws an error when provided a model with relational property but without value', () => {
  const parse = () =>
    parseModelDefinition('user', {
      id: primaryKey(String),
      country: oneOf('country'),
    })

  expect(parse).toThrow(
    `Failed to set "user.country" as it's a relational property with no value.`,
  )
})
