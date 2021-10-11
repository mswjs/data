import { oneOf, primaryKey } from '../../src'
import {
  ProducedRelationsMap,
  RelationKind,
} from '../../src/relations/Relation'
import { Database } from '../../src/db/Database'
import { InternalEntityProperty, ModelDictionary } from '../../src/glossary'
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
    [InternalEntityProperty.primaryKey]: 'id',
    [InternalEntityProperty.type]: 'user',
    id: 'abc-123',
    name: 'Test User',
  })

  const relations: ProducedRelationsMap = {
    author: {
      kind: RelationKind.OneOf,
      primaryKey: 'id',
      modelName: 'user',
      unique: false,
    },
  }

  const post = {
    [InternalEntityProperty.primaryKey]: 'id',
    [InternalEntityProperty.type]: 'post',
    id: '234',
    title: 'Test Post',
  }
  const initialValues = { author: { id: 'abc-123' } }

  defineRelationalProperties(post, initialValues, relations, db)

  expect(post.propertyIsEnumerable('author')).toBe(true)
})
