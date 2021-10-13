import {
  ParsedModelDefinition,
  parseModelDefinition,
} from '../../src/model/parseModelDefinition'
import { manyOf, oneOf, primaryKey } from '../../src'
import { ModelDictionary } from '../../src/glossary'
import { Relation, RelationKind } from '../../src/relations/Relation'

it('parses a plain model definition', () => {
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
  } as ParsedModelDefinition)
})

it('parses a model definition with relations', () => {
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
      country: new Relation({
        to: 'country',
        kind: RelationKind.OneOf,
        attributes: {
          unique: true,
        },
      }),
      posts: new Relation({
        to: 'post',
        kind: RelationKind.ManyOf,
      }),
    },
  } as ParsedModelDefinition)
})

it('parses a model definition with nested objects', () => {
  const dictionary: ModelDictionary = {
    user: {
      id: primaryKey(String),
      address: {
        billing: {
          street: String,
          houseNumber: String,
          country: oneOf('country'),
        },
      },
      activity: {
        posts: manyOf('post', { unique: true }),
      },
    },
    post: {
      id: primaryKey(String),
    },
    country: {
      code: primaryKey(String),
    },
  }

  const result = parseModelDefinition(dictionary, 'user', dictionary.user)

  expect(result).toEqual({
    primaryKey: 'id',
    properties: ['id', 'address.billing.street', 'address.billing.houseNumber'],
    relations: {
      'address.billing.country': new Relation({
        to: 'country',
        kind: RelationKind.OneOf,
      }),
      'activity.posts': new Relation({
        to: 'post',
        kind: RelationKind.ManyOf,
        attributes: {
          unique: true,
        },
      }),
    },
  } as ParsedModelDefinition)
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
    'Failed to parse a model definition for "user": model is missing a primary key. Did you forget to mark one of its properties using the "primaryKey" function?',
  )
})
