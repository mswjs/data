import { parseModelDefinition } from '../../src/model/parseModelDefinition'
import { manyOf, oneOf, primaryKey } from '../../src'
import { RelationKind } from '../../src/glossary'

it('parses a given plain model definition', () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
    },
  }
  const result = parseModelDefinition(dictionary, 'user', dictionary.user)

  expect(result).toEqual({
    primaryKey: 'id',
    properties: ['id', 'firstName'],
    relations: {},
  })
})

it('parses a given model definition with relations', () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      firstName: String,
      country: oneOf('country', { unique: true }),
      posts: manyOf('post'),
    },
    country: {
      code: primaryKey(String),
    },
    post: {
      id: primaryKey(String),
    },
  }
  const result = parseModelDefinition(dictionary, 'user', dictionary['user'])

  expect(result).toEqual({
    primaryKey: 'id',
    properties: ['id', 'firstName'],
    relations: {
      country: {
        kind: RelationKind.OneOf,
        modelName: 'country',
        unique: true,
        primaryKey: 'code',
      },
      posts: {
        kind: RelationKind.ManyOf,
        modelName: 'post',
        unique: false,
        primaryKey: 'id',
      },
    },
  })
})

it('throws an error when provided a model definition with multiple primary keys', () => {
  const dictionary = {
    user: {
      id: primaryKey(String),
      role: primaryKey(String),
    },
  }
  const parse = () => parseModelDefinition(dictionary, 'user', dictionary.user)

  expect(parse).toThrow(
    'Failed to parse a model definition for "user": cannot have both properties "id" and "role" as a primary key.',
  )
})

it('throws an error when provided a model definition without a primary key', () => {
  const dictionary = {
    user: {
      firstName: String,
    },
  }
  const parse = () => parseModelDefinition(dictionary, 'user', dictionary.user)

  expect(parse).toThrow(
    'Failed to parse a model definition for "user": no provided properties are marked as a primary key (firstName).',
  )
})
