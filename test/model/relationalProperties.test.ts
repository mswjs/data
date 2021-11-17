import { oneOf, primaryKey, nullable } from '../../src'
import {
  Relation,
  RelationKind,
  RelationsList,
} from '../../src/relations/Relation'
import { Database } from '../../src/db/Database'
import { ENTITY_TYPE, ModelDictionary, PRIMARY_KEY } from '../../src/glossary'
import { defineRelationalProperties } from '../../src/model/defineRelationalProperties'

it('marks relational properties as enumerable', () => {
  const dictionary: ModelDictionary = {
    user: {
      id: primaryKey(String),
      name: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: oneOf('user'),
    },
  }

  const db = new Database(dictionary)

  db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    name: 'Test User',
  })

  const relations: RelationsList = [
    {
      propertyPath: ['author'],
      relation: new Relation({
        to: 'user',
        kind: RelationKind.OneOf,
      }),
    },
  ]

  const post = {
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: '234',
    title: 'Test Post',
  }
  const initialValues = { author: { id: 'abc-123' } }

  defineRelationalProperties(post, initialValues, relations, dictionary, db)

  expect(post.propertyIsEnumerable('author')).toBe(true)
})

it('marks nullable relational properties as enumerable', () => {
  const dictionary: ModelDictionary = {
    user: {
      id: primaryKey(String),
      name: String,
    },
    post: {
      id: primaryKey(String),
      title: String,
      author: nullable(oneOf('user')),
    },
  }

  const db = new Database(dictionary)

  db.create('user', {
    [ENTITY_TYPE]: 'user',
    [PRIMARY_KEY]: 'id',
    id: 'abc-123',
    name: 'Test User',
  })

  const relations: RelationsList = [
    {
      propertyPath: ['author'],
      relation: new Relation({
        to: 'user',
        kind: RelationKind.OneOf,
      }),
    },
  ]

  const post = {
    [ENTITY_TYPE]: 'post',
    [PRIMARY_KEY]: 'id',
    id: '234',
    title: 'Test Post',
  }
  const initialValues = { author: { id: 'abc-123' } }

  defineRelationalProperties(post, initialValues, relations, dictionary, db)

  expect(post.propertyIsEnumerable('author')).toBe(true)
})
